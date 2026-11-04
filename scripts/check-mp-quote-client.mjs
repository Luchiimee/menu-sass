// Verificación de lib/mpQuoteClient.ts (cotización de envío del lado del navegador). Sin red.
//
//   node scripts/check-mp-quote-client.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  isQuoteUsable, shouldRequestQuote, mpShipping, parseQuoteResponse, normalizeStreetForQuote, QUOTE_SAFETY_MARGIN_MS,
} from '../lib/mpQuoteClient.ts';
import { normalizeQuoteAddress } from '../lib/deliveryQuote.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const NOW = Date.UTC(2026, 10, 4, 15, 0, 0);
const EXP = NOW + 15 * 60 * 1000;
const quote = (over = {}) => ({
  token: 'aaa.bbb', cost: 3500, zone: { position: 1, maxKm: 1.5, distanceM: 494 }, expiresAt: EXP,
  address: normalizeStreetForQuote('Calle 16 1145, Mercedes'), ...over,
});

console.log('normalizeStreetForQuote');
check('igual que el servidor (normalizeQuoteAddress)', normalizeStreetForQuote('  Calle 16   1145, Mercedes ') === normalizeQuoteAddress('  Calle 16   1145, Mercedes '));
check('minúsculas y espacios', normalizeStreetForQuote('CALLE  16\t1145') === 'calle 16 1145');
check('saca un "(entre …)" final', normalizeStreetForQuote('Calle 16 1145 (entre 15 y 17)') === 'calle 16 1145');
check('"(Entre" en mayúsculas y con espacios', normalizeStreetForQuote('Calle 16 1145  ( Entre 15 y 17 )') === 'calle 16 1145');
check('un paréntesis que no es "entre" queda', normalizeStreetForQuote('Calle 16 1145 (depto 3)') === 'calle 16 1145 (depto 3)');
check('vacía / null → ""', normalizeStreetForQuote('') === '' && normalizeStreetForQuote(null) === '');

console.log('isQuoteUsable');
check('misma dirección y vigente → sí', isQuoteUsable(quote(), 'Calle 16 1145, Mercedes', NOW));
check('cambio de mayúsculas o espacios → sí', isQuoteUsable(quote(), '  calle 16  1145,   MERCEDES', NOW));
check('con "(entre …)" en la calle → sí', isQuoteUsable(quote(), 'Calle 16 1145, Mercedes (entre 15 y 17)', NOW));
check('otra altura → no', !isQuoteUsable(quote(), 'Calle 16 1146, Mercedes', NOW));
check('justo antes del margen de 60 s → sí', isQuoteUsable(quote(), 'Calle 16 1145, Mercedes', EXP - QUOTE_SAFETY_MARGIN_MS - 1));
check('en el margen de 60 s → no', !isQuoteUsable(quote(), 'Calle 16 1145, Mercedes', EXP - QUOTE_SAFETY_MARGIN_MS));
check('vencida → no', !isQuoteUsable(quote(), 'Calle 16 1145, Mercedes', EXP + 1));
check('sin cotización / token vacío → no',
  !isQuoteUsable(null, 'Calle 16 1145, Mercedes', NOW) && !isQuoteUsable(quote({ token: '' }), 'Calle 16 1145, Mercedes', NOW));
check('dirección actual vacía → no', !isQuoteUsable(quote({ address: '' }), '', NOW));
check('expiresAt inválido → no', !isQuoteUsable(quote({ expiresAt: NaN }), 'Calle 16 1145, Mercedes', NOW));

console.log('shouldRequestQuote');
const ask = (over = {}) => shouldRequestQuote({
  metodoEnvio: 'delivery', deliveryZonesEnabled: true, mpAvailable: true, zoneStatus: 'zone1',
  direccionCalle: 'Calle 16 1145, Mercedes', currentQuote: null, now: NOW, ...over,
});
check('envío, zonas, MP, zona 1, con altura, sin cotización → sí', ask());
check('zona 2 → sí', ask({ zoneStatus: 'zone2' }));
for (const [nombre, over] of [
  ['retiro', { metodoEnvio: 'retiro' }], ['mesa', { metodoEnvio: 'mesa' }],
  ['sin zonas', { deliveryZonesEnabled: false }], ['sin Mercado Pago', { mpAvailable: false }],
  ['el navegador está calculando', { zoneStatus: 'calculating' }], ['fuera de zona en el navegador', { zoneStatus: 'outside' }],
  ['tarifa fija', { zoneStatus: 'flat' }], ['sin altura', { direccionCalle: 'Calle dieciseis' }],
  ['ya hay cotización utilizable', { currentQuote: quote() }],
]) check(`${nombre} → no`, !ask(over));
check('cotización de otra dirección → sí (pide otra)', ask({ currentQuote: quote(), direccionCalle: 'Calle 16 1146, Mercedes' }));
check('cotización en el margen de 60 s → sí (pide otra)', ask({ currentQuote: quote(), now: EXP - 30_000 }));

