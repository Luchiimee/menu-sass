// Verificación del carrito por renglones (lib/cartLines.ts) contra la lógica
// anterior de context/CartContext.tsx. Sin dependencias ni red.
//
//   node scripts/check-cart-lines.mjs       (Node >= 22.18 / 24: importa .ts directo)
//
// Imprime la tabla antes/después y falla (exit 1) si algún caso esperado no da.

import {
  cartTotal, mergeUnits, setLineExtra, stepProduct, stepProductExtra, addExtraToOneUnit,
} from '../lib/cartLines.ts';

const P = { id: 'bacon', name: 'Americana Bacon Deluxe', price: 9000 };
const E = { id: 'med', name: 'Medallón', price: 2500 };

let n = 0;
const newId = (pid) => `${pid}-${++n}`;

// ---------- lógica ANTERIOR (copia de CartContext antes de este cambio) ----------
function oldAddToCart(prev, product) {
  if (product.extraId) {
    const newCart = prev.map((it) => ({ ...it, extrasList: (it.extrasList || []).map((e) => ({ ...e })) }));
    const parentIndex = [...newCart].reverse().findIndex((item) => item.id === product.id);
    if (parentIndex === -1) return prev;
    const idx = newCart.length - 1 - parentIndex;
    const ex = newCart[idx].extrasList.find((e) => e.id === product.extraId);
    if (ex) ex.quantity += 1;
    else newCart[idx].extrasList.push({ id: product.extraId, name: product.name, price: product.price, quantity: 1 });
    return newCart;
  }
  const i = prev.findIndex((item) => item.id === product.id && (!item.extrasList || item.extrasList.length === 0));
  if (i !== -1) return prev.map((item, k) => (k === i ? { ...item, quantity: item.quantity + 1 } : item));
  return [...prev, { ...product, uniqueId: newId(product.id), quantity: 1, extrasList: [] }];
}
const oldLoop = (cart, product, qty) => {
  for (let i = 0; i < qty; i++) cart = oldAddToCart(cart, product);
  return cart;
};
const oldExtra = { id: P.id, extraId: E.id, name: E.name, price: E.price };

// ---------- escenarios ----------
const rows = [];

for (const qty of [1, 3]) {
  // A) Modal: producto qty veces + cada extra qty veces (MarketPro, Argentina, AlternaPro, UrbanoDark)
  {
    let before = [];
    before = oldLoop(before, P, qty);
    before = oldLoop(before, oldExtra, qty);
    const after = mergeUnits([], P, [{ ...E, quantity: 1 }], qty, newId);
    rows.push({ flujo: 'Modal: N unidades, todas con el extra', plantillas: 'MarketPro, Argentina, AlternaPro, UrbanoDark',
      unidades: qty, antes: cartTotal(before), despues: cartTotal(after), esperado: qty * (P.price + E.price) });
  }
  // B) Modal de variaciones de [slug]: una unidad por vez (producto + extras)
  {
    let before = [];
    for (let i = 0; i < qty; i++) { before = oldAddToCart(before, P); before = oldAddToCart(before, oldExtra); }
    const after = mergeUnits([], P, [{ ...E, quantity: 1 }], qty, newId);
    rows.push({ flujo: 'Modal de variaciones (todas con el extra)', plantillas: '[slug] modal general (pop, elegant, bistro, etc.)',
      unidades: qty, antes: cartTotal(before), despues: cartTotal(after), esperado: qty * (P.price + E.price) });
  }
  // C) Tarjeta: + producto qty veces, + extra una vez
  {
    let before = [];
    before = oldLoop(before, P, qty);
    before = oldAddToCart(before, oldExtra);
    let after = [];
    for (let i = 0; i < qty; i++) after = stepProduct(after, P, 1, newId);
    after = stepProductExtra(after, P.id, E, 1, newId);
    rows.push({ flujo: 'Tarjeta: + producto N veces, + extra 1 vez', plantillas: 'Classic, Minimal, Spotlight, VisualGrid, pop/bistro inline',
      unidades: qty, antes: cartTotal(before), despues: cartTotal(after), esperado: qty * P.price + E.price });
  }
  // D) Carrito (CartFooter): renglón de N unidades con el extra ×1, + del extra
  {
    const base = mergeUnits([], P, [{ ...E, quantity: 1 }], qty, newId);
    const line = base[0];
    const before = base.map((it) => ({ ...it, extrasList: it.extrasList.map((e) => ({ ...e, quantity: e.quantity + 1 })) }));
    const after = setLineExtra(base, line.uniqueId, E.id, 2, newId);
    rows.push({ flujo: 'Carrito: renglón con extra ×1, toca + del extra', plantillas: 'CartFooter (todas)',
      unidades: qty, antes: cartTotal(before), despues: cartTotal(after),
      esperado: (qty - 1) * (P.price + E.price) + (P.price + 2 * E.price) });
  }
}

