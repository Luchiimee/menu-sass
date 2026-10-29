// Verificación de los endpoints públicos del checkout MP (lib/mpCheckoutPublic.ts)
// con una base FALSA en memoria: sin red, sin Supabase, sin MP real.
//
//   node scripts/check-mp-checkout-public.mjs   (Node >= 22.18 / 24: importa .ts directo)
//
// Falla (exit 1) si algún caso esperado no da.

import { getCheckoutStatus, getCheckoutAvailability } from '../lib/mpCheckoutPublic.ts';

// ---------- base falsa: from().select().eq().maybeSingle() ----------
function makeDb(tables, opts = {}) {
  const db = {
    selects: [], // [{ table, cols }] para verificar qué columnas se piden
    failTable: opts.failTable ?? null,
    from(table) {
      const filters = [];
      let cols = '';
      const q = {
        select(c) { cols = c; db.selects.push({ table, cols: c }); return q; },
        eq(col, val) { filters.push((r) => r[col] === val); return q; },
        maybeSingle() {
          if (db.failTable === table) return Promise.resolve({ data: null, error: { message: 'boom' } });
          const rows = (tables[table] || []).filter((r) => filters.every((f) => f(r)));
          const row = rows[0] ?? null;
          // devuelve solo las columnas pedidas, como la base real
          const wanted = cols.split(',').map((s) => s.trim());
          const data = row ? Object.fromEntries(wanted.map((c) => [c, row[c]])) : null;
          return Promise.resolve({ data, error: null });
        },
      };
      return q;
    },
  };
  return db;
}

const R1 = '11111111-1111-4111-8111-111111111111';
const R2 = '22222222-2222-4222-8222-222222222222';
const R3 = '33333333-3333-4333-8333-333333333333';
const P_PENDING = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const P_PAID_NO_ORDER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const P_PAID_ORDER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
const P_FAILED = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
const P_EXPIRED = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5';
const P_WEIRD = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6';
const MISSING = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function tables() {
  const base = { restaurant_id: R1, total_amount: 29300, mp_payment_id: '555', payload: { customer: { name: 'Ana', phone: '1155551234' } } };
  return {
    pending_mp_orders: [
      { id: P_PENDING, status: 'pending', ...base },
      { id: P_PAID_NO_ORDER, status: 'paid', ...base },
      { id: P_PAID_ORDER, status: 'paid', ...base },
      { id: P_FAILED, status: 'failed', ...base },
      { id: P_EXPIRED, status: 'expired', ...base },
      { id: P_WEIRD, status: 'algo_nuevo', ...base },
    ],
    orders: [{ id: P_PAID_ORDER, restaurant_id: R1, customer_name: 'Ana', total: 29300 }],
    restaurant_mp_credentials: [
      { restaurant_id: R1, status: 'connected' },
      { restaurant_id: R2, status: 'revoked' },
    ],
  };
}

