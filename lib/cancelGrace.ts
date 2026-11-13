// Cancelar la suscripción mantiene el servicio hasta el fin del período ya pagado. Lógica pura, sin red ni imports
// con alias (@/) para probarla con scripts/check-cancel-grace.mjs. La usa lib/cancelSubscription.ts.
//
// El fin del período es el próximo cobro (next_payment_date del preapproval en MP). Se guarda en grace_period_until
// con subscription_status = 'cancelled': los controles de acceso ya tratan una gracia futura como "no bloquear"
// (dashboard/layout, lib/publicMenu, lib/planAccess) y, al vencer, el estado 'cancelled' vuelve a bloquear solo.

// Tope por seguridad: un next_payment_date más lejano que esto no es un período mensual y no se respeta.
export const MAX_GRACE_DAYS = 62;
const DAY_MS = 24 * 60 * 60 * 1000;

function toTime(value: unknown): number | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const t = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

// graceUntil solo si la fecha es válida, futura y a no más de MAX_GRACE_DAYS días; si no, null (corte inmediato).
export function computeCancelGrace(nextPaymentDate: unknown, now: Date): { graceUntil: string | null } {
  const t = toTime(nextPaymentDate);
  if (t === null) return { graceUntil: null };
  const delta = t - now.getTime();
  if (delta <= 0 || delta > MAX_GRACE_DAYS * DAY_MS) return { graceUntil: null };
  return { graceUntil: new Date(t).toISOString() };
}

// Fecha hasta la que queda activo el servicio tras cancelar: nunca acorta una gracia futura que el local ya tenía
// (por ejemplo la de la migración). Sin gracia nueva ni vigente → null (corte inmediato, como antes).
export function resolveServiceUntil(graceUntil: string | null, existingGrace: unknown, now: Date): string | null {
  const existing = toTime(existingGrace);
  const existingFuture = existing !== null && existing > now.getTime() ? existing : null;
  const nuevo = graceUntil === null ? null : toTime(graceUntil);
  if (nuevo === null && existingFuture === null) return null;
  return new Date(Math.max(nuevo ?? 0, existingFuture ?? 0)).toISOString();
}
