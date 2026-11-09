// Verificación de lib/publicOrder.ts: lista cerrada de columnas, filtro de la fila y de los
// renglones, y validación del id. Sin red.
//
//   node scripts/check-public-order.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { PUBLIC_ORDER_COLUMNS, PUBLIC_ORDER_SELECT, isValidOrderId, isValidRestaurantId, toPublicOrder } from '../lib/publicOrder.ts';
import { RATE_LIMITS } from '../lib/rateLimitCore.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

console.log('PUBLIC_ORDER_COLUMNS: lista cerrada');
{
  const SENSIBLES = [
    'customer_name', 'customer_phone', 'address', 'description', 'coupon_code', 'shift_id',
    'table_number', 'origin_plan', 'payer_name', 'payment_id', 'payment_proof', 'mp_payment_id',
    'mp_preference_id', 'mp_status', 'created_at',
  ];
  for (const col of SENSIBLES) check(`no incluye ${col}`, !PUBLIC_ORDER_COLUMNS.includes(col));
  check('ninguna columna empieza con mp_', !PUBLIC_ORDER_COLUMNS.some((c) => c.startsWith('mp_')));
  check('sin duplicados', new Set(PUBLIC_ORDER_COLUMNS).size === PUBLIC_ORDER_COLUMNS.length);
  check('tiene las 13 columnas acordadas', PUBLIC_ORDER_COLUMNS.length === 13);
  check('PUBLIC_ORDER_SELECT no es *', !PUBLIC_ORDER_SELECT.includes('*'));
  check('PUBLIC_ORDER_SELECT es la lista', PUBLIC_ORDER_SELECT.split(', ').join(',') === PUBLIC_ORDER_COLUMNS.join(','));
}

console.log('toPublicOrder: descarta lo que no está en la lista');
{
  const row = {
    id: 'a', restaurant_id: 'r', status: 'pendiente', payment_status: null, pago_confirmado: false,
    payment_method: 'efectivo', order_type: 'delivery', scheduled_delivery_time: 'Inmediato',
    total: 1000, delivery_cost: 200, discount_amount: 0, updated_at: '2026-11-09T10:00:00Z',
    items: [],
    customer_name: 'Ana Perez', customer_phone: '1155550000', address: 'Calle 123', description: 'sin cebolla',
    coupon_code: 'X', shift_id: 's', mp_payment_id: '9', secreto: 'z',
  };
  const out = toPublicOrder(row);
  check('devuelve exactamente las columnas permitidas', Object.keys(out).sort().join() === [...PUBLIC_ORDER_COLUMNS].sort().join());
  for (const k of ['customer_name', 'customer_phone', 'address', 'description', 'coupon_code', 'shift_id', 'mp_payment_id', 'secreto']) {
    check(`descarta ${k} aunque venga en la fila`, !(k in out));
  }
  check('copia los valores permitidos', out.status === 'pendiente' && out.total === 1000 && out.delivery_cost === 200 && out.restaurant_id === 'r');
  check('no devuelve el mismo objeto', out !== row);
  check('items inexistente → []', Array.isArray(toPublicOrder({ id: 'a' }).items) && toPublicOrder({ id: 'a' }).items.length === 0);
  check('items que no es array → []', toPublicOrder({ items: 'x' }).items.length === 0);
  check('fila sin nada no tira', toPublicOrder({}).status === undefined);
}

