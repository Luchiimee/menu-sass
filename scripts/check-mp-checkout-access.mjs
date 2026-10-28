// Verificación de la puerta de acceso al checkout con MP (lib/mpCheckoutGate.ts) con
// base, canUseMpConnect y requirePlan FALSOS: sin red, sin Supabase.
//
//   node scripts/check-mp-checkout-access.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { isMpCheckoutEnabledCore } from '../lib/mpCheckoutGate.ts';

const R1 = '11111111-1111-4111-8111-111111111111';
const U1 = 'user-1';

function fakeDb(row, opts = {}) {
  const db = {
    selects: [],
    from() {
      const q = {
        select(cols) { db.selects.push(cols); return q; },
        eq() { return q; },
        maybeSingle() {
          if (opts.error) return Promise.resolve({ data: null, error: opts.error });
          return Promise.resolve({ data: row, error: null });
        },
      };
      return q;
    },
  };
  return db;
}

const row = (over = {}) => ({ id: R1, user_id: U1, owner_email: 'dueno@x.com', mp_checkout_enabled: true, ...over });
const planOk = async () => ({ ok: true, restaurant: { id: R1 } });
const planNo = async () => ({ ok: false });
const allow = () => true;
const deny = () => false;

let failures = 0;
let total = 0;
function check(name, cond, extra = '') {
  total++;
  if (cond) console.log(`  ok   ${name}`);
  else { failures++; console.log(`  FAIL ${name} ${extra}`); }
}
const run = (r, deps) => isMpCheckoutEnabledCore({ id: R1 }, { canUseMpConnect: allow, requirePlan: planOk, ...deps, db: fakeDb(r, deps?.dbOpts) });

const origError = console.error;
console.error = () => {};

console.log('interruptor del dueño');
check('todo en regla + interruptor encendido → true', (await run(row())) === true);
check('interruptor apagado (false) → false', (await run(row({ mp_checkout_enabled: false }))) === false);
check('interruptor null → false', (await run(row({ mp_checkout_enabled: null }))) === false);
check('columna ausente en la fila (undefined) → false', (await run((() => { const r = row(); delete r.mp_checkout_enabled; return r; })())) === false);
check('valor truthy que no es true ("true", 1) → false',
  (await run(row({ mp_checkout_enabled: 'true' }))) === false && (await run(row({ mp_checkout_enabled: 1 }))) === false);
check('error de la base por columna inexistente → false',
  (await run(null, { dbOpts: { error: { message: 'column restaurants.mp_checkout_enabled does not exist' } } })) === false);

console.log('lo que ya se exigía sigue igual');
check('restaurante inexistente → false', (await run(null)) === false);
check('sin user_id → false', (await run(row({ user_id: null }))) === false);
check('lanzamiento cerrado y dueño no admin → false', (await run(row(), { canUseMpConnect: deny })) === false);
check('plan/suscripción no válidos → false', (await run(row(), { requirePlan: planNo })) === false);
check('requirePlan devuelve otro restaurante → false', (await run(row(), { requirePlan: async () => ({ ok: true, restaurant: { id: 'otro' } }) })) === false);
check('interruptor encendido NO alcanza si falla el plan', (await run(row({ mp_checkout_enabled: true }), { requirePlan: planNo })) === false);
check('interruptor encendido NO alcanza si el lanzamiento está cerrado', (await run(row({ mp_checkout_enabled: true }), { canUseMpConnect: deny })) === false);

console.log('orden y lecturas');
{
  let planCalls = 0;
  await run(row({ mp_checkout_enabled: false }), { requirePlan: async () => { planCalls++; return { ok: true, restaurant: { id: R1 } }; } });
  check('con el interruptor apagado ni consulta el plan', planCalls === 0);

  const db = fakeDb(row());
  await isMpCheckoutEnabledCore({ id: R1 }, { db, canUseMpConnect: allow, requirePlan: planOk });
  check('lee mp_checkout_enabled junto con id, user_id y owner_email', db.selects.length === 1 && /mp_checkout_enabled/.test(db.selects[0]) && /owner_email/.test(db.selects[0]), db.selects.join('|'));

  let emailSeen = null;
  await run(row({ owner_email: 'a@b.com' }), { canUseMpConnect: (e) => { emailSeen = e; return true; } });
  check('canUseMpConnect recibe el email del dueño', emailSeen === 'a@b.com');
}

console.error = origError;
if (failures > 0) {
  console.log(`\n${failures} de ${total} casos FALLARON`);
  process.exit(1);
}
console.log(`\nTodos los casos OK (${total})`);
