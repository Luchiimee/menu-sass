// Verificación de lib/cashUtils.ts (resumen de caja): el costo de delivery es lo cobrado en
// cada pedido (orders.delivery_cost), plata del repartidor, no la tarifa fija del local.
//
//   node scripts/check-cash-summary.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { buildShiftSummary, deliveryCollected } from '../lib/cashUtils.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

let n = 0;
const order = (order_type, total, delivery_cost, extra = {}) => ({
  id: `o${++n}`, order_type, payment_method: 'efectivo', total, status: 'completado', delivery_cost, ...extra,
});
const gasto = (amount) => ({ id: `g${++n}`, amount, description: 'gasto', category: null });

console.log('deliveryCollected');
{
  const r = deliveryCollected([order('delivery', 6225, 6000)]);
  check('zona 2 (dato real 1afb2402): 1 envío, 6000', r.count === 1 && r.total === 6000);
}
check('envío gratis (delivery_cost 0) → no resta (limitación conocida)', deliveryCollected([order('delivery', 3000, 0)]).total === 0);
check('retiro → 0', deliveryCollected([order('retiro', 1000, 0)]).total === 0);
check('mesa → 0', deliveryCollected([order('mesa', 1000, 0)]).total === 0);
check('retiro con delivery_cost cargado por error → no resta', deliveryCollected([order('retiro', 1000, 500)]).total === 0);
check('mostrador sin delivery_cost → 0', deliveryCollected([{ id: 'm', order_type: 'mostrador', payment_method: 'efectivo', total: 800, status: 'completado' }]).total === 0);
check('apertura → no cuenta', deliveryCollected([order('apertura', 5000, 100)]).total === 0);
check("delivery_cost como texto ('6000.00')", deliveryCollected([order('delivery', '6225', '6000.00')]).total === 6000);
check("delivery_cost null / '' / 'abc' → 0", deliveryCollected([order('delivery', 1, null), order('delivery', 1, ''), order('delivery', 1, 'abc')]).total === 0);
check('pendiente excluido', deliveryCollected([order('delivery', 6225, 6000, { status: 'pendiente' })]).total === 0);
check('cancelado excluido', deliveryCollected([order('delivery', 6225, 6000, { status: 'cancelado' })]).total === 0);

console.log('buildShiftSummary');
{
  const s = buildShiftSummary([order('delivery', 6225, 6000)], [], 0);
  check('zona 2: ventas 6225, envíos −6000, neta 225', s.totalSales === 6225 && s.deliveryCostTotal === 6000 && s.netProfit === 225);
  check('… marca deliveryBasis: cobrado', s.deliveryBasis === 'cobrado');
}
{
  const s = buildShiftSummary([order('delivery', 6225, 6000)], [gasto(100), gasto('50')], 0);
  check('zona 2 con gastos 150 → neta 75', s.netProfit === 75 && s.totalExpenses === 150);
}
{
  const s = buildShiftSummary([order('delivery', 3725, 3500)], [], 0);
  check('zona 1 (3725 / 3500) → neta 225', s.netProfit === 225 && s.deliveryCostTotal === 3500);
}
{
  const s = buildShiftSummary([order('delivery', 3000, 0)], [], 0);
  check('envío gratis → no resta: neta = ventas (limitación conocida, decisión A)', s.deliveryCostTotal === 0 && s.netProfit === 3000 && s.deliveryCount === 0);
}
{
  const s = buildShiftSummary([order('retiro', 1500, 0), order('mesa', 2000, 0)], [], 0);
  check('retiro + mesa → sin delivery, neta = ventas', s.deliveryCostTotal === 0 && s.netProfit === 3500 && s.salesByType.retiro.count === 1 && s.salesByType.mesa.count === 1);
}
{
  const s = buildShiftSummary([order('delivery', 6225, 6000, { payment_method: 'mercadopago' })], [], 0);
  check('Mercado Pago de envío: resta su envío (6000) aunque mercadopago no esté en byPaymentMethod', s.deliveryCostTotal === 6000 && s.totalSales === 6225);
}
{
  const s = buildShiftSummary([{ id: 'm', order_type: 'mostrador', payment_method: 'efectivo', total: '800', status: 'completado' }], [], 0);
  check('mostrador sin delivery_cost (venta manual) → cuenta como venta, sin delivery', s.totalSales === 800 && s.deliveryCostTotal === 0);
}
{
  const s = buildShiftSummary([order('delivery', '6225.00', '6000.00'), order('retiro', '250', null)], [gasto('25.5')], '0');
  check('valores como texto', s.totalSales === 6475 && s.deliveryCostTotal === 6000 && s.netProfit === 449.5);
}
{
  const s = buildShiftSummary([
    order('delivery', 6225, 6000, { status: 'pendiente' }),
    order('delivery', 6225, 6000, { status: 'cancelado' }),
    order('delivery', 3725, 3500),
  ], [], 0);
  check('pendiente y cancelado excluidos de ventas y de envíos', s.orderCount === 1 && s.totalSales === 3725 && s.deliveryCostTotal === 3500);
}
{
  const s = buildShiftSummary([order('apertura', 5000, 0), order('delivery', 3725, 3500)], [], 5000);
  check('apertura no es venta; openingBalance aparte', s.totalSales === 3725 && s.openingBalance === 5000);
}