console.log('toPublicOrder: renglones');
{
  const out = toPublicOrder({
    items: [
      {
        id: 'p1', name: 'Pizza', price: 100, quantity: 2, uniqueId: 'p1-1',
        // columnas del producto que el carrito arrastra y que NO deben salir
        restaurant_id: 'r', cost: 40, image_url: 'http://x', description: 'larga', category_id: 'c', customer_name: 'Ana',
        extrasList: [{ id: 'e1', name: 'Queso', price: 10, quantity: 1, extra_secreto: 'z' }, null, 'x'],
      },
      null,
      'texto',
      7,
    ],
  });
  check('descarta renglones que no son objeto', out.items.length === 1);
  const it = out.items[0];
  check('el renglón solo tiene id, name, price, quantity, uniqueId, extrasList',
    Object.keys(it).sort().join() === ['extrasList', 'id', 'name', 'price', 'quantity', 'uniqueId'].sort().join());
  check('descarta cost, image_url, restaurant_id, description del producto',
    !('cost' in it) && !('image_url' in it) && !('restaurant_id' in it) && !('description' in it) && !('customer_name' in it));
  check('conserva los datos que muestra el seguimiento', it.name === 'Pizza' && it.price === 100 && it.quantity === 2 && it.uniqueId === 'p1-1');
  check('extras: descarta null y strings', it.extrasList.length === 1);
  check('extras: solo id, name, price, quantity',
    Object.keys(it.extrasList[0]).sort().join() === ['id', 'name', 'price', 'quantity'].sort().join());
  check('renglón sin extrasList → []', toPublicOrder({ items: [{ id: 'a' }] }).items[0].extrasList.length === 0);
}

console.log('isValidOrderId');
{
  const OK = '3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f';
  check('UUID v4 minúsculas', isValidOrderId(OK));
  check('UUID v4 mayúsculas', isValidOrderId(OK.toUpperCase()));
  check('mezcla de mayúsculas y minúsculas', isValidOrderId('3F2b8C1e-5d4A-4B7e-9c10-0A1b2C3d4E5f'));
  check('variante a', isValidOrderId('3f2b8c1e-5d4a-4b7e-a c10-0a1b2c3d4e5f'.replace(' ', '')));
  check('vacío', !isValidOrderId(''));
  check('undefined', !isValidOrderId(undefined));
  check('null', !isValidOrderId(null));
  check('número', !isValidOrderId(12345));
  check('sin guiones (32 hex)', !isValidOrderId(OK.replace(/-/g, '')));
  check('con comillas', !isValidOrderId(`'${OK}'`) && !isValidOrderId(`${OK}'`) && !isValidOrderId(`"${OK}"`));
  check('con comodines %', !isValidOrderId('%') && !isValidOrderId(`${OK.slice(0, 35)}%`) && !isValidOrderId('%' + OK.slice(1)));
  check('con comodín _', !isValidOrderId(`${OK.slice(0, 35)}_`));
  check('con asterisco', !isValidOrderId('*'));
  check('36 caracteres que no son UUID', !isValidOrderId('x'.repeat(36)) && !isValidOrderId('-'.repeat(36)) && !isValidOrderId('0'.repeat(36)));
  check('con inyección', !isValidOrderId(`${OK}' or '1'='1`));
  check('con espacios', !isValidOrderId(` ${OK}`) && !isValidOrderId(`${OK} `));
  check('con salto de línea', !isValidOrderId(`${OK}\n`));
  check('versión 1 no vale', !isValidOrderId('3f2b8c1e-5d4a-1b7e-9c10-0a1b2c3d4e5f'));
  check('variante inválida (c)', !isValidOrderId('3f2b8c1e-5d4a-4b7e-cc10-0a1b2c3d4e5f'));
  check('no hex', !isValidOrderId('3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5g'));
  check('37 caracteres', !isValidOrderId(OK + '0'));
  check('35 caracteres', !isValidOrderId(OK.slice(1)));
  check('objeto', !isValidOrderId({ toString: () => OK }));
  check('array', !isValidOrderId([OK]));
}

console.log('isValidRestaurantId (?restaurant=)');
{
  check('uuid cualquiera de versión', isValidRestaurantId('3f2b8c1e-5d4a-1b7e-9c10-0a1b2c3d4e5f'));
  check('vacío / null', !isValidRestaurantId('') && !isValidRestaurantId(null));
  check('comodines y comillas', !isValidRestaurantId('%') && !isValidRestaurantId("'x'"));
}

console.log('límite por IP');
check('seguimiento: 120 por IP por minuto', RATE_LIMITS.orderPerIp.limit === 120 && RATE_LIMITS.orderPerIp.windowSeconds === 60);

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallas`);
process.exit(failures === 0 ? 0 : 1);
