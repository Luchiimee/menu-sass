// Verificación del cálculo de totales del checkout online (lib/checkoutPricing.ts).
// Usa un cliente de base falso en memoria: sin red, sin Supabase, sin Mercado Pago.
//
//   node scripts/check-checkout-pricing.mjs       (Node >= 22.18 / 24: importa .ts directo)
//
// Falla (exit 1) si algún caso esperado no da.

import { computeOrderTotal, CheckoutError, isProductPurchasable } from '../lib/checkoutPricing.ts';

// ---------- base falsa: from().select().eq().in().maybeSingle() ----------
function makeDb(tables) {
  return {
    from(table) {
      const filters = [];
      const q = {
        select() { return q; },
        eq(col, val) { filters.push((r) => r[col] === val); return q; },
        in(col, vals) { filters.push((r) => vals.includes(r[col])); return q; },
        _rows() { return (tables[table] || []).filter((r) => filters.every((f) => f(r))); },
        maybeSingle() { return Promise.resolve({ data: q._rows()[0] ?? null, error: null }); },
        then(resolve, reject) { return Promise.resolve({ data: q._rows(), error: null }).then(resolve, reject); },
      };
      return q;
    },
  };
}

const R1 = 'rest-1';
const R2 = 'rest-2';
const NOW = new Date('2026-06-15T15:00:00Z');

function baseTables() {
  return {
    restaurants: [
      { id: R1, subscription_plan: 'go', delivery_cost: 800, delivery_zones_enabled: false, delivery_zone2_cost: 1500 },
    ],
    products: [
      { id: 'burger', restaurant_id: R1, name: 'Burger', price: 9000, sale_type: 'unidad', variations: [] },
      { id: 'otra', restaurant_id: R2, name: 'De otro local', price: 5000, sale_type: 'unidad', variations: [] },
      { id: 'kilo', restaurant_id: R1, name: 'Helado', price: 0, sale_type: 'peso',
        variations: [{ label: '1/2 kg', price: '6000' }, { label: '1 kg', price: '11000' }] },
    ],
    extras: [
      { id: 'queso', restaurant_id: R1, name: 'Queso', price: 500, is_available: true },
      { id: 'huevo', restaurant_id: R1, name: 'Huevo', price: 700, is_available: false },
      { id: 'suelto', restaurant_id: R1, name: 'Sin vínculo', price: 300, is_available: true },
    ],
    product_extras: [
      { product_id: 'burger', extra_id: 'queso' },
      { product_id: 'burger', extra_id: 'huevo' },
    ],
    coupons: [
      { restaurant_id: R1, code: 'VIGENTE', is_active: true, starts_at: '2026-01-01T00:00:00Z', expires_at: '2026-12-31T00:00:00Z', discount_percent: 10 },
      { restaurant_id: R1, code: 'VENCIDO', is_active: true, starts_at: '2026-01-01T00:00:00Z', expires_at: '2026-03-01T00:00:00Z', discount_percent: 10 },
      { restaurant_id: R1, code: 'APAGADO', is_active: false, starts_at: '2026-01-01T00:00:00Z', expires_at: null, discount_percent: 10 },
      { restaurant_id: R1, code: 'FUTURO', is_active: true, starts_at: '2026-09-01T00:00:00Z', expires_at: null, discount_percent: 10 },
      { restaurant_id: R1, code: 'TODO', is_active: true, starts_at: '2026-01-01T00:00:00Z', expires_at: null, discount_percent: 100 },
    ],
    discount_rules: [],
  };
}

let failed = 0;
function report(name, ok, detail) {
  console.log(`${name} → ${ok ? 'OK' : 'FALLA'}${detail ? ` (${detail})` : ''}`);
  if (!ok) failed++;
}
const run = (tables, cart, type = 'delivery', coupon = null) =>
  computeOrderTotal(R1, cart, type, { db: makeDb(tables), couponCode: coupon, now: NOW });

async function expectError(name, code, fn) {
  try {
    await fn();
    report(name, false, `no lanzó (esperaba ${code})`);
  } catch (e) {
    report(name, e instanceof CheckoutError && e.code === code, `código ${e.code ?? e.message}`);
  }
}

