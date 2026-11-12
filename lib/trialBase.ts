// Fecha desde la que se cuenta la prueba gratis de 14 días: el REGISTRO del usuario, no el alta del local.
//
// Regla: la MÁS ANTIGUA entre profiles.created_at y restaurants.created_at (así quien ya tiene local
// no cambia nunca: su base sigue siendo la de siempre o una anterior). Sin local cuenta el perfil.
// Si no hay ninguna de las dos fechas válidas, se usa la de auth.users (tercer argumento, opcional).
// Sin ninguna fecha válida devuelve null (lib/trial trata null como "nunca vence", igual que hoy).
//
// Lo demás de la prueba sigue en lib/trial.ts (se le pasa esta fecha como "createdAt"). Un trial_ends_at ya
// guardado sigue mandando para el cobro (firstChargeDate) y los locales con tarjeta + trial_ends_at, active o
// authorized no se bloquean nunca (chargeScheduled / isTrialBlocking), sea cual sea la base.
//
// Los mails de ciclo de vida (lib/email/lifecycle.ts) NO usan esta base: siguen contando desde
// restaurants.created_at para no mandar mails retroactivos a cuentas existentes.
//
// Solo importa ./trial.ts con ruta relativa (sin alias ni React): sirve en servidor y cliente y se prueba sin red
// en scripts/check-trial-base.mjs.

import { isTrialExpired } from './trial.ts';

type DateLike = string | Date | null | undefined;

function parse(v: DateLike): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function trialBaseDate(
  profileCreatedAt: DateLike,
  restaurantCreatedAt: DateLike,
  authCreatedAt?: DateLike,
): Date | null {
  const candidates = [parse(profileCreatedAt), parse(restaurantCreatedAt)].filter((d): d is Date => d !== null);
  if (candidates.length === 0) return parse(authCreatedAt);
  return candidates.reduce((min, d) => (d.getTime() < min.getTime() ? d : min));
}

// ¿La prueba vencida impide ACTIVAR un plan sin tarjeta (POST /api/subscriptions/activate)? Solo si ya existe un local
// sin suscripción paga y la base está vencida: se mantiene el 403 actual. Sin local no se bloquea: el local nace en
// prueba vencida (el panel lo bloquea por la fecha base) y se desbloquea cargando tarjeta (save-card necesita el local).
export function activationBlockedByTrial(opts: {
  hasLocal: boolean;
  hasPaidSub: boolean;
  baseDate: DateLike;
  now: Date;
}): boolean {
  if (!opts.hasLocal || opts.hasPaidSub) return false;
  return isTrialExpired(opts.baseDate, opts.now);
}
