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

// --- Configuración de los turnos (intervalo y aviso mínimo) -------------------------------------
//
// scheduled_delivery_config guarda { interval_minutes, buffer_minutes }. Hay locales con claves
// viejas ({ interval, buffer }) o con una mezcla ({ buffer: 15, interval: 30, buffer_minutes: 30 }):
// se leen en este orden y lo inválido cae al valor por defecto.

export const DELIVERY_INTERVAL_OPTIONS = [15, 30, 60];
export const DELIVERY_BUFFER_OPTIONS = [0, 15, 30, 60];
export const DEFAULT_DELIVERY_INTERVAL = 30;
export const DEFAULT_DELIVERY_BUFFER = 15;

function toMinutes(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && /^\s*\d+\s*$/.test(value)) return Number(value);
  return null;
}

export function normalizeDeliveryConfig(config: unknown): { intervalMinutes: number; bufferMinutes: number } {
  const c = (config && typeof config === 'object' ? config : {}) as Record<string, unknown>;

  // Primera clave con valor (nueva antes que vieja); si ese valor no sirve, va al default.
  const rawInterval = c.interval_minutes ?? c.interval;
  const rawBuffer = c.buffer_minutes ?? c.buffer;

  const interval = toMinutes(rawInterval);
  const buffer = toMinutes(rawBuffer);

  return {
    intervalMinutes: interval !== null && DELIVERY_INTERVAL_OPTIONS.includes(interval) ? interval : DEFAULT_DELIVERY_INTERVAL,
    // 0 ("Sin tiempo de espera") es una opción válida del panel
    bufferMinutes: buffer !== null && DELIVERY_BUFFER_OPTIONS.includes(buffer) ? buffer : DEFAULT_DELIVERY_BUFFER,
  };
}
