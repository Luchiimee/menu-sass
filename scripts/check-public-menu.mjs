// Verificación de lib/publicMenu.ts: lista cerrada de columnas, filtro de la fila, suspensión y slug. Sin red.
//
//   node scripts/check-public-menu.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { readFileSync } from 'node:fs';
import {
  PUBLIC_RESTAURANT_COLUMNS, SUSPENSION_COLUMNS, PUBLIC_SNAPPYLINK_COLUMNS,
  toPublicRestaurant, toPublicSnappylink, computeMenuSuspension, isValidSlug, normalizeSlug, escapeLikePattern, columnFromPgError, buildMenuResponse,
  mapMenuResponse, mapBioResponse, productsForPlan,
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
  check('83 columnas', PUBLIC_RESTAURANT_COLUMNS.length === 83);
  check('hero_video_url fuera de la lista (no existe en la base)', !PUBLIC_RESTAURANT_COLUMNS.includes('hero_video_url') && !SUSPENSION_COLUMNS.includes('hero_video_url'));
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
  const validos = [
    'a', 'pizzeria-don-juan', 'local-12ab3', '123', 'a-b-c', 'x'.repeat(80),
    'Donacocafrutosecos', 'casadelia.ar', 'a_b', 'a-b', 'A.B', 'Pizzeria', 'a.b', 'piz_a', 'Mi_Local.2-bis',
  ];
  for (const ok of validos) {
    check('válido: ' + (ok.length > 20 ? '(' + ok.length + ' caracteres)' : ok), isValidSlug(ok) === true);
  }
  const malos = [
    ['vacío', ''], ['solo espacio', ' '], ['espacio en el medio', 'a b'], ['espacio al borde', ' pizza'], ['porcentaje', 'a%b'],
    ['porcentaje codificado', 'pizza%20'], ['comodín %', '%'], ['asterisco', 'a*b'], ['asterisco al final', 'piz*'], ['comilla simple', "a'b"],
    ['comilla doble', 'a"b'], ['barra', 'a/b'], ['barra invertida', 'a\\b'], ['ruta relativa', '../x'], ['coma', 'a,b'], ['paréntesis', 'a)b'],
    ['punto y coma', 'a;b'], ['acento', 'pizzería'], ['ñ', 'año'], ['arroba', 'a@b'], ['numeral', 'a#b'], ['interrogación', 'a?b'],
    ['salto de línea', 'a\nb'], ['salto de línea al final', 'abc\n'], ['retorno de carro', 'a\rb'], ['tabulación', 'a\tb'],
    ['carácter nulo', 'a\u0000b'], ['carácter de control', 'a\u0007b'], ['demasiado largo (81)', 'x'.repeat(81)],
    ['null', null], ['undefined', undefined], ['número', 5], ['arreglo', ['a']], ['objeto', {}],
  ];
  for (const [name, v] of malos) {
    check('inválido: ' + name, isValidSlug(v) === false);
  }
}

console.log('normalizeSlug');
{
  check('recorta espacios en los bordes', normalizeSlug('  Casa.Delia ') === 'Casa.Delia');
  check('conserva las mayúsculas (la búsqueda es insensible a mayúsculas)', normalizeSlug('Donacocafrutosecos') === 'Donacocafrutosecos');
  check('null y undefined → cadena vacía (que luego no es válida)', normalizeSlug(null) === '' && normalizeSlug(undefined) === '' && isValidSlug(normalizeSlug(null)) === false);
  check('un slug con espacios en el medio sigue siendo inválido', isValidSlug(normalizeSlug('a b')) === false);
}

