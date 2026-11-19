// Verificación de lib/retentionPlan.ts y del aviso de borrado. Sin red.
//   node scripts/check-retention-plan.mjs   (Node >= 22.18)
import { planRetention } from '../lib/retentionPlan.ts';
import { deleteWarningEmail } from '../lib/email/deleteWarning.ts';
import { diaArg } from '../lib/email/dates.ts';

let failures = 0;
const check = (name, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) failures++; };
const T = (s) => new Date(s);
const one = (row, warned, now) => planRetention([row], warned ? new Map([[row.id, T(warned)]]) : new Map(), T(now))[0];

// Servicio hasta el 5/12/2026 (00:00 AR = 03:00Z) → borrado 5/3/2027 → aviso desde el 18/2/2027
const base = { id: 'a', subscription_status: 'cancelled', grace_period_until: '2026-12-05T03:00:00Z' };

check('antes del aviso: espera', one(base, null, '2027-02-10T12:00:00Z').kind === 'wait');
check('día del aviso (18/2): avisa con el día de borrado real', (() => { const a = one(base, null, '2027-02-18T15:00:00Z'); return a.kind === 'warn' && diaArg(a.deleteOn) === '2027-03-05'; })());
check('sin aviso enviado NUNCA borra, aunque ya pasó el día', (() => { const a = one(base, null, '2027-03-20T15:00:00Z'); return a.kind === 'warn'; })());
check('aviso tardío: la fecha que dice el mail es hoy + 15 días', (() => { const a = one(base, null, '2027-03-20T15:00:00Z'); return diaArg(a.deleteOn) === '2027-04-04'; })());
check('avisado el 18/2: el 5/3 borra', one(base, '2027-02-18T15:00:00Z', '2027-03-05T15:00:00Z').kind === 'delete');
check('avisado el 18/2: el 4/3 todavía no (no llegó el día)', one(base, '2027-02-18T15:00:00Z', '2027-03-04T15:00:00Z').kind === 'wait');
check('avisado tarde (20/3): no borra hasta 14 días después', one(base, '2027-03-20T15:00:00Z', '2027-03-25T15:00:00Z').kind === 'wait');
check('avisado tarde (20/3): borra a los 14 días', one(base, '2027-03-20T15:00:00Z', '2027-04-03T15:00:00Z').kind === 'delete');
check('no cancelado: se ignora', planRetention([{ ...base, subscription_status: 'active' }], new Map(), T('2027-03-20T15:00:00Z')).length === 0);
check('sin fecha de fin de servicio: se ignora', planRetention([{ ...base, grace_period_until: null }], new Map(), T('2027-03-20T15:00:00Z')).length === 0);
check('fecha inválida: se ignora', planRetention([{ ...base, grace_period_until: 'no-fecha' }], new Map(), T('2027-03-20T15:00:00Z')).length === 0);
check('una cuenta que ya volvió (active) no se borra aunque tenga gracia vieja', planRetention([{ ...base, subscription_status: 'active' }], new Map([['a', T('2027-02-18T15:00:00Z')]]), T('2027-03-10T15:00:00Z')).length === 0);

check('un aviso de una cancelación anterior no habilita el borrado', one(base, '2026-06-01T15:00:00Z', '2027-03-10T15:00:00Z').kind === 'warn');

// Pruebas gratis abandonadas: creado el 1/11/2026 → la prueba vence el 15/11 (00:00 AR) → borrado 13/2/2027 → aviso desde el 29/1/2027
const trial = { id: 't', subscription_status: 'trialing', grace_period_until: null, created_at: '2026-11-01T15:00:00Z', mp_card_id: null, mp_customer_id: null, mp_preapproval_id: null, first_paid_at: null };
check('prueba abandonada: antes del aviso espera', one(trial, null, '2027-01-20T12:00:00Z').kind === 'wait');
check('prueba abandonada: el 29/1 avisa, con motivo trial y borrado el 13/2/2027', (() => { const a = one(trial, null, '2027-01-29T15:00:00Z'); return a.kind === 'warn' && a.reason === 'trial' && diaArg(a.deleteOn) === '2027-02-13'; })());
check('prueba abandonada: sin aviso enviado NUNCA borra', one(trial, null, '2027-06-01T12:00:00Z').kind === 'warn');
check('prueba abandonada: avisada el 29/1, el 13/2 borra', one(trial, '2027-01-29T15:00:00Z', '2027-02-13T15:00:00Z').kind === 'delete');
check('prueba abandonada: el 12/2 todavía no', one(trial, '2027-01-29T15:00:00Z', '2027-02-12T15:00:00Z').kind === 'wait');
check('prueba en curso (creada hace 5 días) → espera, no avisa', one({ ...trial, created_at: '2027-01-25T15:00:00Z' }, null, '2027-01-30T12:00:00Z').kind === 'wait');
check('un aviso anterior al fin de la prueba no cuenta', one(trial, '2026-11-10T15:00:00Z', '2027-02-14T15:00:00Z').kind === 'warn');
for (const [campo, valor] of [['mp_card_id', 'card_1'], ['mp_customer_id', 'cus_1'], ['mp_preapproval_id', 'pre_1'], ['first_paid_at', '2026-11-20T00:00:00Z']]) {
  check(`prueba con ${campo} cargado: NO se considera abandonada`, planRetention([{ ...trial, [campo]: valor }], new Map(), T('2027-03-01T12:00:00Z')).length === 0);
}
check('prueba con un campo sin leer (undefined): NO se considera abandonada', (() => { const { mp_card_id, ...sin } = trial; return planRetention([sin], new Map(), T('2027-03-01T12:00:00Z')).length === 0; })());
check('prueba sin created_at: se ignora', planRetention([{ ...trial, created_at: null }], new Map(), T('2027-03-01T12:00:00Z')).length === 0);
check('paused / active / authorized no entran', ['paused', 'active', 'authorized'].every((st) => planRetention([{ ...trial, subscription_status: st }], new Map(), T('2027-03-01T12:00:00Z')).length === 0));
check('cancelado conserva motivo cancelled', one(base, null, '2027-02-18T15:00:00Z').reason === 'cancelled');

const tw = deleteWarningEmail({ name: 'Mi local', deleteOn: T('2027-02-13T03:00:00Z'), reason: 'trial' });
check('mail de prueba: dice que la prueba terminó y no habla de cancelar', tw.text.includes('tu prueba gratuita') && !tw.text.includes('cancelaste') && !tw.html.includes('cancelaste'));
check('mail de prueba: invita a elegir un plan', tw.text.includes('Elegir mi plan') && tw.text.includes('elegí un plan'));
check('mail por cancelación no cambió', w0().text.includes('cancelaste tu suscripción') && w0().text.includes('Reactivar mi plan'));
function w0() { return deleteWarningEmail({ name: 'X', deleteOn: T('2027-03-05T03:00:00Z') }); }

const w = deleteWarningEmail({ name: 'Doña <Coca>', deleteOn: T('2027-03-05T03:00:00Z') });
check('mail: dice la fecha y que no se puede recuperar', w.text.includes('El 5 de marzo de 2027 borramos') && w.text.includes('no se puede recuperar'));
check('mail: invita a reactivar y escapa el nombre', w.text.includes('reactivá tu plan') && w.html.includes('Doña &lt;Coca&gt;') && !w.html.includes('<Coca>'));
check('mail: el asunto lleva la fecha', w.subject.includes('5 de marzo de 2027'));

if (failures) { console.log(`\n${failures} FALLARON`); process.exit(1); }
console.log('\nTodo OK');
