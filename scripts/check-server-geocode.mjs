// Verificación de lib/serverGeocode.ts (geocodificación en el servidor) con un fetch FALSO:
// sin red, sin Google, sin clave real.
//
//   node scripts/check-server-geocode.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { geocodeAddress, boundsFor } from '../lib/serverGeocode.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const KEY = 'CLAVE-FALSA-NO-DEBE-APARECER';
const CENTER = { lat: -34.64792460763209, lng: -59.44086990384274 };

// fetch falso: guarda las URLs pedidas y responde lo que se le pase
function fakeFetch(response, opts = {}) {
  const f = async (url, init) => {
    f.calls.push(url);
    if (opts.hang) {
      return new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error(`abortado ${url}`), { name: 'AbortError' })));
      });
    }
    if (opts.throws) throw new Error(`fallo de red pidiendo ${url}`);
    return { ok: opts.status ? false : true, status: opts.status ?? 200, json: async () => response };
  };
  f.calls = [];
  return f;
}

const comp = (types, name) => ({ long_name: name, short_name: name, types });
const street = (lat, lng, locationType = 'ROOFTOP', extra = {}) => ({
  formatted_address: 'C. 16 1145, B6600 Mercedes, Provincia de Buenos Aires, Argentina',
  address_components: [comp(['street_number'], '1145'), comp(['route'], 'Calle 16'), comp(['locality', 'political'], 'Mercedes')],
  geometry: { location: { lat, lng }, location_type: locationType },
  ...extra,
});
const routeOnly = {
  formatted_address: 'C. 16, Mercedes',
  address_components: [comp(['route'], 'Calle 16'), comp(['locality', 'political'], 'Mercedes')],
  geometry: { location: { lat: -34.65, lng: -59.44 }, location_type: 'GEOMETRIC_CENTER' },
};
const run = (fetchImpl, over = {}) => geocodeAddress({ address: 'calle 16 1145', city: 'Mercedes', center: CENTER, maxRadiusKm: 3, fetchImpl, apiKey: KEY, ...over });
const leaks = (result) => JSON.stringify(result).includes(KEY) || JSON.stringify(result).includes('maps.googleapis.com');

console.log('dirección ok');
{
  const f = fakeFetch({ status: 'OK', results: [street(-34.6455, -59.4365)] });
  const r = await run(f);
  check('ROOFTOP con número → ok con coordenadas, formatted y precisión',
    r.ok && r.lat === -34.6455 && r.lng === -59.4365 && r.precision === 'ROOFTOP' && r.formatted.startsWith('C. 16 1145'));
  check('una sola llamada (sin reintentos)', f.calls.length === 1);
  const u = new URL(f.calls[0]);
  check('mismos parámetros que el navegador: dirección con ciudad, language, components',
    u.searchParams.get('address') === 'calle 16 1145, Mercedes, Argentina' && u.searchParams.get('language') === 'es'
    && u.searchParams.get('components') === 'country:AR|administrative_area:Buenos Aires');
  const b = boundsFor(CENTER, 3);
  check('bounds del radio de la zona más lejana', u.searchParams.get('bounds') === `${b.south},${b.west}|${b.north},${b.east}`);
  check('la clave va a Google pero no al resultado', u.searchParams.get('key') === KEY && !leaks(r));
}
{
  const r = await run(fakeFetch({ status: 'OK', results: [street(-34.65, -59.43, 'RANGE_INTERPOLATED')] }));
  check('RANGE_INTERPOLATED con número → ok', r.ok && r.precision === 'RANGE_INTERPOLATED');
}
{
  const f = fakeFetch({ status: 'OK', results: [street(-34.65, -59.43)] });
  await run(f, { center: null, maxRadiusKm: null, city: null });
  const u = new URL(f.calls[0]);
  check('sin centro ni radio → sin bounds; sin ciudad → la dirección sola', !u.searchParams.has('bounds') && u.searchParams.get('address') === 'calle 16 1145');
}

console.log('direcciones que no sirven');
check('sin altura (centro de la calle) → sin_altura',
  (await run(fakeFetch({ status: 'OK', results: [routeOnly] }))).reason === 'sin_altura');
