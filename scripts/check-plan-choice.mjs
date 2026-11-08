// Verificación de decidePlanChange (lib/planChoice.ts). Sin red.
//
//   node scripts/check-plan-choice.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { decidePlanChange, changePlanGate } from '../lib/planChoice.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

console.log('estados que pueden elegir plan (trialing o sin estado)');
for (const status of ['trialing', null, undefined, '']) {
  for (const plan of ['light', 'go', 'plus']) {
    check(`${JSON.stringify(status)} + ${plan} → allow`, decidePlanChange(status, null, plan) === 'allow');
  }
}
check('trialing con plan actual distinto → allow', decidePlanChange('trialing', 'light', 'plus') === 'allow');
check('trialing con el mismo plan → allow (idempotente)', decidePlanChange('trialing', 'go', 'go') === 'allow');

console.log('estados con cobro: use_billing_flow');
for (const status of ['active', 'authorized', 'paused', 'cancelled']) {
  for (const plan of ['light', 'go', 'plus']) {
    check(`${status} + ${plan} → use_billing_flow`, decidePlanChange(status, 'go', plan) === 'use_billing_flow');
  }
}
check('estado desconocido → use_billing_flow (no se asume permitido)', decidePlanChange('raro', 'go', 'plus') === 'use_billing_flow');
check('"Trialing" en mayúsculas no cuenta como trialing', decidePlanChange('Trialing', 'go', 'plus') === 'use_billing_flow');

console.log('plan inválido');
for (const bad of [null, undefined, '', ' ', 'enterprise', 'LIGHT', 'Go', 'PLUS', 'light ', 'premium', 0, 1, {}, [], ['go'], true]) {
  check(`plan ${JSON.stringify(bad)} en trialing → invalid_plan`, decidePlanChange('trialing', 'go', bad) === 'invalid_plan');
}
check('plan inválido gana sobre el estado (active + enterprise)', decidePlanChange('active', 'go', 'enterprise') === 'invalid_plan');
check('plan inválido sin estado', decidePlanChange(null, null, 'enterprise') === 'invalid_plan');

console.log('changePlanGate: puerta de /api/subscriptions/change (rama sin suscripción activa)');
{
  const r = (status, pre, plan = 'go') => ({ subscription_status: status, mp_preapproval_id: pre, subscription_plan: plan });
  const ok = (g) => g.ok === true;
  const bloq = (g, st, code) => g.ok === false && g.status === st && g.code === code;
  check('trialing sin tarjeta → ok', ok(changePlanGate(r('trialing', null), 'plus')));
  check('trialing con tarjeta (sin preapproval) → ok', ok(changePlanGate({ ...r('trialing', null), mp_card_id: 'c1' }, 'plus')));
  check('estado null → ok', ok(changePlanGate(r(null, null, null), 'light')));
  check('sin local (null) → ok (como hoy: el update no toca filas)', ok(changePlanGate(null, 'go')));
  check('active SIN preapproval → 409 USE_BILLING_FLOW', bloq(changePlanGate(r('active', null), 'plus'), 409, 'USE_BILLING_FLOW'));
  check('authorized SIN preapproval → 409 USE_BILLING_FLOW', bloq(changePlanGate(r('authorized', null), 'plus'), 409, 'USE_BILLING_FLOW'));
  check('active CON preapproval → ok (la puerta no aplica)', ok(changePlanGate(r('active', 'pre_1'), 'plus')));
  check('authorized CON preapproval → ok (la puerta no aplica)', ok(changePlanGate(r('authorized', 'pre_1'), 'light')));
  check('paused → 409 USE_BILLING_FLOW', bloq(changePlanGate(r('paused', null), 'plus'), 409, 'USE_BILLING_FLOW'));
  check('paused aunque conserve un preapproval → 409', bloq(changePlanGate(r('paused', 'pre_1'), 'plus'), 409, 'USE_BILLING_FLOW'));
  check('cancelled → 409 USE_BILLING_FLOW', bloq(changePlanGate(r('cancelled', null), 'plus'), 409, 'USE_BILLING_FLOW'));
  for (const bad of [null, '', 'enterprise', 'PLUS', undefined]) {
    check(`plan inválido ${JSON.stringify(bad)} en trialing → 400 INVALID_PLAN`, bloq(changePlanGate(r('trialing', null), bad), 400, 'INVALID_PLAN'));
  }
  check('plan inválido en paused → 400 (gana sobre el estado)', bloq(changePlanGate(r('paused', null), 'enterprise'), 400, 'INVALID_PLAN'));
  check('el resultado ok no trae status ni code', JSON.stringify(changePlanGate(r('trialing', null), 'go')) === '{"ok":true}');
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