console.log('locales con tarifa fija (Casa Delia 3100, Doña Coca 2000): igual que antes salvo envíos gratis');
// Fórmula anterior: cantidad de pedidos de envío × restaurants.delivery_cost
const oldDelivery = (orders, flat) =>
  orders.filter((o) => o.order_type === 'delivery' && !['pendiente', 'cancelado'].includes(o.status)).length * flat;
for (const [local, flat] of [['Casa Delia', 3100], ['Doña Coca', 2000]]) {
  // En tarifa fija el checkout guarda delivery_cost = la tarifa del local
  const orders = [order('delivery', 5000 + flat, flat), order('delivery', 1200 + flat, flat), order('retiro', 900, 0), order('mesa', 700, 0)];
  const s = buildShiftSummary(orders, [gasto(300)], 0);
  check(`${local}: costo delivery igual que antes (${oldDelivery(orders, flat)})`, s.deliveryCostTotal === oldDelivery(orders, flat));
  check(`${local}: ganancia neta igual que antes`, s.netProfit === s.totalSales - oldDelivery(orders, flat) - 300);
  const conGratis = [...orders, order('delivery', 9000, 0)]; // envío gratis por monto
  const g = buildShiftSummary(conGratis, [], 0);
  check(`${local}: con un envío gratis difiere en exactamente la tarifa (${flat})`, oldDelivery(conGratis, flat) - g.deliveryCostTotal === flat);
}

console.log('por método de pago: la suma siempre es igual al total vendido');
const pmSum = (s) => Object.values(s.byPaymentMethod).reduce((a, v) => a + v, 0);
const cierra = (s) => Math.abs(pmSum(s) - s.totalSales) < 1e-9;
const pago = (payment_method, total, extra = {}) => order('retiro', total, 0, { payment_method, ...extra });
{
  const s = buildShiftSummary([pago('mercadopago', 250)], [], 0);
  check('pedido de Mercado Pago solo → byPaymentMethod.mercadopago 250 y la suma cierra', s.byPaymentMethod.mercadopago === 250 && cierra(s));
}
{
  const s = buildShiftSummary([pago('mercadopago', 250), pago('efectivo', 1000), pago('transferencia', 500)], [], 0);
  check('MP + efectivo + transferencia → cada uno en su clave y la suma cierra (1750)',
    s.byPaymentMethod.mercadopago === 250 && s.byPaymentMethod.efectivo === 1000 && s.byPaymentMethod.transferencia === 500 && s.totalSales === 1750 && cierra(s));
}
{
  const s = buildShiftSummary([pago('cripto', 300), pago('efectivo', 100)], [], 0);
  check('método desconocido → va a "otros" y la suma cierra', s.byPaymentMethod.otros === 300 && cierra(s));
}
{
  const s = buildShiftSummary([pago('toString', 70), pago('otros', 30)], [], 0);
  check('"toString" u "otros" como método no rompen el objeto: van a "otros"', s.byPaymentMethod.otros === 100 && typeof s.byPaymentMethod.toString === 'function' && cierra(s));
}
{
  // Cierre real del 01/11 de Burgers Snappy: efectivo 6225 + 8100, transferencia 250, MP 250
  const s = buildShiftSummary([
    order('delivery', 6225, 6000),
    order('delivery', 8100, 6000),
    pago('transferencia', 250),
    order('delivery', 250, 0, { payment_method: 'mercadopago' }),
  ], [], 0);
  check('caso real 01/11: efectivo 14325, transferencia 250, MP 250', s.byPaymentMethod.efectivo === 14325 && s.byPaymentMethod.transferencia === 250 && s.byPaymentMethod.mercadopago === 250);
  check('… suma 14825 = total vendido 14825', pmSum(s) === 14825 && s.totalSales === 14825);
}
{
  const s = buildShiftSummary([pago('efectivo', 0.1), pago('mercadopago', 0.2), pago('tarjeta', 1234.56)], [], 0);
  check('con decimales la suma también cierra', cierra(s));
}
check('resumen nuevo trae siempre mercadopago y otros (aunque sean 0)', (() => {
  const s = buildShiftSummary([pago('efectivo', 100)], [], 0);
  return s.byPaymentMethod.mercadopago === 0 && s.byPaymentMethod.otros === 0;
})());

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
