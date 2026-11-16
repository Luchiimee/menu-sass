// Verificación de POST /api/checkout/order (pedidos de efectivo / transferencia / mesa): validación del body
// (lib/orderCheckout.ts), armado de items (lib/orderItems.ts), conversión del carrito con combo destacado
// (lib/mpClientCheckout.ts) y límites de uso. Sin red ni base.
//
//   node scripts/check-order-checkout.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { readFileSync } from 'node:fs';
import { parseOrderRequest, ORDER_MAX_NAME, ORDER_MAX_NOTES } from '../lib/orderCheckout.ts';
import { buildOrderItems } from '../lib/orderItems.ts';
import { convertCartForMp } from '../lib/mpClientCheckout.ts';
import { RATE_LIMITS, ipKey, restaurantKey } from '../lib/rateLimitCore.ts';

let failed = 0;
function check(name, ok, detail) {
  console.log(`${name} → ${ok ? 'OK' : 'FALLA'}${detail ? ` (${detail})` : ''}`);
  if (!ok) failed++;
}

const RID = '11111111-1111-4111-8111-111111111111';
const OID = '22222222-2222-4222-8222-222222222222';
const PID = '33333333-3333-4333-8333-333333333333';
const cart = [{ productId: PID, extras: [], quantity: 1 }];
const base = () => ({
  restaurant_id: RID, order_id: OID, order_type: 'retiro', payment_method: 'efectivo',
  customer_name: 'Ana Pérez', customer_phone: '1122334455', cart, expected_total: 9000,
});

// --- parseOrderRequest: pedido válido ---
{
  const r = parseOrderRequest(base());
  check('retiro válido', r.ok && r.value.orderType === 'retiro' && r.value.address === '' && r.value.tableNumber === null);
  check('horario por defecto Inmediato', r.ok && r.value.scheduledDeliveryTime === 'Inmediato');
  check('el id del pedido se normaliza a minúsculas', parseOrderRequest({ ...base(), order_id: OID.toUpperCase() }).value?.orderId === OID);
}
{
  const r = parseOrderRequest({ ...base(), order_type: 'delivery', address: 'Calle 123', delivery_cost: 800 });
  check('delivery con dirección y envío informado', r.ok && r.value.address === 'Calle 123' && r.value.clientShipping === 800);
  check('delivery sin dirección → direccion_invalida', parseOrderRequest({ ...base(), order_type: 'delivery' }).error === 'direccion_invalida');
}
{
  const r = parseOrderRequest({ ...base(), order_type: 'mesa', table_number: 'Mesa 4', address: 'ignorada' });
  check('mesa con número', r.ok && r.value.tableNumber === 'Mesa 4' && r.value.address === '');
  check('mesa sin número → mesa_invalida', parseOrderRequest({ ...base(), order_type: 'mesa' }).error === 'mesa_invalida');
  check('retiro ignora table_number', parseOrderRequest({ ...base(), table_number: 'Mesa 9' }).value?.tableNumber === null);
}
// --- medios de pago: Mercado Pago NO entra por acá ---
for (const bad of ['mercadopago', 'tarjeta', '', null, undefined, 5]) {
  check(`payment_method ${JSON.stringify(bad)} → metodo_pago_invalido`, parseOrderRequest({ ...base(), payment_method: bad }).error === 'metodo_pago_invalido');
}
for (const bad of ['drone', '', null, undefined]) {
  check(`order_type ${JSON.stringify(bad)} → tipo_pedido_invalido`, parseOrderRequest({ ...base(), order_type: bad }).error === 'tipo_pedido_invalido');
}
// --- ids ---
check('restaurant_id inválido', parseOrderRequest({ ...base(), restaurant_id: 'abc' }).error === 'restaurante_invalido');
check('order_id inválido', parseOrderRequest({ ...base(), order_id: 'abc' }).error === 'pedido_invalido');
check('sin order_id', parseOrderRequest({ ...base(), order_id: undefined }).error === 'pedido_invalido');
// --- textos ---
check('nombre vacío', parseOrderRequest({ ...base(), customer_name: '  ' }).error === 'nombre_invalido');
check('nombre demasiado largo', parseOrderRequest({ ...base(), customer_name: 'x'.repeat(ORDER_MAX_NAME + 1) }).error === 'nombre_invalido');
check('nombre no string', parseOrderRequest({ ...base(), customer_name: { a: 1 } }).error === 'nombre_invalido');
check('notas demasiado largas', parseOrderRequest({ ...base(), notes: 'x'.repeat(ORDER_MAX_NOTES + 1) }).error === 'notas_invalidas');
check('teléfono opcional', parseOrderRequest({ ...base(), customer_phone: '' }).ok);
check('horario programado se conserva', parseOrderRequest({ ...base(), scheduled_delivery_time: '21:30' }).value?.scheduledDeliveryTime === '21:30');
// --- totales informados ---
check('expected_total opcional', parseOrderRequest({ ...base(), expected_total: undefined }).value?.expectedTotal === null);
for (const bad of ['9000', NaN, Infinity, {}, []]) {
  check(`expected_total ${JSON.stringify(bad)} → inválido`, parseOrderRequest({ ...base(), expected_total: bad }).error === 'total_esperado_invalido');
}
check('delivery_cost no numérico → envio_invalido', parseOrderRequest({ ...base(), delivery_cost: '800' }).error === 'envio_invalido');
// --- body inválido ---
for (const bad of [null, undefined, 'x', 5, []]) {
  check(`body ${JSON.stringify(bad)} → body_invalido`, parseOrderRequest(bad).error === 'body_invalido');
}
// --- el body NO puede traer precios ni estados: se ignoran y no pasan a value ---
{
  const r = parseOrderRequest({ ...base(), total: 1, price: 1, status: 'entregado', pago_confirmado: true, payment_status: 'pagado', shift_id: 'x', discount_amount: 99, origin_plan: 'plus' });
  const keys = Object.keys(r.value ?? {});
  check('campos de precio/estado del body no llegan al pedido', r.ok && !['total', 'price', 'status', 'pagoConfirmado', 'paymentStatus', 'shiftId', 'discountAmount', 'originPlan'].some((k) => keys.includes(k)));
}