// (a) 3 × producto con extra de $500 = precio×3 + $1.500 (+ envío fijo $800)
{
  const r = await run(baseTables(), [{ productId: 'burger', extras: [{ extraId: 'queso', qty: 1 }], quantity: 3 }]);
  report('(a) 3 × $9.000 con extra $500 → subtotal $28.500', r.subtotal === 28500, `subtotal ${r.subtotal}`);
  report('(a) total con envío fijo $800', r.total === 29300, `total ${r.total}`);
  const r2 = await run(baseTables(), [{ productId: 'burger', extras: [{ extraId: 'queso', qty: 2 }], quantity: 3 }], 'retiro');
  report('(a) extra ×2 por unidad, retiro sin envío', r2.total === (9000 + 1000) * 3, `total ${r2.total}`);
}

// (b) precio manipulado en el body se ignora
{
  const evil = [{ productId: 'burger', price: 1, unit_price: 1, total: 1, name: 'x',
    extras: [{ extraId: 'queso', qty: 1, price: 0 }], quantity: 1 }];
  const r = await run(baseTables(), evil, 'retiro');
  report('(b) precio manipulado en el body se ignora', r.total === 9500, `total ${r.total}`);
}

// (c) producto de otro restaurante
await expectError('(c) producto de otro restaurante', 'producto_no_encontrado',
  () => run(baseTables(), [{ productId: 'otra', extras: [], quantity: 1 }]));

// (d) combo / hero-item
await expectError('(d) combo (hero-item)', 'combo_no_soportado',
  () => run(baseTables(), [{ productId: 'hero-item', extras: [], quantity: 1 }]));

// (e) mesa (y un tipo inventado)
await expectError('(e) order_type mesa', 'mesa_no_soportada',
  () => run(baseTables(), [{ productId: 'burger', extras: [], quantity: 1 }], 'mesa'));
await expectError('(e) order_type desconocido', 'tipo_pedido_invalido',
  () => run(baseTables(), [{ productId: 'burger', extras: [], quantity: 1 }], 'drone'));

// (f) cupón vencido / inactivo / futuro / inexistente
for (const code of ['VENCIDO', 'APAGADO', 'FUTURO', 'NOEXISTE']) {
  await expectError(`(f) cupón ${code}`, 'cupon_invalido',
    () => run(baseTables(), [{ productId: 'burger', extras: [], quantity: 1 }], 'retiro', code));
}
{
  const r = await run(baseTables(), [{ productId: 'burger', extras: [], quantity: 1 }], 'retiro', ' vigente ');
  report('(f) cupón vigente (10%) se aplica', r.total === 8100 && r.couponDiscount === 900, `total ${r.total}`);
}

// (g) total <= 0
await expectError('(g) cupón 100% en retiro → total 0', 'total_invalido',
  () => run(baseTables(), [{ productId: 'burger', extras: [], quantity: 1 }], 'retiro', 'TODO'));
{
  const t = baseTables();
  t.discount_rules = [{ id: 'r1', restaurant_id: R1, activo: true, tipo: 'porcentaje', porcentaje: 60, monto_minimo: '0' }];
  await expectError('(g) cupón 100% + regla 60%: tope 100% y total 0', 'total_invalido',
    () => run(t, [{ productId: 'burger', extras: [], quantity: 1 }], 'retiro', 'TODO'));
  const r = await run(t, [{ productId: 'burger', extras: [], quantity: 1 }], 'delivery', 'TODO');
  report('(g) con delivery, el descuento topado deja solo el envío', r.total === 800 && r.discountTotal === 9000, `total ${r.total}`);
}

// (h) extra no vinculado / no disponible / inexistente
await expectError('(h) extra no vinculado al producto', 'extra_invalido',
  () => run(baseTables(), [{ productId: 'burger', extras: [{ extraId: 'suelto', qty: 1 }], quantity: 1 }]));
await expectError('(h) extra con is_available=false', 'extra_invalido',
  () => run(baseTables(), [{ productId: 'burger', extras: [{ extraId: 'huevo', qty: 1 }], quantity: 1 }]));
await expectError('(h) extra inexistente', 'extra_invalido',
  () => run(baseTables(), [{ productId: 'burger', extras: [{ extraId: 'fantasma', qty: 1 }], quantity: 1 }]));

