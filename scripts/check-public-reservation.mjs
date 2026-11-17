// Verificación de lib/publicReservation.ts: validación del pedido de reserva y de la consulta por teléfono,
// lista cerrada de columnas y límites de uso. Sin red.
//
//   node scripts/check-public-reservation.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  PUBLIC_RESERVATION_COLUMNS, PUBLIC_RESERVATION_SELECT,
  parseReservationRequest, parseLookupRequest, normalizeReservationPhone, toPublicReservation, argentinaNow,
} from '../lib/publicReservation.ts';
import { RATE_LIMITS, ipKey, restaurantKey } from '../lib/rateLimitCore.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const RID = '3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f';
// 2026-11-17 12:00 en Argentina (15:00 UTC)
const NOW = new Date('2026-11-17T15:00:00Z');
const base = { restaurantId: RID, name: 'Juan', lastname: 'Pérez', phone: '1123456789', date: '2026-11-20', time: '21:00', guests: 2, notes: 'Cumple' };
const err = (patch) => { const r = parseReservationRequest({ ...base, ...patch }, NOW); return r.ok ? 'ok' : r.error; };

console.log('columnas públicas');
{
  check('no incluye admin_notes', !PUBLIC_RESERVATION_COLUMNS.includes('admin_notes'));
  check('no incluye teléfono ni created_at', !PUBLIC_RESERVATION_COLUMNS.includes('customer_phone') && !PUBLIC_RESERVATION_COLUMNS.includes('created_at'));
  check('select no es *', !PUBLIC_RESERVATION_SELECT.includes('*'));
  const out = toPublicReservation({ customer_name: 'A', reservation_date: '2026-11-20', reservation_time: '21:00:00', guests: 2, status: 'pendiente', admin_notes: 'secreto', customer_phone: '1', id: 'x' });
  check('toPublicReservation descarta lo demás', JSON.stringify(Object.keys(out)) === JSON.stringify([...PUBLIC_RESERVATION_COLUMNS]));
}

console.log('parseReservationRequest: válidos');
{
  const r = parseReservationRequest(base, NOW);
  check('pedido normal ok', r.ok);
  check('id en minúsculas', parseReservationRequest({ ...base, restaurantId: RID.toUpperCase() }, NOW).value.restaurantId === RID);
  check('sin notas ok', parseReservationRequest({ ...base, notes: undefined }, NOW).ok);
  check('hoy más tarde ok', err({ date: '2026-11-17', time: '21:00' }) === 'ok');
  check('teléfono con +54 y espacios ok', err({ phone: '+54 9 11 2345-6789' }) === 'ok');
}

console.log('parseReservationRequest: inválidos');
{
  check('body no objeto', !parseReservationRequest(null, NOW).ok && !parseReservationRequest([], NOW).ok && !parseReservationRequest('x', NOW).ok);
  check('restaurantId inválido', err({ restaurantId: 'abc' }) === 'datos_invalidos');
  check('nombre vacío', err({ name: '   ' }) === 'datos_invalidos');
  check('apellido faltante', err({ lastname: undefined }) === 'datos_invalidos');
  check('nombre muy largo', err({ name: 'a'.repeat(61) }) === 'datos_invalidos');
  check('nombre con control', err({ name: 'Ju\u0000an' }) === 'datos_invalidos');
  check('notas muy largas', err({ notes: 'a'.repeat(501) }) === 'datos_invalidos');
  check('teléfono corto', err({ phone: '1234567' }) === 'datos_invalidos');
  check('teléfono con letras', err({ phone: '11abc45678' }) === 'datos_invalidos');
  check('teléfono con 16 dígitos', err({ phone: '1234567890123456' }) === 'datos_invalidos');
  check('fecha inexistente', err({ date: '2026-02-30' }) === 'datos_invalidos');
  check('fecha mal formada', err({ date: '20/11/2026' }) === 'datos_invalidos');
  check('hora inválida', err({ time: '25:00' }) === 'datos_invalidos');
  check('invitados 0', err({ guests: 0 }) === 'datos_invalidos');
  check('invitados 51', err({ guests: 51 }) === 'datos_invalidos');
  check('invitados decimal', err({ guests: 2.5 }) === 'datos_invalidos');
  check('invitados texto', err({ guests: '2' }) === 'datos_invalidos');
  check('fecha de ayer', err({ date: '2026-11-16' }) === 'fecha_pasada');
  check('hoy hora pasada', err({ date: '2026-11-17', time: '11:00' }) === 'fecha_pasada');
  check('hoy misma hora', err({ date: '2026-11-17', time: '12:00' }) === 'fecha_pasada');
  check('más de un año', err({ date: '2028-01-01' }) === 'datos_invalidos');
}

console.log('parseLookupRequest / teléfono');
{
  check('consulta válida', parseLookupRequest({ restaurantId: RID, phone: ' 1123456789 ' }).ok);
  check('devuelve teléfono recortado', parseLookupRequest({ restaurantId: RID, phone: ' 1123456789 ' }).value.phone === '1123456789');
  check('sin teléfono', !parseLookupRequest({ restaurantId: RID }).ok);
  check('teléfono inválido', !parseLookupRequest({ restaurantId: RID, phone: 'abc' }).ok);
  check('id inválido', !parseLookupRequest({ restaurantId: 'x', phone: '1123456789' }).ok);
  check('normalizeReservationPhone no string', normalizeReservationPhone(123456789) === null);
}

console.log('argentinaNow');
{
  const a = argentinaNow(NOW);
  check('fecha y hora de Argentina', a.date === '2026-11-17' && a.time === '12:00');
  const b = argentinaNow(new Date('2026-11-18T02:30:00Z'));
  check('cruce de día (UTC ya es 18, Argentina sigue 17)', b.date === '2026-11-17' && b.time === '23:30');
}

console.log('límites de uso');
{
  check('claves distintas por scope', ipKey('reservation', 'h') !== ipKey('reslookup', 'h') && ipKey('reservation', 'h') !== ipKey('order', 'h'));
  check('clave por local con scope reservation', restaurantKey(RID, 'reservation') === `reservation:rid:${RID}`);
  check('la consulta tiene tope más bajo que el alta por local', RATE_LIMITS.reservationLookupPerIp.limit <= RATE_LIMITS.reservationPerIp.limit);
}

if (failures > 0) { console.log(`\n${failures} fallo(s)`); process.exit(1); }
console.log('\nTodo ok');
