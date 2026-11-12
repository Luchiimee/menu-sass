// Verificación de lib/adminOverview.ts (datos de /admin/snappy) y del helper isTrialBlockingHasCard. Sin red.
//
//   node scripts/check-admin-overview.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { readFileSync } from 'node:fs';
import {
  buildAdminOverview, ADMIN_PROFILE_COLUMNS, ADMIN_RESTAURANT_COLUMNS, ADMIN_PROFILE_SELECT, ADMIN_RESTAURANT_SELECT,
  ADMIN_FIRST_PAID_SELECT,
} from '../lib/adminOverview.ts';
import { isTrialBlocking, isTrialBlockingHasCard } from '../lib/trial.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const P = (id, created_at, extra = {}) => ({ id, email: `${id}@x.com`, first_name: id, phone: '1', created_at, ...extra });
const R = (id, user_id, created_at, extra = {}) => ({
  id, user_id, slug: `s-${id}`, subscription_status: 'trialing', subscription_plan: null, created_at, trial_ends_at: null, ...extra,
});

console.log('columnas');
check('perfil: lista cerrada', ADMIN_PROFILE_COLUMNS.join() === 'id,email,first_name,phone,created_at');
check('local: sin mp_card_id ni mp_preapproval_id en la salida',
  !ADMIN_RESTAURANT_COLUMNS.includes('mp_card_id') && !ADMIN_RESTAURANT_COLUMNS.includes('mp_preapproval_id'));
check('select del perfil sin sensibles', !/mp_/.test(ADMIN_PROFILE_SELECT));
check('select del local pide mp_card_id (solo para has_card) y no mp_preapproval_id',
  /mp_card_id/.test(ADMIN_RESTAURANT_SELECT) && !/mp_preapproval_id/.test(ADMIN_RESTAURANT_SELECT));

console.log('armado');
{
  const sucio = {
    mp_card_id: 'card_123', mp_preapproval_id: 'pre_9', owner_email: 'dueno@x.com', mp_access_token: 'APP_USR-secreto',
    name: 'Local', hero_url: 'x',
  };
  const out = buildAdminOverview(
    [P('u1', '2026-11-02T10:00:00Z', { password_hash: 'zzz', last_ip: '1.1.1.1' })],
    [R('r1', 'u1', '2026-11-02T10:01:00Z', sucio)],
  );
  const json = JSON.stringify(out);
  check('una fila con perfil y local', out.length === 1 && out[0].profile.id === 'u1' && out[0].restaurant.id === 'r1');
  check('el local trae exactamente las columnas esperadas + has_card + first_paid_at',
    Object.keys(out[0].restaurant).sort().join() === [...ADMIN_RESTAURANT_COLUMNS, 'has_card', 'first_paid_at'].sort().join());
  check('el perfil trae exactamente las columnas esperadas',
    Object.keys(out[0].profile).sort().join() === [...ADMIN_PROFILE_COLUMNS].sort().join());
  check('no aparece ningún valor sensible en la salida',
    !/card_123|pre_9|APP_USR|dueno@x|zzz|1\.1\.1\.1|hero_url/.test(json));
  check('has_card es true con mp_card_id', out[0].restaurant.has_card === true);
}
{
  const hc = (card) => buildAdminOverview([P('u', '2026-11-01T00:00:00Z')], [R('r', 'u', '2026-11-01T00:00:00Z', { mp_card_id: card })])[0].restaurant.has_card;
  check('has_card false con null', hc(null) === false);
  check('has_card false con vacío', hc('') === false);
  check('has_card false con solo espacios (igual que chargeScheduled)', hc('   ') === false);
  check('has_card false si la columna no vino', buildAdminOverview([P('u', '2026-11-01T00:00:00Z')], [R('r', 'u', '2026-11-01T00:00:00Z')])[0].restaurant.has_card === false);
}
{
  const out = buildAdminOverview(
    [P('u1', '2026-11-02T00:00:00Z'), P('u2', '2026-11-03T00:00:00Z')],
    [R('r1', 'u1', '2026-11-02T00:01:00Z'), R('huerfano', 'u-no-existe', '2026-11-01T00:00:00Z'), R('sin-user', null, '2026-11-01T00:00:00Z')],
  );
  check('perfil sin local: restaurant null', out.find((x) => x.profile.id === 'u2').restaurant === null);
  check('local sin perfil: no se lista', out.length === 2 && !out.some((x) => x.restaurant?.id === 'huerfano' || x.restaurant?.id === 'sin-user'));
}
{
  const out = buildAdminOverview(
    [P('a', '2026-11-01T00:00:00Z'), P('b', '2026-11-05T00:00:00Z'), P('c', '2026-11-03T00:00:00Z'), P('d', '2026-11-03T00:00:00Z'), P('e', null)],
    [],
  );
  check('orden: más reciente primero, con empate por id y sin fecha al final',
    out.map((x) => x.profile.id).join('') === 'bcdae');
}
{
  const out = buildAdminOverview(
    [P('u', '2026-11-01T00:00:00Z')],
    [R('nuevo', 'u', '2026-11-09T00:00:00Z'), R('viejo', 'u', '2026-11-02T00:00:00Z')],
  );
  check('dos locales del mismo usuario: se toma el más antiguo', out[0].restaurant.id === 'viejo');
}
check('entradas null o vacías no rompen', buildAdminOverview(null, null).length === 0 && buildAdminOverview([], undefined).length === 0);
{
  const profiles = [P('a', '2026-11-01T00:00:00Z')];
  const antes = JSON.stringify(profiles);
  buildAdminOverview(profiles, []);
  check('no muta la entrada', JSON.stringify(profiles) === antes);
}

