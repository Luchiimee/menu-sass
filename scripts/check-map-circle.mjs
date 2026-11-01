// Verificación de lib/mapCircle.ts (borde punteado de las zonas en el mapa) sin Google.
//
//   node scripts/check-map-circle.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { circlePath, destinationPoint } from '../lib/mapCircle.ts';
import { haversineKm } from '../lib/deliveryZones.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const SNAPPY = { lat: -34.6479, lng: -59.4408 };

console.log('destinationPoint');
{
  const p = destinationPoint(SNAPPY.lat, SNAPPY.lng, 1.5, 0);
  check('1,5 km al norte: misma longitud, latitud mayor', Math.abs(p.lng - SNAPPY.lng) < 1e-9 && p.lat > SNAPPY.lat);
  check('… a 1,5 km según haversine (±1 m)', Math.abs(haversineKm(SNAPPY.lat, SNAPPY.lng, p.lat, p.lng) - 1.5) < 0.001);
}
{
  const p = destinationPoint(SNAPPY.lat, SNAPPY.lng, 3, 90);
  check('3 km al este: longitud mayor', p.lng > SNAPPY.lng);
}
{
  const p = destinationPoint(0, 179.99, 5, 90);
  check('cruza el antimeridiano y queda en [-180, 180]', p.lng >= -180 && p.lng <= 180 && p.lng < 0);
}

console.log('circlePath');
for (const km of [1.5, 3, 30]) {
  const path = circlePath(SNAPPY.lat, SNAPPY.lng, km);
  const maxErrM = Math.max(...path.map((p) => Math.abs(haversineKm(SNAPPY.lat, SNAPPY.lng, p.lat, p.lng) - km) * 1000));
  check(`radio ${km} km: todos los puntos a ${km} km (error máx. ${maxErrM.toFixed(3)} m)`, maxErrM < 1);
}
{
  const path = circlePath(SNAPPY.lat, SNAPPY.lng, 3, 96);
  check('97 puntos y cerrado (el último repite el primero)', path.length === 97
    && Math.abs(path[0].lat - path[96].lat) < 1e-9 && Math.abs(path[0].lng - path[96].lng) < 1e-9);
}
check('mínimo 8 segmentos', circlePath(SNAPPY.lat, SNAPPY.lng, 1, 2).length === 9);
check('radio 0 → vacío', circlePath(SNAPPY.lat, SNAPPY.lng, 0).length === 0);
check('radio negativo → vacío', circlePath(SNAPPY.lat, SNAPPY.lng, -1).length === 0);
check('NaN → vacío', circlePath(NaN, SNAPPY.lng, 1).length === 0 && circlePath(SNAPPY.lat, SNAPPY.lng, NaN).length === 0);

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
