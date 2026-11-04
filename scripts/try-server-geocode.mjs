// Prueba REAL de lib/serverGeocode.ts contra Google: se corre A MANO, no es un test.
//
//   node --env-file=.env.local scripts/try-server-geocode.mjs
//
// Hace como máximo 3 llamadas a Geocoding (una por dirección), sin bucles ni reintentos, y
// muestra para cada una el resultado, la distancia en línea recta al local y la zona que daría
// resolveZone con las zonas de ejemplo de abajo. Nunca imprime la clave ni la URL.

import { geocodeAddress } from '../lib/serverGeocode.ts';
import { haversineKm, resolveZone, legacyZones } from '../lib/deliveryZones.ts';

const CENTER = { lat: -34.64792460763209, lng: -59.44086990384274 };
// Solo para el ejemplo: zona 1 hasta 1,5 km a $3.500 y zona 2 hasta 3 km a $6.000
const ZONES = legacyZones({ delivery_zone1_km: 1.5, delivery_zone1_cost: 3500, delivery_zone2_km: 3, delivery_zone2_cost: 6000 });
const MAX_RADIUS_KM = 3;
const ADDRESSES = ['calle 16 1145, Mercedes', 'calle 22 128, Mercedes', 'Calle 30 3654, Mercedes'];

if (!process.env.GOOGLE_MAPS_SERVER_API_KEY) {
  console.error('Falta GOOGLE_MAPS_SERVER_API_KEY. ¿Corriste con --env-file=.env.local?');
  process.exit(1);
}

for (const address of ADDRESSES) {
  const r = await geocodeAddress({ address, center: CENTER, maxRadiusKm: MAX_RADIUS_KM });
  console.log(`\n${address}`);
  if (!r.ok) {
    console.log(`  resultado: ${r.reason}${r.detail ? ` (${r.detail})` : ''}`);
    continue;
  }
  const km = haversineKm(r.lat, r.lng, CENTER.lat, CENTER.lng);
  const zone = resolveZone(ZONES, km);
  const zoneText = zone.covered
    ? `zona ${zone.zone.position} (hasta ${zone.zone.maxKm} km) → $${zone.zone.cost.toLocaleString('es-AR')}`
    : zone.reason === 'fuera_de_cobertura' ? 'fuera de cobertura' : zone.reason;
  console.log(`  resultado: ok · ${r.precision} · ${r.formatted}`);
  console.log(`  coordenadas: ${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}`);
  console.log(`  distancia al local: ${km.toFixed(2)} km`);
  console.log(`  zona: ${zoneText}`);
}
