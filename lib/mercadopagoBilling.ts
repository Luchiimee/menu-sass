import crypto from 'crypto';

const MP_BASE = 'https://api.mercadopago.com';

const mpHeaders = (idempotencyKey?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
  ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
});

export const PLAN_PRICES: Record<string, number> = {
  light: 15000,
  go:    22000,
  plus:  35000,
};

export function getPlanAmount(plan: string | null | undefined): number {
  return PLAN_PRICES[plan ?? ''] ?? 22000;
}

export type ChargeResult =
  | { outcome: 'approved'; paymentId: string }
  | { outcome: 'rejected'; detail: string }
  | { outcome: 'error'; detail: string };

// Traduce el status_detail de Mercado Pago a un mensaje claro y accionable
// para mostrarle al usuario. La clave es que sepa QUÉ hacer.
const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_call_for_authorize:
    'Tu banco no autorizó el pago automático. Comunicate con tu banco para autorizarlo, o probá con otra tarjeta.',
  cc_rejected_insufficient_amount:
    'La tarjeta no tiene fondos suficientes. Probá con otra tarjeta.',
  cc_rejected_bad_filled_security_code:
    'El código de seguridad (CVV) es incorrecto. Revisalo e intentá de nuevo.',
  cc_rejected_bad_filled_date:
    'La fecha de vencimiento es incorrecta. Revisala e intentá de nuevo.',
  cc_rejected_bad_filled_other:
    'Hay un dato de la tarjeta mal cargado. Revisá los datos e intentá de nuevo.',
  cc_rejected_high_risk:
    'Mercado Pago rechazó el pago por seguridad. Probá con otra tarjeta o medio de pago.',
  cc_rejected_card_disabled:
    'La tarjeta está inhabilitada para compras online. Llamá a tu banco para activarla o usá otra.',
  cc_rejected_blacklist:
    'La tarjeta no fue aceptada. Probá con otra tarjeta.',
  cc_rejected_max_attempts:
    'Superaste el límite de intentos. Esperá un momento o probá con otra tarjeta.',
  cc_rejected_duplicated_payment:
    'Ya hay un pago igual en proceso. Esperá unos minutos antes de reintentar.',
  cc_rejected_other_reason:
    'El banco rechazó el pago. Probá con otra tarjeta o comunicate con tu banco.',
};

export function friendlyChargeError(detail: string | null | undefined): string {
  if (!detail) return 'No se pudo procesar el pago. Probá con otra tarjeta.';
  return REJECTION_MESSAGES[detail]
    ?? 'El pago fue rechazado por el banco. Probá con otra tarjeta o comunicate con tu banco.';
}

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
