import crypto from 'crypto';
import { getPlanAmount } from '@/lib/plans';

const MP_BASE = 'https://api.mercadopago.com';

const mpHeaders = (idempotencyKey?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
  ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
});

export type ChargeResult =
  | { outcome: 'approved'; paymentId: string }
  | { outcome: 'rejected'; detail: string }
  | { outcome: 'error'; detail: string };

export { friendlyChargeError } from '@/lib/chargeErrors';

interface ChargeSubscriptionParams {
  customerId: string;
  cardId: string;
  cardBrand: string | null;
  plan: string | null;
  payerEmail: string;
  description: string;
}

// Cobra un plan sobre una tarjeta ya guardada en el customer de Mercado Pago.
// No toca la base de datos — el caller decide qué actualizar según el outcome.
export async function chargeSubscription({
  customerId,
  cardId,
  cardBrand,
  plan,
  payerEmail,
  description,
}: ChargeSubscriptionParams): Promise<ChargeResult> {
  // 1. Crear card token desde la tarjeta guardada
  let cardToken: any;
  try {
    const tokenRes = await fetch(`${MP_BASE}/v1/card_tokens`, {
      method: 'POST',
      headers: mpHeaders(crypto.randomUUID()),
      body: JSON.stringify({
        customer_id: customerId,
        card_id:     cardId,
      }),
    });
    cardToken = await tokenRes.json();

    if (!tokenRes.ok || !cardToken.id) {
      return {
        outcome: 'error',
        detail: `Error creando card token: ${cardToken.message ?? JSON.stringify(cardToken)}`,
      };
    }
  } catch (err: any) {
    return { outcome: 'error', detail: err.message || 'Error de red creando el token de la tarjeta' };
  }

  // 1.b. Resolver payment_method_id de forma robusta.
  // Si viene vacío/nulo, lo tomamos del token (o de la tarjeta) para no mandar
  // un payment_method_id inválido que haría rechazar el pago.
  let paymentMethodId: string = cardBrand || cardToken.payment_method_id || '';
  if (!paymentMethodId) {
    try {
      const cardRes = await fetch(`${MP_BASE}/v1/customers/${customerId}/cards/${cardId}`, {
        headers: mpHeaders(),
      });
      const cardData = await cardRes.json();
      paymentMethodId = cardData?.payment_method?.id ?? '';
    } catch {
      // si falla, seguimos: MP puede inferirlo del token
    }
  }

  // 2. Cobrar con /v1/payments
  try {
    const paymentBody: Record<string, any> = {
      transaction_amount: getPlanAmount(plan),
      token:              cardToken.id,
      description,
      installments:       1,
      payer: {
        email: payerEmail,
        type:  'customer',
        id:    customerId,
      },
    };
    // Solo enviamos payment_method_id si lo pudimos resolver (si no, MP lo infiere del token)
    if (paymentMethodId) paymentBody.payment_method_id = paymentMethodId;

    const paymentRes = await fetch(`${MP_BASE}/v1/payments`, {
      method: 'POST',
      headers: mpHeaders(crypto.randomUUID()),
      body: JSON.stringify(paymentBody),
    });
    const payment = await paymentRes.json();

    if (paymentRes.ok && payment.status === 'approved') {
      return { outcome: 'approved', paymentId: payment.id };
    }

    return {
      outcome: 'rejected',
      detail: payment.status_detail ?? payment.message ?? `Pago rechazado: status=${payment.status}`,
    };
  } catch (err: any) {
    return { outcome: 'error', detail: err.message || 'Error de red al procesar el pago' };
  }
}

export type SubscriptionResult =
  | { outcome: 'approved'; preapprovalId: string }
  | { outcome: 'rejected'; detail: string }
  | { outcome: 'error'; detail: string };

interface CreateSubscriptionParams {
  cardTokenId: string;
  plan: string | null;
  payerEmail: string;
  userId: string;
}

