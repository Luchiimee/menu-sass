// Verificación de lib/cancelGrace.ts: fin del período pagado al cancelar (graceUntil) y la fecha efectiva que no
// acorta una gracia existente. Sin red.
//
//   node scripts/check-cancel-grace.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { MAX_GRACE_DAYS, computeCancelGrace, resolveServiceUntil } from '../lib/cancelGrace.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const NOW = new Date('2026-11-12T15:00:00Z');
const days = (n) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

console.log('computeCancelGrace');
check('tope de 62 días', MAX_GRACE_DAYS === 62);
{
  const f = days(26);
  check('fecha futura (26 días): graceUntil en ISO', computeCancelGrace(f.toISOString(), NOW).graceUntil === f.toISOString());
  check('acepta Date', computeCancelGrace(f, NOW).graceUntil === f.toISOString());
  check('acepta el formato de MP con offset (-04:00)', computeCancelGrace('2026-12-08T15:37:47.000-04:00', NOW).graceUntil === '2026-12-08T19:37:47.000Z');
  check('fecha pasada: null', computeCancelGrace(days(-1).toISOString(), NOW).graceUntil === null);
  check('justo ahora: null', computeCancelGrace(NOW.toISOString(), NOW).graceUntil === null);
  check('1 ms en el futuro: graceUntil', computeCancelGrace(new Date(NOW.getTime() + 1), NOW).graceUntil === new Date(NOW.getTime() + 1).toISOString());
  check('null y undefined: null', computeCancelGrace(null, NOW).graceUntil === null && computeCancelGrace(undefined, NOW).graceUntil === null);
  check('inválida o vacía: null', ['', 'no es fecha', 'x', '2026-13-45'].every((v) => computeCancelGrace(v, NOW).graceUntil === null));
  check('número, objeto y booleano: null', [1796000000000, {}, true, []].every((v) => computeCancelGrace(v, NOW).graceUntil === null));
  check('90 días: null (más de 62)', computeCancelGrace(days(90).toISOString(), NOW).graceUntil === null);
  check('62 días justos: graceUntil', computeCancelGrace(days(62).toISOString(), NOW).graceUntil === days(62).toISOString());
  check('62 días y 1 ms: null', computeCancelGrace(new Date(days(62).getTime() + 1), NOW).graceUntil === null);
  check('Date inválida: null', computeCancelGrace(new Date('x'), NOW).graceUntil === null);
  check('devuelve solo { graceUntil }', Object.keys(computeCancelGrace(f, NOW)).join(',') === 'graceUntil');
}

console.log('resolveServiceUntil (no acorta una gracia existente)');
{
  const nueva = days(26).toISOString();
  check('sin gracia nueva ni existente: null (corte inmediato)', resolveServiceUntil(null, null, NOW) === null);
  check('solo gracia nueva: la nueva', resolveServiceUntil(nueva, null, NOW) === nueva);
  check('gracia existente vencida y sin nueva: null', resolveServiceUntil(null, days(-3).toISOString(), NOW) === null);
  check('gracia existente vencida y nueva: la nueva', resolveServiceUntil(nueva, days(-3).toISOString(), NOW) === nueva);
  check('gracia existente futura y sin nueva: se conserva', resolveServiceUntil(null, days(40).toISOString(), NOW) === days(40).toISOString());
  check('existente futura más lejos que la nueva: gana la existente (no se acorta)', resolveServiceUntil(nueva, days(40).toISOString(), NOW) === days(40).toISOString());
  check('existente futura más cerca que la nueva: gana la nueva', resolveServiceUntil(nueva, days(10).toISOString(), NOW) === nueva);
  check('existente inválida: se ignora', resolveServiceUntil(nueva, 'x', NOW) === nueva && resolveServiceUntil(null, 'x', NOW) === null);
  check('acepta Date como existente', resolveServiceUntil(null, days(5), NOW) === days(5).toISOString());
}

if (failures > 0) {
  console.log(`\n${failures} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\ntodo ok');
