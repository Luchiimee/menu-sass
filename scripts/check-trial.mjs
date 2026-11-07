// Verificación de la regla de la prueba gratis (lib/trial.ts). Sin red.
//
//   node scripts/check-trial.mjs   (Node >= 22.18 / 24: importa .ts directo)
//
// Regla: la prueba termina a las 00:00 hora Argentina del día 15 contado desde created_at
// (día del alta = día 1, último día de uso = 14 inclusive).

import {
  TRIAL_DAYS, trialExpiresAt, trialLastDay, isTrialExpired, trialDaysLeft, trialDayNumber, isTrialBlocking, firstChargeDate,
} from '../lib/trial.ts';
import { fechaLargaArg } from '../lib/email/dates.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const at = (iso) => new Date(iso);

// Altas del 6/11/2026 hora Argentina (UTC-3)
const ALTAS = {
  '00:10': '2026-11-06T03:10:00Z',
  '15:00': '2026-11-06T18:00:00Z',
  '23:30': '2026-11-07T02:30:00Z',
};
const FIN = '2026-11-20T03:00:00.000Z'; // 00:00 AR del 20/11 (día 15)

console.log('constante');
check('14 días', TRIAL_DAYS === 14);

console.log('fin de la prueba: mismo instante sin importar la hora del alta');
for (const [hora, iso] of Object.entries(ALTAS)) {
  check(`alta ${hora} AR → vence ${FIN}`, trialExpiresAt(iso).toISOString() === FIN);
  check(`alta ${hora} AR → último día: 19 de noviembre`, fechaLargaArg(trialLastDay(iso)) === '19 de noviembre de 2026');
}
check('acepta Date además de string', trialExpiresAt(new Date(ALTAS['15:00'])).toISOString() === FIN);

console.log('límite exacto de 03:00Z');
for (const [hora, iso] of Object.entries(ALTAS)) {
  check(`alta ${hora}: 02:59:59.999Z del 20/11 todavía no vence`, !isTrialExpired(iso, at('2026-11-20T02:59:59.999Z')));
  check(`alta ${hora}: 03:00:00.000Z del 20/11 ya vence`, isTrialExpired(iso, at('2026-11-20T03:00:00.000Z')));
}
check('el día 14 a las 23:59 AR todavía tiene prueba', !isTrialExpired(ALTAS['00:10'], at('2026-11-20T02:59:00Z')));
check('el día 15 a las 00:00 AR no', isTrialExpired(ALTAS['00:10'], at('2026-11-20T03:00:00Z')));
check('un mes después sigue vencida', isTrialExpired(ALTAS['15:00'], at('2026-12-20T15:00:00Z')));

console.log('días 13, 14 y 15 (el alta es el día 1)');
{
  // mediodía AR de cada día
  const dia13 = at('2026-11-18T15:00:00Z');
  const dia14 = at('2026-11-19T15:00:00Z');
  const dia15 = at('2026-11-20T15:00:00Z');
  for (const [hora, iso] of Object.entries(ALTAS)) {
    check(`alta ${hora}: día 13 → número 13, quedan 2, no vencida`,
      trialDayNumber(iso, dia13) === 13 && trialDaysLeft(iso, dia13) === 2 && !isTrialExpired(iso, dia13));
    check(`alta ${hora}: día 14 → número 14, queda 1, no vencida`,
      trialDayNumber(iso, dia14) === 14 && trialDaysLeft(iso, dia14) === 1 && !isTrialExpired(iso, dia14));
    check(`alta ${hora}: día 15 → número 15, quedan 0, vencida`,
      trialDayNumber(iso, dia15) === 15 && trialDaysLeft(iso, dia15) === 0 && isTrialExpired(iso, dia15));
  }
}

console.log('día del alta');
{
  check('el día del alta es el día 1 y quedan 14', trialDayNumber(ALTAS['15:00'], at('2026-11-06T20:00:00Z')) === 1 && trialDaysLeft(ALTAS['15:00'], at('2026-11-06T20:00:00Z')) === 14);
  // alta 23:30 AR: a las 00:00 AR ya es el día 2
  check('alta 23:30 AR: 30 minutos después ya es el día 2', trialDayNumber(ALTAS['23:30'], at('2026-11-07T03:00:00Z')) === 2);
  check('alta 00:10 AR: a las 23:59 AR sigue siendo el día 1', trialDayNumber(ALTAS['00:10'], at('2026-11-07T02:59:00Z')) === 1);
  check('ahora anterior al alta (reloj desfasado): día 1 y quedan 14', trialDayNumber(ALTAS['15:00'], at('2026-11-05T12:00:00Z')) === 1 && trialDaysLeft(ALTAS['15:00'], at('2026-11-05T12:00:00Z')) === 14);
  check('no vence antes del alta', !isTrialExpired(ALTAS['15:00'], at('2026-11-05T12:00:00Z')));
}

console.log('valores inválidos: no vence');
for (const v of [null, undefined, '', 'nada', '2026-13-45']) {
  const nombre = v === '' ? "''" : String(v);
  check(`${nombre}: sin fecha de fin, no vence, quedan 14, día 0`,
    trialExpiresAt(v) === null && trialLastDay(v) === null && !isTrialExpired(v, at('2030-01-01T00:00:00Z')) &&
    trialDaysLeft(v, at('2030-01-01T00:00:00Z')) === 14 && trialDayNumber(v, at('2030-01-01T00:00:00Z')) === 0);
}

