// Reglas del cambio de plan con suscripción activa en Mercado Pago (sin red ni base: se prueban en
// scripts/check-plan-change.mjs).
//
//  - Subir de plan: se cobra la diferencia proporcional a los días que faltan del ciclo; si faltan menos de
//    PRORATE_MIN_DAYS días no se cobra nada y el plan nuevo se paga desde el próximo cobro.
//  - Bajar de plan: sin reembolso; el cliente conserva el plan que pagó hasta el próximo cobro y ahí pasa al más bajo.

// Con menos días que estos para el próximo cobro, subir de plan no cobra diferencia
export const PRORATE_MIN_DAYS = 5;

// Base del prorrateo: un ciclo de 30 días
export const PRORATE_CYCLE_DAYS = 30;

export type PlanChangeKind = 'upgrade' | 'downgrade' | 'same';

// Compara lo que paga hoy (monto del preapproval) con el precio del plan elegido
export function planChangeKind(currentPrice: number, newPrice: number): PlanChangeKind {
  if (newPrice > currentPrice) return 'upgrade';
  if (newPrice < currentPrice) return 'downgrade';
  return 'same';
}

// Diferencia a cobrar ahora al subir de plan. 0 si no es subida o si faltan menos de PRORATE_MIN_DAYS días.
export function prorateAmount(daysRemaining: number, currentPrice: number, newPrice: number): number {
  if (planChangeKind(currentPrice, newPrice) !== 'upgrade') return 0;
  if (!Number.isFinite(daysRemaining) || daysRemaining < PRORATE_MIN_DAYS) return 0;
  const days = Math.min(daysRemaining, PRORATE_CYCLE_DAYS);
  return Math.round((days / PRORATE_CYCLE_DAYS) * (newPrice - currentPrice));
}
