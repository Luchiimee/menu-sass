// Verificación de lib/dataRetention.ts y del mail de cancelación. Sin red.
//   node scripts/check-data-retention.mjs   (Node >= 22.18)
import { RETENTION_DAYS, WARNING_DAYS, serviceEndFor, deleteOnFor, warningOnFor } from '../lib/dataRetention.ts';
import { cancelNoticeEmail } from '../lib/email/cancelNotice.ts';
import { diaArg } from '../lib/email/dates.ts';

let failures = 0;
const check = (name, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) failures++; };
const dia = (d) => diaArg(d);

check('90 días y aviso a los 15', RETENTION_DAYS === 90 && WARNING_DAYS === 15);

// Ejemplo de Luciano: cancela el 15, el servicio sigue hasta el 5 del mes siguiente → 90 días desde el 5
const cancelled = new Date('2026-11-15T15:00:00Z');
const grace = '2026-12-05T03:00:00Z';
check('el fin del servicio es la gracia', serviceEndFor(grace, cancelled).toISOString() === '2026-12-05T03:00:00.000Z');
check('borrado = 90 días desde el 5/12 → 5/3', dia(deleteOnFor(grace, cancelled)) === '2027-03-05');
check('aviso = 15 días antes del borrado → 18/2', dia(warningOnFor(deleteOnFor(grace, cancelled))) === '2027-02-18');
check('sin gracia (corte inmediato): 90 días desde la cancelación', dia(deleteOnFor(null, cancelled)) === '2027-02-13');
check('gracia inválida: cuenta desde la cancelación', dia(deleteOnFor('no-fecha', cancelled)) === '2027-02-13');
check('el borrado queda a las 00:00 hora Argentina', deleteOnFor(grace, cancelled).toISOString() === '2027-03-05T03:00:00.000Z');

const withService = cancelNoticeEmail({ name: 'Doña <Coca>', serviceUntil: new Date(grace), deleteOn: deleteOnFor(grace, cancelled) });
check('mail con servicio: dice hasta cuándo sigue', withService.text.includes('siguen funcionando hasta el 5 de diciembre de 2026'));
check('mail: dice hasta cuándo se guardan los datos', withService.text.includes('hasta el 5 de marzo de 2027'));
check('mail: explica cómo volver', withService.text.includes('Si volvés antes de esa fecha') && withService.html.includes('/dashboard/plan'));
check('mail: escapa el nombre en el HTML', withService.html.includes('Doña &lt;Coca&gt;') && !withService.html.includes('<Coca>'));
const noService = cancelNoticeEmail({ name: null, serviceUntil: null, deleteOn: deleteOnFor(null, cancelled) });
check('mail sin servicio: "ya no están activos" y nombre por defecto', noService.text.includes('ya no están activos') && noService.text.includes('tu local'));

if (failures) { console.log(`\n${failures} FALLARON`); process.exit(1); }
console.log('\nTodo OK');