// Ejemplo del enunciado: 2 simples + 1 con Medallón = 29.500
{
  let c = [];
  c = stepProduct(c, P, 1, newId); c = stepProduct(c, P, 1, newId); c = stepProduct(c, P, 1, newId);
  c = stepProductExtra(c, P.id, E, 1, newId);
  const ok = cartTotal(c) === 29500 && c.length === 2;
  console.log(`Ejemplo 3 × ${P.name} + Medallón en una: $${cartTotal(c)} en ${c.length} renglones → ${ok ? 'OK' : 'FALLA'}`);
  if (!ok) process.exitCode = 1;
}

// − del extra vuelve la unidad al renglón sin extra (inversa)
{
  let c = [];
  for (let i = 0; i < 3; i++) c = stepProduct(c, P, 1, newId);
  c = stepProductExtra(c, P.id, E, 1, newId);
  c = stepProductExtra(c, P.id, E, -1, newId);
  const ok = c.length === 1 && c[0].quantity === 3 && c[0].extrasList.length === 0;
  console.log(`+ y − del extra vuelve a 3 simples en 1 renglón → ${ok ? 'OK' : 'FALLA'}`);
  if (!ok) process.exitCode = 1;
}

// "+ Agregar extra" del carrito (addExtraToOneUnit)
const check = (label, ok, detail) => {
  console.log(`${label} → ${ok ? 'OK' : 'FALLA'}${detail ? ` (${detail})` : ''}`);
  if (!ok) process.exitCode = 1;
};
// (a) 2×Americana sin extra + Medallón → 1×Americana + 1×Americana con Medallón
{
  const c0 = mergeUnits([], P, [], 2, newId);
  const c = addExtraToOneUnit(c0, c0[0].uniqueId, E, newId);
  const plain = c.find((it) => it.extrasList.length === 0);
  const withM = c.find((it) => it.extrasList.some((e) => e.id === E.id));
  check('(a) 2 simples + Agregar Medallón → 1 simple + 1 con Medallón, $20.500',
    c.length === 2 && plain?.quantity === 1 && withM?.quantity === 1 && cartTotal(c) === 9000 + 11500,
    `$${cartTotal(c)} en ${c.length} renglones`);
}
// (b) quantity 1 → el extra va al mismo renglón
{
  const c0 = mergeUnits([], P, [], 1, newId);
  const c = addExtraToOneUnit(c0, c0[0].uniqueId, E, newId);
  check('(b) 1 unidad + Agregar Medallón → mismo renglón',
    c.length === 1 && c[0].uniqueId === c0[0].uniqueId && c[0].extrasList[0]?.quantity === 1 && cartTotal(c) === 11500,
    `$${cartTotal(c)}`);
}
// (c) agregar el mismo extra a otra unidad → se agrupa con el renglón idéntico
{
  let c = mergeUnits([], P, [{ ...E, quantity: 1 }], 1, newId);
  c = mergeUnits(c, P, [], 1, newId);
  const plainLine = c.find((it) => it.extrasList.length === 0);
  c = addExtraToOneUnit(c, plainLine.uniqueId, E, newId);
  check('(c) 1 con Medallón + 1 simple, Agregar Medallón a la simple → 2× con Medallón en 1 renglón',
    c.length === 1 && c[0].quantity === 2 && cartTotal(c) === 23000, `$${cartTotal(c)}`);
}

const fmt = (v) => `$${v.toLocaleString('es-AR')}`;
console.log('\n| Flujo | Plantillas | Unidades | Antes | Después | Esperado | |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  const ok = r.despues === r.esperado;
  if (!ok) process.exitCode = 1;
  console.log(`| ${r.flujo} | ${r.plantillas} | ${r.unidades} | ${fmt(r.antes)} | ${fmt(r.despues)} | ${fmt(r.esperado)} | ${ok ? 'OK' : 'FALLA'} |`);
}