console.log('mpShipping');
check('costo de la cotización', mpShipping(quote(), false) === 3500);
check('envío gratis por monto → 0', mpShipping(quote(), true) === 0);
check('sin cotización → 0', mpShipping(null, false) === 0);

console.log('parseQuoteResponse');
const ok200 = { quote: 'aaa.bbb', cost: 3500, zone: { position: 1, max_km: 1.5, distance_m: 494 }, expires_at: new Date(EXP).toISOString() };
{
  const r = parseQuoteResponse(200, ok200);
  check('200 → cotización con token, costo, zona y vencimiento',
    r.ok && r.quote.token === 'aaa.bbb' && r.quote.cost === 3500 && r.quote.zone.maxKm === 1.5 && r.quote.zone.distanceM === 494 && r.quote.expiresAt === EXP);
}
for (const [nombre, body] of [
  ['token vacío', { ...ok200, quote: '' }], ['sin token', { ...ok200, quote: undefined }],
  ['costo negativo', { ...ok200, cost: -1 }], ['costo como texto', { ...ok200, cost: '3500' }],
  ['sin zona', { ...ok200, zone: null }], ['vencimiento inválido', { ...ok200, expires_at: 'mañana' }],
]) {
  const r = parseQuoteResponse(200, body);
  check(`200 con ${nombre} → respuesta_invalida`, !r.ok && r.code === 'respuesta_invalida');
}
for (const code of ['fuera_de_cobertura', 'sin_altura', 'parcial', 'sin_resultados', 'fuera_de_bounds']) {
  const r = parseQuoteResponse(422, { error: code, message: `msg ${code}` });
  check(`422 ${code} → ese código con el mensaje del servidor`, !r.ok && r.code === code && r.message === `msg ${code}`);
}
check('422 sin mensaje → mensaje propio', parseQuoteResponse(422, { error: 'fuera_de_cobertura' }).message === 'Lo sentimos, no llegamos a tu zona.');
check('422 con un código desconocido → respuesta_invalida', parseQuoteResponse(422, { error: 'otra_cosa' }).code === 'respuesta_invalida');
{
  const r = parseQuoteResponse(429, { error: 'demasiados_intentos', message: 'Hiciste demasiados intentos. Probá de nuevo en 3 minutos.' }, '180');
  check('429 → demasiados_intentos con la espera', !r.ok && r.code === 'demasiados_intentos' && r.retryAfterSeconds === 180 && r.message.includes('3 minutos'));
  check('429 sin Retry-After → sin espera', parseQuoteResponse(429, { error: 'demasiados_intentos' }).retryAfterSeconds === undefined);
}
for (const [status, code] of [[503, 'cotizacion_no_disponible'], [503, 'geocodificacion_no_disponible'], [403, 'no_disponible'], [409, 'sin_zonas'], [409, 'mp_no_conectado']]) {
  const r = parseQuoteResponse(status, { error: code, message: 'del servidor' });
  check(`${status} ${code} → error con el mensaje del servidor`, !r.ok && r.code === code && r.message === 'del servidor');
}
check('503 sin body útil → no_disponible con mensaje propio', (() => { const r = parseQuoteResponse(503, {}); return r.code === 'no_disponible' && r.message.length > 0; })());
check('JSON inválido (json null) → respuesta_invalida', parseQuoteResponse(503, null).code === 'respuesta_invalida' && parseQuoteResponse(200, null).code === 'respuesta_invalida');
check('array en vez de objeto → respuesta_invalida', parseQuoteResponse(200, [ok200]).code === 'respuesta_invalida');
check('status inesperado (500, 400) → respuesta_invalida',
  parseQuoteResponse(500, { error: 'error_datos' }).code === 'respuesta_invalida' && parseQuoteResponse(400, { error: 'direccion_invalida' }).code === 'respuesta_invalida');

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
