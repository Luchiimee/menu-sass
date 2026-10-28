// Verificación del webhook de MP Connect (lib/mpWebhookCore.ts) con una base y
// un Mercado Pago FALSOS en memoria: sin red, sin Supabase, sin MP real.
//
//   node scripts/check-mp-webhook.mjs       (Node >= 22.18 / 24: importa .ts directo)
//
// Falla (exit 1) si algún caso esperado no da.

import crypto from 'node:crypto';
import { handleWebhookRequest, PAYMENT_STATUS_PAID } from '../lib/mpWebhookCore.ts';

// ---------- base falsa: from().select/update/insert + rpc ----------
function makeDb(tables, opts = {}) {
  const db = {
    insertCalls: 0,
    failOrderInserts: 0, // cuántos inserts a orders fallan (error genérico)
    shiftError: false,
    rpcCalls: 0,
    tables,
    from(table) {
      tables[table] = tables[table] || [];
      const filters = [];
      let op = 'select';
      let values = null;
      const q = {
        select() { if (op === 'select') op = 'select'; return q; },
        eq(col, val) { filters.push((r) => r[col] === val); return q; },
        in(col, vals) { filters.push((r) => vals.includes(r[col])); return q; },
        update(v) { op = 'update'; values = v; return q; },
        insert(v) { op = 'insert'; values = v; return q; },
        _run() {
          if (op === 'insert') {
            if (table === 'orders') {
              db.insertCalls++;
              if (db.failOrderInserts > 0) { db.failOrderInserts--; return { data: null, error: { message: 'boom' } }; }
              if (tables.orders.some((o) => o.id === values.id)) return { data: null, error: { code: '23505', message: 'duplicate key' } };
            }
            tables[table].push({ ...values });
            return { data: null, error: null };
          }
          const rows = tables[table].filter((r) => filters.every((f) => f(r)));
          if (op === 'update') {
            rows.forEach((r) => Object.assign(r, values));
            return { data: rows.map((r) => ({ id: r.id })), error: null };
          }
          return { data: rows, error: null };
        },
        maybeSingle() { const r = q._run(); return Promise.resolve({ data: r.data?.[0] ?? null, error: r.error }); },
        then(resolve, reject) { return Promise.resolve(q._run()).then(resolve, reject); },
      };
      return q;
    },
    rpc(name) {
      db.rpcCalls++;
      if (db.shiftError) return Promise.resolve({ data: null, error: { message: 'permission denied' } });
      return Promise.resolve({ data: 'shift-auto', error: null });
    },
  };
  return db;
}

const SECRET = 'secreto-de-prueba';
const R1 = '11111111-1111-4111-8111-111111111111';
const R2 = '22222222-2222-4222-8222-222222222222';
const PEND = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PAY = '5550001';

function tables() {
  return {
    restaurant_mp_credentials: [
      { restaurant_id: R1, mp_user_id: '9001', status: 'connected' },
      { restaurant_id: R2, mp_user_id: '9002', status: 'connected' },
    ],
    restaurants: [
      { id: R1, subscription_plan: 'go', current_shift_id: 'shift-1' },
      { id: R2, subscription_plan: 'plus', current_shift_id: null },
    ],
    pending_mp_orders: [
      {
        id: PEND, restaurant_id: R1, status: 'pending', total_amount: 29300, mp_payment_id: null, order_id: null,
        payload: {
          order_type: 'delivery',
          customer: { name: 'Ana Pérez', phone: '1155551234', address: 'Calle 123', notes: 'sin cebolla' },
          coupon_code: 'VIGENTE', auto_rule_id: null,
          lines: [
            { productId: 'burger', variationIndex: null, name: 'Burger', unitBase: 9000,
              extras: [{ extraId: 'queso', name: 'Queso', price: 500, qty: 1 }], quantity: 3, lineTotal: 28500 },
          ],
          amounts: { subtotal: 28500, coupon_discount: 0, auto_discount: 0, discount_total: 0, shipping: 800, total: 29300 },
        },
      },
    ],
    orders: [],
  };
}

// ---------- MP falso ----------
function approved(over = {}) {
  return { id: Number(PAY), status: 'approved', transaction_amount: 29300, currency_id: 'ARS', collector_id: 9001, external_reference: PEND, ...over };
}
function makeMp(payment, kind = 'ok') {
  const mp = {
    calls: 0,
    fetchPayment: async (rid, id) => {
      mp.calls++;
      if (kind !== 'ok') return { kind };
      return { kind: 'ok', payment: typeof payment === 'function' ? payment(rid, id) : payment };
    },
  };
  return mp;
}

