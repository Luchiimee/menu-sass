// Verificación de lib/publicMenu.ts: lista cerrada de columnas, filtro de la fila, suspensión y slug. Sin red.
//
//   node scripts/check-public-menu.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  PUBLIC_RESTAURANT_COLUMNS, SUSPENSION_COLUMNS, PUBLIC_SNAPPYLINK_COLUMNS,
  toPublicRestaurant, toPublicSnappylink, computeMenuSuspension, isValidSlug,
} from '../lib/publicMenu.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const at = (iso) => new Date(iso);

console.log('PUBLIC_RESTAURANT_COLUMNS: lista cerrada');
{
  const SENSIBLES = [
    'owner_email', 'user_id', 'mp_customer_id', 'mp_card_id', 'mp_preapproval_id', 'card_last_four', 'card_brand',
    'trial_ends_at', 'next_payment_date', 'grace_period_until', 'subscription_status', 'created_at',
    'delivery_address', 'cash_close_hour', 'cash_auto_close_enabled', 'mp_checkout_enabled',
  ];
  for (const col of SENSIBLES) {
    check(`no incluye ${col}`, !PUBLIC_RESTAURANT_COLUMNS.includes(col));
  }
  check('sin duplicados', new Set(PUBLIC_RESTAURANT_COLUMNS).size === PUBLIC_RESTAURANT_COLUMNS.length);
  check('ordenada alfabéticamente', PUBLIC_RESTAURANT_COLUMNS.every((c, i, a) => i === 0 || a[i - 1] < c));
  check('subscription_plan sí entra (planType)', PUBLIC_RESTAURANT_COLUMNS.includes('subscription_plan'));
  check('id y name entran', PUBLIC_RESTAURANT_COLUMNS.includes('id') && PUBLIC_RESTAURANT_COLUMNS.includes('name'));
  check('84 columnas', PUBLIC_RESTAURANT_COLUMNS.length === 84);
  check('ninguna columna de suspensión está en la lista pública', SUSPENSION_COLUMNS.every((c) => !PUBLIC_RESTAURANT_COLUMNS.includes(c)));
  check('columnas de snappylinks sin duplicados', new Set(PUBLIC_SNAPPYLINK_COLUMNS).size === PUBLIC_SNAPPYLINK_COLUMNS.length);
}

console.log('toPublicRestaurant: descarta lo que no está en la lista');
{
  const row = {
    id: 'r1', name: 'Local', subscription_plan: 'go', theme_color: '#fff',
    owner_email: 'dueno@x.com', user_id: 'u1', mp_card_id: 'c1', mp_preapproval_id: 'p1', card_last_four: '4242',
    trial_ends_at: '2026-11-20', grace_period_until: null, subscription_status: 'active', created_at: '2026-01-01',
    columna_nueva_interna: 'secreto',
  };
  const out = toPublicRestaurant(row);
  check('copia las columnas permitidas', out.id === 'r1' && out.name === 'Local' && out.subscription_plan === 'go' && out.theme_color === '#fff');
  check('descarta las sensibles', !('owner_email' in out) && !('user_id' in out) && !('mp_card_id' in out) && !('mp_preapproval_id' in out) && !('card_last_four' in out) && !('trial_ends_at' in out) && !('subscription_status' in out) && !('created_at' in out));
  check('descarta una columna extra aunque venga en la fila', !('columna_nueva_interna' in out));
  check('solo quedan claves de la lista', Object.keys(out).every((k) => PUBLIC_RESTAURANT_COLUMNS.includes(k)));
  check('no inventa claves ausentes', !('phone' in out));
  check('conserva null', 'grace_period_until' in row && toPublicRestaurant({ phone: null }).phone === null);
  check('fila nula → objeto vacío', JSON.stringify(toPublicRestaurant(null)) === '{}' && JSON.stringify(toPublicRestaurant(undefined)) === '{}');
  const sl = toPublicSnappylink({ bio: 'hola', links: [], is_active: true, slug: 'x', restaurant_id: 'r1', extra: 1 });
  check('snappylink: solo las columnas permitidas', sl.bio === 'hola' && sl.is_active === true && !('slug' in sl) && !('restaurant_id' in sl) && !('extra' in sl));
}