console.log('first_paid_at (consulta aparte)');
check('select aparte: solo id y first_paid_at', ADMIN_FIRST_PAID_SELECT === 'id, first_paid_at');
check('el select principal del local NO pide first_paid_at (así la columna faltante no rompe la lista)',
  !/first_paid_at/.test(ADMIN_RESTAURANT_SELECT) && !ADMIN_RESTAURANT_COLUMNS.includes('first_paid_at'));
{
  const profiles = [P('u1', '2026-11-02T00:00:00Z'), P('u2', '2026-11-03T00:00:00Z')];
  const rests = [R('r1', 'u1', '2026-11-02T00:01:00Z'), R('r2', 'u2', '2026-11-03T00:01:00Z')];
  const sin = buildAdminOverview(profiles, rests);
  check('sin la segunda consulta: first_paid_at null en todos', sin.every((x) => x.restaurant.first_paid_at === null));
  const vacio = buildAdminOverview(profiles, rests, []);
  check('segunda consulta vacía (columna inexistente): null y la lista sigue completa', vacio.length === 2 && vacio.every((x) => x.restaurant.first_paid_at === null));
  const nulo = buildAdminOverview(profiles, rests, null);
  check('segunda consulta null: null y la lista sigue completa', nulo.length === 2 && nulo.every((x) => x.restaurant.first_paid_at === null));
  const con = buildAdminOverview(profiles, rests, [{ id: 'r1', first_paid_at: '2026-11-10T15:00:00Z' }, { id: 'r2', first_paid_at: null }, { id: 'r-ajeno', first_paid_at: '2026-11-11T00:00:00Z' }]);
  check('first_paid_at se une por id del local', con.find((x) => x.restaurant.id === 'r1').restaurant.first_paid_at === '2026-11-10T15:00:00Z');
  check('un local sin pago queda null', con.find((x) => x.restaurant.id === 'r2').restaurant.first_paid_at === null);
  check('una fila de first_paid_at sin local no agrega filas ni se filtra', con.length === 2 && !JSON.stringify(con).includes('r-ajeno'));
  check('las demás columnas no cambian con la segunda consulta',
    JSON.stringify(con.map((x) => ({ ...x.restaurant, first_paid_at: 0 }))) === JSON.stringify(sin.map((x) => ({ ...x.restaurant, first_paid_at: 0 }))));
}

console.log('isTrialBlockingHasCard == isTrialBlocking');
{
  const now = new Date('2026-11-30T12:00:00Z');
  let iguales = true;
  let casos = 0;
  for (const status of ['trialing', 'authorized', 'cancelled', 'paused', null])
    for (const createdAt of ['2026-11-01T10:00:00Z', '2026-11-25T10:00:00Z', null, 'basura'])
      for (const hasCard of [true, false])
        for (const trialEndsAt of [null, '', '2026-12-05T03:00:00Z', 'no-fecha']) {
          casos++;
          const a = isTrialBlockingHasCard({ status, createdAt, hasCard, trialEndsAt, now });
          const b = isTrialBlocking({ status, createdAt, mpCardId: hasCard ? 'card' : null, trialEndsAt, now });
          if (a !== b) iguales = false;
        }
  check(`mismos resultados en ${casos} combinaciones`, iguales);
  check('trial vencido sin tarjeta bloquea', isTrialBlockingHasCard({ status: 'trialing', createdAt: '2026-11-01T10:00:00Z', hasCard: false, trialEndsAt: null, now }) === true);
  check('trial vencido con tarjeta y fecha de cobro no bloquea', isTrialBlockingHasCard({ status: 'trialing', createdAt: '2026-11-01T10:00:00Z', hasCard: true, trialEndsAt: '2026-12-05T03:00:00Z', now }) === false);
}

console.log('endpoint (lectura del código)');
{
  const src = readFileSync(new URL('../app/api/admin/overview/route.ts', import.meta.url), 'utf8');
  check('401 sin sesión y 403 sin acceso', /status: 401/.test(src) && /status: 403/.test(src) && /hasAdminSnappyAccess/.test(src));
  check('service role y no-store', /getSupabaseAdmin\(\)/.test(src) && /no-store/.test(src));
  check('no lee snappylinks ni pide mp_preapproval_id', !/snappylinks/.test(src.replace(/\/\/.*$/gm, '')) && !/mp_preapproval_id/.test(src.replace(/\/\/.*$/gm, '')));
  check('no usa isAdminEmail', !/isAdminEmail/.test(src));
  check('pide first_paid_at en una consulta aparte y tolera el error (42703)',
    /ADMIN_FIRST_PAID_SELECT/.test(src) && /42703/.test(src) && /firstPaidRows = \[\]/.test(src));
  check('el error de first_paid_at no devuelve 500 (solo el de perfiles o locales)',
    /profiles\.error \?\? restaurants\.error/.test(src) && !/firstPaid\.error\)? ?\{[^}]*status: 500/.test(src));
}

if (failures > 0) {
  console.log(`\n${failures} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\ntodo ok');
