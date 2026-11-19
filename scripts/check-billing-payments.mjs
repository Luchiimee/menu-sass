// Verificación de lib/billingPayments.ts (historial de facturación). Sin red.
//   node scripts/check-billing-payments.mjs
import { isRecordedStatus, planFromDescription, rowFromMpPayment, rowFromCronCharge, saveBillingPayment } from '../lib/billingPayments.ts';

let failures = 0;
const check = (name, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) failures++; };
const now = new Date('2026-12-05T15:00:00Z');
const rest = { id: 'r1', subscription_plan: 'light' };

check('estados que se anotan', ['approved', 'rejected', 'cancelled', 'refunded', 'charged_back'].every(isRecordedStatus));
check('estados que NO se anotan', ['pending', 'in_process', 'authorized', '', null, undefined, 5].every((s) => !isRecordedStatus(s)));
check('plan desde la descripción del cron', planFromDescription('Snappy - Plan go - Mi local') === 'go');
check('plan desde el motivo de la suscripción', planFromDescription('Snappy - Plan PLUS') === 'plus');
check('descripción sin plan → null', planFromDescription('otra cosa') === null && planFromDescription(null) === null && planFromDescription(42) === null);

const ok = rowFromMpPayment({ id: 123456, status: 'approved', transaction_amount: 29500, currency_id: 'ARS', description: 'Snappy - Plan go - X', date_approved: '2026-12-05T12:00:00.000-03:00' }, rest, now);
check('aprobado: id como texto, monto, plan de la descripción y fecha', ok && ok.mp_payment_id === '123456' && ok.amount === 29500 && ok.plan === 'go' && ok.paid_at === '2026-12-05T15:00:00.000Z' && ok.status === 'approved' && ok.source === 'webhook' && ok.restaurant_id === 'r1');
const rej = rowFromMpPayment({ id: 9, status: 'rejected', status_detail: 'cc_rejected_insufficient_amount', transaction_amount: 20000 }, rest, now);
check('rechazado: guarda el motivo y usa el plan actual del local si no hay descripción', rej && rej.status_detail === 'cc_rejected_insufficient_amount' && rej.plan === 'light');
check('pendiente / en proceso: no se anota', rowFromMpPayment({ id: 1, status: 'pending' }, rest, now) === null && rowFromMpPayment({ id: 1, status: 'in_process' }, rest, now) === null);
check('sin id o pago nulo: no se anota', rowFromMpPayment({ status: 'approved' }, rest, now) === null && rowFromMpPayment(null, rest, now) === null);
check('monto inválido → null, no rompe', rowFromMpPayment({ id: 2, status: 'approved', transaction_amount: 'x' }, rest, now).amount === null);
check('sin fecha: usa ahora', rowFromMpPayment({ id: 3, status: 'approved', transaction_amount: 1 }, rest, now).paid_at === now.toISOString());
check('el detalle largo se recorta', rowFromMpPayment({ id: 4, status: 'rejected', status_detail: 'x'.repeat(500) }, rest, now).status_detail.length === 200);

const cron = rowFromCronCharge({ restaurantId: 'r1', paymentId: 77, plan: 'go', amount: 29500 }, now);
check('cron: aprobado, id como texto, origen cron', cron.mp_payment_id === '77' && cron.status === 'approved' && cron.source === 'cron' && cron.amount === 29500 && cron.currency === 'ARS');

// saveBillingPayment: upsert por mp_payment_id y nunca lanza
const calls = [];
const good = { from: (t) => ({ upsert: async (row, opts) => { calls.push({ t, row, opts }); return { error: null }; } }) };
check('guarda con upsert sobre mp_payment_id', (await saveBillingPayment(good, cron)) === true && calls[0].t === 'billing_payments' && calls[0].opts.onConflict === 'mp_payment_id');
const logs = [];
const bad = { from: () => ({ upsert: async () => ({ error: { message: 'boom' } }) }) };
check('error de la base: devuelve false, no lanza y loguea solo código + id', (await saveBillingPayment(bad, cron, (l) => logs.push(l))) === false && logs.length === 1 && logs[0].includes('SAVE_FAILED') && !logs[0].includes('boom'));
const throws = { from: () => { throw new Error('caída'); } };
check('excepción: devuelve false y no lanza', (await saveBillingPayment(throws, cron, () => {})) === false);
check('fila nula: no llama a la base', (await saveBillingPayment({ from: () => { throw new Error('no debía llamarse'); } }, null)) === false);

console.log(failures ? `\n${failures} FALLARON` : '\nTodo OK');
process.exit(failures ? 1 : 0);