// --- buildOrderItems: mismo formato que el carrito y que los pedidos de MP ---
{
  const items = buildOrderItems([
    { productId: PID, variationIndex: null, name: 'Burger', unitBase: 9000, quantity: 2, extras: [{ extraId: 'e1', name: 'Queso', price: 500, qty: 1 }] },
    { productId: PID, variationIndex: 1, name: 'Helado (1 kg)', unitBase: 11000, quantity: 1, extras: [] },
    { productId: 'hero-item', variationIndex: null, name: 'Combo Pro', unitBase: 15000, quantity: 1, extras: [] },
  ]);
  check('items: id simple', items[0].id === PID && items[0].price === 9000 && items[0].quantity === 2);
  check('items: extra por unidad', items[0].extrasList[0].id === 'e1' && items[0].extrasList[0].quantity === 1);
  check('items: variación → id producto-índice', items[1].id === `${PID}-1` && items[1].uniqueId === `${PID}-1-2`);
  check('items: combo destacado', items[2].id === 'hero-item' && items[2].price === 15000);
}

// --- convertCartForMp con allowHero ---
{
  const hero = [{ id: 'hero-item', quantity: 2, price: 1 }];
  check('MP sigue rechazando el combo', convertCartForMp(hero).ok === false && convertCartForMp(hero).reason === 'combo');
  const r = convertCartForMp([...hero, { id: PID, quantity: 1, extrasList: [] }], { allowHero: true });
  check('pedido offline acepta el combo sin precio', r.ok && r.items[0].productId === 'hero-item' && r.items[0].quantity === 2 && !('price' in r.items[0]));
  check('allowHero no habilita otros ids hero', convertCartForMp([{ id: 'hero-otro', quantity: 1 }], { allowHero: true }).reason === 'combo');
  check('combo con cantidad inválida', convertCartForMp([{ id: 'hero-item', quantity: 0 }], { allowHero: true }).reason === 'cantidad');
}