console.log('computeMenuSuspension');
{
  const ADMINS = ['admin@snappy.com'];
  // Alta 6/11/2026 15:00 AR → día 1 = 6/11, día 14 = 19/11, vence 00:00 AR del 20/11 (= 03:00Z)
  const CREATED = '2026-11-06T18:00:00Z';
  const row = (o = {}) => ({ owner_email: 'dueno@x.com', subscription_status: 'trialing', created_at: CREATED, mp_card_id: null, trial_ends_at: null, grace_period_until: null, ...o });
  const run = (o, now) => computeMenuSuspension(row(o), ADMINS, at(now));

  check('trialing sin tarjeta, día 14 (23:59 AR) → no suspendido', run({}, '2026-11-20T02:59:00Z').isSuspended === false);
  check('trialing sin tarjeta, día 15 (00:00 AR) → suspendido', run({}, '2026-11-20T03:00:00Z').isSuspended === true);
  check('trialing sin tarjeta, día 1 → no suspendido', run({}, '2026-11-06T19:00:00Z').isSuspended === false);
  check('trialing sin tarjeta, semanas después → suspendido', run({}, '2026-12-30T15:00:00Z').isSuspended === true);

  check('trialing con mp_card_id y trial_ends_at, prueba vencida por created_at → no suspendido (espera al cron)',
    run({ mp_card_id: 'card_1', trial_ends_at: '2026-11-20T03:00:00Z' }, '2026-12-01T15:00:00Z').isSuspended === false);
  check('trialing con tarjeta SIN trial_ends_at, vencida → suspendido (cobro no programado)',
    run({ mp_card_id: 'card_1', trial_ends_at: null }, '2026-12-01T15:00:00Z').isSuspended === true);
  check('trialing con trial_ends_at SIN tarjeta, vencida → suspendido',
    run({ mp_card_id: null, trial_ends_at: '2026-11-20T03:00:00Z' }, '2026-12-01T15:00:00Z').isSuspended === true);

  check('gracia vigente evita el bloqueo (prueba vencida)', run({ grace_period_until: '2026-12-31T00:00:00Z' }, '2026-12-01T15:00:00Z').isSuspended === false);
  check('gracia vigente evita el bloqueo (paused)', run({ subscription_status: 'paused', grace_period_until: '2026-12-31T00:00:00Z' }, '2026-12-01T15:00:00Z').isSuspended === false);
  check('gracia vencida no evita el bloqueo', run({ subscription_status: 'paused', grace_period_until: '2026-11-01T00:00:00Z' }, '2026-12-01T15:00:00Z').isSuspended === true);

  check('paused → suspendido', run({ subscription_status: 'paused' }, '2026-11-08T15:00:00Z').isSuspended === true);
  check('cancelled → suspendido', run({ subscription_status: 'cancelled' }, '2026-11-08T15:00:00Z').isSuspended === true);
  check('active → no suspendido (aunque created_at sea viejo)', run({ subscription_status: 'active', created_at: '2020-01-01T00:00:00Z' }, '2026-11-08T15:00:00Z').isSuspended === false);
  check('authorized → no suspendido', run({ subscription_status: 'authorized', created_at: '2020-01-01T00:00:00Z' }, '2026-11-08T15:00:00Z').isSuspended === false);
  check('estado null → no suspendido', run({ subscription_status: null }, '2026-12-30T15:00:00Z').isSuspended === false);

  for (const st of ['paused', 'cancelled', 'trialing']) {
    const r = run({ owner_email: 'admin@snappy.com', subscription_status: st }, '2026-12-30T15:00:00Z');
    check(`admin inmune con ${st}`, r.isSuspended === false && r.isAdmin === true);
  }
  check('no admin → isAdmin false', run({}, '2026-11-08T15:00:00Z').isAdmin === false);
  check('comparación exacta del email (como la página): otra capitalización no es admin',
    run({ owner_email: 'Admin@Snappy.com', subscription_status: 'cancelled' }, '2026-11-08T15:00:00Z').isAdmin === false);
  check('owner_email nulo → no admin y no rompe', computeMenuSuspension(row({ owner_email: null, subscription_status: 'cancelled' }), ADMINS, at('2026-11-08T15:00:00Z')).isSuspended === true);
  check('fila nula → no suspendida y no rompe', computeMenuSuspension(null, ADMINS, at('2026-11-08T15:00:00Z')).isSuspended === false);
}

console.log('isValidSlug');
{
  for (const ok of ['a', 'pizzeria-don-juan', 'local-12ab3', '123', 'a-b-c', 'x'.repeat(80)]) {
    check(`válido: ${ok.length > 20 ? `(${ok.length} caracteres)` : ok}`, isValidSlug(ok) === true);
  }
  const malos = [
    ['vacío', ''], ['mayúsculas', 'Pizzeria'], ['espacio', 'pizza don'], ['espacio al borde', ' pizza'], ['porcentaje', 'pizza%20'],
    ['comodín %', '%'], ['comodín _', 'piz_a'], ['asterisco', 'piz*'], ['punto', 'a.b'], ['barra', 'a/b'], ['coma', 'a,b'],
    ['paréntesis', 'a)b'], ['comilla', "a'b"], ['acento', 'pizzería'], ['ñ', 'año'], ['salto de línea', 'a\nb'],
    ['demasiado largo (81)', 'x'.repeat(81)], ['null', null], ['undefined', undefined], ['número', 5], ['arreglo', ['a']],
  ];
  for (const [name, v] of malos) {
    check(`inválido: ${name}`, isValidSlug(v) === false);
  }
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
