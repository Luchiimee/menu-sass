// Verificación de lib/geoResult.ts con respuestas FALSAS de Google: sin red, sin clave.
//
//   node scripts/check-geo-result.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  parseReverseGeocode, parseForwardGeocode, fetchGeo, geoFailureMessage,
  geoPositionErrorMessage, GEO_MESSAGES, GEOLOCATION_OPTIONS,
} from '../lib/geoResult.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const comp = (long_name, ...types) => ({ long_name, short_name: long_name, types });
const full = [comp('1234', 'street_number'), comp('Calle 2', 'route'), comp('Mercedes', 'locality')];
const reverse = (status, results) => ({ status, results });

console.log('geocodificación inversa');
{
  const r = parseReverseGeocode(reverse('OK', [{ address_components: full }]));
  check('OK completo → "Calle 2 1234, Mercedes"', r.kind === 'ok' && r.value.address === 'Calle 2 1234, Mercedes' && r.value.hasNumber);
}
{
  const r = parseReverseGeocode(reverse('OK', [{ address_components: [comp('Calle 2', 'route'), comp('Mercedes', 'locality')] }]));
  check('sin altura → "Calle 2, Mercedes", hasNumber false', r.kind === 'ok' && r.value.address === 'Calle 2, Mercedes' && !r.value.hasNumber);
}
{
  const r = parseReverseGeocode(reverse('OK', [{ address_components: [comp('Calle 2', 'route')] }]));
  check('sin localidad → solo la calle, sin coma', r.kind === 'ok' && r.value.address === 'Calle 2');
}
{
  const r = parseReverseGeocode(reverse('OK', [{ address_components: [comp('Mercedes', 'locality'), comp('Buenos Aires', 'administrative_area_level_1')] }]));
  check('sin route → sin_resultado (antes quedaba ", Mercedes")', r.kind === 'sin_resultado');
}
{
  const r = parseReverseGeocode(reverse('OK', [{ address_components: [comp('   ', 'route'), comp('Mercedes', 'locality')] }]));
  check('route en blanco → sin_resultado', r.kind === 'sin_resultado');
}
{
  const r = parseReverseGeocode(reverse('OK', [
    { address_components: [comp('Mercedes', 'locality')] },
    { address_components: full },
  ]));
  check('el primer resultado sin calle se salta: usa el siguiente con route', r.kind === 'ok' && r.value.address === 'Calle 2 1234, Mercedes');
}
check('ZERO_RESULTS → sin_resultado', parseReverseGeocode(reverse('ZERO_RESULTS', [])).kind === 'sin_resultado');
check('OK con results vacío → sin_resultado', parseReverseGeocode(reverse('OK', [])).kind === 'sin_resultado');
{
  const r = parseReverseGeocode({ status: 'REQUEST_DENIED', error_message: 'You must enable Billing on the Google Cloud Project', results: [] });
  check('REQUEST_DENIED → error con el estado', r.kind === 'error' && r.reason === 'REQUEST_DENIED');
  check('el mensaje de Google no se copia al motivo', !JSON.stringify(r).includes('Billing'));
}
check('OVER_QUERY_LIMIT → error', parseReverseGeocode(reverse('OVER_QUERY_LIMIT', [])).kind === 'error');
check('sin status → error', parseReverseGeocode({ results: [{ address_components: full }] }).kind === 'error');
check('null → error', parseReverseGeocode(null).kind === 'error');
check('texto en vez de objeto → error', parseReverseGeocode('<html>').kind === 'error');

console.log('geocodificación directa');
{
  const r = parseForwardGeocode({ status: 'OK', results: [{ geometry: { location: { lat: -34.6479, lng: -59.4408 } } }] });
  check('OK → coordenadas', r.kind === 'ok' && r.value.lat === -34.6479 && r.value.lng === -59.4408);
}
check('ZERO_RESULTS → sin_resultado', parseForwardGeocode({ status: 'ZERO_RESULTS', results: [] }).kind === 'sin_resultado');
check('REQUEST_DENIED → error', parseForwardGeocode({ status: 'REQUEST_DENIED', results: [] }).kind === 'error');
check('OK sin geometry → error', parseForwardGeocode({ status: 'OK', results: [{}] }).kind === 'error');
check('lat no numérica → error', parseForwardGeocode({ status: 'OK', results: [{ geometry: { location: { lat: 'x', lng: 1 } } }] }).kind === 'error');

console.log('fetchGeo (red falsa)');
const okRes = (body, init = {}) => async () => ({ ok: true, status: 200, json: async () => body, ...init });
{
  const r = await fetchGeo(okRes({ status: 'OK', results: [{ address_components: full }] }), 'https://x/?key=SECRET', parseReverseGeocode);
  check('respuesta OK se parsea', r.kind === 'ok');
}
{
  const r = await fetchGeo(async () => { throw new Error('fetch failed https://x/?key=SECRET'); }, 'https://x/?key=SECRET', parseReverseGeocode);
  check('red caída → error "red"', r.kind === 'error' && r.reason === 'red');
  check('el motivo no filtra la clave ni la URL', !JSON.stringify(r).includes('SECRET') && !JSON.stringify(r).includes('https'));
}
{
  const e = new Error('The operation was aborted due to timeout'); e.name = 'TimeoutError';
  const r = await fetchGeo(async () => { throw e; }, 'https://x/', parseReverseGeocode);
  check('timeout → error "timeout"', r.kind === 'error' && r.reason === 'timeout');
}
{
  const r = await fetchGeo(okRes({ status: 'OK', results: [{ address_components: full }] }, { ok: false, status: 500 }), 'https://x/', parseReverseGeocode);
  check('HTTP 500 → error aunque el cuerpo diga OK', r.kind === 'error' && r.reason === 'http_500');
}
{
  const r = await fetchGeo(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } }), 'https://x/', parseReverseGeocode);
  check('cuerpo que no es JSON → error', r.kind === 'error' && r.reason === 'respuesta_invalida');
}
{
  const r = await fetchGeo(okRes({ status: 'REQUEST_DENIED', error_message: 'billing' }), 'https://x/', parseForwardGeocode);
  check('REQUEST_DENIED con HTTP 200 → error', r.kind === 'error' && r.reason === 'REQUEST_DENIED');
}
{
  const r = await fetchGeo(okRes({ status: 'ZERO_RESULTS', results: [] }), 'https://x/', parseForwardGeocode);
  check('ZERO_RESULTS → sin_resultado', r.kind === 'sin_resultado');
}

console.log('mensajes');
check('sin_resultado y error tienen mensajes distintos', geoFailureMessage({ kind: 'sin_resultado' }) !== geoFailureMessage({ kind: 'error', reason: 'x' }));
check('permiso denegado', geoPositionErrorMessage(1) === GEO_MESSAGES.gpsDenegado);
check('posición no disponible', geoPositionErrorMessage(2) === GEO_MESSAGES.gpsNoDisponible);
check('timeout', geoPositionErrorMessage(3) === GEO_MESSAGES.gpsTimeout);
check('código desconocido → no disponible', geoPositionErrorMessage(undefined) === GEO_MESSAGES.gpsNoDisponible);
check('getCurrentPosition tiene timeout finito', Number.isFinite(GEOLOCATION_OPTIONS.timeout) && GEOLOCATION_OPTIONS.timeout > 0);

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
