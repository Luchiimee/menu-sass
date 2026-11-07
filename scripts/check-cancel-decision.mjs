// Verificación de lib/cancelDecision.ts (decideCancel). Sin red.
//
//   node scripts/check-cancel-decision.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { decideCancel, PRE_NO_ID_CODE, PRE_NO_ID_MESSAGE } from '../lib/cancelDecision.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const r = (subscription_status, mp_preapproval_id, mp_card_id) => ({ subscription_status, mp_preapproval_id, mp_card_id });

console.log('cancel_mp: tiene mp_preapproval_id');
check('active con id', decideCancel(r('active', 'pre_1', null)) === 'cancel_mp');
check('paused con id', decideCancel(r('paused', 'pre_1', null)) === 'cancel_mp');
check('con id y con tarjeta: gana el id', decideCancel(r('active', 'pre_1', 'card_1')) === 'cancel_mp');

console.log('cancel_local: lo cobra el cron de Snappy o nadie lo cobra');
check('active, sin id, con tarjeta (cron)', decideCancel(r('active', null, 'card_1')) === 'cancel_local');
check('authorized, sin id, con tarjeta', decideCancel(r('authorized', null, 'card_1')) === 'cancel_local');
check('trialing sin id ni tarjeta', decideCancel(r('trialing', null, null)) === 'cancel_local');
check('trialing con tarjeta', decideCancel(r('trialing', null, 'card_1')) === 'cancel_local');
check('paused sin id ni tarjeta', decideCancel(r('paused', null, null)) === 'cancel_local');
check('cancelled sin id ni tarjeta', decideCancel(r('cancelled', null, null)) === 'cancel_local');
check('status null sin id ni tarjeta', decideCancel(r(null, null, null)) === 'cancel_local');
check('status undefined', decideCancel({}) === 'cancel_local');

console.log('blocked_no_id: active/authorized, sin id y sin tarjeta (caso Casa Delia)');
check('active', decideCancel(r('active', null, null)) === 'blocked_no_id');
check('authorized', decideCancel(r('authorized', null, null)) === 'blocked_no_id');
check('active con strings vacíos', decideCancel(r('active', '', '  ')) === 'blocked_no_id');
check('active con campos ausentes', decideCancel({ subscription_status: 'active' }) === 'blocked_no_id');

console.log('bordes');
check('null/undefined no explota → cancel_local', decideCancel(null) === 'cancel_local' && decideCancel(undefined) === 'cancel_local');
check('código y mensaje de PRE_NO_ID', PRE_NO_ID_CODE === 'PRE_NO_ID' && PRE_NO_ID_MESSAGE.startsWith('Tu suscripción de Mercado Pago no está vinculada'));

if (failures > 0) {
  console.error(`\n${failures} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\nTodo ok');