// ---------- extras de la regla: variaciones, envío, reglas automáticas, validación ----------
{
  const r = await run(baseTables(), [{ productId: 'kilo', variationIndex: 1, extras: [], quantity: 2 }], 'retiro');
  report('variación 1 kg × 2 = $22.000', r.total === 22000, `total ${r.total}`);
}
await expectError('producto por peso sin variationIndex', 'variacion_invalida',
  () => run(baseTables(), [{ productId: 'kilo', extras: [], quantity: 1 }]));
await expectError('variationIndex fuera de rango', 'variacion_invalida',
  () => run(baseTables(), [{ productId: 'kilo', variationIndex: 9, extras: [], quantity: 1 }]));
await expectError('variationIndex en producto por unidad', 'variacion_invalida',
  () => run(baseTables(), [{ productId: 'burger', variationIndex: 0, extras: [], quantity: 1 }]));
{
  const t = baseTables();
  t.restaurants[0].delivery_zones_enabled = true;
  const r = await run(t, [{ productId: 'burger', extras: [], quantity: 1 }], 'delivery');
  report('envío por zonas → siempre zona 2 ($1.500)', r.shipping === 1500, `envío ${r.shipping}`);
  t.restaurants[0].subscription_plan = 'light';
  const r2 = await run(t, [{ productId: 'burger', extras: [], quantity: 1 }], 'delivery');
  report('plan light ignora zonas → costo fijo ($800)', r2.shipping === 800, `envío ${r2.shipping}`);
}
{
  const t = baseTables();
  t.discount_rules = [
    { id: 'a', restaurant_id: R1, activo: true, tipo: 'envio_gratis', monto_minimo: '5000' },
    { id: 'b', restaurant_id: R1, activo: true, tipo: 'efectivo', porcentaje: 20 },
  ];
  const r = await run(t, [{ productId: 'burger', extras: [], quantity: 1 }], 'delivery');
  report('regla envío gratis; la regla de efectivo no se aplica', r.shipping === 0 && r.total === 9000, `total ${r.total}`);
}
{
  const t = baseTables();
  t.discount_rules = [{ id: 'p', restaurant_id: R1, activo: true, tipo: 'porcentaje', porcentaje: 5, monto_minimo: '1000' }];
  const r = await run(t, [{ productId: 'burger', extras: [], quantity: 1 }], 'retiro', 'VIGENTE');
  report('cupón 10% + regla 5% se suman (15%)', r.total === 7650, `total ${r.total}`);
}
{
  const t = baseTables();
  t.products[0].price = 33.333;
  const r = await run(t, [{ productId: 'burger', extras: [], quantity: 3 }], 'retiro');
  report('redondeo a 2 decimales una sola vez (3 × 33,333 = 99,999 → 100)', r.total === 100, `total ${r.total}`);
}
for (const [name, cart] of [
  ['carrito vacío', []],
  ['más de 50 ítems', Array.from({ length: 51 }, () => ({ productId: 'burger', extras: [], quantity: 1 }))],
  ['cantidad 0', [{ productId: 'burger', extras: [], quantity: 0 }]],
  ['cantidad 51', [{ productId: 'burger', extras: [], quantity: 51 }]],
  ['cantidad decimal', [{ productId: 'burger', extras: [], quantity: 1.5 }]],
  ['extra repetido', [{ productId: 'burger', extras: [{ extraId: 'queso', qty: 1 }, { extraId: 'queso', qty: 1 }], quantity: 1 }]],
  ['no es array', { productId: 'burger' }],
]) {
  await expectError(`validación: ${name}`, 'carrito_invalido', () => run(baseTables(), cart));
}
await expectError('producto con is_available=false', 'producto_no_disponible', () => {
  const t = baseTables();
  t.products[0].is_available = false;
  return run(t, [{ productId: 'burger', extras: [], quantity: 1 }]);
});
{
  const t = baseTables();
  t.products[0].is_available = null;
  const r = await run(t, [{ productId: 'burger', extras: [], quantity: 1 }], 'retiro');
  report('producto con is_available=null cuenta como disponible', r.total === 9000, `total ${r.total}`);
}
report('isProductPurchasable: precio 0 no se puede comprar', !isProductPurchasable({ id: 'x', price: 0, sale_type: 'unidad' }));
report('isProductPurchasable: peso sin variaciones no se puede comprar', !isProductPurchasable({ id: 'x', sale_type: 'peso', variations: [] }));

if (failed > 0) {
  console.error(`\n${failed} caso(s) fallaron`);
  process.exit(1);
}
console.log('\nTodos los casos OK');
