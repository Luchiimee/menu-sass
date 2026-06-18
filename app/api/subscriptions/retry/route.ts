import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';
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

export async function POST() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const userId = sessionUser.id;

    // 1. Obtener datos necesarios del restaurant
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('mp_customer_id, mp_card_id, card_brand, subscription_plan, owner_email')
      .eq('user_id', userId)
      .maybeSingle();

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    if (!restaurant.mp_card_id || !restaurant.mp_customer_id) {
      return NextResponse.json(
        { error: 'No hay tarjeta guardada. Agregá un método de pago primero.' },
        { status: 400 }
      );
    }

    const amount = PLAN_PRICES[restaurant.subscription_plan ?? ''] ?? 22000;

    // 2. Crear card token desde la tarjeta guardada
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
      console.error('retry — error creando card token:', JSON.stringify(cardToken, null, 2));
      return NextResponse.json(
        { error: 'No se pudo generar el token de la tarjeta. Intentá de nuevo.' },
        { status: 502 }
      );
    }

    // 3. Cobrar con /v1/payments
    const paymentRes = await fetch(`${MP_BASE}/v1/payments`, {
      method: 'POST',
      headers: mpHeaders(crypto.randomUUID()),
      body: JSON.stringify({
        transaction_amount: amount,
        token:              cardToken.id,
        description:        `Snappy - Reintento cobro plan ${restaurant.subscription_plan}`,
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

    // 4. Si approved: activar y setear próximo cobro
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
        .eq('user_id', userId);

      return NextResponse.json({ success: true, reactivated: true });
    }

    // 5. Pago fallido: informar al frontend con detalle
    console.error('retry — pago rechazado:', JSON.stringify(payment, null, 2));
    return NextResponse.json({
      success: false,
      error:   payment.status_detail ?? payment.message ?? 'El pago fue rechazado',
    });

  } catch (err: any) {
    console.error('SERVER ERROR (retry):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