// ---------- request firmado ----------
function sign(dataId, requestId = 'req-1', ts = '1700000000', secret = SECRET) {
  const v1 = crypto.createHmac('sha256', secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex');
  return `ts=${ts},v1=${v1}`;
}
function req({ rid = R1, dataId = PAY, type = 'payment', secret = SECRET, signature, requestId = 'req-1' } = {}) {
  const sp = new URLSearchParams({ 'data.id': dataId, type });
  if (rid) sp.set('rid', rid);
  return {
    secret,
    searchParams: sp,
    xSignature: signature === undefined ? sign(dataId, requestId) : signature,
    xRequestId: requestId,
    rawBody: JSON.stringify({ type, data: { id: dataId }, user_id: 'ignorado' }),
  };
}

let failed = 0;
function check(name, cond, detail) {
  console.log(`${name} → ${cond ? 'OK' : 'FALLA'}${detail ? ` (${detail})` : ''}`);
  if (!cond) failed++;
}
const run = (input, db, mp) => handleWebhookRequest(input, { db, fetchPayment: mp.fetchPayment });
const pendingRow = (db) => db.tables.pending_mp_orders[0];

// 1. sin secreto → 401
{
  const db = makeDb(tables()); const mp = makeMp(approved());
  const r = await run(req({ secret: null }), db, mp);
  check('sin secreto → 401, sin consultar MP ni crear pedido', r.http === 401 && mp.calls === 0 && db.tables.orders.length === 0, `http ${r.http}`);
}
// 2. firma inválida → 401 (varios modos)
for (const [name, input] of [
  ['firma de otro secreto', req({ signature: sign(PAY, 'req-1', '1700000000', 'otro-secreto') })],
  ['sin header x-signature', req({ signature: null })],
  ['firma malformada', req({ signature: 'basura' })],
  ['firma de otro data.id', req({ signature: sign('999') })],
  ['firma de otro request-id', req({ signature: sign(PAY, 'req-otro') })],
]) {
  const db = makeDb(tables()); const mp = makeMp(approved());
  const r = await run(input, db, mp);
  check(`firma inválida (${name}) → 401, sin pedido`, r.http === 401 && mp.calls === 0 && db.tables.orders.length === 0, `http ${r.http}`);
}
// 3. otros tipos: 200 sin hacer nada
{
  const db = makeDb(tables()); const mp = makeMp(approved());
  const r = await run(req({ type: 'merchant_order' }), db, mp);
  check('type != payment (firmado) → 200 sin consultar MP', r.http === 200 && mp.calls === 0 && db.tables.orders.length === 0);
}
// 4. aprobado válido → un pedido con todos los campos
{
  const db = makeDb(tables()); const mp = makeMp(approved());
  const r = await run(req(), db, mp);
  const o = db.tables.orders[0];
  check('approved válido → 200 y un pedido', r.http === 200 && db.tables.orders.length === 1, r.result);
  check('pedido: pago y estado', o?.payment_method === 'mercadopago' && o.pago_confirmado === true && o.payment_status === PAYMENT_STATUS_PAID && o.status === 'pendiente');
  check('pedido: total = total_amount, envío, cupón, plan, turno', o?.total === 29300 && o.delivery_cost === 800 && o.discount_amount === 0 && o.origin_plan === 'go' && o.shift_id === 'shift-1');
  check('pedido: datos del payload (no del aviso)', o?.customer_name === 'Ana Pérez' && o.address === 'Calle 123' && o.description === 'sin cebolla' && o.coupon_code === 'VIGENTE' && o.order_type === 'delivery' && o.restaurant_id === R1);
  check('pedido: items con uniqueId y extrasList', o?.items?.[0]?.uniqueId === 'burger-1' && o.items[0].quantity === 3 && o.items[0].price === 9000 && o.items[0].extrasList[0].id === 'queso' && o.items[0].extrasList[0].quantity === 1);
  check('pending → paid con mp_payment_id y order_id', pendingRow(db).status === 'paid' && pendingRow(db).mp_payment_id === PAY && pendingRow(db).order_id === PEND);
  check('no se consultó get_or_create_shift (había turno activo)', db.rpcCalls === 0);
}
// 5. mismo aviso dos veces / tres → un solo pedido
{
  const db = makeDb(tables()); const mp = makeMp(approved());
  await run(req(), db, mp); const r2 = await run(req(), db, mp); const r3 = await run(req(), db, mp);
  check('mismo aviso 3 veces → un solo pedido', db.tables.orders.length === 1 && r2.http === 200 && r3.http === 200, `${r2.result}/${r3.result}`);
}
// 5b. avisos concurrentes
{
  const db = makeDb(tables()); const mp = makeMp(approved());
  const rs = await Promise.all([run(req(), db, mp), run(req(), db, mp), run(req(), db, mp)]);
  check('3 avisos simultáneos → un solo pedido', db.tables.orders.length === 1 && rs.every((r) => r.http === 200), rs.map((r) => r.result).join('/'));
}
// 6. monto distinto
for (const [name, amount] of [['menor', 100], ['mayor', 99999], ['un centavo menos', 29299.99]]) {
  const db = makeDb(tables()); const mp = makeMp(approved({ transaction_amount: amount }));
  const r = await run(req(), db, mp);
  check(`approved con monto ${name} → sin pedido`, r.http === 200 && db.tables.orders.length === 0 && pendingRow(db).status === 'pending', r.result);
}
{
  const db = makeDb(tables()); const mp = makeMp(approved({ transaction_amount: '29300.00' }));
  await run(req(), db, mp);
  check('monto exacto como texto ("29300.00") → pedido', db.tables.orders.length === 1);
}
// 7. moneda
{
  const db = makeDb(tables()); const mp = makeMp(approved({ currency_id: 'USD' }));
  const r = await run(req(), db, mp);
  check('approved en USD → sin pedido', db.tables.orders.length === 0 && r.result === 'moneda_distinta');
}
// 8. estados no aprobados
for (const st of ['pending', 'in_process', 'authorized']) {
  const db = makeDb(tables()); const mp = makeMp(approved({ status: st }));
  const r = await run(req(), db, mp);
  check(`pago ${st} → sin pedido y la fila sigue pending`, r.http === 200 && db.tables.orders.length === 0 && pendingRow(db).status === 'pending');
}
for (const st of ['rejected', 'cancelled']) {
  const db = makeDb(tables()); const mp = makeMp(approved({ status: st }));
  await run(req(), db, mp);
  check(`pago ${st} → sin pedido y la fila pasa a failed`, db.tables.orders.length === 0 && pendingRow(db).status === 'failed');
}
// 8b. rechazado y luego aprobado en la misma preference
{
  const db = makeDb(tables());
  await run(req({ dataId: '5550000' }), db, makeMp(approved({ id: 5550000, status: 'rejected' })));
  await run(req(), db, makeMp(approved()));
  check('rechazado y después aprobado (reintento del cliente) → un pedido', db.tables.orders.length === 1 && pendingRow(db).status === 'paid');
}
// 9. external_reference
{
  const db = makeDb(tables());
  const r = await run(req(), db, makeMp(approved({ external_reference: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })));
  check('external_reference inexistente → sin pedido', db.tables.orders.length === 0 && r.result === 'pending_inexistente');
  const r2 = await run(req(), db, makeMp(approved({ external_reference: 'no-es-uuid' })));
  check('external_reference que no es uuid → sin pedido', db.tables.orders.length === 0 && r2.result === 'sin_referencia');
  const r3 = await run(req(), db, makeMp(approved({ external_reference: null })));
  check('sin external_reference → sin pedido', db.tables.orders.length === 0 && r3.result === 'sin_referencia');
}
// 10. restaurante / cuenta equivocada
{
  const db = makeDb(tables());
  const r = await run(req({ rid: R2, signature: sign(PAY) }), db, makeMp(approved({ collector_id: 9002 })));
  check('pending de otro restaurante que rid → sin pedido', db.tables.orders.length === 0 && r.result === 'restaurante_distinto');
  const db2 = makeDb(tables());
  const r2 = await run(req(), db2, makeMp(approved({ collector_id: 9002 })));
  check('collector_id distinto del mp_user_id → sin pedido', db2.tables.orders.length === 0 && r2.result === 'collector_distinto');
  const db3 = makeDb(tables());
  const r3 = await run(req({ rid: 'no-uuid' }), db3, makeMp(approved()));
  check('rid inválido → 200 sin pedido', r3.http === 200 && db3.tables.orders.length === 0);
  const db4 = makeDb(tables());
  const r4 = await run(req({ rid: null }), db4, makeMp(approved()));
  check('sin rid → 200 sin pedido', r4.http === 200 && db4.tables.orders.length === 0);
  const t5 = tables(); t5.restaurant_mp_credentials[0].status = 'revoked';
  const db5 = makeDb(t5);
  const r5 = await run(req(), db5, makeMp(approved()));
  check('credenciales no conectadas → 200 sin pedido', r5.http === 200 && db5.tables.orders.length === 0 && r5.result === 'sin_credenciales');
  const db6 = makeDb(tables());
  const r6 = await run(req({ dataId: '12ab', signature: sign('12ab') }), db6, makeMp(approved()));
  check('data.id no numérico → 200 sin pedido', r6.http === 200 && db6.tables.orders.length === 0);
  const db7 = makeDb(tables());
  const r7 = await run(req(), db7, makeMp(approved({ id: 777 })));
  check('MP devuelve otro id de pago → sin pedido', db7.tables.orders.length === 0 && r7.result === 'pago_distinto');
}
// 11. respuestas de MP
{
  const db = makeDb(tables());
  const r = await run(req(), db, makeMp(null, 'transient'));
  check('MP caído/5xx (transitorio) → 500 para que reintente', r.http === 500 && db.tables.orders.length === 0 && pendingRow(db).status === 'pending');
  const r2 = await run(req(), db, makeMp(null, 'not_found'));
  check('MP 404 (aviso de prueba o pago ajeno) → 200 sin pedido', r2.http === 200 && db.tables.orders.length === 0);
  const r3 = await run(req(), db, makeMp(null, 'no_token'));
  check('sin token del vendedor → 200 sin pedido', r3.http === 200 && db.tables.orders.length === 0);
}
// 12. turno
{
  const t = tables(); t.restaurants[0].current_shift_id = null;
  const db = makeDb(t);
  await run(req(), db, makeMp(approved()));
  check('sin turno activo → get_or_create_shift', db.rpcCalls === 1 && db.tables.orders[0]?.shift_id === 'shift-auto');
  const t2 = tables(); t2.restaurants[0].current_shift_id = null;
  const db2 = makeDb(t2); db2.shiftError = true;
  const r = await run(req(), db2, makeMp(approved()));
  check('get_or_create_shift falla → pedido igual, con shift_id null', r.http === 200 && db2.tables.orders.length === 1 && db2.tables.orders[0].shift_id === null);
}
// 13. falla la creación del pedido después de marcar paid
{
  const db = makeDb(tables()); db.failOrderInserts = 1;
  const r = await run(req(), db, makeMp(approved()));
  check('falla el insert del pedido → 500 y la fila queda paid sin order_id', r.http === 500 && pendingRow(db).status === 'paid' && !pendingRow(db).order_id && db.tables.orders.length === 0, r.result);
  const r2 = await run(req(), db, makeMp(approved()));
  check('el reintento de MP recupera el pedido (uno solo)', r2.http === 200 && db.tables.orders.length === 1 && pendingRow(db).order_id === PEND, r2.result);
  const r3 = await run(req(), db, makeMp(approved()));
  check('y un tercer aviso no duplica', r3.http === 200 && db.tables.orders.length === 1);
}
// 14. otro pago sobre una fila ya cobrada / fila expirada
{
  const db = makeDb(tables());
  await run(req(), db, makeMp(approved()));
  const r = await run(req({ dataId: '5550009', signature: sign('5550009') }), db, makeMp(approved({ id: 5550009 })));
  check('segundo pago aprobado sobre fila ya cobrada → sin segundo pedido', db.tables.orders.length === 1 && r.result === 'pago_duplicado', r.result);
  const t = tables(); t.pending_mp_orders[0].status = 'expired';
  const db2 = makeDb(t);
  const r2 = await run(req(), db2, makeMp(approved()));
  check('aprobado sobre fila expirada → sin pedido (reconciliar a mano)', db2.tables.orders.length === 0 && r2.result === 'expirado');
}

if (failed > 0) {
  console.error(`\n${failed} caso(s) fallaron`);
  process.exit(1);
}
console.log('\nTodos los casos OK');
