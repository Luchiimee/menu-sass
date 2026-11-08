// Verificación de decidePlanChange (lib/planChoice.ts). Sin red.
//
//   node scripts/check-plan-choice.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { decidePlanChange } from '../lib/planChoice.ts';

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

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
