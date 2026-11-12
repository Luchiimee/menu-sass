// trial-base-report.mjs — SOLO LECTURA.
//
// Compara, por perfil, la base de la prueba ACTUAL (restaurants.created_at) con la NUEVA (la más antigua entre
// profiles.created_at y restaurants.created_at, lib/trialBase.ts) y lista a quién le cambiaría el estado hoy
// (activo → bloqueado). Aparte, quién recibiría un mail de ciclo de vida nuevo si los mails usaran la base nueva.
//
//   node --env-file=.env.local scripts/trial-base-report.mjs [--restaurant=<uuid>]
//
// Variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (nunca se imprimen).
// Solo hace SELECT (supabase-js .select): ninguna escritura, ningún SQL, nada contra Mercado Pago.
// Ids y emails salen enmascarados.

import { createClient } from '@supabase/supabase-js';
import { trialBaseDate } from '../lib/trialBase.ts';
import { isTrialBlocking, trialDaysLeft } from '../lib/trial.ts';
import { diasDesde, diaArg } from '../lib/email/dates.ts';
import { selectTrialEnding, selectTrialFollowup, dedupeKey } from '../lib/email/lifecycle.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (correr con --env-file=.env.local).');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const maskId = (id) => (id ? `${String(id).slice(0, 4)}…${String(id).slice(-2)}` : '—');
const maskEmail = (e) => {
  if (!e || !String(e).includes('@')) return '—';
  const [u, d] = String(e).split('@');
  return `${u.slice(0, 3)}***@${d}`;
};
// Siempre día de calendario argentino
const day = (v) => (v ? diaArg(new Date(v)) : '—');

