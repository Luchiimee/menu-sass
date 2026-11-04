// Verificación de lib/checkoutQuoteGate.ts (la cotización de envío en el pago con MP). Sin red.
//
//   node scripts/check-checkout-quote-gate.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { checkDeliveryQuote, addressMatchesQuote, quoteFingerprint } from '../lib/checkoutQuoteGate.ts';
import { signQuote } from '../lib/deliveryQuote.ts';
import { haversineKm } from '../lib/deliveryZones.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const SECRET = 'secreto-de-prueba-NO-DEBE-APARECER';
const NOW = Date.UTC(2026, 10, 4, 15, 0, 0);
const RID = 'e6904df6-2ea2-4c53-a57a-feef6243fc00';
const CENTER = { lat: -34.64792460763209, lng: -59.44086990384274 };
const CLIENT = { lat: -34.652182, lng: -59.442417 };
const zonesRestaurant = (over = {}) => ({
  id: RID, subscription_plan: 'go', delivery_zones_enabled: true, delivery_lat: String(CENTER.lat), delivery_lng: String(CENTER.lng), ...over,
});
const { token } = signQuote({ restaurantId: RID, address: 'calle 16 1145, Mercedes', ...CLIENT, distanceM: 494, zonePosition: 1, cost: 3500 }, SECRET, NOW);
const gate = (over = {}) => checkDeliveryQuote({
  orderType: 'delivery', restaurant: zonesRestaurant(), address: 'Calle 16 1145, Mercedes', quote: token, secret: SECRET, now: NOW + 60_000, ...over,
});

console.log('no cambia: no exige cotización');
for (const [nombre, over] of [
  ['retiro', { orderType: 'retiro', address: '' }],
  ['retiro con una cotización de más (se ignora)', { orderType: 'retiro', address: '', quote: 'basura' }],
  ['envío sin zonas (tarifa fija)', { restaurant: zonesRestaurant({ delivery_zones_enabled: false }), quote: undefined }],
  ['plan Light con zonas cargadas', { restaurant: zonesRestaurant({ subscription_plan: 'light' }), quote: undefined }],
  ['envío sin zonas, sin secreto configurado', { restaurant: zonesRestaurant({ delivery_zones_enabled: null }), quote: undefined, secret: '' }],
]) {
  const r = gate(over);
  check(nombre, r.ok && r.distanceKm === undefined && r.audit === null);
}

console.log('cotización válida');
{
  const r = gate();
  const expectedKm = haversineKm(CLIENT.lat, CLIENT.lng, CENTER.lat, CENTER.lng);
  check('ok con la distancia recalculada contra el local', r.ok && Math.abs(r.distanceKm - expectedKm) < 1e-9);
  check('auditoría: zona, distancias, costo cotizado, vencimiento y coordenadas',
    r.audit.zone_position === 1 && r.audit.distance_m === 494 && r.audit.distance_m_actual === Math.round(expectedKm * 1000)
    && r.audit.quoted_cost === 3500 && r.audit.quote_exp === new Date(NOW + 15 * 60 * 1000).toISOString()
    && r.audit.lat === CLIENT.lat && r.audit.lng === CLIENT.lng);
  check('quote_fp: huella de 16 caracteres, sin el token ni el secreto',
    r.audit.quote_fp === quoteFingerprint(token) && /^[0-9a-f]{16}$/.test(r.audit.quote_fp)
    && !JSON.stringify(r).includes(token) && !JSON.stringify(r).includes(SECRET));
}
{
  // El dueño movió el local después de cotizar: cuenta la ubicación nueva, no distanceM
  const moved = { lat: -34.6600, lng: -59.4600 };
  const r = gate({ restaurant: zonesRestaurant({ delivery_lat: moved.lat, delivery_lng: moved.lng }) });
  const km = haversineKm(CLIENT.lat, CLIENT.lng, moved.lat, moved.lng);
  check('local movido → distancia contra la ubicación actual (no los 494 m cotizados)',
    r.ok && Math.abs(r.distanceKm - km) < 1e-9 && r.audit.distance_m === 494 && r.audit.distance_m_actual !== 494);
}

console.log('dirección');
check('igual con otro formato (mayúsculas, espacios) → coincide', gate({ address: '  CALLE 16   1145,  mercedes ' }).ok);
check('con "(entre …)" → coincide', gate({ address: 'Calle 16 1145, Mercedes (entre 15 y 17)' }).ok);
check('otra dirección → cotizacion_no_coincide', gate({ address: 'Calle 16 1146, Mercedes' }).error === 'cotizacion_no_coincide');
check('la cotizada más otro texto que no es "(entre " → no coincide', gate({ address: 'Calle 16 1145, Mercedes depto 3' }).error === 'cotizacion_no_coincide');
check('prefijo engañoso "calle 16 11450" → no coincide', !addressMatchesQuote('calle 16 11450, mercedes', 'calle 16 1145, mercedes'));
check('dirección vacía → no coincide', gate({ address: '' }).error === 'cotizacion_no_coincide');

console.log('restaurante');
check('cotización de otro restaurante → cotizacion_no_coincide',
  gate({ restaurant: zonesRestaurant({ id: '11111111-1111-4111-8111-111111111111' }) }).error === 'cotizacion_no_coincide');
check('id del restaurante en mayúsculas → coincide', gate({ restaurant: zonesRestaurant({ id: RID.toUpperCase() }) }).ok);
check('local sin ubicación → local_sin_ubicacion (409)',
  (() => { const r = gate({ restaurant: zonesRestaurant({ delivery_lat: null }) }); return r.error === 'local_sin_ubicacion' && r.status === 409; })());

console.log('cotización faltante o inválida');
for (const [nombre, quote] of [['sin quote', undefined], ['quote null', null], ['quote vacío', '']]) {
  const r = gate({ quote });
  check(`${nombre} → cotizacion_requerida (400)`, r.error === 'cotizacion_requerida' && r.status === 400);
}
{
  const [body, sig] = token.split('.');
  const p = JSON.parse(Buffer.from(body, 'base64url').toString());
  p.cost = 1;
  const tampered = `${Buffer.from(JSON.stringify(p)).toString('base64url')}.${sig}`;
  check('quote alterado → cotizacion_invalida (400)', gate({ quote: tampered }).error === 'cotizacion_invalida' && gate({ quote: tampered }).status === 400);
  check('quote mal formado → cotizacion_invalida', gate({ quote: 'no-es-un-token' }).error === 'cotizacion_invalida');
  check('quote que no es string → cotizacion_invalida', gate({ quote: 12345 }).error === 'cotizacion_invalida');
  check('firmado con otro secreto → cotizacion_invalida', gate({ secret: 'otro-secreto' }).error === 'cotizacion_invalida');
}
{
  const r = gate({ secret: '' });
  check('sin CHECKOUT_QUOTE_SECRET → cotizacion_no_disponible (503)', r.error === 'cotizacion_no_disponible' && r.status === 503);
}

console.log('vencimiento (bordes)');
const exp = NOW + 15 * 60 * 1000;
check('1 ms antes de vencer → ok', gate({ now: exp - 1 }).ok);
{
  const r = gate({ now: exp });
  check('justo al vencer → cotizacion_vencida (409)', r.error === 'cotizacion_vencida' && r.status === 409);
}
check('después → cotizacion_vencida', gate({ now: exp + 60_000 }).error === 'cotizacion_vencida');

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
