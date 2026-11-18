// Gracia por cobro fallido: cuando se rechaza un cobro, el local pasa a 'paused' pero el menú y el panel siguen
// funcionando PAYMENT_GRACE_DAYS días para que el dueño actualice la tarjeta. Es un campo APARTE de
// grace_period_until (que es el fin del período pagado tras cancelar y oculta los botones de tarjeta): acá los botones
// de tarjeta tienen que seguir visibles. Solo cuenta mientras el estado sea 'paused'.

export const PAYMENT_GRACE_DAYS = 3;

export function paymentGraceUntil(now: Date): string {
  return new Date(now.getTime() + PAYMENT_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function inPaymentGrace(
  r: { subscription_status?: string | null; payment_grace_until?: string | Date | null } | null | undefined,
  now: Date,
): boolean {
  if (!r || r.subscription_status !== 'paused' || !r.payment_grace_until) return false;
  const t = new Date(r.payment_grace_until).getTime();
  return Number.isFinite(t) && t > now.getTime();
}
