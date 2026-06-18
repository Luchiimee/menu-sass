import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MP_BASE = 'https://api.mercadopago.com';

const mpHeaders = (idempotencyKey?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
  ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
});

const PLAN_PRICES: Record<string, number> = {
  light: 15000,
  go:    22000,
  plus:  35000,
};

function getAmount(plan: string | null): number {
  return PLAN_PRICES[plan ?? ''] ?? 22000;
}

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
      'id, name, owner_email, subscription_plan, subscription_status, mp_customer_id, mp_card_id, card_last_four, card_brand, trial_ends_at, next_payment_date, grace_period_until'
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

    try {
      const monto = getAmount(restaurant.subscription_plan);
      console.log(`[cron/charge] Cobrando ${restaurant.name}: $${monto}`);

      // c. Crear card token desde la tarjeta guardada
      const tokenRes = await fetch(`${MP_BASE}/v1/card_tokens`, {
        method: 'POST',
        headers: mpHeaders(crypto.randomUUID()),
        body: JSON.stringify({
          customer_id: restaurant.mp_customer_id,
          card_id:     restaurant.mp_card_id,
        }),
      });
      const cardToken = await tokenRes.json();

      if (!tokenRes.ok || !cardToken.id) {
        throw new Error(`Error creando card token: ${cardToken.message ?? JSON.stringify(cardToken)}`);
      }

      // d. Cobrar con /v1/payments
      const paymentRes = await fetch(`${MP_BASE}/v1/payments`, {
        method: 'POST',
        headers: mpHeaders(crypto.randomUUID()),
        body: JSON.stringify({
          transaction_amount: monto,
          token:              cardToken.id,
          description:        `Snappy - Plan ${restaurant.subscription_plan} - ${restaurant.name}`,
          installments:       1,
          payment_method_id:  restaurant.card_brand,
          payer: {
            email: restaurant.owner_email,
            type:  'customer',
            id:    restaurant.mp_customer_id,
          },
        }),
      });
      const payment = await paymentRes.json();

      // e. Pago aprobado
      if (paymentRes.ok && payment.status === 'approved') {
        const nextPayment = new Date();
        nextPayment.setDate(nextPayment.getDate() + 30);

        await supabase
          .from('restaurants')
          .update({
            subscription_status: 'active',
            next_payment_date:   nextPayment.toISOString(),
            mp_preapproval_id:   null,
          })
          .eq('id', restaurant.id);

        console.log(`[cron/charge] ✅ ${restaurant.name}: pago aprobado (payment_id=${payment.id})`);
        charged++;
      } else {
        // f. Pago fallido
        throw new Error(
          `Pago rechazado: status=${payment.status} status_detail=${payment.status_detail}`
        );
      }
    } catch (err: any) {
      console.error(`[cron/charge] ❌ ${restaurant.name}: ${err.message}`);

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
  };
  console.log('[cron/charge] Resumen:', summary);
  return NextResponse.json(summary);
}
