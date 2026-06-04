import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prices: Record<string, number> = {
  light: 15000,
  go: 22000,
  plus: 35000,
};

const MP_BASE = 'https://api.mercadopago.com';
const mpHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const plan = searchParams.get('plan');

    if (!userId || !plan || !prices[plan]) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('mp_preapproval_id, subscription_plan')
      .eq('user_id', userId)
      .maybeSingle();

    const currentPlan = restaurant?.subscription_plan as string;
    if (!restaurant?.mp_preapproval_id || !currentPlan || !prices[currentPlan]) {
      return NextResponse.json({ proratedAmount: 0, daysRemaining: 0 });
    }

    const preapprovalRes = await fetch(
      `https://api.mercadopago.com/preapproval/${restaurant.mp_preapproval_id}`,
      { headers: mpHeaders() }
    );
    const preapprovalData = await preapprovalRes.json();

    const dateCreated = new Date(preapprovalData.date_created || new Date());
    const today = new Date();
    const renewalDay = dateCreated.getDate();
    const nextRenewal = new Date(today.getFullYear(), today.getMonth(), renewalDay);
    if (nextRenewal <= today) nextRenewal.setMonth(nextRenewal.getMonth() + 1);

    const daysRemaining = Math.max(1, Math.ceil((nextRenewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const proratedAmount = Math.round((daysRemaining / 30) * (prices[plan] - prices[currentPlan]));

    return NextResponse.json({ proratedAmount: Math.max(0, proratedAmount), daysRemaining });
  } catch {
    return NextResponse.json({ proratedAmount: 0, daysRemaining: 0 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, plan, email } = await req.json();

    if (!userId || !plan || !prices[plan]) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('mp_preapproval_id, subscription_status, subscription_plan')
      .eq('user_id', userId)
      .maybeSingle();

    const preapprovalId = restaurant?.mp_preapproval_id;
    const currentPlan = restaurant?.subscription_plan as string;
    const status = restaurant?.subscription_status;
    const hasActiveSub = preapprovalId && (status === 'active' || status === 'authorized');

    let proratedAmount = 0;
    let daysRemaining = 0;

    if (hasActiveSub && currentPlan && prices[currentPlan]) {
      const currentPrice = prices[currentPlan];
      const newPrice = prices[plan];
      const isUpgrade = newPrice > currentPrice;

      // Obtener detalles del preapproval para calcular el ciclo
      const preapprovalRes = await fetch(`${MP_BASE}/preapproval/${preapprovalId}`, { headers: mpHeaders() });
      const preapprovalData = await preapprovalRes.json();

      // Calcular próxima fecha de renovación basada en la fecha de creación
      const dateCreated = new Date(preapprovalData.date_created || new Date());
      const today = new Date();
      const renewalDay = dateCreated.getDate();

      const nextRenewal = new Date(today);
      nextRenewal.setDate(renewalDay);
      if (nextRenewal <= today) {
        nextRenewal.setMonth(nextRenewal.getMonth() + 1);
      }

      daysRemaining = Math.max(1, Math.ceil((nextRenewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

      // Cobrar diferencia proporcional solo si es un upgrade
      if (isUpgrade && email) {
        proratedAmount = Math.round((daysRemaining / 30) * (newPrice - currentPrice));

        if (proratedAmount > 0) {
          // Buscar cliente y tarjeta guardada
          const customerRes = await fetch(`${MP_BASE}/v1/customers/search?email=${encodeURIComponent(email)}`, { headers: mpHeaders() });
          const customerData = await customerRes.json();
          const customerId = customerData.results?.[0]?.id;

          if (customerId) {
            const cardsRes = await fetch(`${MP_BASE}/v1/customers/${customerId}/cards`, { headers: mpHeaders() });
            const cards = await cardsRes.json();
            const card = Array.isArray(cards) && cards[0];

            if (card) {
              // Crear token desde la tarjeta guardada (sin CVV para cobros recurrentes)
              const tokenRes = await fetch(`${MP_BASE}/v1/card_tokens`, {
                method: 'POST',
                headers: mpHeaders(),
                body: JSON.stringify({ card_id: card.id }),
              });
              const tokenData = await tokenRes.json();

              if (tokenRes.ok && tokenData.id) {
                const paymentRes = await fetch(`${MP_BASE}/v1/payments`, {
                  method: 'POST',
                  headers: mpHeaders(),
                  body: JSON.stringify({
                    transaction_amount: proratedAmount,
                    token: tokenData.id,
                    description: `Prorrateo Plan ${plan.toUpperCase()} - Snappy (${daysRemaining} días)`,
                    installments: 1,
                    payment_method_id: card.payment_method_id,
                    payer: { type: 'customer', id: customerId, email },
                  }),
                });

                if (!paymentRes.ok) {
                  const paymentErr = await paymentRes.json();
                  console.error('MP proration payment error:', paymentErr);
                  // No bloqueamos el cambio de plan si falla el prorrateo
                }
              }
            }
          }
        }
      }

      // Actualizar monto de la suscripción para el próximo ciclo
      await fetch(`${MP_BASE}/preapproval/${preapprovalId}`, {
        method: 'PUT',
        headers: mpHeaders(),
        body: JSON.stringify({ auto_recurring: { transaction_amount: newPrice } }),
      });
    }

    // Actualizar Supabase
    await supabase.from('restaurants').update({ subscription_plan: plan }).eq('user_id', userId);

    return NextResponse.json({ success: true, proratedAmount, daysRemaining });
  } catch (err: any) {
    console.error('SERVER ERROR (change):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