// Crea una SUSCRIPCIÓN (preapproval) autorizada usando el token de tarjeta que
// generó el navegador (que SÍ incluye el CVV). MP exige el CVV para autorizar,
// por eso NO sirve un token regenerado desde la tarjeta guardada. Con el token
// correcto, MP autoriza, cobra el primer mes y maneja los cobros mensuales
// siguientes por su cuenta (sin CVV, sin cron, sin "call_for_authorize").
export async function createSubscription({
  cardTokenId,
  plan,
  payerEmail,
  userId,
}: CreateSubscriptionParams): Promise<SubscriptionResult> {
  try {
    const res = await fetch(`${MP_BASE}/preapproval`, {
      method: 'POST',
      headers: mpHeaders(crypto.randomUUID()),
      body: JSON.stringify({
        reason: `Snappy - Plan ${(plan ?? '').toUpperCase()}`,
        payer_email: payerEmail,
        external_reference: userId,
        back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/plan`,
        card_token_id: cardTokenId,
        status: 'authorized',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: getPlanAmount(plan),
          currency_id: 'ARS',
        },
      }),
    });
    const data = await res.json();

    // status 'authorized' = tarjeta autorizada y primer cobro OK
    if (res.ok && data.status === 'authorized') {
      return { outcome: 'approved', preapprovalId: data.id };
    }

    // Cualquier otro estado/errores → no quedó activa
    return {
      outcome: 'rejected',
      detail: data.message ?? data.status_detail ?? `Suscripción no autorizada: status=${data.status}`,
    };
  } catch (err: any) {
    return { outcome: 'error', detail: err.message || 'Error de red al crear la suscripción' };
  }
}

export type DeleteCardsResult =
  | { ok: true; deleted: number }
  | { ok: false; deleted: number; detail: string };

// Borra TODAS las tarjetas guardadas del cliente en Mercado Pago (al cancelar la suscripción).
// Mismo criterio que save-card al reemplazar una tarjeta (GET /cards + DELETE /cards/{id}).
// ok solo si no quedó ninguna sin borrar; el caller no debe bloquear la cancelación si falla.
export async function deleteCustomerCards(customerId: string): Promise<DeleteCardsResult> {
  let deleted = 0;
  try {
    const listRes = await fetch(`${MP_BASE}/v1/customers/${encodeURIComponent(customerId)}/cards`, { headers: mpHeaders() });
    const cards = await listRes.json().catch(() => null);
    if (!listRes.ok || !Array.isArray(cards)) {
      return { ok: false, deleted, detail: `no se pudo listar las tarjetas: http=${listRes.status}` };
    }
    let failed = 0;
    for (const c of cards) {
      if (!c?.id) continue;
      const del = await fetch(
        `${MP_BASE}/v1/customers/${encodeURIComponent(customerId)}/cards/${encodeURIComponent(String(c.id))}`,
        { method: 'DELETE', headers: mpHeaders() },
      );
      if (del.ok || del.status === 404) deleted++; else failed++;
    }
    return failed === 0 ? { ok: true, deleted } : { ok: false, deleted, detail: `${failed} tarjeta(s) sin borrar` };
  } catch (err: any) {
    return { ok: false, deleted, detail: err.message || 'Error de red al borrar las tarjetas' };
  }
}

export type CancelPreapprovalResult =
  | { ok: true }
  | { ok: false; detail: string };

// Cancela un preapproval (suscripción) en Mercado Pago. Solo devuelve ok si MP
// confirma que quedó cancelado: el caller NO debe borrar mp_preapproval_id de la
// base si esto falla, para no perder la referencia y que MP siga cobrando.
// Si ya estaba cancelado (p. ej. un reintento), también se considera ok.
export async function cancelPreapproval(preapprovalId: string): Promise<CancelPreapprovalResult> {
  try {
    const res = await fetch(`${MP_BASE}/preapproval/${encodeURIComponent(preapprovalId)}`, {
      method: 'PUT',
      headers: mpHeaders(crypto.randomUUID()),
      body: JSON.stringify({ status: 'cancelled' }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.status === 'cancelled') return { ok: true };

    // MP rechaza el PUT si el preapproval ya estaba cancelado: lo verificamos con un GET.
    const checkRes = await fetch(`${MP_BASE}/preapproval/${encodeURIComponent(preapprovalId)}`, {
      headers: mpHeaders(),
    });
    const check = await checkRes.json().catch(() => ({}));
    if (checkRes.ok && check.status === 'cancelled') return { ok: true };

    return {
      ok: false,
      detail: data.message ?? `MP no confirmó la cancelación: http=${res.status} status=${data.status}`,
    };
  } catch (err: any) {
    return { ok: false, detail: err.message || 'Error de red al cancelar la suscripción' };
  }
}

export type GetPreapprovalResult =
  | { ok: true; data: any }
  | { ok: false; detail: string };

// GET de un preapproval en MP (solo lectura).
export async function getPreapproval(preapprovalId: string): Promise<GetPreapprovalResult> {
  try {
    const res = await fetch(`${MP_BASE}/preapproval/${encodeURIComponent(preapprovalId)}`, {
      headers: mpHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, detail: data.message ?? `http=${res.status}` };
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, detail: err.message || 'Error de red al consultar la suscripción' };
  }
}
