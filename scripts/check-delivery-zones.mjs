// Verificación de lib/deliveryZones.ts (motor de zonas de envío) sin red ni Supabase.
//
//   node scripts/check-delivery-zones.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  haversineKm, normalizeZones, resolveZone, legacyZones, readDeliveryZones, readZonesForEditing, isMissingTableError, toNumber,
  MAX_ZONES, MAX_ZONE_KM,
} from '../lib/deliveryZones.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

// Datos reales de Burgers Snappy (los numeric llegan como texto)
const SNAPPY = { lat: -34.6479, lng: -59.4408 };
const snappyRows = [
  { position: 1, max_km: '1.50', cost: '3500.00' },
  { position: 2, max_km: '3.00', cost: '6000.00' },
];
const snappy = normalizeZones(snappyRows);

console.log('toNumber');
check('number', toNumber(1.5) === 1.5);
check('string numérico', toNumber('3500.00') === 3500);
check('null → NaN (Number(null) sería 0)', Number.isNaN(toNumber(null)));
check("'' → NaN (Number('') sería 0)", Number.isNaN(toNumber('')) && Number.isNaN(toNumber('   ')));
check('texto → NaN', Number.isNaN(toNumber('abc')));
check('booleano → NaN', Number.isNaN(toNumber(true)));

console.log('haversineKm');
check('mismo punto → 0', haversineKm(SNAPPY.lat, SNAPPY.lng, SNAPPY.lat, SNAPPY.lng) === 0);
{
  const d = haversineKm(-34, -59, -35, -59);
  check('1° de latitud ≈ 111,19 km', Math.abs(d - 111.19) < 0.01);
}
{
  const d = haversineKm(SNAPPY.lat, SNAPPY.lng, SNAPPY.lat + 0.009, SNAPPY.lng);
  check('0,009° al norte del local ≈ 1 km', Math.abs(d - 1.0008) < 0.001);
}

console.log('normalizeZones');
check('Burgers Snappy (strings) → 2 zonas numéricas', snappy.ok && snappy.zones.length === 2
  && snappy.zones[0].maxKm === 1.5 && snappy.zones[0].cost === 3500 && snappy.zones[1].maxKm === 3 && snappy.zones[1].cost === 6000);
{
  const r = normalizeZones([{ max_km: 3, cost: 6000 }, { max_km: 1.5, cost: 3500 }, { max_km: 5, cost: 8000 }]);
  check('zonas desordenadas → ordenadas por radio, position 1..n', r.ok && r.zones.map((z) => z.maxKm).join() === '1.5,3,5' && r.zones.map((z) => z.position).join() === '1,2,3');
}
check('vacío → sin_zonas', !normalizeZones([]).ok && normalizeZones([]).error === 'sin_zonas');
check('no es lista → sin_zonas', normalizeZones(null).error === 'sin_zonas' && normalizeZones(undefined).error === 'sin_zonas');
check(`${MAX_ZONES} zonas → ok`, normalizeZones(Array.from({ length: MAX_ZONES }, (_, i) => ({ max_km: i + 1, cost: 1000 }))).ok);
check(`${MAX_ZONES + 1} zonas → demasiadas_zonas`, normalizeZones(Array.from({ length: MAX_ZONES + 1 }, (_, i) => ({ max_km: i + 1, cost: 1000 }))).error === 'demasiadas_zonas');
check('costo null → costo_invalido (nunca envío gratis)', normalizeZones([{ max_km: 1.5, cost: null }]).error === 'costo_invalido');
check("costo '' → costo_invalido", normalizeZones([{ max_km: 1.5, cost: '' }]).error === 'costo_invalido');
check('costo negativo → costo_invalido', normalizeZones([{ max_km: 1.5, cost: -1 }]).error === 'costo_invalido');
check('costo 0 → válido (envío gratis explícito)', normalizeZones([{ max_km: 1.5, cost: 0 }]).ok);
check("costo '0' → válido", normalizeZones([{ max_km: 1.5, cost: '0' }]).ok);
check('radio 0 → radio_invalido', normalizeZones([{ max_km: 0, cost: 100 }]).error === 'radio_invalido');
check('radio null → radio_invalido', normalizeZones([{ max_km: null, cost: 100 }]).error === 'radio_invalido');
check('radio negativo → radio_invalido', normalizeZones([{ max_km: -1, cost: 100 }]).error === 'radio_invalido');
check('radio NaN/Infinity → radio_invalido', normalizeZones([{ max_km: NaN, cost: 1 }]).error === 'radio_invalido' && normalizeZones([{ max_km: Infinity, cost: 1 }]).error === 'radio_invalido');
check(`radio ${MAX_ZONE_KM} km → ok`, normalizeZones([{ max_km: MAX_ZONE_KM, cost: 1 }]).ok);
check(`radio ${MAX_ZONE_KM + 0.5} km → radio_fuera_de_rango`, normalizeZones([{ max_km: MAX_ZONE_KM + 0.5, cost: 1 }]).error === 'radio_fuera_de_rango');
check("radios repetidos (1.5 y '1.50') → radio_repetido", normalizeZones([{ max_km: 1.5, cost: 1 }, { max_km: '1.50', cost: 2 }]).error === 'radio_repetido');
check('acepta zonas ya normalizadas ({ maxKm })', normalizeZones([{ maxKm: 2, cost: 100 }]).ok);