// --- límites de uso ---
check('límite por IP más holgado que el pago online', RATE_LIMITS.newOrderPerIp.limit > RATE_LIMITS.checkoutPerIp.limit && RATE_LIMITS.newOrderPerIp.windowSeconds === 600);
check('límite por restaurante más holgado que el pago online', RATE_LIMITS.newOrderPerRestaurant.limit > RATE_LIMITS.checkoutPerRestaurant.limit);
check('claves propias (no comparten contador con el pago)', ipKey('neworder', 'h') === 'neworder:ip:h' && restaurantKey(RID, 'neworder') === `neworder:rid:${RID}`);

// --- la ruta: orden de las comprobaciones y escritura con service_role ---
{
  const src = readFileSync(new URL('../app/api/checkout/order/route.ts', import.meta.url), 'utf8');
  const at = (needle) => src.indexOf(needle);
  check('ruta: límite por IP antes de leer la base', at("limitByIp(req, 'neworder'") > -1 && at("limitByIp(req, 'neworder'") < at('getSupabaseAdmin()'));
  check('ruta: total recalculado con offline y sin precios del body', at('computeOrderTotal(') > -1 && at('offline: {') > -1 && !/total:\s*o\./.test(src));
  check('ruta: expected_total se compara antes de escribir', at('totalsMatch(') > -1 && at('totalsMatch(') < at(".from('orders').insert"));
  check('ruta: estado y pago fijos del lado servidor', src.includes("status: 'pendiente'") && src.includes("payment_status: 'pendiente'") && src.includes('pago_confirmado: false'));
  check('ruta: total e items salen del cálculo', src.includes('total: priced.total') && src.includes('buildOrderItems(priced.lines)'));
  check('ruta: límites fallan abiertos', src.includes("RATE_LIMITS.newOrderPerIp, 'open'") && src.includes("RATE_LIMITS.newOrderPerRestaurant, 'open', 'neworder'"));
  check('ruta: id duplicado cuenta como éxito', src.includes('isDuplicateOrderIdError(insertError)'));
}

// --- GET /api/public/discount-rules: lista cerrada de columnas, solo reglas activas ---
{
  const src = readFileSync(new URL('../app/api/public/discount-rules/route.ts', import.meta.url), 'utf8');
  check('reglas: solo activas y por restaurante', src.includes(".eq('activo', true)") && src.includes(".eq('restaurant_id', rid)"));
  check('reglas: columnas cerradas (sin select *)', !/select\(\s*['"]\*/.test(src) && src.includes('RULE_COLUMNS'));
  check('reglas: valida el id y limita por IP', src.includes('UUID.test(rid)') && src.includes("limitByIp(req, 'public'"));
}

// --- CartFooter: ya no inserta en orders desde el navegador ---
{
  const src = readFileSync(new URL('../components/CartFooter.tsx', import.meta.url), 'utf8');
  check('CartFooter: sin insert directo a orders', !/\.from\(\s*['"]orders['"]\s*\)\s*\.insert/.test(src));
  check('CartFooter: usa /api/checkout/order', src.includes("fetch('/api/checkout/order'"));
  check('CartFooter: las reglas de descuento vienen del servidor (la tabla es privada para anon)', src.includes('/api/public/discount-rules?rid=') && !/\.from\(\s*['"]discount_rules['"]\s*\)/.test(src));
  check('CartFooter: manda expected_total y delivery_cost, no total', src.includes('expected_total: totalFinal') && src.includes('delivery_cost: envio') && !/\btotal: totalFinal/.test(src));
}

if (failed > 0) {
  console.error(`\n${failed} caso(s) fallaron`);
  process.exit(1);
}
console.log('\nTodos los casos OK');
