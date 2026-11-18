// Verificación de lib/email/cancelNoticeRun.ts con base y envío simulados. Sin red.
//   node scripts/check-cancel-notice-run.mjs   (Node >= 22.18)
import { sendCancelNotice, cancelNoticeDedupeKey } from '../lib/email/cancelNoticeRun.ts';

let failures = 0;
const check = (name, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) failures++; };

const deleteOn = new Date('2027-03-05T03:00:00Z');
const rest = { id: 'r1', owner_email: 'a@b.com', name: 'Local' };

function fakeDb(reserveResult = 'reserved') {
  const calls = [];
  return {
    calls,
    async reserve(row) { calls.push(['reserve', row]); if (reserveResult === 'throw') throw new Error('x'); return reserveResult; },
    async markSent(k, id) { calls.push(['sent', k, id]); },
    async markFailed(k, e) { calls.push(['failed', k, e]); },
  };
}
const okSend = async () => ({ ok: true, id: 'p1' });
const logs = [];
const log = (l) => logs.push(l);

let db = fakeDb();
let r = await sendCancelNotice({ db, send: okSend, restaurant: rest, serviceUntil: null, deleteOn, log });
check('manda y marca sent', r.outcome === 'sent' && db.calls[1][0] === 'sent');
check('clave: cancel_notice:<id>:<día del borrado>', db.calls[0][1].dedupe_key === 'cancel_notice:r1:2027-03-05' && cancelNoticeDedupeKey('r1', deleteOn) === 'cancel_notice:r1:2027-03-05');
check('kind cancel_notice', db.calls[0][1].kind === 'cancel_notice');

db = fakeDb('duplicate');
let sendCalled = false;
r = await sendCancelNotice({ db, send: async () => { sendCalled = true; return { ok: true, id: null }; }, restaurant: rest, serviceUntil: null, deleteOn, log });
check('duplicado: no manda', r.outcome === 'duplicate' && !sendCalled);

db = fakeDb();
r = await sendCancelNotice({ db, send: async () => ({ ok: false, error: 'resend_http_422' }), restaurant: rest, serviceUntil: null, deleteOn, log });
check('falla del proveedor: marca failed y no lanza', r.outcome === 'failed' && db.calls[1][0] === 'failed');

db = fakeDb();
r = await sendCancelNotice({ db, send: async () => { throw new Error('boom'); }, restaurant: rest, serviceUntil: null, deleteOn, log });
check('el envío lanza: se captura', r.outcome === 'failed');

db = fakeDb('throw');
r = await sendCancelNotice({ db, send: okSend, restaurant: rest, serviceUntil: null, deleteOn, log });
check('la reserva lanza: reserve_error, no manda', r.outcome === 'reserve_error');

db = fakeDb('error');
r = await sendCancelNotice({ db, send: okSend, restaurant: rest, serviceUntil: null, deleteOn, log });
check('reserva con error (p. ej. check de kind sin aplicar): reserve_error', r.outcome === 'reserve_error');

db = fakeDb();
r = await sendCancelNotice({ db, send: okSend, restaurant: { ...rest, owner_email: '  ' }, serviceUntil: null, deleteOn, log });
check('sin email: no_email', r.outcome === 'no_email' && db.calls.length === 0);

db = fakeDb();
r = await sendCancelNotice({ db, send: () => new Promise(() => {}), restaurant: rest, serviceUntil: null, deleteOn, maxMs: 30, log });
check('envío colgado: timeout a los maxMs', r.outcome === 'timeout');

check('los logs llevan código y restaurant.id, sin email', logs.length > 0 && logs.every((l) => l.includes('restaurant=r1') && !l.includes('@')));

if (failures) { console.log(`\n${failures} FALLARON`); process.exit(1); }
console.log('\nTodo OK');