console.log('bloqueo (isTrialBlocking)');
{
  const vencida = at('2026-11-20T15:00:00Z');
  const vigente = at('2026-11-19T15:00:00Z');
  const base = { status: 'trialing', createdAt: ALTAS['15:00'], hasCard: false, now: vencida };
  check('trialing vencido sin tarjeta → bloquea', isTrialBlocking(base));
  check('trialing vigente → no bloquea', !isTrialBlocking({ ...base, now: vigente }));
  check('trialing vencido CON tarjeta → no bloquea (espera el cobro)', !isTrialBlocking({ ...base, hasCard: true }));
  for (const status of ['active', 'authorized', 'paused', 'cancelled', null, undefined]) {
    check(`estado ${status}: el vencimiento de la prueba no aplica`, !isTrialBlocking({ ...base, status }));
  }
  check('created_at nulo → no bloquea', !isTrialBlocking({ ...base, createdAt: null }));
}

console.log('fecha de primer cobro (firstChargeDate)');
{
  // alta 15:00 AR del 6/11 guardó trial_ends_at con la regla vieja: created_at + 14×24h = 18:00Z del 20/11
  const guardado = '2026-11-20T18:00:00.000Z';
  check('con trial_ends_at guardado se usa ese valor', firstChargeDate(ALTAS['15:00'], guardado).toISOString() === guardado);
  check('sin trial_ends_at (null) cae en la regla: 00:00 AR del día 15', firstChargeDate(ALTAS['15:00'], null).toISOString() === FIN);
  check('undefined y string vacío también', firstChargeDate(ALTAS['15:00'], undefined).toISOString() === FIN && firstChargeDate(ALTAS['15:00'], '').toISOString() === FIN);
  check('trial_ends_at inválido cae en la regla', firstChargeDate(ALTAS['15:00'], 'nada').toISOString() === FIN);
  check('acepta Date', firstChargeDate(ALTAS['15:00'], new Date(guardado)).toISOString() === guardado);
  check('la diferencia entre ambos casos: el valor guardado es 15 hs posterior a la regla nueva',
    firstChargeDate(ALTAS['15:00'], guardado) - firstChargeDate(ALTAS['15:00'], null) === 15 * 3600000);
  check('con trial_ends_at guardado no importa un created_at inválido', firstChargeDate('nada', guardado).toISOString() === guardado);
  check('sin ninguno de los dos → null', firstChargeDate(null, null) === null && firstChargeDate('nada', 'nada') === null);
  // un local con tarjeta de la regla vieja se cobra el día 16 por la mañana, no el 15
  check('el día mostrado (AR) con el valor guardado es el 20/11 (cobra el cron del 20/11 07:00 AR si ya pasó, si no el siguiente)',
    fechaLargaArg(firstChargeDate(ALTAS['15:00'], guardado)) === '20 de noviembre de 2026');
}

console.log('tabla vieja (planAccess: ceil(días) >= 14) vs. nueva');
{
  // regla vieja de lib/planAccess.ts, copiada para comparar
  const DAY_MS = 86400000;
  const vieja = (createdAt, now) => 14 - Math.ceil(Math.abs(now.getTime() - new Date(createdAt).getTime()) / DAY_MS) <= 0;
  const nueva = (createdAt, now) => isTrialExpired(createdAt, now);

  // bloquea desde: primer instante en que cada regla da "vencida" (búsqueda por minuto)
  const desde = (fn, iso) => {
    let t = new Date(iso).getTime() + 12 * DAY_MS;
    const fin = t + 4 * DAY_MS;
    for (; t < fin; t += 60000) if (fn(iso, new Date(t))) return new Date(t).toISOString();
    return null;
  };
  const filas = {
    '00:10': ['2026-11-19T03:11:00.000Z', FIN],
    '15:00': ['2026-11-19T18:01:00.000Z', FIN],
    '23:30': ['2026-11-20T02:31:00.000Z', FIN],
  };
  for (const [hora, [esperadaVieja, esperadaNueva]] of Object.entries(filas)) {
    const v = desde(vieja, ALTAS[hora]);
    const n = desde(nueva, ALTAS[hora]);
    console.log(`       alta ${hora} AR: vieja bloquea desde ${v}  nueva desde ${n}`);
    check(`alta ${hora}: la vieja bloqueaba 13 días después del alta (un día antes)`, v === esperadaVieja);
    check(`alta ${hora}: la nueva bloquea a las 00:00 AR del día 15`, n === esperadaNueva);
  }
  // el día 14 completo: vieja bloqueada, nueva abierta
  for (const hora of Object.keys(ALTAS)) {
    const mediodiaDia14 = at('2026-11-19T20:00:00Z'); // 17:00 AR del día 14
    check(`alta ${hora}, día 14 por la tarde: vieja bloquea (salvo alta tardía), nueva no`,
      !nueva(ALTAS[hora], mediodiaDia14) && (hora === '23:30' ? !vieja(ALTAS[hora], mediodiaDia14) : vieja(ALTAS[hora], mediodiaDia14)));
  }
  // día 13: ambas abiertas; día 16: ambas bloqueadas
  for (const hora of Object.keys(ALTAS)) {
    const d13 = at('2026-11-18T15:00:00Z'), d16 = at('2026-11-21T15:00:00Z');
    check(`alta ${hora}: día 13 abierto y día 16 bloqueado en ambas reglas`,
      !vieja(ALTAS[hora], d13) && !nueva(ALTAS[hora], d13) && vieja(ALTAS[hora], d16) && nueva(ALTAS[hora], d16));
  }
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
