// Regla única de la prueba gratis de 14 días.
//
// La prueba termina a las 00:00 (hora America/Argentina/Buenos_Aires) del día 15 contado desde
// restaurants.created_at: el día del alta es el día 1 y el último día de uso es el 14, inclusive.
// El fin es exclusivo: desde esas 00:00 la prueba está vencida.
//
// Un created_at nulo o inválido nunca vence (mismo criterio que el panel: sin fecha se asumen
// los 14 días completos).
//
// Sin imports con alias ni React: sirve en servidor y en cliente y se prueba sin red en
// scripts/check-trial.mjs.

import { addDays, diasDesde, inicioDiaArg } from './email/dates.ts';

export const TRIAL_DAYS = 14;

function parse(createdAt: string | Date | null | undefined): Date | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Instante en que vence la prueba (00:00 AR del día 15). null si created_at no sirve.
export function trialExpiresAt(createdAt: string | Date | null | undefined): Date | null {
  const d = parse(createdAt);
  return d ? addDays(inicioDiaArg(d), TRIAL_DAYS) : null;
}

// Último día con prueba (el 14, inclusive): un instante dentro de ese día, para mostrarlo.
export function trialLastDay(createdAt: string | Date | null | undefined): Date | null {
  const end = trialExpiresAt(createdAt);
  return end ? new Date(end.getTime() - 1) : null;
}

export function isTrialExpired(createdAt: string | Date | null | undefined, now: Date): boolean {
  const end = trialExpiresAt(createdAt);
  return end ? now.getTime() >= end.getTime() : false;
}

// Días de prueba que quedan, contando el día de hoy: 14 el día del alta, 1 el día 14, 0 vencida.
export function trialDaysLeft(createdAt: string | Date | null | undefined, now: Date): number {
  const d = diasDesde(createdAt, now);
  if (d === null) return TRIAL_DAYS;
  return Math.min(TRIAL_DAYS, Math.max(0, TRIAL_DAYS - d));
}

// Número de día de la prueba: 1 el día del alta, 14 el último. 0 si no hay fecha válida.
export function trialDayNumber(createdAt: string | Date | null | undefined, now: Date): number {
  const d = diasDesde(createdAt, now);
  return d === null ? 0 : Math.max(1, d + 1);
}

// ¿La prueba vencida bloquea el acceso? Solo para locales 'trialing'. Un local con tarjeta
// guardada (mp_card_id) no se bloquea: espera el cobro del cron al terminar la prueba.
export function isTrialBlocking(opts: {
  status: string | null | undefined;
  createdAt: string | Date | null | undefined;
  hasCard: boolean;
  now: Date;
}): boolean {
  return opts.status === 'trialing' && !opts.hasCard && isTrialExpired(opts.createdAt, opts.now);
}
