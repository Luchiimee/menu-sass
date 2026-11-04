// Verificación de lib/geocodeCache.ts (caché en memoria de la geocodificación de la cotización).
//
//   node scripts/check-geocode-cache.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { createTtlCache, geocodeCacheKey, isCacheableGeocode, GEOCODE_CACHE_TTL_MS } from '../lib/geocodeCache.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

let t = 0;
const cache = createTtlCache({ ttlMs: 1000, maxEntries: 3, now: () => t });

console.log('vencimiento');
cache.set('a', 1);
t = 999;
check('antes del vencimiento → devuelve el valor', cache.get('a') === 1);
t = 1000;
check('justo al vencer → no está', cache.get('a') === undefined && cache.size() === 0);
check('6 horas', GEOCODE_CACHE_TTL_MS === 6 * 60 * 60 * 1000);

console.log('tope de entradas');
t = 0;
cache.set('a', 1); cache.set('b', 2); cache.set('c', 3); cache.set('d', 4);
check('pasado el tope se descarta la más vieja', cache.size() === 3 && cache.get('a') === undefined && cache.get('d') === 4);
cache.set('b', 22); cache.set('e', 5);
check('reinsertar renueva la entrada (se descarta otra)', cache.get('b') === 22 && cache.get('c') === undefined);

console.log('clave');
const base = { restaurantId: 'E6904DF6-2EA2-4C53-A57A-FEEF6243FC00', address: 'calle 16 1145, mercedes', center: { lat: -34.64792460763209, lng: -59.44086990384274 }, maxRadiusKm: 3 };
const k = geocodeCacheKey(base);
check('estable y con el restaurante en minúsculas', k === geocodeCacheKey({ ...base }) && k.startsWith('e6904df6-'));
check('otra dirección → otra clave', k !== geocodeCacheKey({ ...base, address: 'calle 16 1146, mercedes' }));
check('otro restaurante → otra clave', k !== geocodeCacheKey({ ...base, restaurantId: '11111111-1111-4111-8111-111111111111' }));
check('el local se movió → otra clave', k !== geocodeCacheKey({ ...base, center: { lat: -34.65, lng: -59.44 } }));
check('cambió el radio de la última zona → otra clave', k !== geocodeCacheKey({ ...base, maxRadiusKm: 4 }));

console.log('qué se guarda');
check('ok → sí', isCacheableGeocode({ ok: true }));
for (const reason of ['sin_altura', 'parcial', 'sin_resultados', 'fuera_de_bounds']) check(`${reason} → sí`, isCacheableGeocode({ ok: false, reason }));
for (const reason of ['google_error', 'timeout', 'sin_clave']) check(`${reason} → no (puede resolverse en el próximo intento)`, !isCacheableGeocode({ ok: false, reason }));

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
