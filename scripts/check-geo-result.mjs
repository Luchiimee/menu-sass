// Verificación de lib/geoResult.ts con respuestas FALSAS de Google: sin red, sin clave.
//
//   node scripts/check-geo-result.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  parseReverseGeocode, parseForwardGeocode, fetchGeo, geoFailureMessage, geoPositionErrorMessage,
  gpsPocoPrecisaMessage, isGpsAccurate, GEO_MESSAGES, GEOLOCATION_OPTIONS, GPS_MAX_ACCURACY_M,
} from '../lib/geoResult.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const comp = (long_name, ...types) => ({ long_name, short_name: long_name, types });
const full = [comp('1234', 'street_number'), comp('Calle 2', 'route'), comp('Mercedes', 'locality')];
const onlyRoute = [comp('Calle 2', 'route'), comp('Mercedes', 'locality')];
const onlyLocality = [comp('Mercedes', 'locality'), comp('Buenos Aires', 'administrative_area_level_1')];
const res = (components, location_type = 'ROOFTOP') => ({ address_components: components, geometry: { location_type, location: { lat: -34.6479, lng: -59.4408 } } });
const reverse = (status, results) => ({ status, results });

console.log('geocodificación inversa');
{
  const r = parseReverseGeocode(reverse('OK', [res(full, 'ROOFTOP')]));
  check('OK con ROOFTOP → "Calle 2 1234, Mercedes"', r.kind === 'ok' && r.value.address === 'Calle 2 1234, Mercedes' && r.value.hasNumber);
  check('conserva location_type ROOFTOP', r.kind === 'ok' && r.value.locationType === 'ROOFTOP');
}
{
  const r = parseReverseGeocode(reverse('OK', [{ address_components: [comp('Calle 2', 'route'), comp('1234', 'street_number')] }]));
  check('sin localidad → "Calle 2 1234", sin coma', r.kind === 'ok' && r.value.address === 'Calle 2 1234');
}
{
  const r = parseReverseGeocode(reverse('OK', [res(onlyRoute, 'GEOMETRIC_CENTER')]));
  check('solo route → ok pero SIN dirección (se pide la altura)', r.kind === 'ok' && r.value.address === null && !r.value.hasNumber);
}
{
  const r = parseReverseGeocode(reverse('OK', [res(onlyLocality, 'APPROXIMATE')]));
  check('solo locality → sin_resultado (nunca ", Mercedes")', r.kind === 'sin_resultado');
}
{
  const r = parseReverseGeocode(reverse('OK', [res([comp('   ', 'route'), comp('7', 'street_number')])]));
  check('route en blanco → sin_resultado', r.kind === 'sin_resultado');
}
{
  const r = parseReverseGeocode(reverse('OK', [res(onlyRoute), res(full)]));
  check('elige el primer resultado con route Y número, aunque no sea el primero', r.kind === 'ok' && r.value.address === 'Calle 2 1234, Mercedes' && r.value.hasNumber);
}
{
  const r = parseReverseGeocode(reverse('OK', [res(onlyLocality), res(onlyRoute)]));
  check('sin ninguno con número: el primero con calle (pide altura)', r.kind === 'ok' && r.value.address === null);
}
{
  const r = parseReverseGeocode(reverse('OK', [res([comp('1234', 'street_number')])]));
  check('número sin calle → sin_resultado', r.kind === 'sin_resultado');
}
{
  const r = parseReverseGeocode(reverse('OK', [{ formatted_address: 'Calle 2 1234, B7600 Mercedes, Buenos Aires', address_components: onlyLocality }]));
  check('no usa formatted_address aunque venga completo', r.kind === 'sin_resultado');
}
check('ZERO_RESULTS → sin_resultado', parseReverseGeocode(reverse('ZERO_RESULTS', [])).kind === 'sin_resultado');
check('OK con results vacío → sin_resultado', parseReverseGeocode(reverse('OK', [])).kind === 'sin_resultado');
{
  const r = parseReverseGeocode({ status: 'REQUEST_DENIED', error_message: 'You must enable Billing on the Google Cloud Project', results: [] });
  check('REQUEST_DENIED → error con el estado', r.kind === 'error' && r.motivo === 'REQUEST_DENIED');
  check('el mensaje de Google no se copia al motivo', !JSON.stringify(r).includes('Billing'));
}
{
  const r = parseReverseGeocode(reverse('OVER_QUERY_LIMIT', []));
  check('OVER_QUERY_LIMIT → error con el estado', r.kind === 'error' && r.motivo === 'OVER_QUERY_LIMIT');
}
check('sin status → error', parseReverseGeocode({ results: [res(full)] }).kind === 'error');
check('null → error', parseReverseGeocode(null).kind === 'error');
check('texto en vez de objeto → error', parseReverseGeocode('<html>').kind === 'error');