console.log('escapeLikePattern: el slug nunca es un patrón');
{
  // Emulación de ILIKE de Postgres con escape por defecto (barra invertida): % = cualquier cadena,
  // _ = un carácter, \x = x literal. Insensible a mayúsculas.
  function ilike(value, pattern) {
    let re = '';
    for (let k = 0; k < pattern.length; k++) {
      const c = pattern[k];
      if (c === '\\') { k++; re += (pattern[k] ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
      else if (c === '%') re += '[\\s\\S]*';
      else if (c === '_') re += '[\\s\\S]';
      else re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp('^' + re + '$', 'i').test(value);
  }

  // Sanidad de la emulación: SIN escapar, los comodines sí actúan (por eso hay que escapar)
  check('sin escapar, "a_b" coincidiría con "axb"', ilike('axb', 'a_b') === true);
  check('sin escapar, "a%" coincidiría con "abc"', ilike('abc', 'a%') === true);

  check('"a_b" ya escapado NO coincide con "axb"', ilike('axb', escapeLikePattern('a_b')) === false);
  check('"a_b" escapado sí coincide con "a_b"', ilike('a_b', escapeLikePattern('a_b')) === true);
  check('"a%" escapado NO coincide con "abc"', ilike('abc', escapeLikePattern('a%')) === false);
  check('"a%" escapado coincide solo con "a%" literal', ilike('a%', escapeLikePattern('a%')) === true);
  check('"%" escapado NO coincide con cualquier slug', ilike('casadelia.ar', escapeLikePattern('%')) === false);
  check('"_" escapado NO coincide con un slug de una letra', ilike('a', escapeLikePattern('_')) === false);
  check('la barra invertida también se escapa', escapeLikePattern('a\\b') === 'a\\\\b' && ilike('a\\b', escapeLikePattern('a\\b')) === true);
  check('el punto y el guion no se tocan', escapeLikePattern('casadelia.ar') === 'casadelia.ar' && escapeLikePattern('a-b') === 'a-b');
  check('insensible a mayúsculas, como hoy', ilike('Donacocafrutosecos', escapeLikePattern('donacocafrutosecos')) === true);
  check('"casadelia.ar" no coincide con "casadeliaXar" (el punto es literal)', ilike('casadeliaXar', escapeLikePattern('casadelia.ar')) === false);
  check('ningún slug válido deja comodines sin escapar', ['a_b', 'A.B', 'x-y', 'Mi_Local.2-bis'].every((v) => !/(^|[^\\])[%_]/.test(escapeLikePattern(v).replace(/\\./g, ''))));
}

console.log('buildMenuResponse: la respuesta del endpoint');
{
  const ADMINS = ['admin@snappy.com'];
  const NOW = at('2026-11-08T15:00:00Z');
  const SENSIBLES = ['owner_email', 'user_id', 'mp_customer_id', 'mp_card_id', 'mp_preapproval_id', 'card_last_four', 'card_brand', 'trial_ends_at', 'next_payment_date', 'grace_period_until', 'subscription_status', 'created_at', 'delivery_address', 'cash_close_hour', 'cash_auto_close_enabled', 'mp_checkout_enabled'];
  const row = (o = {}) => ({
    id: 'r1', name: 'Local', subscription_plan: 'go', theme_color: '#fff', phone: '1155',
    owner_email: 'dueno@x.com', user_id: 'u1', mp_customer_id: 'cus', mp_card_id: null, mp_preapproval_id: 'pre', card_last_four: '4242', card_brand: 'visa',
    trial_ends_at: null, next_payment_date: '2026-12-01', grace_period_until: null, subscription_status: 'active', created_at: '2026-01-01T00:00:00Z',
    delivery_address: 'Calle 1', cash_close_hour: 4, cash_auto_close_enabled: true, mp_checkout_enabled: true, columna_nueva: 'x', ...o,
  });
  const cats = [{ id: 'c1', name: 'Pizzas', image_url: null }];
  const menu = buildMenuResponse({ type: 'menu', row: row(), adminEmails: ADMINS, now: NOW, categories: cats });
  const json = JSON.stringify(menu);

  check('menú: type, isSuspended false, planType y local', menu.type === 'menu' && menu.isSuspended === false && menu.planType === 'go' && menu.restaurant.id === 'r1' && menu.restaurant.name === 'Local');
  check('menú: trae las categorías', JSON.stringify(menu.categories) === JSON.stringify(cats));
  check('menú: la respuesta NO trae isAdmin (en ninguna parte)', !('isAdmin' in menu) && !/isAdmin/i.test(json));
  for (const col of SENSIBLES) {
    check(`menú: no trae ${col}`, !(col in menu.restaurant) && !json.includes(`"${col}"`));
  }
  check('menú: no trae columnas fuera de la lista', !('columna_nueva' in menu.restaurant) && Object.keys(menu.restaurant).every((k) => PUBLIC_RESTAURANT_COLUMNS.includes(k)));
  check('menú: no filtra el email del dueño ni el id de MP', !json.includes('dueno@x.com') && !json.includes('"pre"') && !json.includes('4242'));

  const admin = buildMenuResponse({ type: 'menu', row: row({ owner_email: 'admin@snappy.com', subscription_status: 'cancelled' }), adminEmails: ADMINS, now: NOW, categories: [] });
  check('dueño admin inmune: no suspendido y sin isAdmin ni email', admin.isSuspended === false && !/isAdmin/i.test(JSON.stringify(admin)) && !JSON.stringify(admin).includes('admin@snappy.com'));

  for (const st of ['paused', 'cancelled']) {
    const sus = buildMenuResponse({ type: 'menu', row: row({ subscription_status: st }), adminEmails: ADMINS, now: NOW, categories: cats });
    check(`${st}: solo { type, isSuspended: true }`, JSON.stringify(sus) === '{"type":"menu","isSuspended":true}');
  }
  const susBio = buildMenuResponse({ type: 'bio', row: row({ subscription_status: 'paused' }), adminEmails: ADMINS, now: NOW, snappylinkRow: { bio: 'x' } });
  check('bio suspendida: solo { type, isSuspended: true }', JSON.stringify(susBio) === '{"type":"bio","isSuspended":true}');

  const bio = buildMenuResponse({ type: 'bio', row: row(), adminEmails: ADMINS, now: NOW, snappylinkRow: { bio: 'hola', links: [], is_active: true, title: 'T', slug: 'x', restaurant_id: 'r1', extra: 1 } });
  check('bio: type, local y snappylink filtrado', bio.type === 'bio' && bio.restaurant.id === 'r1' && bio.snappylink.bio === 'hola' && bio.snappylink.title === 'T');
  check('bio: snappylink sin slug, restaurant_id ni extras', !('slug' in bio.snappylink) && !('restaurant_id' in bio.snappylink) && !('extra' in bio.snappylink));
  check('bio: sin isAdmin ni columnas sensibles', !/isAdmin/i.test(JSON.stringify(bio)) && SENSIBLES.every((c) => !(c in bio.restaurant)));
  check('planType null si el local no tiene plan', buildMenuResponse({ type: 'menu', row: row({ subscription_plan: null }), adminEmails: ADMINS, now: NOW }).planType === null);
}

console.log('mapMenuResponse / mapBioResponse: equivalen a la lectura vieja (select *)');
{
  const ADMINS = [];
  const NOW = at('2026-11-08T15:00:00Z');
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // Fila completa como la devolvía select('*') (con columnas sensibles)
  const full = {};
  for (const c of PUBLIC_RESTAURANT_COLUMNS) full[c] = 'v:' + c;
  Object.assign(full, {
    id: 'r1', subscription_plan: 'light', owner_email: 'dueno@x.com', user_id: 'u1', mp_card_id: 'card', mp_preapproval_id: 'pre',
    card_last_four: '4242', card_brand: 'visa', trial_ends_at: null, next_payment_date: '2026-12-01', grace_period_until: null,
    subscription_status: 'active', created_at: '2026-01-01T00:00:00Z', delivery_address: 'Calle 1', cash_close_hour: 4,
  });
  const cats = [{ id: 'c1', name: 'Pizzas', image_url: null }, { id: 2, name: 'Bebidas', image_url: 'x.png' }, { id: 'c3', name: 'Vacía', image_url: null }];
  const rawProducts = [
    { id: 'p1', name: 'Muzza', category_id: 'c1', video_url: 'v1.mp4', price: 10 },
    { id: 'p2', name: 'Coca', category_id: '2', video_url: null, price: 5 },
    { id: 'p3', name: 'Huérfano', category_id: 'zzz', video_url: 'v3.mp4', price: 1 },
  ];
  const extras = [{ id: 'e1', name: 'Queso', product_extras: [{ product_id: 'p1' }] }];

  // Réplica de lo que armaba getRestaurant con la lectura vieja (menú)
  function oldMenu(menuData, raw, allExtras) {
    const products = (raw || []).map((p) => (menuData.subscription_plan === 'light' ? { ...p, video_url: null } : p));
    const categoriesWithProducts = (menuData.categories || []).map((cat) => ({ ...cat, products: (products || []).filter((p) => String(p.category_id) === String(cat.id)) }));
    return { ...menuData, categories: categoriesWithProducts, fetched_products: products || [], fetched_extras: allExtras || [], page_type: 'menu' };
  }

  for (const plan of ['light', 'go', 'plus', null]) {
    const row = { ...full, subscription_plan: plan };
    const viejo = oldMenu({ ...row, categories: cats }, rawProducts, extras);
    const resp = buildMenuResponse({ type: 'menu', row: { ...row, categories: cats }, adminEmails: ADMINS, now: NOW, categories: cats });
    const nuevo = mapMenuResponse(resp, rawProducts, extras);
    const lista = [...PUBLIC_RESTAURANT_COLUMNS, 'categories', 'fetched_products', 'fetched_extras', 'page_type'];
    check('menú (plan ' + plan + '): las ' + lista.length + ' propiedades que usan los templates son idénticas', lista.every((k) => eq(viejo[k], nuevo[k])));
  }
  {
    const row = { ...full, subscription_plan: 'light' };
    const nuevo = mapMenuResponse(buildMenuResponse({ type: 'menu', row, adminEmails: ADMINS, now: NOW, categories: cats }), rawProducts, extras);
    check('plan Light: video_url null en productos y en cada categoría', nuevo.fetched_products.every((p) => p.video_url === null) && nuevo.categories[0].products[0].video_url === null);
    const go = mapMenuResponse(buildMenuResponse({ type: 'menu', row: { ...full, subscription_plan: 'go' }, adminEmails: ADMINS, now: NOW, categories: cats }), rawProducts, extras);
    check('plan Go: conserva video_url', go.fetched_products[0].video_url === 'v1.mp4');
    check('categorías con sus productos (id numérico vs texto) y vacía con []', nuevo.categories[1].products.length === 1 && nuevo.categories[2].products.length === 0);
    check('producto sin categoría queda solo en fetched_products', nuevo.fetched_products.length === 3 && nuevo.categories.every((c) => c.products.every((p) => p.id !== 'p3')));
    const sens = ['owner_email', 'user_id', 'mp_card_id', 'mp_preapproval_id', 'card_last_four', 'card_brand', 'next_payment_date', 'subscription_status', 'created_at', 'delivery_address', 'cash_close_hour'];
    check('el objeto nuevo ya no trae columnas sensibles', sens.every((c) => !(c in nuevo)));
  }
  {
    const vacio = mapMenuResponse({ restaurant: { id: 'r', subscription_plan: 'go' }, categories: null }, null, null);
    check('sin categorías, productos ni extras: arreglos vacíos', eq(vacio.categories, []) && eq(vacio.fetched_products, []) && eq(vacio.fetched_extras, []) && vacio.page_type === 'menu');
    check('productsForPlan tolera null', eq(productsForPlan(null, 'light'), []));
  }

  // Bio: réplica del mapeo viejo
  function oldBio(bioData) {
    return {
      ...bioData.restaurant,
      snappylink_bio: bioData.bio, snappylink_links: bioData.links, snappylink_template_id: bioData.template_id, is_bio_active: bioData.is_active,
      snappylink_title: bioData.title, snappylink_bg_color: bioData.bg_color, snappylink_bg_img: bioData.bg_img, snappylink_btn_color: bioData.btn_color,
      snappylink_btn_text_color: bioData.btn_text_color, snappylink_shadow_color: bioData.shadow_color, snappylink_title_color: bioData.title_color,
      snappylink_desc_color: bioData.desc_color, snappylink_social_links: bioData.social_links || [], snappylink_social_pos: bioData.social_pos || 'bottom',
      page_type: 'bio',
    };
  }
  const SL_CAMPOS = ['snappylink_bio', 'snappylink_links', 'snappylink_template_id', 'is_bio_active', 'snappylink_title', 'snappylink_bg_color', 'snappylink_bg_img', 'snappylink_btn_color', 'snappylink_btn_text_color', 'snappylink_shadow_color', 'snappylink_title_color', 'snappylink_desc_color', 'snappylink_social_links', 'snappylink_social_pos', 'page_type'];
  const slRow = { bio: 'Hola', links: [{ label: 'a', url: 'https://x' }], template_id: 'modern', is_active: true, title: 'Mi bio', bg_color: '#111', bg_img: 'bg.png', btn_color: '#0f0', btn_text_color: '#fff', shadow_color: '#000', title_color: '#eee', desc_color: '#ccc', social_links: [{ k: 1 }], social_pos: 'top', slug: 'mi-bio', restaurant_id: 'r1' };
  {
    const viejo = oldBio({ ...slRow, restaurant: full });
    const resp = buildMenuResponse({ type: 'bio', row: full, adminEmails: ADMINS, now: NOW, snappylinkRow: slRow });
    const nuevo = mapBioResponse(resp);
    check('bio: las ' + SL_CAMPOS.length + ' propiedades snappylink_* / is_bio_active / page_type son idénticas', SL_CAMPOS.every((k) => eq(viejo[k], nuevo[k])));
    check('bio: las columnas del local que usa la bio son idénticas', ['name', 'logo_url', 'theme_color', 'subscription_plan', 'phone', 'facebook', 'instagram', 'tiktok'].every((k) => eq(viejo[k], nuevo[k])));
    check('bio: sin columnas sensibles ni slug/restaurant_id de snappylinks', !('owner_email' in nuevo) && !('user_id' in nuevo) && !('slug' in nuevo) && !('restaurant_id' in nuevo));
  }
  {
    const sinNada = oldBio({ ...slRow, social_links: null, social_pos: null, restaurant: full });
    const resp = buildMenuResponse({ type: 'bio', row: full, adminEmails: ADMINS, now: NOW, snappylinkRow: { ...slRow, social_links: null, social_pos: null } });
    const nuevo = mapBioResponse(resp);
    check('bio: valores por defecto (social_links [] y social_pos "bottom")', eq(nuevo.snappylink_social_links, []) && nuevo.snappylink_social_pos === 'bottom' && eq(sinNada.snappylink_social_links, nuevo.snappylink_social_links) && sinNada.snappylink_social_pos === nuevo.snappylink_social_pos);
    check('bio: snappylink_logo_url no se mapea (igual que hoy)', !('snappylink_logo_url' in nuevo));
    check('bio: is_active false se conserva', mapBioResponse({ restaurant: {}, snappylink: { ...slRow, is_active: false } }).is_bio_active === false);
  }
}

console.log('columnFromPgError: solo el nombre de la columna');
{
  check('mensaje típico de PostgREST', columnFromPgError('column restaurants.hero_video_url does not exist') === 'restaurants.hero_video_url');
  check('con comillas', columnFromPgError('column "hero_video_url" does not exist') === 'hero_video_url');
  check('mayúsculas en la frase', columnFromPgError('Column restaurants.foo_1 DOES NOT EXIST') === 'restaurants.foo_1');
  check('no matchea otro error', columnFromPgError('relation "restaurants" does not exist') === null);
  check('mensaje vacío, null y no-string → null', columnFromPgError('') === null && columnFromPgError(null) === null && columnFromPgError(undefined) === null && columnFromPgError(42) === null);
  check('no devuelve el mensaje completo ni datos extra', columnFromPgError('column restaurants.x does not exist; detalle: dueno@x.com') === 'restaurants.x');
  check('nombre con caracteres raros no matchea', columnFromPgError('column foo;drop table does not exist') === null);
  check('mensaje enorme → null', columnFromPgError('column a does not exist' + 'x'.repeat(600)) === null);
}

console.log('coherencia con el listado real de columnas de producción (scripts/fixtures/restaurants-columns.json)');
{
  const fx = JSON.parse(readFileSync(new URL('./fixtures/restaurants-columns.json', import.meta.url), 'utf8'));
  const real = new Set(fx.columns);
  check('el listado de producción no tiene duplicados', real.size === fx.columns.length);
  const pedidas = [...PUBLIC_RESTAURANT_COLUMNS, ...SUSPENSION_COLUMNS];
  const noVerificadas = [];
  for (const col of pedidas) {
    if (real.has(col)) {
      check(`existe en producción: ${col}`, true);
    } else if (!fx.complete && col > fx.lastKnown) {
      noVerificadas.push(col); // cae después del corte del listado parcial: no es un fallo
    } else {
      check(`existe en producción: ${col}`, false);
    }
  }
  if (noVerificadas.length > 0) {
    console.log(`  --   NO VERIFICADAS contra producción (listado parcial, después de "${fx.lastKnown}"): ${noVerificadas.join(', ')}`);
  }
  check('ninguna columna pedida es una de las que se sabe que NO existen', !pedidas.includes('hero_video_url'));
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
