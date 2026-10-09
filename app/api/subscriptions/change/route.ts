import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';
import { PLAN_PRICES as prices, isPlanId, type PlanId } from '@/lib/plans';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MP_BASE = 'https://api.mercadopago.com';
const mpHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
});

// GET del preapproval en MP. Devuelve null si la llamada falla.
async function fetchPreapproval(preapprovalId: string): Promise<any | null> {
  try {
    const res = await fetch(`${MP_BASE}/preapproval/${preapprovalId}`, { headers: mpHeaders() });
    if (!res.ok) {
      console.error(`change — GET preapproval ${preapprovalId} falló: http=${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err: any) {
    console.error(`change — GET preapproval ${preapprovalId} falló:`, err?.message);
    return null;
  }
}

// Monto que el cliente paga HOY: el que está fijado en su preapproval de MP
// (puede ser un precio viejo). Si no se pudo leer, el precio de lista del plan actual.
function currentAmountFrom(preapprovalData: any | null, currentPlan: PlanId): number {
  const amount = Number(preapprovalData?.auto_recurring?.transaction_amount);
  return Number.isFinite(amount) && amount > 0 ? amount : prices[currentPlan];
}

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const userId = sessionUser.id;

    const { searchParams } = new URL(req.url);
    const plan = searchParams.get('plan');

    if (!isPlanId(plan)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('mp_preapproval_id, subscription_plan')
      .eq('user_id', userId)
      .maybeSingle();

    const currentPlan = restaurant?.subscription_plan;
    if (!restaurant?.mp_preapproval_id || !isPlanId(currentPlan)) {
      return NextResponse.json({ proratedAmount: 0, daysRemaining: 0 });
    }

    const preapprovalData = await fetchPreapproval(restaurant.mp_preapproval_id);
    const currentPrice = currentAmountFrom(preapprovalData, currentPlan);
    const newPrice = prices[plan];
    const isUpgrade = newPrice > currentPrice;

    const dateCreated = new Date(preapprovalData?.date_created || new Date());
    const today = new Date();
    const renewalDay = dateCreated.getDate();
    const nextRenewal = new Date(today.getFullYear(), today.getMonth(), renewalDay);
    if (nextRenewal <= today) nextRenewal.setMonth(nextRenewal.getMonth() + 1);

    const daysRemaining = Math.max(1, Math.ceil((nextRenewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const proratedAmount = Math.round((daysRemaining / 30) * (newPrice - currentPrice));

    return NextResponse.json({ proratedAmount: Math.max(0, proratedAmount), daysRemaining, isUpgrade, currentPrice, newPrice });
  } catch {
    return NextResponse.json({ proratedAmount: 0, daysRemaining: 0 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const userId = sessionUser.id;

    const { plan, email } = await req.json();

    if (!isPlanId(plan)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('mp_preapproval_id, subscription_status, subscription_plan')
      .eq('user_id', userId)
      .maybeSingle();

    const preapprovalId = restaurant?.mp_preapproval_id;
    const currentPlan = restaurant?.subscription_plan;
    const status = restaurant?.subscription_status;
    const hasActiveSub = preapprovalId && (status === 'active' || status === 'authorized');

    let proratedAmount = 0;
    let daysRemaining = 0;
    let prorateCharged = false;
    let isUpgrade = false;

    if (hasActiveSub && isPlanId(currentPlan)) {
      // Obtener detalles del preapproval: monto que paga hoy y ciclo
      const preapprovalData = await fetchPreapproval(preapprovalId);
      const currentPrice = currentAmountFrom(preapprovalData, currentPlan);
      const newPrice = prices[plan];
      isUpgrade = newPrice > currentPrice;

      // Calcular próxima fecha de renovación basada en la fecha de creación
      const dateCreated = new Date(preapprovalData?.date_created || new Date());
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

                const paymentData = await paymentRes.json();
                // Solo consideramos cobrado si MP lo aprobó
                if (paymentRes.ok && paymentData.status === 'approved') {
                  prorateCharged = true;
                } else {
                  console.error('MP proration payment error:', paymentData);
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

    return NextResponse.json({ success: true, proratedAmount, daysRemaining, prorateCharged, isUpgrade });
  } catch (err: any) {
    console.error('SERVER ERROR (change):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