let failures = 0;
let total = 0;
function check(name, cond, extra = '') {
  total++;
  if (cond) console.log(`  ok   ${name}`);
  else { failures++; console.log(`  FAIL ${name} ${extra}`); }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Silencia console.error de los casos de error esperados
const origError = console.error;
console.error = () => {};

// ================= status =================
console.log('status');
{
  const db = makeDb(tables());
  const run = (id) => getCheckoutStatus(db, id);

  let r = await run('no-es-un-uuid');
  check('uuid inválido → 404 not_found', r.http === 404 && same(r.body, { error: 'not_found' }), JSON.stringify(r));
  r = await run(undefined);
  check('sin id → 404', r.http === 404);
  r = await run(null);
  check('id null → 404', r.http === 404);
  r = await run("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' or '1'='1");
  check('uuid con basura al final → 404', r.http === 404);
  const before = db.selects.length;
  await run('x');
  check('uuid inválido no consulta la base', db.selects.length === before);

  const notFound = await run(MISSING);
  const invalid = await run('zzz');
  check('no existe → 404 not_found', notFound.http === 404 && same(notFound.body, { error: 'not_found' }));
  check('404 idéntico para inválido e inexistente', same(notFound, invalid));

  r = await run(P_PENDING);
  check('pending → { state: pending } sin order_id', r.http === 200 && same(r.body, { state: 'pending' }), JSON.stringify(r));
  r = await run(P_PAID_NO_ORDER);
  check('paid sin pedido → { state: paid } sin order_id', r.http === 200 && same(r.body, { state: 'paid' }), JSON.stringify(r));
  r = await run(P_PAID_ORDER);
  check('paid con pedido → order_created + order_id', r.http === 200 && same(r.body, { state: 'order_created', order_id: P_PAID_ORDER }), JSON.stringify(r));
  r = await run(P_FAILED);
  check('failed → { state: failed }', r.http === 200 && same(r.body, { state: 'failed' }));
  r = await run(P_EXPIRED);
  check('expired → { state: expired }', r.http === 200 && same(r.body, { state: 'expired' }));
  r = await run(P_WEIRD);
  check('status desconocido en la base → 404 (no se filtra)', r.http === 404);
  r = await run(P_PAID_ORDER.toUpperCase());
  check('uuid en mayúsculas se normaliza', r.http === 200 && r.body.state === 'order_created');

  // Nunca expone payload, montos, datos del cliente ni restaurant_id
  const bodies = [P_PENDING, P_PAID_NO_ORDER, P_PAID_ORDER, P_FAILED, P_EXPIRED].map((i) => run(i));
  const text = JSON.stringify(await Promise.all(bodies));
  check('la respuesta no trae payload/montos/cliente/restaurante',
    !/payload|total|amount|customer|Ana|1155551234|restaurant|mp_payment|555/i.test(text), text);

  // Solo se piden las columnas mínimas
  const cols = db.selects.map((s) => `${s.table}:${s.cols}`);
  check('lee solo pending.status y orders.id',
    cols.every((c) => c === 'pending_mp_orders:status' || c === 'orders:id'), cols.join(' | '));
}
{
  const dbPendingFails = makeDb(tables(), { failTable: 'pending_mp_orders' });
  let r = await getCheckoutStatus(dbPendingFails, P_PENDING);
  check('error de base leyendo pendiente → 500 error_datos', r.http === 500 && same(r.body, { error: 'error_datos' }));
  const dbOrdersFails = makeDb(tables(), { failTable: 'orders' });
  r = await getCheckoutStatus(dbOrdersFails, P_PAID_NO_ORDER);
  check('error de base leyendo orders → 500 (no confunde con paid)', r.http === 500);
  r = await getCheckoutStatus(dbOrdersFails, P_PENDING);
  check('pending no consulta orders aunque orders falle', r.http === 200 && r.body.state === 'pending');
}

// ================= available =================
console.log('available');
{
  const enabled = async () => true;
  const disabled = async () => false;
  const run = (deps, rid) => getCheckoutAvailability(deps, rid);

  let r = await run({ db: makeDb(tables()), isEnabled: enabled }, 'no-es-uuid');
  check('rid inválido → { available: false }', same(r, { available: false }));
  r = await run({ db: makeDb(tables()), isEnabled: enabled }, undefined);
  check('sin rid → false', same(r, { available: false }));

  let called = 0;
  await run({ db: makeDb(tables()), isEnabled: async () => { called++; return true; } }, 'x');
  check('rid inválido no llama a isEnabled', called === 0);

  r = await run({ db: makeDb(tables()), isEnabled: enabled }, R1);
  check('habilitado + credenciales connected → true', same(r, { available: true }));
  r = await run({ db: makeDb(tables()), isEnabled: disabled }, R1);
  check('no habilitado (plan/lanzamiento) → false', same(r, { available: false }));
  r = await run({ db: makeDb(tables()), isEnabled: enabled }, R2);
  check('credenciales no connected → false', same(r, { available: false }));
  r = await run({ db: makeDb(tables()), isEnabled: enabled }, R3);
  check('sin credenciales → false', same(r, { available: false }));
  r = await run({ db: makeDb(tables(), { failTable: 'restaurant_mp_credentials' }), isEnabled: enabled }, R1);
  check('error de base → false (sin motivo)', same(r, { available: false }));
  r = await run({ db: makeDb(tables()), isEnabled: async () => { throw new Error('secreto interno'); } }, R1);
  check('isEnabled lanza → false', same(r, { available: false }));
  r = await run({ db: makeDb(tables()), isEnabled: enabled }, R1.toUpperCase());
  check('rid en mayúsculas se normaliza', same(r, { available: true }));

  // La forma de la respuesta es siempre exactamente { available: boolean }
  const all = await Promise.all([R1, R2, R3, 'x'].map((id) => run({ db: makeDb(tables()), isEnabled: enabled }, id)));
  check('siempre solo la clave available (boolean)',
    all.every((x) => Object.keys(x).length === 1 && typeof x.available === 'boolean'));
}

console.error = origError;
if (failures > 0) {
  console.log(`\n${failures} de ${total} casos FALLARON`);
  process.exit(1);
}
console.log(`\nTodos los casos OK (${total})`);