check('APPROXIMATE con número → sin_altura',
  (await run(fakeFetch({ status: 'OK', results: [street(-34.65, -59.43, 'APPROXIMATE')] }))).reason === 'sin_altura');
check('partial_match → parcial',
  (await run(fakeFetch({ status: 'OK', results: [street(-34.65, -59.43, 'ROOFTOP', { partial_match: true })] }))).reason === 'parcial');
check('ZERO_RESULTS → sin_resultados', (await run(fakeFetch({ status: 'ZERO_RESULTS', results: [] }))).reason === 'sin_resultados');
check('OK sin results → sin_resultados', (await run(fakeFetch({ status: 'OK', results: [] }))).reason === 'sin_resultados');
check('punto lejos de los bounds (homónimo en otra ciudad, ~140 km) → fuera_de_bounds',
  (await run(fakeFetch({ status: 'OK', results: [street(-34.9, -57.95)] }))).reason === 'fuera_de_bounds');
{
  // Calle 30 3654: ~3,6 km del local, apenas más allá de la zona de 3 km → ok (la zona la decide resolveZone)
  const r = await run(fakeFetch({ status: 'OK', results: [street(-34.6669, -59.4719)] }));
  check('dirección real apenas fuera de la última zona → ok, no fuera_de_bounds', r.ok === true);
  check('a 22 km (radio 3 + 20 = 23) todavía no es fuera_de_bounds', (await run(fakeFetch({ status: 'OK', results: [street(-34.6479 + 22 / 111, -59.4408)] }))).ok === true);
  check('a 24 km ya es fuera_de_bounds', (await run(fakeFetch({ status: 'OK', results: [street(-34.6479 + 24 / 111, -59.4408)] }))).reason === 'fuera_de_bounds');
}
{
  const f = fakeFetch({ status: 'OK', results: [] });
  const r = await run(f, { address: '   ' });
  check('dirección vacía → sin_resultados sin llamar a Google', r.reason === 'sin_resultados' && f.calls.length === 0);
}

console.log('errores de Google y de red');
{
  const r = await run(fakeFetch({ status: 'REQUEST_DENIED', error_message: `The provided API key is invalid: ${KEY}` }));
  check('REQUEST_DENIED → google_error con el código', !r.ok && r.reason === 'google_error' && r.detail === 'REQUEST_DENIED');
  check('… sin copiar el error_message de Google (ni la clave)', !leaks(r) && !JSON.stringify(r).includes('invalid'));
}
{
  const r = await run(fakeFetch({ status: 'OVER_QUERY_LIMIT' }));
  check('OVER_QUERY_LIMIT → google_error', r.reason === 'google_error' && r.detail === 'OVER_QUERY_LIMIT');
}
{
  const r = await run(fakeFetch({}, { status: 500 }));
  check('HTTP 500 → google_error http_500', r.reason === 'google_error' && r.detail === 'http_500');
}
{
  const r = await run(fakeFetch({}, { throws: true }));
  check('fallo de red → google_error, sin la URL ni la clave', r.reason === 'google_error' && r.detail === 'red' && !leaks(r));
}
{
  const f = fakeFetch({}, { hang: true });
  const t0 = Date.now();
  const r = await run(f, { timeoutMs: 50 });
  check('Google no responde → timeout (corta solo, sin reintentar)', r.reason === 'timeout' && f.calls.length === 1 && Date.now() - t0 < 2000 && !leaks(r));
}

console.log('sin clave');
{
  const f = fakeFetch({ status: 'OK', results: [] });
  const saved = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  delete process.env.GOOGLE_MAPS_SERVER_API_KEY;
  const r = await geocodeAddress({ address: 'calle 16 1145', fetchImpl: f });
  if (saved !== undefined) process.env.GOOGLE_MAPS_SERVER_API_KEY = saved;
  check('sin GOOGLE_MAPS_SERVER_API_KEY → sin_clave, sin llamar a Google', r.reason === 'sin_clave' && f.calls.length === 0);
  check('apiKey en blanco → sin_clave', (await run(fakeFetch({}), { apiKey: '   ' })).reason === 'sin_clave');
}

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
