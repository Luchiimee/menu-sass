// Verificación del lanzamiento de Mercado Pago Connect: con MP_CONNECT_PUBLIC encendido,
// cualquier dueño (no solo admins) pasa canUseMpConnect, pero el plan sigue mandando.
// Usa el canUseMpConnect REAL (lib/access.ts) y la puerta REAL del checkout
// (lib/mpCheckoutGate.ts) con una base y un requirePlan falsos: sin red, sin Supabase.
//
//   node scripts/check-mp-access.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { readFileSync } from 'node:fs';
import { MP_CONNECT_PUBLIC, canUseMpConnect, ADMIN_EMAILS } from '../lib/access.ts';
import { isMpCheckoutEnabledCore } from '../lib/mpCheckoutGate.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const R1 = '11111111-1111-4111-8111-111111111111';
const DUENO = 'dueno-comun@ejemplo.com';

// requirePlan falso con la misma regla que lib/planAccess.ts: plan dentro de allowedPlans y
// suscripción al día (paused / cancelled / prueba vencida → no)
function makeRequirePlan(plan, status = 'active') {
  return async (_userId, allowedPlans) => {
    if (!allowedPlans.includes(plan)) return { ok: false, status: 403, reason: 'plan' };
    if (status !== 'active') return { ok: false, status: 403, reason: status };
    return { ok: true, restaurant: { id: R1, plan } };
  };
}
const fakeDb = (row) => ({
  from() {
    const q = { select() { return q; }, eq() { return q; }, maybeSingle: () => Promise.resolve({ data: row, error: null }) };
    return q;
  },
});
const row = (over = {}) => ({ id: R1, user_id: 'user-1', owner_email: DUENO, mp_checkout_enabled: true, ...over });
const gate = (plan, { status, ...over } = {}) =>
  isMpCheckoutEnabledCore({ id: R1 }, { db: fakeDb(row(over)), canUseMpConnect, requirePlan: makeRequirePlan(plan, status) });

console.log('lanzamiento (lib/access.ts)');
check('MP_CONNECT_PUBLIC está encendido', MP_CONNECT_PUBLIC === true);
check('un dueño que no es admin pasa canUseMpConnect', !ADMIN_EMAILS.includes(DUENO) && canUseMpConnect(DUENO) === true);
check('sin email también pasa (la puerta real es el plan)', canUseMpConnect(null) === true);

console.log('checkout con Mercado Pago (gate real, interruptor del dueño encendido)');
check('Light → no', (await gate('light')) === false);
check('GO al día → sí', (await gate('go')) === true);
check('Plus al día → sí', (await gate('plus')) === true);
check('GO pausado → no', (await gate('go', { status: 'paused' })) === false);
check('Plus cancelado → no', (await gate('plus', { status: 'cancelled' })) === false);

console.log('interruptor del dueño (mp_checkout_enabled)');
check('GO con el interruptor apagado → no ofrece Mercado Pago', (await gate('go', { mp_checkout_enabled: false })) === false);
check('Plus con el interruptor sin configurar (null) → no', (await gate('plus', { mp_checkout_enabled: null })) === false);

console.log('conexión de la cuenta (/api/mp/connect y /api/mp/callback siguen exigiendo GO o Plus)');
for (const file of ['app/api/mp/connect/route.ts', 'app/api/mp/callback/route.ts']) {
  const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  check(`${file}: requirePlan(user.id, ['go', 'plus'])`, src.includes("requirePlan(user.id, ['go', 'plus'])"));
}
{
  const src = readFileSync(new URL('../lib/mpCheckoutGate.ts', import.meta.url), 'utf8');
  check("lib/mpCheckoutGate.ts: requirePlan(data.user_id, ['go', 'plus'])", src.includes("requirePlan(data.user_id, ['go', 'plus'])"));
}

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
