import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chargeSubscription, cancelPreapproval } from '@/lib/mercadopagoBilling';
import { releasePreapproval, releaseLogLine } from '@/lib/preapprovalRelease';
import { isPlanId } from '@/lib/plans';

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

  // 2.a Bajadas de plan programadas: al llegar el próximo cobro el cliente pasa al plan más bajo (el monto en MP
  // ya se fijó cuando pidió el cambio). Va antes del cobro del cron para que este use el plan nuevo.
  const { data: pendingRows, error: pendingError } = await supabase
    .from('restaurants')
    .select('id, pending_plan')
    .not('pending_plan', 'is', null)
    .lte('pending_plan_from', now);
  if (pendingError) {
    console.error('Cron charge — error leyendo planes pendientes:', pendingError);
  }
  let planChangesApplied = 0;
  for (const row of pendingRows ?? []) {
    if (!isPlanId(row.pending_plan)) continue;
    const { error: applyError } = await supabase
      .from('restaurants')
      .update({ subscription_plan: row.pending_plan, pending_plan: null, pending_plan_from: null })
      .eq('id', row.id);
    if (applyError) console.error(`[cron/charge] no se pudo aplicar el plan pendiente de ${row.id}:`, applyError);
    else planChangesApplied++;
  }

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
      const nextPayment = new Date();
      nextPayment.setDate(nextPayment.getDate() + 30);

      // El cobro ya está aprobado (no se repite). El id solo se borra si MP confirma
      // que el preapproval quedó cancelado; si no, se conserva la referencia.
      const release = await releasePreapproval(restaurant.mp_preapproval_id, cancelPreapproval);
      if (release.code === 'CANCEL_FAILED') {
        console.error(releaseLogLine('[cron/charge]', release, restaurant.id));
      }

      const update: Record<string, any> = {
        subscription_status: 'active',
        next_payment_date:   nextPayment.toISOString(),
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
        .update({ subscription_status: 'paused' })
        .eq('id', restaurant.id);

      failed++;
    }
  }

  // 4. Resumen
  const summary = {
    success:   true,
    processed: rows.length,
    charged,
    failed,
    skipped,
    planChangesApplied,
  };
  console.log('[cron/charge] Resumen:', summary);
  return NextResponse.json(summary);
}
