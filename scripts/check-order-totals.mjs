// Verificación de lib/orderTotals.ts (montos de un pedido guardado para mostrar).
//
//   node scripts/check-order-totals.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { orderDisplayTotals, itemsSubtotal, round2 } from '../lib/orderTotals.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const item = (price, quantity, extrasList = []) => ({ id: 'p', name: 'X', price, quantity, extrasList });

console.log('orderDisplayTotals');
{
  // Pedido real 1afb2402: efectivo con 10% automático que no quedó en discount_amount
  const r = orderDisplayTotals({ items: [item(250, 1)], delivery_cost: 6000, discount_amount: 0, total: 6225 });
  check('pedido 1afb2402 (viejo): descuento 25 por diferencia', same(r, { subtotal: 250, envio: 6000, descuento: 25, total: 6225 }));
}
{
  const r = orderDisplayTotals({ items: [item(250, 1)], delivery_cost: 6000, discount_amount: 25, total: 6225 });
  check('pedido nuevo con el descuento guardado → usa el guardado', same(r, { subtotal: 250, envio: 6000, descuento: 25, total: 6225 }));
}
{
  const r = orderDisplayTotals({ items: [item(1000, 2)], delivery_cost: 2500, discount_amount: 0, total: 4500 });
  check('sin descuento → 0', same(r, { subtotal: 2000, envio: 2500, descuento: 0, total: 4500 }));
}
{
  // 10% cupón + 10% efectivo sobre 1000 = 200, guardado junto
  const r = orderDisplayTotals({ items: [item(1000, 1)], delivery_cost: 500, discount_amount: 200, total: 1300 });
  check('cupón + efectivo guardados juntos → 200', r?.descuento === 200 && r.total === 1300);
}
{
  // Pedido viejo con cupón: discount_amount = solo el cupón (100), el efectivo (100) quedó en total
  const r = orderDisplayTotals({ items: [item(1000, 1)], delivery_cost: 500, discount_amount: 100, total: 1300 });
  check('viejo con cupón y efectivo: guardado 100 (solo cupón) pero la diferencia da 200 → 200', r?.descuento === 200);
}
{
  // Mercado Pago (mpWebhookCore guarda solo el cupón): 10% cupón + 10% regla de porcentaje
  const r = orderDisplayTotals({ items: [item(1000, 1)], delivery_cost: 800, discount_amount: 100, total: 1600 });
  check('Mercado Pago con cupón + regla: no muestra menos que la diferencia (200)', r?.descuento === 200);
}
{
  // Dato inconsistente: guardado mayor que la diferencia → se respeta el guardado
  const r = orderDisplayTotals({ items: [item(1000, 1)], delivery_cost: 0, discount_amount: 150, total: 900 });
  check('guardado mayor que la diferencia → el guardado', r?.descuento === 150);
}
{
  const r = orderDisplayTotals({ items: [item(1000, 2, [{ name: 'Queso', price: 200, quantity: 1 }])], delivery_cost: 0, discount_amount: 0, total: 2160 });
  check('con extras: subtotal (1000+200)×2 = 2400, descuento 240', r?.subtotal === 2400 && r.descuento === 240);
}
{
  const r = orderDisplayTotals({ items: [item(3000, 1)], delivery_cost: 0, discount_amount: 0, total: 3000 });
  check('envío gratis (delivery_cost 0) → envío 0, sin descuento', same(r, { subtotal: 3000, envio: 0, descuento: 0, total: 3000 }));
}
{
  const r = orderDisplayTotals({ items: [{ price: '250.00', quantity: '1', extrasList: [] }], delivery_cost: '6000.00', discount_amount: '0', total: '6225.00' });
  check('valores como texto (numeric de Supabase)', same(r, { subtotal: 250, envio: 6000, descuento: 25, total: 6225 }));
}
check('total null → null (no inventa)', orderDisplayTotals({ items: [item(250, 1)], delivery_cost: 6000, total: null }) === null);
check("total '' → null", orderDisplayTotals({ items: [], total: '' }) === null);
check('total ausente → null', orderDisplayTotals({ items: [item(1, 1)] }) === null);
check('pedido null → null', orderDisplayTotals(null) === null);
{
  // El dueño sumó un ítem sin recalcular descuentos (orders/page.tsx: total += precio): no queda negativo
  const r = orderDisplayTotals({ items: [item(250, 1)], delivery_cost: 0, discount_amount: 0, total: 400 });
  check('total mayor que productos + envío → descuento 0, nunca negativo', r?.descuento === 0);
}
{
  const r = orderDisplayTotals({ items: [item(255, 1)], delivery_cost: 0, discount_amount: 0, total: 229.5 });
  check('decimales: 10% de 255 = 25,5', r?.descuento === 25.5);
}
check('discount_amount negativo se ignora', orderDisplayTotals({ items: [item(100, 1)], delivery_cost: 0, discount_amount: -5, total: 90 })?.descuento === 10);
check('ítems no es lista → subtotal 0', orderDisplayTotals({ items: null, delivery_cost: 500, total: 500 })?.subtotal === 0);

console.log('helpers');
check('itemsSubtotal con extras en texto', itemsSubtotal([{ price: '100', quantity: 2, extrasList: [{ price: '10', quantity: '3' }] }]) === 260);
check('round2(0.1 + 0.2) = 0.3', round2(0.1 + 0.2) === 0.3);
check('round2(25.005) = 25.01', round2(25.005) === 25.01);

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
