// Regla de acceso a "Turnos de entrega" (entrega programada). Fuente única para el checkout y el panel.
//
// El plan Light no incluye turnos: aunque el interruptor haya quedado activo en la base, se ignora.
// El admin (isAdmin) puede usarlos en cualquier plan, para probarlos.
//
// Sin imports (ni alias) para poder probarla sin red: scripts/check-scheduled-delivery.mjs.

export function canUseScheduledDelivery(plan: string | null | undefined, isAdmin: boolean | null | undefined): boolean {
  const isLight = (plan ?? '').toString().trim().toLowerCase() === 'light';
  return !isLight || !!isAdmin;
}

// ¿Está activa la entrega programada para este local? Interruptor del dueño + plan.
export function isScheduledDeliveryActive(
  enabled: boolean | null | undefined,
  plan: string | null | undefined,
  isAdmin: boolean | null | undefined,
): boolean {
  return !!enabled && canUseScheduledDelivery(plan, isAdmin);
}
