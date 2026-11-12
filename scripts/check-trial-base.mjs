// Verificación de lib/trialBase.ts: la prueba de 14 días cuenta desde el REGISTRO (la fecha más antigua entre
// profiles.created_at y restaurants.created_at). Sin red.
//
//   node scripts/check-trial-base.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { trialBaseDate, activationBlockedByTrial } from '../lib/trialBase.ts';
import {
  trialDaysLeft, trialDayNumber, isTrialExpired, isTrialBlocking, firstChargeDate, trialExpiresAt,
} from '../lib/trial.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}
const at = (iso) => new Date(iso);
const iso = (d) => (d ? d.toISOString() : null);

// "Hoy" para los casos: 12/11/2026 15:00 hora Argentina
const NOW = at('2026-11-12T18:00:00Z');

console.log('trialBaseDate');
{
  const perfil = '2026-11-01T15:00:00Z';
  const localNuevo = '2026-11-10T15:00:00Z';
  const localViejo = '2026-10-20T15:00:00Z';
  check('sin local: usa el perfil', iso(trialBaseDate(perfil, null)) === iso(at(perfil)));
  check('con local posterior al perfil: usa el perfil (la más antigua)', iso(trialBaseDate(perfil, localNuevo)) === iso(at(perfil)));
  check('perfil antiguo con local nuevo: usa el perfil', iso(trialBaseDate('2026-10-01T10:00:00Z', '2026-11-11T10:00:00Z')) === '2026-10-01T10:00:00.000Z');
  check('local anterior al perfil: usa el local (quien ya tiene local no cambia)', iso(trialBaseDate(perfil, localViejo)) === iso(at(localViejo)));
  check('fechas iguales: esa fecha', iso(trialBaseDate(perfil, perfil)) === iso(at(perfil)));
  check('sin perfil pero con local: usa el local', iso(trialBaseDate(null, localNuevo)) === iso(at(localNuevo)));
  check('sin perfil ni local: usa auth.users', iso(trialBaseDate(null, null, '2026-11-02T10:00:00Z')) === '2026-11-02T10:00:00.000Z');
  check('auth.users NO gana si hay perfil o local', iso(trialBaseDate(perfil, null, '2026-10-01T00:00:00Z')) === iso(at(perfil)));
  check('fecha de perfil inválida: cae al local', iso(trialBaseDate('nada', localNuevo)) === iso(at(localNuevo)));
  check('fecha de local inválida: cae al perfil', iso(trialBaseDate(perfil, 'nada')) === iso(at(perfil)));
  check('todo vacío o inválido: null', trialBaseDate(null, undefined) === null && trialBaseDate('x', 'y', 'z') === null);
  check('acepta Date', iso(trialBaseDate(at(perfil), at(localNuevo))) === iso(at(perfil)));
}

console.log('caso Tamara: perfil sin local, día 12 de 14');
{
  const perfil = '2026-11-01T15:00:00Z'; // 1/11 hora Argentina
  const base = trialBaseDate(perfil, null);
  check('día 12 de la prueba', trialDayNumber(base, NOW) === 12);
  check('le quedan 3 días contando hoy', trialDaysLeft(base, NOW) === 3);
  check('no está vencida el 12/11', isTrialExpired(base, NOW) === false);
  check('vence a las 00:00 AR del 15/11', iso(trialExpiresAt(base)) === '2026-11-15T03:00:00.000Z');
  const bloq = (now) => isTrialBlocking({ status: 'trialing', createdAt: base, mpCardId: null, trialEndsAt: null, now });
  check('14/11 23:59 AR todavía no bloquea', bloq(at('2026-11-15T02:59:00Z')) === false);
  check('15/11 00:00 AR bloquea como cualquiera', bloq(at('2026-11-15T03:00:00Z')) === true);
  // Sin la regla nueva (created_at null) nunca vencía
  check('regla vieja (sin fecha de local): nunca bloqueaba', isTrialBlocking({ status: 'trialing', createdAt: null, mpCardId: null, trialEndsAt: null, now: at('2026-12-31T00:00:00Z') }) === false);
}