console.log('resolveZone (límites en metros redondeados, <=)');
const dist = (km) => resolveZone(snappyRows, km);
check('0 km → zona 1', dist(0).covered && dist(0).zone.position === 1);
check('exactamente 1,5 km → zona 1', dist(1.5).covered && dist(1.5).zone.cost === 3500);
check('1,5004 km (redondea a 1500 m) → zona 1', dist(1.5004).covered && dist(1.5004).zone.position === 1);
check('1,5006 km (redondea a 1501 m) → zona 2', dist(1.5006).covered && dist(1.5006).zone.position === 2);
check('exactamente 3 km → zona 2', dist(3).covered && dist(3).zone.cost === 6000);
{
  const r = dist(3.001);
  check('3,001 km → fuera de cobertura', !r.covered && r.reason === 'fuera_de_cobertura' && r.distanceM === 3001);
}
check('zonas desordenadas: igual elige la menor que alcanza', (() => {
  const r = resolveZone([{ max_km: 3, cost: 6000 }, { max_km: 1.5, cost: 3500 }], 1.2);
  return r.covered && r.zone.cost === 3500;
})());
check('zonas vacías → configuracion_invalida', resolveZone([], 1).reason === 'configuracion_invalida');
check('costo null → configuracion_invalida (sin precio)', resolveZone([{ max_km: 1.5, cost: null }], 1).reason === 'configuracion_invalida');
check('distancia negativa → distancia_invalida', resolveZone(snappyRows, -0.1).reason === 'distancia_invalida');
check('distancia NaN → distancia_invalida', resolveZone(snappyRows, NaN).reason === 'distancia_invalida');
check('distancia como texto → distancia_invalida', resolveZone(snappyRows, '1').reason === 'distancia_invalida');
{
  // De punta a punta con coordenadas: 0,009° al norte ≈ 1 km del local
  const r = resolveZone(snappyRows, haversineKm(SNAPPY.lat, SNAPPY.lng, SNAPPY.lat + 0.009, SNAPPY.lng));
  check('punto a ~1 km de Burgers Snappy → zona 1 ($3.500)', r.covered && r.zone.cost === 3500);
}

console.log('legacyZones (columnas viejas, mismos valores efectivos que hoy)');
{
  const z = normalizeZones(legacyZones({ delivery_zone1_km: '1.5', delivery_zone1_cost: '3500.00', delivery_zone2_km: '3', delivery_zone2_cost: '6000.00' }));
  check('Burgers Snappy por columnas → mismas 2 zonas', z.ok && z.zones.length === 2 && z.zones[0].maxKm === 1.5 && z.zones[1].cost === 6000);
}
{
  const raw = legacyZones({ delivery_zone1_km: null, delivery_zone1_cost: 0, delivery_zone2_km: null, delivery_zone2_cost: 0 });
  check('radios null → 3 y 7 km (como Number(x) || 3 / || 7)', raw[0].max_km === 3 && raw[1].max_km === 7);
}
{
  const raw = legacyZones({ delivery_zone1_km: '0', delivery_zone1_cost: '0', delivery_zone2_km: 0, delivery_zone2_cost: 0 });
  check('radios 0 → 3 y 7 km', raw[0].max_km === 3 && raw[1].max_km === 7);
}
{
  const raw = legacyZones({ delivery_zone1_km: 5, delivery_zone1_cost: 100, delivery_zone2_km: 4, delivery_zone2_cost: 200 });
  check('zona 2 menor que la 1 → solo la zona 1 (hoy nunca se alcanza)', raw.length === 1 && raw[0].max_km === 5);
}
{
  const raw = legacyZones({ delivery_zone1_km: 3, delivery_zone1_cost: 100, delivery_zone2_km: 3, delivery_zone2_cost: 200 });
  check('zona 2 igual a la 1 → solo la zona 1', raw.length === 1);
}
{
  const z = normalizeZones(legacyZones({ delivery_zone1_km: 1.5, delivery_zone1_cost: null, delivery_zone2_km: 3, delivery_zone2_cost: 6000 }));
  check('costo null en columnas → inválido, no gratis', !z.ok && z.error === 'costo_invalido');
}
check('sin fila → zonas por defecto con costo null (inválido)', !normalizeZones(legacyZones(null)).ok);

