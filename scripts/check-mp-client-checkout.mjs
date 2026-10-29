// Verificación de lib/mpClientCheckout.ts (conversión del carrito, comparación de
// totales y mensajes de error). Sin red ni base.
//
//   node scripts/check-mp-client-checkout.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  convertCartForMp, totalsMatch, mpErrorMessage,
  parseReturnParams, parseStoredMpPending, nextPollDelay, decideNext,
} from '../lib/mpClientCheckout.ts';

const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';
const E1 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
const E2 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2';

let failures = 0;
let total = 0;
function check(name, cond, extra = '') {
  total++;
  if (cond) console.log(`  ok   ${name}`);
  else { failures++; console.log(`  FAIL ${name} ${extra}`); }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const line = (over = {}) => ({ id: P1, name: 'Burger', price: 9000, quantity: 2, uniqueId: `${P1}-1`, extrasList: [], ...over });

console.log('convertCartForMp');
{
  let r = convertCartForMp([line()]);
  check('producto simple', r.ok && same(r.items, [{ productId: P1, extras: [], quantity: 2 }]), JSON.stringify(r));

  r = convertCartForMp([line({ id: `${P1}-2`, name: 'Burger (Doble)' })]);
  check('variación: uuid-N → productId + variationIndex', r.ok && same(r.items, [{ productId: P1, variationIndex: 2, extras: [], quantity: 2 }]), JSON.stringify(r));

  r = convertCartForMp([line({ extrasList: [{ id: E1, name: 'Queso', price: 500, quantity: 1 }, { id: E2, name: 'Bacon', price: 700, quantity: 2 }] })]);
  check('extras: id → extraId, quantity → qty (por unidad)',
    r.ok && same(r.items[0].extras, [{ extraId: E1, qty: 1 }, { extraId: E2, qty: 2 }]), JSON.stringify(r));

  r = convertCartForMp([line({ extrasList: [{ id: E1, name: 'Queso', price: 500, quantity: 0 }] })]);
  check('extra en 0 se descarta', r.ok && same(r.items[0].extras, []));

  r = convertCartForMp([line(), line({ id: P2, uniqueId: `${P2}-2` })]);
  check('varios renglones', r.ok && r.items.length === 2 && r.items[1].productId === P2);

  r = convertCartForMp([line(), { ...line(), id: 'hero-item', name: 'Combo' }]);
  check('combo / hero-item no convierte', !r.ok && r.reason === 'combo');
  r = convertCartForMp([line({ id: 'hero-promo-1' })]);
  check('cualquier id que empieza con hero es combo', !r.ok && r.reason === 'combo');

  r = convertCartForMp([]);
  check('carrito vacío', !r.ok && r.reason === 'vacio');
  r = convertCartForMp(null);
  check('carrito null', !r.ok && r.reason === 'vacio');
  r = convertCartForMp(Array.from({ length: 51 }, () => line()));
  check('más de 50 renglones', !r.ok && r.reason === 'vacio');
  r = convertCartForMp(Array.from({ length: 50 }, () => line()));
  check('50 renglones entra', r.ok);

  r = convertCartForMp([line({ id: 'algo-raro' })]);
  check('id que no es de producto', !r.ok && r.reason === 'producto_no_convertible');
  r = convertCartForMp([line({ id: 12345 })]);
  check('id numérico', !r.ok && r.reason === 'producto_no_convertible');
  r = convertCartForMp([line({ id: `${P1}-2-3` })]);
  check('uuid con doble sufijo', !r.ok && r.reason === 'producto_no_convertible');

  r = convertCartForMp([line({ quantity: 0 })]);
  check('cantidad 0', !r.ok && r.reason === 'cantidad');
  r = convertCartForMp([line({ quantity: 51 })]);
  check('cantidad 51', !r.ok && r.reason === 'cantidad');
  r = convertCartForMp([line({ quantity: 1.5 })]);
  check('cantidad decimal', !r.ok && r.reason === 'cantidad');
  r = convertCartForMp([line({ quantity: 50 })]);
  check('cantidad 50 entra', r.ok);

  r = convertCartForMp([line({ extrasList: [{ id: E1, quantity: 1 }, { id: E1, quantity: 2 }] })]);
  check('extra repetido en un renglón', !r.ok && r.reason === 'extra_no_convertible');
  r = convertCartForMp([line({ extrasList: [{ id: E1, quantity: 51 }] })]);
  check('extra con cantidad fuera de rango', !r.ok && r.reason === 'extra_no_convertible');
  r = convertCartForMp([line({ extrasList: [{ id: 99, quantity: 1 }] })]);
  check('extra con id no string', !r.ok && r.reason === 'extra_no_convertible');

  // El resultado no lleva precio ni nombre (el servidor recalcula)
  r = convertCartForMp([line({ extrasList: [{ id: E1, name: 'Queso', price: 500, quantity: 1 }] })]);
  check('no viajan price ni name', r.ok && !/price|name|Burger|Queso|9000|500/.test(JSON.stringify(r.items)), JSON.stringify(r));
}

console.log('totalsMatch');
{
  check('iguales', totalsMatch(29300, 29300));
  check('flotante del cliente vs redondeo del servidor', totalsMatch(1234.5678, 1234.57));
  check('suma con error de coma flotante', totalsMatch(0.1 + 0.2, 0.3));
  check('1 centavo de diferencia se tolera', totalsMatch(100.01, 100));
  check('2 centavos de diferencia no', !totalsMatch(100.02, 100));
  check('distintos', !totalsMatch(29300, 30100));
  check('NaN', !totalsMatch(NaN, 100));
  check('undefined', !totalsMatch(undefined, 100));
  check('string numérico se acepta', totalsMatch('100', 100));
  check('string no numérico', !totalsMatch('abc', 100));
}

console.log('mpErrorMessage');
{
  check('código conocido', mpErrorMessage('cerrado').includes('cerrado'));
  check('código desconocido → mensaje genérico', mpErrorMessage('lo_que_sea') === 'No pudimos iniciar el pago. Intentá de nuevo.');
  check('sin código → genérico', mpErrorMessage(undefined).startsWith('No pudimos'));
  check('combo_no_soportado explica qué hacer', /combo/i.test(mpErrorMessage('combo_no_soportado')));
  check('mp_temporalmente_no_disponible (503 reintentable)', mpErrorMessage('mp_temporalmente_no_disponible') === 'No pudimos iniciar el pago, probá de nuevo en unos segundos');
  check('mp_no_conectado sigue igual', mpErrorMessage('mp_no_conectado').includes('Elegí otro medio de pago'));
}

console.log('parseReturnParams');
{
  const sp = (q) => new URLSearchParams(q);
  let r = parseReturnParams(sp(`mp=success&ref=${P1}`));
  check('success + ref', r && r.mp === 'success' && r.ref === P1);
  r = parseReturnParams(sp(`mp=failure&ref=${P1.toUpperCase()}`));
  check('ref en mayúsculas se normaliza', r && r.ref === P1);
  r = parseReturnParams(sp('mp=pending'));
  check('sin ref → ref null', r && r.mp === 'pending' && r.ref === null);
  r = parseReturnParams(sp('mp=success&ref=no-es-uuid'));
  check('ref inválido → null', r && r.ref === null);
  check('mp desconocido → no es vuelta', parseReturnParams(sp(`mp=hacked&ref=${P1}`)) === null);
  check('sin mp → no es vuelta', parseReturnParams(sp(`ref=${P1}`)) === null);
  r = parseReturnParams(sp(`mp=success&ref=${P1}&status=approved&payment_id=1&external_reference=${P2}`));
  check('ignora los parámetros de MP (external_reference no se usa como ref)', r && r.ref === P1 && Object.keys(r).length === 2);
}

console.log('parseStoredMpPending');
{
  const NOW = 1_700_000_000_000;
  const entry = (over = {}) => JSON.stringify({ ref: P1, metodoEnvio: 'retiro', ts: NOW - 60_000, restaurantId: 'rest-1', cart: [line()], ...over });
  let r = parseStoredMpPending(entry(), 'rest-1', NOW);
  check('entrada válida', r && r.ref === P1 && r.metodoEnvio === 'retiro' && r.cart.length === 1);
  check('null/vacío', parseStoredMpPending(null, 'rest-1', NOW) === null && parseStoredMpPending('', 'rest-1', NOW) === null);
  check('JSON roto', parseStoredMpPending('{no', 'rest-1', NOW) === null);
  check('otro restaurante', parseStoredMpPending(entry({ restaurantId: 'rest-2' }), 'rest-1', NOW) === null);
  check('vencida (más de 24 h)', parseStoredMpPending(entry({ ts: NOW - 25 * 3600_000 }), 'rest-1', NOW) === null);
  check('ts del futuro', parseStoredMpPending(entry({ ts: NOW + 3600_000 }), 'rest-1', NOW) === null);
  check('ref inválido', parseStoredMpPending(entry({ ref: 'x' }), 'rest-1', NOW) === null);
  check('metodoEnvio mesa no vale', parseStoredMpPending(entry({ metodoEnvio: 'mesa' }), 'rest-1', NOW) === null);
  r = parseStoredMpPending(entry({ cart: 'basura' }), 'rest-1', NOW);
  check('cart no array → []', r && Array.isArray(r.cart) && r.cart.length === 0);
}

console.log('nextPollDelay');
{
  check('arranca en 2 s y sube de a poco', nextPollDelay(2000, 'ok') === 2500 && nextPollDelay(2500, 'ok') === 3125);
  let d = 2000;
  for (let i = 0; i < 20; i++) d = nextPollDelay(d, 'ok');
  check('tope de 5 s', d === 5000, String(d));
  check('429 duplica', nextPollDelay(2000, 'rate_limited') === 4000 && nextPollDelay(5000, 'rate_limited') === 10000);
  check('429 repetido tiene tope', nextPollDelay(15000, 'rate_limited') === 20000 && nextPollDelay(20000, 'rate_limited') === 20000);
  check('error de red también duplica', nextPollDelay(3000, 'error') === 6000);
}

console.log('decideNext');
{
  const d = (state, mode, recheckDone = false) => decideNext({ state, mode, recheckDone });
  check('order_created → order_created', d('order_created', 'success') === 'order_created' && d('order_created', 'failure') === 'order_created');
  check('paid → wait_paid (también desde failure)', d('paid', 'success') === 'wait_paid' && d('paid', 'failure') === 'wait_paid');
  check('pending en success/pending → sigue esperando', d('pending', 'success') === 'wait_pending' && d('pending', 'pending') === 'wait_pending');
  check('pending en failure → recheck', d('pending', 'failure') === 'recheck');
  check('failed la primera vez → recheck', d('failed', 'success') === 'recheck');
  check('failed después del recheck → failure', d('failed', 'success', true) === 'failure');
  check('expired primera vez → recheck, luego failure', d('expired', 'pending') === 'recheck' && d('expired', 'pending', true) === 'failure');
  check('not_found primera vez → recheck, luego failure', d('not_found', 'success') === 'recheck' && d('not_found', 'success', true) === 'failure');
  check('pending en failure tras recheck → failure', d('pending', 'failure', true) === 'failure');
}

if (failures > 0) {
  console.log(`\n${failures} de ${total} casos FALLARON`);
  process.exit(1);
}
console.log(`\nTodos los casos OK (${total})`);
