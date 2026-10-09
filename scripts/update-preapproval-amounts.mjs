// update-preapproval-amounts.mjs
//
// Actualiza el monto de los preapprovals (suscripciones) de Mercado Pago de los
// clientes existentes al precio de lista actual de lib/plans.ts.
//
// CÓMO CORRERLO (Node >= 22.18 / 24, que importa .ts sin compilar):
//
//   Dry-run (por defecto, NO modifica nada):
//     node --env-file=.env.local scripts/update-preapproval-amounts.mjs
//
//   Aplicar (hace el PUT en MP):
//     node --env-file=.env.local scripts/update-preapproval-amounts.mjs --apply --confirm=SI
//
// Variables de entorno: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// MERCADO_PAGO_ACCESS_TOKEN. Nunca se imprimen.
//
// Reglas:
//   - Solo lee de Supabase (restaurants con mp_preapproval_id). No escribe en la base.
//   - Solo actualiza preapprovals con status "authorized" y next_payment_date >= CUTOFF.
//     Los que cobran antes se saltean (si no, pagarían el precio nuevo este mes).
//   - Idempotente: si el monto ya es el nuevo, se saltea. Se puede correr varias veces.

import { createClient } from '@supabase/supabase-js';
import { PLAN_PRICES } from '../lib/plans.ts';

const CUTOFF = new Date('2026-11-01T00:00:00-03:00');
const MP_BASE = 'https://api.mercadopago.com';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const CONFIRMED = args.includes('--confirm=SI');

if (APPLY && !CONFIRMED) {
  console.error('Para aplicar cambios hace falta --apply --confirm=SI. Abortado, no se modificó nada.');
  process.exit(1);
}

for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'MERCADO_PAGO_ACCESS_TOKEN']) {
  if (!process.env[name]) {
    console.error(`Falta la variable de entorno ${name}. ¿Corriste con --env-file=.env.local?`);
    process.exit(1);
  }
}

const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const mpHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${mpToken}`,
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getPreapproval(id) {
  try {
    const res = await fetch(`${MP_BASE}/preapproval/${encodeURIComponent(id)}`, { headers: mpHeaders });
    if (!res.ok) return { error: `GET http=${res.status}` };
    return { data: await res.json() };
  } catch (err) {
    return { error: `GET falló: ${err.message}` };
  }
}

// Mismo formato de PUT que /api/subscriptions/change
async function putAmount(id, amount) {
  try {
    const res = await fetch(`${MP_BASE}/preapproval/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: mpHeaders,
      body: JSON.stringify({ auto_recurring: { transaction_amount: amount } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: `PUT http=${res.status} ${data.message ?? ''}`.trim() };
    const applied = Number(data?.auto_recurring?.transaction_amount);
    if (applied !== amount) return { error: `PUT respondió monto ${applied}, se esperaba ${amount}` };
    return { ok: true };
  } catch (err) {
    return { error: `PUT falló: ${err.message}` };
  }
}

function decide(restaurant, pre) {
  const newAmount = PLAN_PRICES[restaurant.subscription_plan];
  if (!newAmount) return { action: 'skip', reason: `plan desconocido (${restaurant.subscription_plan})` };
  if (!pre) return { action: 'skip', reason: 'no se pudo leer el preapproval' };

  const current = Number(pre.auto_recurring?.transaction_amount);
  if (pre.status !== 'authorized') return { action: 'skip', reason: `status MP = ${pre.status}` };
  if (pre.auto_recurring?.currency_id && pre.auto_recurring.currency_id !== 'ARS') {
    return { action: 'skip', reason: `moneda ${pre.auto_recurring.currency_id}` };
  }
  if (current === newAmount) return { action: 'skip', reason: 'ya tiene el monto nuevo' };
  if (!pre.next_payment_date) return { action: 'skip', reason: 'sin next_payment_date en MP' };
  if (new Date(pre.next_payment_date) < CUTOFF) {
    return { action: 'skip', reason: `cobra antes del ${CUTOFF.toISOString()} — actualizar después` };
  }
  return { action: 'update', reason: `${current} → ${newAmount}` };
}

async function main() {
  const env = mpToken.startsWith('TEST-') ? 'TEST' : 'PRODUCCIÓN';
  console.log(`Modo: ${APPLY ? 'APPLY (modifica MP)' : 'DRY-RUN (no modifica nada)'} · token MP de ${env}`);
  console.log(`Corte: solo se actualizan los que cobran desde ${CUTOFF.toISOString()}\n`);

  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, subscription_plan, subscription_status, mp_preapproval_id')
    .not('mp_preapproval_id', 'is', null);

  if (error) {
    console.error('Error leyendo restaurants:', error.message);
    process.exit(1);
  }

  const rows = [];
  let updated = 0;
  let failed = 0;

  for (const r of restaurants ?? []) {
    const { data: pre, error: getError } = await getPreapproval(r.mp_preapproval_id);
    const decision = getError ? { action: 'skip', reason: getError } : decide(r, pre);

    let result = decision.action === 'update' ? (APPLY ? 'ACTUALIZAR' : 'se actualizaría') : 'se saltea';
    if (APPLY && decision.action === 'update') {
      const put = await putAmount(r.mp_preapproval_id, PLAN_PRICES[r.subscription_plan]);
      if (put.ok) { result = 'ACTUALIZADO'; updated++; }
      else { result = `ERROR: ${put.error}`; failed++; }
    }

    rows.push({
      nombre: r.name,
      plan: r.subscription_plan,
      estado_db: r.subscription_status,
      estado_mp: pre?.status ?? '-',
      monto_actual: pre?.auto_recurring?.transaction_amount ?? '-',
      monto_nuevo: PLAN_PRICES[r.subscription_plan] ?? '-',
      next_payment_date: pre?.next_payment_date ?? '-',
      resultado: result,
      motivo: decision.reason,
    });
  }

  console.table(rows);
  console.log(`\nTotal: ${rows.length} · actualizados: ${updated} · errores: ${failed}`);
  if (!APPLY) console.log('Dry-run: no se modificó nada. Para aplicar: --apply --confirm=SI');
  if (failed > 0) process.exit(2);
}

main().catch((err) => {
  console.error('Error inesperado:', err.message);
  process.exit(1);
});