console.log('dentro de plazo y vencida');
{
  const baseOk = trialBaseDate('2026-11-05T12:00:00Z', '2026-11-09T12:00:00Z');
  const baseVencida = trialBaseDate('2026-10-20T12:00:00Z', '2026-11-11T12:00:00Z');
  check('perfil 5/11 + local 9/11: dentro de plazo', isTrialExpired(baseOk, NOW) === false);
  check('perfil 20/10 + local 11/11: vencida (el local nuevo no la alarga)', isTrialExpired(baseVencida, NOW) === true);
  check('esa cuenta vencida con la regla vieja (solo local) seguía en plazo', isTrialExpired('2026-11-11T12:00:00Z', NOW) === false);
}

console.log('quién NO cambia de estado con la base nueva');
{
  const baseVieja = '2026-10-01T12:00:00Z'; // perfil muy antiguo → base vencida
  const params = (over) => ({ status: 'trialing', createdAt: baseVieja, mpCardId: null, trialEndsAt: null, now: NOW, ...over });
  check('trialing sin tarjeta: bloquea', isTrialBlocking(params({})) === true);
  check('trialing con tarjeta + trial_ends_at: NO bloquea', isTrialBlocking(params({ mpCardId: 'card_1', trialEndsAt: '2026-11-20T03:00:00Z' })) === false);
  check('trialing con tarjeta pero sin trial_ends_at: bloquea (igual que hoy)', isTrialBlocking(params({ mpCardId: 'card_1' })) === true);
  check('active: NO bloquea', isTrialBlocking(params({ status: 'active', mpCardId: 'card_1' })) === false);
  check('authorized (Doña Coca): NO bloquea', isTrialBlocking(params({ status: 'authorized' })) === false);
  check('authorized sin tarjeta guardada: NO bloquea', isTrialBlocking(params({ status: 'authorized', mpCardId: null })) === false);
  check('cancelled / paused: no dependen de la prueba', isTrialBlocking(params({ status: 'cancelled' })) === false && isTrialBlocking(params({ status: 'paused' })) === false);
  // el trial_ends_at guardado manda sobre la base para el cobro
  const guardada = '2026-11-25T03:00:00Z';
  check('firstChargeDate: trial_ends_at guardado manda sobre la base', iso(firstChargeDate(baseVieja, guardada)) === iso(at(guardada)));
  check('firstChargeDate: sin trial_ends_at usa el fin por la base', iso(firstChargeDate(baseVieja, null)) === iso(trialExpiresAt(baseVieja)));
}

console.log('activate: crear el local aunque la prueba haya vencido');
{
  const vencida = trialBaseDate('2026-10-01T12:00:00Z', null);
  const enPlazo = trialBaseDate('2026-11-10T12:00:00Z', null);
  const blocked = (o) => activationBlockedByTrial({ hasLocal: true, hasPaidSub: false, baseDate: vencida, now: NOW, ...o });
  check('sin local y prueba vencida: se permite crear (nace bloqueado por la fecha base)', blocked({ hasLocal: false }) === false);
  check('sin local y prueba vigente: se permite', blocked({ hasLocal: false, baseDate: enPlazo }) === false);
  check('con local, vencida y sin suscripción paga: 403 como hoy', blocked({}) === true);
  check('con local, vencida y con suscripción paga: se permite', blocked({ hasPaidSub: true }) === false);
  check('con local y prueba vigente: se permite', blocked({ baseDate: enPlazo }) === false);
  check('con local y sin fecha base: se permite (nunca vence)', blocked({ baseDate: null }) === false);
  // el local recién creado hereda la base del perfil: nace bloqueado y se desbloquea con tarjeta + trial_ends_at
  const baseNacido = trialBaseDate('2026-10-01T12:00:00Z', NOW);
  check('el local creado hoy NO alarga la prueba: nace vencido', isTrialExpired(baseNacido, NOW) === true);
  check('nace bloqueado hasta cargar tarjeta', isTrialBlocking({ status: 'trialing', createdAt: baseNacido, mpCardId: null, trialEndsAt: null, now: NOW }) === true);
}

if (failures > 0) {
  console.error(`\n${failures} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\nTodo ok');
