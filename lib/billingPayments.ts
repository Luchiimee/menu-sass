// Historial de facturación: cada cobro de la suscripción se anota en public.billing_payments (docs/sql/38).
// Lógica pura + un guardado "best-effort": anotar un cobro NUNCA puede romper ni demorar el cobro ni el webhook.
// Sin imports con alias, para probarlo sin red (scripts/check-billing-payments.mjs).

// Estados de Mercado Pago que se anotan. 'pending', 'in_process' y 'authorized' todavía no son un cobro.
export const RECORDED_STATUSES = ['approved', 'rejected', 'cancelled', 'refunded', 'charged_back'] as const;
export type RecordedStatus = (typeof RECORDED_STATUSES)[number];

export type BillingPaymentRow = {
  restaurant_id: string;
  mp_payment_id: string;
  amount: number | null;
  currency: string;
  status: RecordedStatus;
  status_detail: string | null;
  plan: string | null;
  source: 'webhook' | 'cron';
  paid_at: string;
};

export function isRecordedStatus(s: unknown): s is RecordedStatus {
  return typeof s === 'string' && (RECORDED_STATUSES as readonly string[]).includes(s);
}

// "Snappy - Plan GO - Mi local" / "Snappy - Plan LIGHT" → 'go' / 'light'. null si no aparece un plan.
export function planFromDescription(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const m = text.match(/\bPlan\s+([A-Za-z]+)/i);
  return m ? m[1].toLowerCase() : null;
}

function isoOrNow(v: unknown, now: Date): string {
  if (typeof v === 'string' || v instanceof Date) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return now.toISOString();
}

// Arma la fila desde el pago que devuelve Mercado Pago (GET /v1/payments/:id). null si el pago no se anota.
export function rowFromMpPayment(
  payment: any,
  restaurant: { id: string; subscription_plan?: string | null },
  now: Date,
): BillingPaymentRow | null {
  if (!payment || payment.id === undefined || payment.id === null || !isRecordedStatus(payment.status)) return null;
  const amount = Number(payment.transaction_amount);
  return {
    restaurant_id: restaurant.id,
    mp_payment_id: String(payment.id),
    amount: Number.isFinite(amount) ? amount : null,
    currency: typeof payment.currency_id === 'string' && payment.currency_id ? payment.currency_id : 'ARS',
    status: payment.status,
    status_detail: payment.status_detail ? String(payment.status_detail).slice(0, 200) : null,
    plan: planFromDescription(payment.description) ?? planFromDescription(payment.metadata?.reason) ?? restaurant.subscription_plan ?? null,
    source: 'webhook',
    paid_at: isoOrNow(payment.date_approved ?? payment.date_created, now),
  };
}

// Fila de un cobro aprobado por el cron (todavía sin el detalle que después confirma el webhook).
export function rowFromCronCharge(
  o: { restaurantId: string; paymentId: string | number; plan: string | null; amount: number | null },
  now: Date,
): BillingPaymentRow {
  return {
    restaurant_id: o.restaurantId,
    mp_payment_id: String(o.paymentId),
    amount: o.amount !== null && Number.isFinite(o.amount) ? o.amount : null,
    currency: 'ARS',
    status: 'approved',
    status_detail: null,
    plan: o.plan,
    source: 'cron',
    paid_at: now.toISOString(),
  };
}

// Aviso 'subscription_authorized_payment' de Mercado Pago: es el cobro de una suscripción (preapproval): el primero al
// suscribirse o reactivar, y los mensuales. GET /authorized_payments/:id trae el pago real adentro (payment.id) y a
// qué suscripción pertenece. null si todavía no hay pago asociado (cobro programado, aún sin intentar).
export function subscriptionPaymentTarget(
  authorizedPayment: any,
): { paymentId: string; preapprovalId: string | null; externalReference: string | null } | null {
  const id = authorizedPayment?.payment?.id;
  if (id === undefined || id === null || String(id).trim() === '') return null;
  const pre = authorizedPayment?.preapproval_id;
  const ref = authorizedPayment?.external_reference;
  return {
    paymentId: String(id),
    preapprovalId: typeof pre === 'string' && pre.trim() !== '' ? pre : null,
    externalReference: typeof ref === 'string' && ref.trim() !== '' ? ref : null,
  };
}

// Guarda (o actualiza si Mercado Pago avisa dos veces del mismo pago). Nunca lanza: devuelve true/false y un log corto.
export async function saveBillingPayment(
  client: { from: (table: string) => any },
  row: BillingPaymentRow | null,
  log: (line: string) => void = console.error,
): Promise<boolean> {
  if (!row) return false;
  try {
    const { error } = await client.from('billing_payments').upsert(row, { onConflict: 'mp_payment_id' });
    if (error) {
      log(`[billing-payments] code=SAVE_FAILED restaurant=${row.restaurant_id}`);
      return false;
    }
    return true;
  } catch {
    try { log(`[billing-payments] code=SAVE_EXCEPTION restaurant=${row.restaurant_id}`); } catch { /* un log que falla no rompe nada */ }
    return false;
  }
}
