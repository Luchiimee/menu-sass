import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';
import { PLAN_PRICES as prices, isPlanId, type PlanId } from '@/lib/plans';
import { changePlanGate } from '@/lib/planChoice';
import { chargeSubscription, friendlyChargeError, refundPayment } from '@/lib/mercadopagoBilling';
import { planChangeKind, prorateAmount, PRORATE_MIN_DAYS } from '@/lib/planChange';

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

// Próximo cobro del ciclo actual. Usa next_payment_date del preapproval (la
// fecha real de MP); si no está, la estima por el día de alta (acotado al último
// día del mes para no desbordar, p. ej. día 31 en un mes de 30).
function nextRenewalFrom(preapprovalData: any | null, today: Date): Date {
  const mpNext = preapprovalData?.next_payment_date ? new Date(preapprovalData.next_payment_date) : null;
  if (mpNext && !isNaN(mpNext.getTime()) && mpNext > today) return mpNext;

  const created = new Date(preapprovalData?.date_created || today);
  const dayIn = (y: number, m: number) => Math.min(created.getDate(), new Date(y, m + 1, 0).getDate());
  let renewal = new Date(today.getFullYear(), today.getMonth(), dayIn(today.getFullYear(), today.getMonth()));
  if (renewal <= today) {
    const y = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
    const m = (today.getMonth() + 1) % 12;
    renewal = new Date(y, m, dayIn(y, m));
  }
  return renewal;
}