async function readAll(table, columns) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).order('id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.code ?? 'error de lectura'}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const now = new Date();

const profiles = await readAll('profiles', 'id, email, created_at');
const restaurants = await readAll(
  'restaurants',
  'id, user_id, owner_email, name, created_at, subscription_status, mp_card_id, mp_preapproval_id, trial_ends_at, grace_period_until',
);
let loggedKeys = new Set();
{
  const { data, error } = await db.from('email_log').select('dedupe_key').limit(10000);
  if (!error) loggedKeys = new Set((data ?? []).map((r) => r.dedupe_key));
  else console.log('(aviso: no se pudo leer email_log; los mails se listan sin descontar los ya enviados)');
}

const restByUser = new Map();
for (const r of restaurants) {
  const prev = restByUser.get(r.user_id);
  if (!r.user_id) continue;
  if (!prev || new Date(r.created_at) < new Date(prev.created_at)) restByUser.set(r.user_id, r);
}

// Misma regla que el layout: sin bloqueo con pago activo ni con gracia futura
function blocked(r, createdAt) {
  if (!r) return isTrialBlocking({ status: 'trialing', createdAt, mpCardId: null, trialEndsAt: null, now });
  const hasActivePayment = r.subscription_status === 'authorized' || r.subscription_status === 'active';
  const inGrace = !!(r.grace_period_until && new Date(r.grace_period_until) > now);
  if (hasActivePayment || inGrace) return false;
  return isTrialBlocking({
    status: r.subscription_status, createdAt, mpCardId: r.mp_card_id, trialEndsAt: r.trial_ends_at, now,
  });
}

const rows = profiles.map((p) => {
  const r = restByUser.get(p.id) ?? null;
  const baseOld = r?.created_at ?? null;
  const baseNew = trialBaseDate(p.created_at, r?.created_at);
  const blockedOld = blocked(r, baseOld);
  const blockedNew = blocked(r, baseNew);
  return {
    p, r, baseOld, baseNew, blockedOld, blockedNew,
    leftOld: baseOld ? trialDaysLeft(baseOld, now) : null,
    leftNew: baseNew ? trialDaysLeft(baseNew, now) : null,
    status: r?.subscription_status ?? '(sin local)',
    baseChanged: !!baseNew && day(baseNew) !== day(baseOld),
  };
});

const changes = rows.filter((x) => x.blockedOld !== x.blockedNew);
const baseChanges = rows.filter((x) => x.baseChanged);

console.log(`Hoy: ${now.toISOString()}`);
console.log(`Perfiles: ${profiles.length} | locales: ${restaurants.length} | perfiles sin local: ${rows.filter((x) => !x.r).length}`);
console.log(`Perfiles cuya base cambia (perfil más antiguo que el local, o sin local): ${baseChanges.length}`);
console.log(`Perfiles que cambian de estado hoy (activo→bloqueado o al revés): ${changes.length}`);

const line = (x) =>
  `  ${maskId(x.p.id)}  ${maskEmail(x.p.email ?? x.r?.owner_email)}  estado=${x.status}  ` +
  `base actual=${day(x.baseOld)} nueva=${day(x.baseNew)}  días restantes ${x.leftOld ?? '—'} → ${x.leftNew ?? '—'}  ` +
  `${x.blockedOld ? 'bloqueado' : 'activo'} → ${x.blockedNew ? 'bloqueado' : 'activo'}`;

console.log('\n== CAMBIAN DE ESTADO ==');
if (changes.length === 0) console.log('  (ninguno)');
for (const x of changes) console.log(line(x));

console.log('\n== CAMBIA LA BASE PERO NO EL ESTADO (el detalle) ==');
const soloBase = baseChanges.filter((x) => x.blockedOld === x.blockedNew);
if (soloBase.length === 0) console.log('  (ninguno)');
for (const x of soloBase) console.log(line(x));

// Control: nadie con pago activo / tarjeta + trial_ends_at / authorized cambia
const protegidos = rows.filter((x) => x.r && (
  x.r.subscription_status === 'authorized' || x.r.subscription_status === 'active' ||
  (x.r.mp_card_id && x.r.trial_ends_at)));
const protegidosQueCambian = protegidos.filter((x) => x.blockedOld !== x.blockedNew);
console.log(`\n== CONTROL ==\n  locales authorized / active / con tarjeta + trial_ends_at: ${protegidos.length}; cambian de estado: ${protegidosQueCambian.length}`);
// Control opcional de un local puntual: --restaurant=<uuid>
const controlId = (process.argv.find((a) => a.startsWith('--restaurant=')) ?? '').slice('--restaurant='.length);
const coca = controlId ? restaurants.find((r) => r.id === controlId) : null;
if (coca) {
  const x = rows.find((y) => y.r?.id === coca.id);
  console.log(`  Local de control (${maskId(coca.id)}): estado=${coca.subscription_status}, bloqueado ${x?.blockedOld ? 'sí' : 'no'} → ${x?.blockedNew ? 'sí' : 'no'}`);
}

// Mails de ciclo de vida: la regla del cron es la vieja (restaurants.created_at). Se compara qué pasaría con la nueva.
const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const asLifecycle = (r, created) => ({
  id: r.id, name: r.name ?? null, owner_email: r.owner_email ?? null, created_at: created,
  subscription_status: r.subscription_status, mp_card_id: r.mp_card_id, mp_preapproval_id: r.mp_preapproval_id,
  trial_ends_at: r.trial_ends_at, grace_period_until: r.grace_period_until,
});
const viejos = restaurants.map((r) => asLifecycle(r, r.created_at));
const nuevos = rows.filter((x) => x.r).map((x) => asLifecycle(x.r, x.baseNew ? x.baseNew.toISOString() : x.r.created_at));
const nuevosQueRecibirian = [];
for (const [kind, sel] of [['trial_ending', selectTrialEnding], ['trial_followup', selectTrialFollowup]]) {
  const antes = new Set(sel(viejos, now, adminEmails).map((r) => r.id));
  for (const r of sel(nuevos, now, adminEmails)) {
    if (antes.has(r.id)) continue;
    if (loggedKeys.has(dedupeKey(kind, r.id))) continue;
    nuevosQueRecibirian.push({ kind, r, dias: diasDesde(r.created_at, now) });
  }
}
console.log('\n== MAILS DE CICLO DE VIDA NUEVOS SI LA BASE NUEVA SE APLICARA A LOS MAILS ==');
console.log('(lifecycle.ts NO cambia: los mails siguen con restaurants.created_at, así que hoy ninguno de estos se enviaría)');
if (nuevosQueRecibirian.length === 0) console.log('  (ninguno)');
for (const m of nuevosQueRecibirian) {
  console.log(`  ${m.kind}  ${maskId(m.r.id)}  ${maskEmail(m.r.owner_email)}  día ${m.dias} desde la base nueva`);
}
