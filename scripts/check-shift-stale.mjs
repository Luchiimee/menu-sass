// Verificación de isShiftStale / shiftBusinessDate (lib/cashUtils.ts): ¿quedó abierta una caja
// que ya pasó su hora de cierre? Hora Argentina = UTC-3. Sin red.
//
//   node scripts/check-shift-stale.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { isShiftStale, shiftBusinessDate, normalizeCloseHour, shouldReassignShift } from '../lib/cashUtils.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}
// Fecha y hora de Argentina → instante
const ar = (s) => new Date(`${s}-03:00`);
const iso = (s) => ar(s).toISOString();

console.log('isShiftStale');
// Caso real Burgers Snappy: abierto 01/11 18:58, cierre 00:00, pedido del 02/11 15:16
check('abierto 01/11 18:58, cierre 00:00, ahora 02/11 15:16 → vencido',
  isShiftStale(iso('2026-11-01T18:58:00'), '00:00', ar('2026-11-02T15:16:00')));
check('abierto 22:00, cierre 00:00, ahora 23:00 del mismo día → no vencido',
  !isShiftStale(iso('2026-11-01T22:00:00'), '00:00', ar('2026-11-01T23:00:00')));
check('… y justo a las 00:00 → vencido',
  isShiftStale(iso('2026-11-01T22:00:00'), '00:00', ar('2026-11-02T00:00:00')));
check('cierre 03:00, abierto 18:58, ahora 02:00 del día siguiente → no vencido',
  !isShiftStale(iso('2026-11-01T18:58:00'), '03:00', ar('2026-11-02T02:00:00')));
check('cierre 03:00, abierto 18:58, ahora 03:30 del día siguiente → vencido',
  isShiftStale(iso('2026-11-01T18:58:00'), '03:00', ar('2026-11-02T03:30:00')));
check('sin hora configurada (null) → usa 00:00: vencido a las 15:16 del día siguiente',
  isShiftStale(iso('2026-11-01T18:58:00'), null, ar('2026-11-02T15:16:00')));
check("sin hora configurada ('') → usa 00:00: no vencido a las 23:00",
  !isShiftStale(iso('2026-11-01T18:58:00'), '', ar('2026-11-01T23:00:00')));
check("hora con segundos de la base ('03:00:00') → igual que '03:00'",
  !isShiftStale(iso('2026-11-01T18:58:00'), '03:00:00', ar('2026-11-02T02:00:00'))
  && isShiftStale(iso('2026-11-01T18:58:00'), '03:00:00', ar('2026-11-02T03:30:00')));
check('cierre 22:00, abierto 23:00 → vence a las 22:00 del día siguiente',
  !isShiftStale(iso('2026-11-01T23:00:00'), '22:00', ar('2026-11-02T21:59:00'))
  && isShiftStale(iso('2026-11-01T23:00:00'), '22:00', ar('2026-11-02T22:00:00')));
check('fecha de apertura inválida → no vencido (no avisa)', !isShiftStale('no-es-fecha', '00:00', ar('2026-11-02T15:16:00')));

console.log('normalizeCloseHour');
check("null, '' y basura → '00:00'", normalizeCloseHour(null) === '00:00' && normalizeCloseHour('') === '00:00' && normalizeCloseHour('xx') === '00:00');
check("'03:00:00' → '03:00'", normalizeCloseHour('03:00:00') === '03:00');

console.log('shiftBusinessDate (fecha de Caja del turno)');
check('abierto 01/11 18:58, cierre 00:00 → 2026-11-01', shiftBusinessDate(iso('2026-11-01T18:58:00'), '00:00') === '2026-11-01');
check('abierto 02/11 01:00, cierre 03:00 → caja del 2026-11-01', shiftBusinessDate(iso('2026-11-02T01:00:00'), '03:00') === '2026-11-01');
check('abierto 02/11 03:00 exacto, cierre 03:00 → 2026-11-02', shiftBusinessDate(iso('2026-11-02T03:00:00'), '03:00') === '2026-11-02');
check('abierto 01/11 23:30, cierre 22:00 → 2026-11-01', shiftBusinessDate(iso('2026-11-01T23:30:00'), '22:00') === '2026-11-01');
check('abierto 01/11 21:00, cierre 22:00 → caja del 2026-10-31', shiftBusinessDate(iso('2026-11-01T21:00:00'), '22:00') === '2026-10-31');
check('sin hora → 00:00', shiftBusinessDate(iso('2026-11-01T18:58:00'), null) === '2026-11-01');

console.log('shouldReassignShift (al tomar un pedido)');
const cerrado = iso('2026-11-01T23:59:00');
check('pendiente con turno cerrado → sí', shouldReassignShift('pendiente', cerrado));
check('pendiente con turno abierto (closed_at null) → no', !shouldReassignShift('pendiente', null));
check('pendiente sin turno (no hay closed_at) → no', !shouldReassignShift('pendiente', undefined));
check('recibido, entregado y cancelado con turno cerrado → no',
  !shouldReassignShift('recibido', cerrado) && !shouldReassignShift('entregado', cerrado) && !shouldReassignShift('cancelado', cerrado));
check("closed_at inválido ('no-es-fecha', '') → no", !shouldReassignShift('pendiente', 'no-es-fecha') && !shouldReassignShift('pendiente', ''));

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
