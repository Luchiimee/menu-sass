import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chargeSubscription, cancelPreapproval } from '@/lib/mercadopagoBilling';
import { releasePreapproval, releaseLogLine } from '@/lib/preapprovalRelease';
import { nextMonthlyChargeDate } from '@/lib/billingDate';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // 1. Verificar CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Query restaurantes a cobrar
  const now = new Date().toISOString();

  const { data: restaurants, error: queryError } = await supabase
    .from('restaurants')
    .select(
      'id, name, owner_email, subscription_plan, subscription_status, mp_customer_id, mp_card_id, card_last_four, card_brand, trial_ends_at, next_payment_date, grace_period_until, mp_preapproval_id'
    )
    .in('subscription_status', ['trialing', 'active', 'cancelled'])
    .not('mp_card_id', 'is', null)
    .or(
      `and(subscription_status.eq.trialing,trial_ends_at.lte.${now}),` +
      `and(subscription_status.eq.active,next_payment_date.lte.${now}),` +
      `and(subscription_status.eq.cancelled,grace_period_until.not.is.null,grace_period_until.lte.${now})`
    );

  if (queryError) {
    console.error('Cron charge — error en query:', queryError);
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  const rows = restaurants ?? [];
  let charged = 0;
  let failed = 0;
  let skipped = 0;

  // 3. Procesar cada restaurante individualmente
  for (const restaurant of rows) {
    // a. Sin tarjeta → paused
    if (!restaurant.mp_card_id) {
      console.warn(`[cron/charge] ${restaurant.name}: sin mp_card_id — marcando paused`);
      await supabase
        .from('restaurants')
        .update({ subscription_status: 'paused' })
        .eq('id', restaurant.id);
      skipped++;
      continue;
    }

    console.log(`[cron/charge] Cobrando ${restaurant.name}`);

    const result = await chargeSubscription({
      customerId: restaurant.mp_customer_id,
      cardId:     restaurant.mp_card_id,
      cardBrand:  restaurant.card_brand,
      plan:       restaurant.subscription_plan,
      payerEmail: restaurant.owner_email,
      description: `Snappy - Plan ${restaurant.subscription_plan} - ${restaurant.name}`,
    });

    if (result.outcome === 'approved') {
      // Mismo día del mes siguiente (no +30 días). Se parte de la fecha de cobro que se acaba de cumplir:
      // trial_ends_at en el primer cobro, next_payment_date en los siguientes; reactivaciones, desde hoy.
      const due =
        restaurant.subscription_status === 'trialing' ? restaurant.trial_ends_at
        : restaurant.subscription_status === 'active'  ? restaurant.next_payment_date
        : null;
      const nextPayment = nextMonthlyChargeDate(due);

      // El cobro ya está aprobado (no se repite). El id solo se borra si MP confirma
      // que el preapproval quedó cancelado; si no, se conserva la referencia.
      const release = await releasePreapproval(restaurant.mp_preapproval_id, cancelPreapproval);
      if (release.code === 'CANCEL_FAILED') {
        console.error(releaseLogLine('[cron/charge]', release, restaurant.id));
      }

      const update: Record<string, any> = {
        subscription_status: 'active',
        next_payment_date:   nextPayment.toISOString(),
        last_charge_error:    null,
        last_charge_error_at: null,
      };
      if (release.clearId) update.mp_preapproval_id = null;

      await supabase
        .from('restaurants')
        .update(update)
        .eq('id', restaurant.id);

      console.log(`[cron/charge] ✅ ${restaurant.name}: pago aprobado (payment_id=${result.paymentId})`);
      charged++;
    } else {
      console.error(`[cron/charge] ❌ ${restaurant.name}: ${result.outcome} — ${result.detail}`);

      await supabase
        .from('restaurants')
        .update({
          subscription_status: 'paused',
          last_charge_error:    String(result.detail ?? result.outcome).slice(0, 300),
          last_charge_error_at: new Date().toISOString(),
        })
        .eq('id', restaurant.id);

      failed++;
    }
  }

  // 3b. Control (no cobra nada): cuentas activas con tarjeta, sin preapproval y sin fecha de cobro.
  // El cron no las elige nunca (next_payment_date vacío), así que seguirían activas sin pagar. Solo se avisa.
  let sinFecha = 0;
  const { data: huerfanas, error: huerfanasError } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('subscription_status', 'active')
    .not('mp_card_id', 'is', null)
    .is('mp_preapproval_id', null)
    .is('next_payment_date', null);

  if (huerfanasError) {
    console.error('[cron/charge] control sin fecha de cobro — error en query:', huerfanasError.message);
  } else {
    for (const r of huerfanas ?? []) {
      console.error(`[cron/charge] ⚠️ ${r.name} (${r.id}): activa con tarjeta, sin preapproval y sin next_payment_date — no se le cobra`);
      await supabase
        .from('restaurants')
        .update({
          last_charge_error:    'sin fecha de cobro: activa con tarjeta y sin next_payment_date (no se cobra)',
          last_charge_error_at: new Date().toISOString(),
        })
        .eq('id', r.id);
      sinFecha++;
    }
  }

  // 4. Resumen
  const summary = {
    success:   true,
    processed: rows.length,
    charged,
    failed,
    skipped,
    sinFecha,
  };
  console.log('[cron/charge] Resumen:', summary);
  return NextResponse.json(summary);
}
