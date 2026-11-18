// Verificación de lib/paymentGrace.ts (gracia por cobro fallido). Sin red.
//   node scripts/check-payment-grace.mjs
import { PAYMENT_GRACE_DAYS, paymentGraceUntil, inPaymentGrace } from '../lib/paymentGrace.ts';

let failures = 0;
function check(name, cond) { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) failures++; }
const at = (iso) => new Date(iso);

check('son 3 días', PAYMENT_GRACE_DAYS === 3);
check('paymentGraceUntil suma 3 días exactos', paymentGraceUntil(at('2026-11-19T10:00:00Z')) === '2026-11-22T10:00:00.000Z');
const now = at('2026-11-20T12:00:00Z');
check('paused con gracia futura → en gracia', inPaymentGrace({ subscription_status: 'paused', payment_grace_until: '2026-11-22T10:00:00Z' }, now) === true);
check('paused con gracia vencida → no', inPaymentGrace({ subscription_status: 'paused', payment_grace_until: '2026-11-20T11:59:59Z' }, now) === false);
check('justo en el límite → no', inPaymentGrace({ subscription_status: 'paused', payment_grace_until: '2026-11-20T12:00:00Z' }, now) === false);
check('paused sin fecha → no', inPaymentGrace({ subscription_status: 'paused', payment_grace_until: null }, now) === false);
check('activa con fecha vieja guardada → no cuenta', inPaymentGrace({ subscription_status: 'active', payment_grace_until: '2026-11-22T10:00:00Z' }, now) === false);
check('cancelada → no cuenta', inPaymentGrace({ subscription_status: 'cancelled', payment_grace_until: '2026-11-22T10:00:00Z' }, now) === false);
check('fecha inválida → no', inPaymentGrace({ subscription_status: 'paused', payment_grace_until: 'basura' }, now) === false);
check('fila nula → no', inPaymentGrace(null, now) === false && inPaymentGrace(undefined, now) === false);
console.log(failures ? `\n${failures} FALLAS` : '\nTodo ok');
process.exit(failures ? 1 : 0);