function daysUntil(date: Date, today: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

// Tarjeta guardada con la que se cobra la diferencia: la de la base; si falta, la primera del customer de MP
// (buscado por el email de la base, nunca por uno que mande el navegador).
async function resolveSavedCard(
  restaurant: { mp_customer_id?: string | null; mp_card_id?: string | null; card_brand?: string | null },
  email: string
): Promise<{ customerId: string; cardId: string; cardBrand: string | null } | null> {
  if (restaurant.mp_customer_id && restaurant.mp_card_id) {
    return { customerId: restaurant.mp_customer_id, cardId: restaurant.mp_card_id, cardBrand: restaurant.card_brand ?? null };
  }
  try {
    const customerRes = await fetch(`${MP_BASE}/v1/customers/search?email=${encodeURIComponent(email)}`, { headers: mpHeaders() });
    const customerId = (await customerRes.json())?.results?.[0]?.id;
    if (!customerId) return null;
    const cardsRes = await fetch(`${MP_BASE}/v1/customers/${customerId}/cards`, { headers: mpHeaders() });
    const cards = await cardsRes.json();
    const card = Array.isArray(cards) ? cards[0] : null;
    if (!card?.id) return null;
    return { customerId, cardId: card.id, cardBrand: card.payment_method?.id ?? card.payment_method_id ?? null };
  } catch {
    return null;
  }
}

async function putPreapprovalAmount(preapprovalId: string, amount: number): Promise<boolean> {
  try {
    const res = await fetch(`${MP_BASE}/preapproval/${preapprovalId}`, {
      method: 'PUT',
      headers: mpHeaders(),
      body: JSON.stringify({ auto_recurring: { transaction_amount: amount } }),
    });
    if (!res.ok) {
      console.error(`change — PUT monto preapproval ${preapprovalId} falló: http=${res.status}`, await res.json().catch(() => ({})));
    }
    return res.ok;
  } catch (err: any) {
    console.error(`change — PUT monto preapproval ${preapprovalId} falló:`, err?.message);
    return false;
  }
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
    const kind = planChangeKind(currentPrice, newPrice);

    const today = new Date();
    const renewal = nextRenewalFrom(preapprovalData, today);
    const daysRemaining = daysUntil(renewal, today);
    const proratedAmount = prorateAmount(daysRemaining, currentPrice, newPrice);

    return NextResponse.json({
      proratedAmount,
      daysRemaining,
      isUpgrade: kind === 'upgrade',
      kind,
      currentPrice,
      newPrice,
      effectiveFrom: renewal.toISOString(),
    });
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

    const { plan } = await req.json();

    if (!isPlanId(plan)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, mp_preapproval_id, subscription_status, subscription_plan, owner_email, mp_customer_id, mp_card_id, card_brand, pending_plan')
      .eq('user_id', userId)
      .maybeSingle();

    // El email para buscar la tarjeta a cobrar sale de la base, NO del body:
    // si viniera del cliente, se podría cobrar el prorrateo a la tarjeta de otro.
    const email: string | undefined = restaurant?.owner_email || sessionUser.email || undefined;

    const preapprovalId = restaurant?.mp_preapproval_id;
    const currentPlan = restaurant?.subscription_plan;
    const status = restaurant?.subscription_status;
    const hasActiveSub = preapprovalId && (status === 'active' || status === 'authorized');

    // Puerta de la rama SIN suscripción activa (la que solo escribe subscription_plan): con paused,
    // cancelled o active sin preapproval el cambio pasa por el flujo de cobro. Con suscripción activa
    // la puerta devuelve ok y sigue el cobro/prorrateo de abajo sin cambios.
    const gate = changePlanGate(restaurant, plan);
    if (!gate.ok) {
      console.warn(`[change] code=${gate.code} restaurant=${restaurant?.id ?? 'sin-local'}`);
      if (gate.status === 400) {
        return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
      }
      return NextResponse.json(
        {
          success: false,
          code: gate.code,
          message: 'Con tu suscripción en este estado el cambio de plan se hace desde el flujo de pago. Configurá tu método de pago desde "Mi plan".',
        },
        { status: gate.status }
      );
    }

    let proratedAmount = 0;
    let daysRemaining = 0;
    let prorateCharged = false;
    let isUpgrade = false;

    if (hasActiveSub && isPlanId(currentPlan)) {
      // Con una bajada ya programada no se acepta otro cambio hasta que se aplique
      if (restaurant?.pending_plan) {
        return NextResponse.json(
          {
            success: false,
            code: 'cambio_pendiente',
            message: `Ya tenés un cambio al plan ${String(restaurant.pending_plan).toUpperCase()} programado para tu próximo cobro. Podés cambiar de plan después de esa fecha.`,
          },
          { status: 409 }
        );
      }

      // Monto que paga hoy y ciclo. Si MP no responde no se adivina: no se cambia nada.
      const preapprovalData = await fetchPreapproval(preapprovalId);
      if (!preapprovalData) {
        return NextResponse.json(
          { success: false, code: 'mp_no_responde', message: 'No pudimos consultar tu suscripción en Mercado Pago. Intentá de nuevo en unos minutos.' },
          { status: 502 }
        );
      }
      const currentPrice = currentAmountFrom(preapprovalData, currentPlan);
      const newPrice = prices[plan];
      const kind = planChangeKind(currentPrice, newPrice);
      isUpgrade = kind === 'upgrade';

      const today = new Date();
      const renewal = nextRenewalFrom(preapprovalData, today);
      daysRemaining = daysUntil(renewal, today);

      if (kind === 'same') {
        return NextResponse.json({ success: true, proratedAmount: 0, daysRemaining, prorateCharged: false, isUpgrade: false, kind });
      }

      // ── BAJAR: sin reembolso; conserva el plan hasta el próximo cobro y ahí pasa al más bajo ──
      if (kind === 'downgrade') {
        // El monto nuevo queda fijado en MP desde ya, así el próximo cobro es el del plan más bajo
        if (!(await putPreapprovalAmount(preapprovalId, newPrice))) {
          return NextResponse.json(
            { success: false, code: 'mp_no_actualizo', message: 'No pudimos actualizar tu suscripción en Mercado Pago. Intentá de nuevo en unos minutos.' },
            { status: 502 }
          );
        }
        const { error: pendingError } = await supabase
          .from('restaurants')
          .update({ pending_plan: plan, pending_plan_from: renewal.toISOString() })
          .eq('user_id', userId);
        if (pendingError) {
          console.error('change — no se pudo guardar el plan pendiente:', pendingError);
          await putPreapprovalAmount(preapprovalId, currentPrice); // deja el monto como estaba
          return NextResponse.json({ error: 'Error interno' }, { status: 500 });
        }
        return NextResponse.json({
          success: true, kind, isUpgrade: false, proratedAmount: 0, daysRemaining, prorateCharged: false,
          pendingPlan: plan, effectiveFrom: renewal.toISOString(),
        });
      }

      // ── SUBIR: diferencia proporcional; si no se aprueba, el plan NO cambia ──
      proratedAmount = prorateAmount(daysRemaining, currentPrice, newPrice);
      let chargedPaymentId: number | string | null = null;

      if (proratedAmount > 0) {
        const card = email ? await resolveSavedCard(restaurant!, email) : null;
        if (!card || !email) {
          return NextResponse.json(
            { success: false, code: 'sin_tarjeta', message: 'No encontramos una tarjeta guardada para cobrar la diferencia. Cargá una desde "Cambiar Tarjeta" y volvé a intentar.' },
            { status: 402 }
          );
        }
        const result = await chargeSubscription({
          customerId: card.customerId,
          cardId: card.cardId,
          cardBrand: card.cardBrand,
          plan,
          payerEmail: email,
          // El webhook de pagos ignora las descripciones que empiezan con "Prorrateo" (no son un cobro mensual)
          description: `Prorrateo Plan ${plan.toUpperCase()} - Snappy (${daysRemaining} días)`,
          amount: proratedAmount,
        });
        if (result.outcome !== 'approved') {
          console.error(`change — prorrateo ${result.outcome}:`, result.detail, `restaurant=${restaurant?.id}`);
          return NextResponse.json(
            {
              success: false,
              code: 'prorrateo_rechazado',
              message: result.outcome === 'rejected'
                ? `No pudimos cobrar la diferencia de $${proratedAmount.toLocaleString('es-AR')}. ${friendlyChargeError(result.detail)} Tu plan sigue igual.`
                : 'No pudimos procesar el cobro de la diferencia. Tu plan sigue igual; intentá de nuevo en unos minutos.',
            },
            { status: result.outcome === 'rejected' ? 402 : 502 }
          );
        }
        chargedPaymentId = result.paymentId;
        prorateCharged = true;
      }

      // Con la diferencia cobrada (o sin nada que cobrar) se fija el monto nuevo en MP
      if (!(await putPreapprovalAmount(preapprovalId, newPrice))) {
        if (chargedPaymentId !== null) {
          const refund = await refundPayment(chargedPaymentId);
          if (!refund.ok) {
            console.error(`change — CRÍTICO: se cobró el prorrateo ${chargedPaymentId} y no se pudo devolver:`, refund.detail, `restaurant=${restaurant?.id}`);
          }
        }
        return NextResponse.json(
          { success: false, code: 'mp_no_actualizo', message: 'No pudimos actualizar tu suscripción en Mercado Pago. Intentá de nuevo en unos minutos.' },
          { status: 502 }
        );
      }
    }

    // Actualizar Supabase
    await supabase.from('restaurants').update({ subscription_plan: plan }).eq('user_id', userId);

    return NextResponse.json({
      success: true, kind: isUpgrade ? 'upgrade' : 'set', proratedAmount, daysRemaining, prorateCharged, isUpgrade,
      minDaysForProrate: PRORATE_MIN_DAYS,
    });
  } catch (err: any) {
    console.error('SERVER ERROR (change):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
