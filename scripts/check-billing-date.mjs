// Verificación de lib/billingDate.ts (mismo día del mes, hora Argentina). Sin red.
//   node scripts/check-billing-date.mjs   (Node >= 22.18)
import { nextMonthlyChargeDate } from '../lib/billingDate.ts';

let failures = 0;
const check = (name, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) failures++; };
const next = (due, now) => nextMonthlyChargeDate(due, new Date(now)).toISOString();
// 00:00 AR = 03:00 UTC

check('8/12 → 8/1', next('2026-12-08T03:00:00Z', '2026-12-08T10:00:00Z') === '2027-01-08T03:00:00.000Z');
check('8/1 → 8/2', next('2027-01-08T03:00:00Z', '2027-01-08T10:00:00Z') === '2027-02-08T03:00:00.000Z');
check('cambio de año: 8/12 → 8/1 del año siguiente', next('2026-12-08T03:00:00Z', '2026-12-08T10:00:00Z').startsWith('2027-01-08'));
check('31/1 → 28/2 (mes corto)', next('2027-01-31T03:00:00Z', '2027-01-31T10:00:00Z') === '2027-02-28T03:00:00.000Z');
check('30/1 → 28/2', next('2027-01-30T03:00:00Z', '2027-01-30T10:00:00Z') === '2027-02-28T03:00:00.000Z');
check('año bisiesto: 31/1/2028 → 29/2/2028', next('2028-01-31T03:00:00Z', '2028-01-31T10:00:00Z') === '2028-02-29T03:00:00.000Z');
check('31/3 → 30/4', next('2027-03-31T03:00:00Z', '2027-03-31T10:00:00Z') === '2027-04-30T03:00:00.000Z');
check('mismo día aunque la fecha guardada sea 00:00 UTC (día AR anterior)', next('2026-12-09T00:00:00Z', '2026-12-09T10:00:00Z') === '2027-01-08T03:00:00.000Z');
check('cron atrasado 3 días: sigue siendo el 8 del mes siguiente', next('2026-12-08T03:00:00Z', '2026-12-11T10:00:00Z') === '2027-01-08T03:00:00.000Z');
check('atraso de más de un mes: nunca queda en el pasado', next('2026-10-08T03:00:00Z', '2026-12-11T10:00:00Z') === '2027-01-08T03:00:00.000Z');
check('sin fecha: parte de hoy y es futura', nextMonthlyChargeDate(null, new Date('2026-11-18T10:00:00Z')).toISOString() === '2026-12-18T03:00:00.000Z');
check('fecha inválida: parte de hoy', nextMonthlyChargeDate('no-es-fecha', new Date('2026-11-18T10:00:00Z')).toISOString() === '2026-12-18T03:00:00.000Z');
check('primer cobro tras la prueba (14/11) → 14/12', next('2026-11-14T03:00:00Z', '2026-11-14T10:00:00Z') === '2026-12-14T03:00:00.000Z');

if (failures) { console.log(`\n${failures} FALLARON`); process.exit(1); }
console.log('\nTodo OK');
