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

const w = deleteWarningEmail({ name: 'Doña <Coca>', deleteOn: T('2027-03-05T03:00:00Z') });
check('mail: dice la fecha y que no se puede recuperar', w.text.includes('El 5 de marzo de 2027 borramos') && w.text.includes('no se puede recuperar'));
check('mail: invita a reactivar y escapa el nombre', w.text.includes('reactivá tu plan') && w.html.includes('Doña &lt;Coca&gt;') && !w.html.includes('<Coca>'));
check('mail: el asunto lleva la fecha', w.subject.includes('5 de marzo de 2027'));

if (failures) { console.log(`\n${failures} FALLARON`); process.exit(1); }
console.log('\nTodo OK');
