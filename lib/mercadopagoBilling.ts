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

  // 2. Cobrar con /v1/payments
  try {
    const paymentRes = await fetch(`${MP_BASE}/v1/payments`, {
      method: 'POST',
      headers: mpHeaders(crypto.randomUUID()),
      body: JSON.stringify({
        transaction_amount: getPlanAmount(plan),
        token:              cardToken.id,
        description,
        installments:       1,
        payment_method_id:  cardBrand,
        payer: {
          email: payerEmail,
          type:  'customer',
          id:    customerId,
        },
      }),
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