console.log('geocodificación directa');
{
  const r = parseForwardGeocode({ status: 'OK', results: [res(full, 'ROOFTOP')] });
  check('OK con ROOFTOP → coordenadas', r.kind === 'ok' && r.value.lat === -34.6479 && r.value.lng === -59.4408 && r.value.locationType === 'ROOFTOP');
}
check('ZERO_RESULTS → sin_resultado', parseForwardGeocode({ status: 'ZERO_RESULTS', results: [] }).kind === 'sin_resultado');
check('REQUEST_DENIED → error', parseForwardGeocode({ status: 'REQUEST_DENIED', results: [] }).kind === 'error');
check('OVER_QUERY_LIMIT → error', parseForwardGeocode({ status: 'OVER_QUERY_LIMIT', results: [] }).kind === 'error');
check('OK sin geometry → error', parseForwardGeocode({ status: 'OK', results: [{}] }).kind === 'error');
check('lat no numérica → error', parseForwardGeocode({ status: 'OK', results: [{ geometry: { location: { lat: 'x', lng: 1 } } }] }).kind === 'error');

console.log('fetchGeo (red falsa)');
const okRes = (body, init = {}) => async () => ({ ok: true, status: 200, json: async () => body, ...init });
{
  const r = await fetchGeo(okRes({ status: 'OK', results: [res(full)] }), 'https://x/?key=SECRET', parseReverseGeocode);
  check('respuesta OK se parsea', r.kind === 'ok');
}
{
  const r = await fetchGeo(async () => { throw new Error('fetch failed https://x/?key=SECRET'); }, 'https://x/?key=SECRET', parseReverseGeocode);
  check('red caída → error "red"', r.kind === 'error' && r.motivo === 'red');
  check('el motivo no filtra la clave ni la URL', !JSON.stringify(r).includes('SECRET') && !JSON.stringify(r).includes('https'));
}
{
  const e = new Error('The operation was aborted due to timeout'); e.name = 'TimeoutError';
  const r = await fetchGeo(async () => { throw e; }, 'https://x/', parseReverseGeocode);
  check('timeout → error "timeout"', r.kind === 'error' && r.motivo === 'timeout');
}
{
  const r = await fetchGeo(okRes({ status: 'OK', results: [res(full)] }, { ok: false, status: 500 }), 'https://x/', parseReverseGeocode);
  check('HTTP 500 → error aunque el cuerpo diga OK', r.kind === 'error' && r.motivo === 'http_500');
}
{
  const r = await fetchGeo(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } }), 'https://x/', parseReverseGeocode);
  check('cuerpo que no es JSON → error', r.kind === 'error' && r.motivo === 'respuesta_invalida');
}
{
  const r = await fetchGeo(okRes({ status: 'REQUEST_DENIED', error_message: 'billing' }), 'https://x/', parseForwardGeocode);
  check('REQUEST_DENIED con HTTP 200 → error', r.kind === 'error' && r.motivo === 'REQUEST_DENIED');
}
{
  const r = await fetchGeo(okRes({ status: 'OVER_QUERY_LIMIT' }), 'https://x/', parseForwardGeocode);
  check('OVER_QUERY_LIMIT con HTTP 200 → error', r.kind === 'error' && r.motivo === 'OVER_QUERY_LIMIT');
}
{
  const r = await fetchGeo(okRes({ status: 'ZERO_RESULTS', results: [] }), 'https://x/', parseForwardGeocode);
  check('ZERO_RESULTS → sin_resultado', r.kind === 'sin_resultado');
}

console.log('GPS: opciones y precisión');
check('timeout de 12 s y alta precisión', GEOLOCATION_OPTIONS.timeout === 12000 && GEOLOCATION_OPTIONS.enableHighAccuracy === true);
check('precisión de 20 m sirve', isGpsAccurate(20));
check('justo en el límite sirve', isGpsAccurate(GPS_MAX_ACCURACY_M));
check('1500 m (típico de Wi-Fi/IP) no sirve', !isGpsAccurate(1500));
check('sin accuracy no sirve', !isGpsAccurate(undefined) && !isGpsAccurate(NaN) && !isGpsAccurate(null));
check('el mensaje incluye el error en metros', gpsPocoPrecisaMessage(1500.4).includes('±1500 m'));

console.log('mensajes');
check('sin_resultado y error tienen mensajes distintos', geoFailureMessage({ kind: 'sin_resultado' }) !== geoFailureMessage({ kind: 'error', motivo: 'x' }));
check('permiso denegado', geoPositionErrorMessage(1) === GEO_MESSAGES.gpsDenegado);
check('posición no disponible', geoPositionErrorMessage(2) === GEO_MESSAGES.gpsNoDisponible);
check('timeout', geoPositionErrorMessage(3) === GEO_MESSAGES.gpsTimeout);
check('código desconocido → no disponible', geoPositionErrorMessage(undefined) === GEO_MESSAGES.gpsNoDisponible);

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
