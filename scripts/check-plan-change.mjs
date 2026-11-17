// Reglas del cambio de plan (lib/planChange.ts) y que el cobro y el webhook respeten el diseño.
// Sin red ni base.
//
//   node scripts/check-plan-change.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { readFileSync } from 'node:fs';
import { planChangeKind, prorateAmount, PRORATE_MIN_DAYS, PRORATE_CYCLE_DAYS } from '../lib/planChange.ts';

let failed = 0;
function check(name, ok, detail) {
  console.log(`${name} → ${ok ? 'OK' : 'FALLA'}${detail ? ` (${detail})` : ''}`);
  if (!ok) failed++;
}

// tipo de cambio
check('Light → Go es subida', planChangeKind(20000, 29500) === 'upgrade');
check('Plus → Light es bajada', planChangeKind(47000, 20000) === 'downgrade');
check('mismo monto es igual', planChangeKind(29500, 29500) === 'same');

// prorrateo
check('mínimo de días = 5', PRORATE_MIN_DAYS === 5);
check('Light → Go con 20 días: 2/3 de la diferencia', prorateAmount(20, 20000, 29500) === Math.round((20 / 30) * 9500));
check('Light → Go con 30 días: diferencia completa', prorateAmount(30, 20000, 29500) === 9500);
check('un ciclo de 31 días no cobra más que la diferencia', prorateAmount(31, 20000, 29500) === 9500);
check('con 5 días justo se cobra', prorateAmount(5, 20000, 29500) === Math.round((5 / PRORATE_CYCLE_DAYS) * 9500));
check('con 4 días no se cobra nada', prorateAmount(4, 20000, 29500) === 0);
check('con 1 día no se cobra nada', prorateAmount(1, 20000, 47000) === 0);
check('bajar de plan nunca cobra', prorateAmount(20, 47000, 20000) === 0);
check('mismo plan nunca cobra', prorateAmount(20, 29500, 29500) === 0);
check('días inválidos no cobran', prorateAmount(NaN, 20000, 29500) === 0);

// el servidor sigue el diseño
const change = readFileSync(new URL('../app/api/subscriptions/change/route.ts', import.meta.url), 'utf8');
check('el POST ya no deja el plan cambiado si falla el prorrateo (sin "No bloqueamos")', !change.includes('No bloqueamos'));
check('cobro rechazado devuelve prorrateo_rechazado', change.includes("code: 'prorrateo_rechazado'"));
check('el cobro va antes de fijar el monto nuevo en MP', change.indexOf('chargeSubscription({') < change.indexOf('putPreapprovalAmount(preapprovalId, newPrice))) {\n        if (chargedPaymentId'));
check('si MP no actualiza tras cobrar, se devuelve el pago', change.includes('refundPayment(chargedPaymentId)'));
check('la bajada guarda pending_plan sin tocar subscription_plan', change.includes("update({ pending_plan: plan, pending_plan_from: renewal.toISOString() })"));
check('el email para cobrar sale de la base', change.includes('restaurant?.owner_email') && !change.includes('body.email'));
check('con un cambio pendiente no se acepta otro', change.includes("code: 'cambio_pendiente'"));

const webhook = readFileSync(new URL('../app/api/mercadopago/webhook/route.ts', import.meta.url), 'utf8');
check("el webhook ignora los pagos 'Prorrateo'", webhook.includes("startsWith('Prorrateo')"));

const cron = readFileSync(new URL('../app/api/cron/charge/route.ts', import.meta.url), 'utf8');
check('el cron aplica los planes pendientes antes de cobrar', cron.indexOf('pending_plan_from') > -1 && cron.indexOf('pending_plan_from') < cron.indexOf("from('restaurants')\n    .select(\n      'id, name"));

const sql = readFileSync(new URL('../docs/sql/28_pending_plan.sql', import.meta.url), 'utf8');
check('el SQL protege pending_plan en UPDATE', sql.includes('new.pending_plan        := old.pending_plan;'));
check('el SQL protege pending_plan en INSERT', sql.includes('new.pending_plan        := null;'));

console.log(failed ? `\n${failed} chequeo(s) fallaron` : '\nTodo OK');
process.exit(failed ? 1 : 0);
