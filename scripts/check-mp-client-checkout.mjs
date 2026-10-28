// Verificación de lib/mpClientCheckout.ts (conversión del carrito, comparación de
// totales y mensajes de error). Sin red ni base.
//
//   node scripts/check-mp-client-checkout.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { convertCartForMp, totalsMatch, mpErrorMessage } from '../lib/mpClientCheckout.ts';

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
}

if (failures > 0) {
  console.log(`\n${failures} de ${total} casos FALLARON`);
  process.exit(1);
}
console.log(`\nTodos los casos OK (${total})`);
