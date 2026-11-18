// Cuánto tiempo se guardan los datos de un local después de cancelar, y cuándo se borran.
// Lógica pura, sin red ni imports con alias, para probarla con scripts/check-data-retention.mjs.
//
// Regla (definida con Luciano): los datos se guardan RETENTION_DAYS días contados desde el FIN del servicio
// (el último día pagado: grace_period_until), no desde que tocó "cancelar". Un aviso por mail sale
// WARNING_DAYS días antes del borrado.

import { addDays, inicioDiaArg } from './email/dates.ts';

export const RETENTION_DAYS = 90;
export const WARNING_DAYS = 15;

function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Fin del servicio: la gracia guardada; sin gracia (corte inmediato) es el momento de la cancelación.
export function serviceEndFor(graceUntil: string | Date | null | undefined, cancelledAt: Date): Date {
  return parse(graceUntil) ?? cancelledAt;
}

// Día del borrado: 00:00 (hora Argentina) del día 90 después de que termina el servicio.
export function deleteOnFor(graceUntil: string | Date | null | undefined, cancelledAt: Date): Date {
  return addDays(inicioDiaArg(serviceEndFor(graceUntil, cancelledAt)), RETENTION_DAYS);
}

// Día en que corresponde el aviso previo (WARNING_DAYS antes del borrado).
export function warningOnFor(deleteOn: Date): Date {
  return addDays(deleteOn, -WARNING_DAYS);
}
