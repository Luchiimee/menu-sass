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
//   Un solo local (con el precio de lista de su plan y el mismo corte):
//     node --env-file=.env.local scripts/update-preapproval-amounts.mjs --restaurant=<uuid>
//
//   Un solo local con un monto explícito (ej. volver al precio anterior antes del corte):
//     node --env-file=.env.local scripts/update-preapproval-amounts.mjs --restaurant=<uuid> --amount=22000
//   --amount solo se acepta con --restaurant y tiene que ser un precio de LEGACY_PLAN_PRICES o
//   PLAN_PRICES. En ese modo NO se aplica el corte de fecha: solo se saltea si el preapproval
//   no está "authorized" (o si ya tiene ese monto).
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
import { PLAN_PRICES, LEGACY_PLAN_PRICES } from '../lib/plans.ts';

// El aumento rige desde el 1/12: los cobros anteriores siguen con el precio que tenían
const CUTOFF = new Date('2026-12-01T00:00:00-03:00');
const MP_BASE = 'https://api.mercadopago.com';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const CONFIRMED = args.includes('--confirm=SI');

function abort(message) {
  console.error(`${message} Abortado, no se modificó nada.`);
  process.exit(1);
}

const KNOWN_ARG = /^(--apply|--confirm=SI|--restaurant=.*|--amount=.*)$/;
const unknown = args.filter((a) => !KNOWN_ARG.test(a));
if (unknown.length) abort(`Argumento desconocido: ${unknown.join(' ')}.`);

const argValue = (name) => {
  const found = args.filter((a) => a.startsWith(`--${name}=`));
  if (found.length > 1) abort(`--${name} aparece más de una vez.`);
  return found.length ? found[0].slice(name.length + 3) : null;
};

const RESTAURANT_ID = argValue('restaurant');
const AMOUNT_ARG = argValue('amount');

if (RESTAURANT_ID !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(RESTAURANT_ID)) {
  abort('--restaurant tiene que ser el uuid del local.');
}

let EXPLICIT_AMOUNT = null;
if (AMOUNT_ARG !== null) {
  if (RESTAURANT_ID === null) abort('--amount solo se acepta junto con --restaurant=<uuid>.');
  if (!/^[1-9]\d*$/.test(AMOUNT_ARG)) abort('--amount tiene que ser un entero mayor a 0, sin puntos ni comas.');
  const allowed = new Set([...Object.values(LEGACY_PLAN_PRICES), ...Object.values(PLAN_PRICES)]);
  EXPLICIT_AMOUNT = Number(AMOUNT_ARG);
  if (!allowed.has(EXPLICIT_AMOUNT)) {
    abort(`--amount=${EXPLICIT_AMOUNT} no es un precio de LEGACY_PLAN_PRICES ni de PLAN_PRICES (${[...allowed].sort((a, b) => a - b).join(', ')}).`);
  }
}

if (APPLY && !CONFIRMED) abort('Para aplicar cambios hace falta --apply --confirm=SI.');

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

// Primeros y últimos 4 caracteres, para la tabla
const maskId = (id) => {
  const s = String(id ?? '');
  return s.length > 8 ? `${s.slice(0, 4)}…${s.slice(-4)}` : '****';
};

// Monto a fijar: el explícito (--amount) o el precio de lista del plan
const targetAmount = (restaurant) => EXPLICIT_AMOUNT ?? PLAN_PRICES[restaurant.subscription_plan];

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
  const newAmount = targetAmount(restaurant);
  if (!newAmount) return { action: 'skip', reason: `plan desconocido (${restaurant.subscription_plan})` };
  if (!pre) return { action: 'skip', reason: 'no se pudo leer el preapproval' };

  const current = Number(pre.auto_recurring?.transaction_amount);
  if (pre.status !== 'authorized') return { action: 'skip', reason: `status MP = ${pre.status}` };
  if (pre.auto_recurring?.currency_id && pre.auto_recurring.currency_id !== 'ARS') {
    return { action: 'skip', reason: `moneda ${pre.auto_recurring.currency_id}` };
  }
  if (current === newAmount) return { action: 'skip', reason: 'ya tiene el monto nuevo' };
  // Con monto explícito no se aplica el corte de fecha (ej. volver al precio anterior antes del corte)
  if (EXPLICIT_AMOUNT === null) {
    if (!pre.next_payment_date) return { action: 'skip', reason: 'sin next_payment_date en MP' };
    if (new Date(pre.next_payment_date) < CUTOFF) {
      return { action: 'skip', reason: `cobra antes del ${CUTOFF.toISOString()} — actualizar después` };
    }
  }
  return { action: 'update', reason: `${current} → ${newAmount}${EXPLICIT_AMOUNT !== null ? ' (monto explícito, sin corte)' : ''}` };
}

async function main() {
  const env = mpToken.startsWith('TEST-') ? 'TEST' : 'PRODUCCIÓN';
  console.log(`Modo: ${APPLY ? 'APPLY (modifica MP)' : 'DRY-RUN (no modifica nada)'} · token MP de ${env}`);
  if (RESTAURANT_ID) console.log(`Solo el local ${RESTAURANT_ID}`);
  if (EXPLICIT_AMOUNT !== null) console.log(`Monto explícito: ${EXPLICIT_AMOUNT} (sin corte de fecha)\n`);
  else console.log(`Corte: solo se actualizan los que cobran desde ${CUTOFF.toISOString()}\n`);

  let query = supabase
    .from('restaurants')
    .select('id, name, subscription_plan, subscription_status, mp_preapproval_id')
    .not('mp_preapproval_id', 'is', null);
  if (RESTAURANT_ID) query = query.eq('id', RESTAURANT_ID);

  const { data: restaurants, error } = await query;

  if (error) {
    console.error('Error leyendo restaurants:', error.message);
    process.exit(1);
  }
  if (RESTAURANT_ID && (restaurants ?? []).length === 0) {
    abort(`El local ${RESTAURANT_ID} no existe o no tiene mp_preapproval_id.`);
  }

  const rows = [];
  let updated = 0;
  let failed = 0;

  for (const r of restaurants ?? []) {
    const { data: pre, error: getError } = await getPreapproval(r.mp_preapproval_id);
    const decision = getError ? { action: 'skip', reason: getError } : decide(r, pre);

    let result = decision.action === 'update' ? (APPLY ? 'ACTUALIZAR' : 'se actualizaría') : 'se saltea';
    if (APPLY && decision.action === 'update') {
      const put = await putAmount(r.mp_preapproval_id, targetAmount(r));
      if (put.ok) { result = 'ACTUALIZADO'; updated++; }
      else { result = `ERROR: ${put.error}`; failed++; }
    }

    rows.push({
      nombre: r.name,
      plan: r.subscription_plan,
      preapproval: maskId(r.mp_preapproval_id),
      estado_db: r.subscription_status,
      estado_mp: pre?.status ?? '-',
      monto_actual: pre?.auto_recurring?.transaction_amount ?? '-',
      monto_nuevo: targetAmount(r) ?? '-',
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