console.log('readDeliveryZones (base falsa)');
function fakeDb({ rows = [], error = null } = {}) {
  const db = { queried: null };
  db.from = (table) => {
    db.queried = table;
    const q = {
      select() { return q; },
      eq() { return q; },
      order() { return Promise.resolve({ data: error ? null : rows, error }); },
    };
    return q;
  };
  return db;
}
const legacySnappy = { id: 'r1', delivery_zones_enabled: true, delivery_zone1_km: '1.5', delivery_zone1_cost: '3500', delivery_zone2_km: '3', delivery_zone2_cost: '6000' };
{
  const r = await readDeliveryZones(fakeDb({ rows: [...snappyRows, { position: 3, max_km: '5', cost: '9000' }] }), legacySnappy);
  check('con filas en la tabla → source tabla (3 zonas)', r.source === 'tabla' && r.zones.ok && r.zones.zones.length === 3);
}
{
  const r = await readDeliveryZones(fakeDb({ rows: [] }), legacySnappy);
  check('tabla sin filas para el local → columnas viejas', r.source === 'columnas' && !r.tableMissing && r.zones.ok && r.zones.zones.length === 2);
}
{
  const r = await readDeliveryZones(fakeDb({ error: { code: 'PGRST205', message: "Could not find the table 'public.delivery_zones' in the schema cache" } }), legacySnappy);
  check('tabla inexistente (SQL 14 sin correr) → columnas viejas, tableMissing', r.source === 'columnas' && r.tableMissing && r.zones.ok);
}
{
  const r = await readDeliveryZones(fakeDb({ error: { code: '42P01', message: 'relation "public.delivery_zones" does not exist' } }), legacySnappy);
  check('42P01 también cuenta como tabla inexistente', r.source === 'columnas' && r.tableMissing);
}
{
  const origError = console.error; console.error = () => {};
  const r = await readDeliveryZones(fakeDb({ error: { code: '57014', message: 'canceling statement due to statement timeout' } }), legacySnappy);
  console.error = origError;
  check('otro error de base → error (no inventa zonas)', r.source === 'error');
}
check('isMissingTableError(null) → false', !isMissingTableError(null));

console.log('readDeliveryZones: interruptor delivery_zones_enabled');
// Casa Delia / Doña Coca: tarifa fija, columnas de zona con los valores por defecto (3 y 7 km a $0)
const tarifaFija = (enabled) => ({ id: 'r2', delivery_zones_enabled: enabled, delivery_zone1_km: '3', delivery_zone1_cost: '0', delivery_zone2_km: '7', delivery_zone2_cost: '0' });
{
  const db = fakeDb({ rows: [] });
  const r = await readDeliveryZones(db, tarifaFija(false));
  check('local con tarifa fija (false) → desactivado, sin zonas', r.source === 'desactivado' && !('zones' in r));
  check('… y ni siquiera consulta la tabla', db.queried === null);
}
{
  const r = await readDeliveryZones(fakeDb(), tarifaFija(null));
  check('interruptor null → desactivado', r.source === 'desactivado');
}
{
  const r = await readDeliveryZones(fakeDb(), tarifaFija(undefined));
  check('interruptor ausente → desactivado', r.source === 'desactivado');
}
{
  const r = await readDeliveryZones(fakeDb(), tarifaFija('true'));
  check("solo true activa: 'true' (texto) → desactivado", r.source === 'desactivado');
}
{
  // Aunque la tabla tuviera filas (el dueño apagó las zonas), con el interruptor apagado no hay zonas
  const r = await readDeliveryZones(fakeDb({ rows: snappyRows }), { ...legacySnappy, delivery_zones_enabled: false });
  check('apagado con filas en la tabla → desactivado igual', r.source === 'desactivado');
}
{
  const r = await readDeliveryZones(fakeDb({ rows: snappyRows }), legacySnappy);
  check('activado con tabla → tabla', r.source === 'tabla' && r.zones.ok && r.zones.zones[0].cost === 3500);
}
{
  const r = await readDeliveryZones(fakeDb({ rows: [] }), legacySnappy);
  check('activado sin filas → columnas', r.source === 'columnas' && r.zones.ok && r.zones.zones[1].maxKm === 3);
}

console.log('readZonesForEditing (panel: valores editables sin mirar el interruptor)');
{
  const r = await readZonesForEditing(fakeDb({ rows: [] }), tarifaFija(false));
  check('tarifa fija → columnas con los valores guardados (3 y 7 km)', r.source === 'columnas' && r.zones.ok && r.zones.zones[0].maxKm === 3 && r.zones.zones[1].maxKm === 7);
}
{
  const r = await readZonesForEditing(fakeDb({ rows: snappyRows }), { ...legacySnappy, delivery_zones_enabled: false });
  check('apagado con filas → muestra las de la tabla', r.source === 'tabla' && r.zones.ok && r.zones.zones.length === 2);
}

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
