// Verificación de lib/oauthPending.ts (indicador "OAuth en curso" para volver a la app instalada en Android) y de su
// uso en /login, /register, /auth/callback y /registro-ok. Sin red.
//
//   node scripts/check-oauth-pending.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { readFileSync } from 'node:fs';

import {
  OAUTH_PENDING_KEY, OAUTH_PENDING_MAX_AGE_MS, getStorage, markOAuthPending, clearOAuthPending, isOAuthPending,
  isStandaloneDisplay, clearOAuthPendingIfStandalone, watchOAuthResume,
} from '../lib/oauthPending.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k), m }; };
const emitter = (extra = {}) => { const l = new Map(); return { addEventListener: (t, f) => l.set(t, [...(l.get(t) ?? []), f]), removeEventListener: (t, f) => l.set(t, (l.get(t) ?? []).filter((x) => x !== f)), emit: (t) => Promise.all((l.get(t) ?? []).map((f) => f())), count: (t) => (l.get(t) ?? []).length, ...extra }; };
const NOW = 1_800_000_000_000;

console.log('constantes');
check('clave snappy_oauth_pending', OAUTH_PENDING_KEY === 'snappy_oauth_pending');
check('vigencia de 10 minutos', OAUTH_PENDING_MAX_AGE_MS === 600_000);

console.log('indicador');
let st = mem();
check('sin indicador: no hay OAuth pendiente', !isOAuthPending(st, NOW));
markOAuthPending(st, NOW);
check('marcar guarda el timestamp', st.m.get(OAUTH_PENDING_KEY) === String(NOW));
check('reciente (9 min 59 s): pendiente', isOAuthPending(st, NOW + 599_000));
check('10 minutos justos: vencido y se borra', !isOAuthPending(st, NOW + 600_000) && !st.m.has(OAUTH_PENDING_KEY));
st = mem(); st.setItem(OAUTH_PENDING_KEY, 'basura');
check('valor inválido: no pendiente y se borra', !isOAuthPending(st, NOW) && !st.m.has(OAUTH_PENDING_KEY));
st = mem(); markOAuthPending(st, NOW + 60_000);
check('timestamp del futuro (más de 5 s): se descarta', !isOAuthPending(st, NOW));
st = mem(); markOAuthPending(st, NOW + 3_000);
check('futuro dentro de 5 s (relojes): tolerado', isOAuthPending(st, NOW));
clearOAuthPending(st);
check('clearOAuthPending borra', !st.m.has(OAUTH_PENDING_KEY));
const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
check('almacenamiento que lanza: no revienta', (() => { markOAuthPending(broken, NOW); clearOAuthPending(broken); return !isOAuthPending(broken, NOW); })());
check('sin almacenamiento (null): no revienta', (() => { markOAuthPending(null, NOW); clearOAuthPending(null); return !isOAuthPending(null, NOW); })());
check('getStorage devuelve null si leer localStorage lanza', getStorage({ get localStorage() { throw new Error('x'); } }) === null);

console.log('standalone');
check('display-mode standalone', isStandaloneDisplay({ matchMedia: (q) => ({ matches: q === '(display-mode: standalone)' }) }));
check('navigator.standalone (iOS)', isStandaloneDisplay({ matchMedia: () => ({ matches: false }), navigator: { standalone: true } }));
check('navegador común: no es standalone', !isStandaloneDisplay({ matchMedia: () => ({ matches: false }), navigator: {} }));
st = mem(); markOAuthPending(st, NOW);
clearOAuthPendingIfStandalone({ matchMedia: () => ({ matches: false }), localStorage: st });
check('pestaña personalizada / navegador (no standalone): NO limpia el indicador', st.m.has(OAUTH_PENDING_KEY));
clearOAuthPendingIfStandalone({ matchMedia: () => ({ matches: true }), localStorage: st });
check('dentro de la app (standalone): limpia el indicador', !st.m.has(OAUTH_PENDING_KEY));

console.log('volver a la app (visibilitychange / focus)');
async function scenario({ pending = true, user = true, throwUser = false, age = 1000, visibility = 'visible', events = ['visibilitychange'] } = {}) {
  const s = mem(); if (pending) markOAuthPending(s, NOW - age);
  const doc = emitter({ visibilityState: visibility }); const win = emitter();
  let resumed = 0; let calls = 0;
  const stop = watchOAuthResume({
    storage: s, win, doc, nowMs: () => NOW,
    hasUser: async () => { calls++; if (throwUser) throw new Error('red'); return user; },
    onResume: () => { resumed++; },
  });
  for (const e of events) await (e === 'focus' ? win.emit('focus') : doc.emit('visibilitychange'));
  return { resumed, calls, s, stop, doc, win };
}
let r = await scenario();
check('indicador reciente + usuario: entra al panel y limpia el indicador', r.resumed === 1 && !r.s.m.has(OAUTH_PENDING_KEY));
r = await scenario({ events: ['focus'] });
check('también con el evento focus', r.resumed === 1);
r = await scenario({ pending: false });
check('sin indicador: no consulta al usuario ni navega', r.resumed === 0 && r.calls === 0);
r = await scenario({ age: 11 * 60_000 });
check('indicador de más de 10 minutos: no consulta ni navega, y se borra', r.resumed === 0 && r.calls === 0 && !r.s.m.has(OAUTH_PENDING_KEY));
r = await scenario({ user: false });
check('sin usuario: no navega y CONSERVA el indicador (puede seguir en Google)', r.resumed === 0 && r.s.m.has(OAUTH_PENDING_KEY));
r = await scenario({ throwUser: true });
check('error al consultar al usuario: no navega, conserva el indicador y no revienta', r.resumed === 0 && r.s.m.has(OAUTH_PENDING_KEY));
r = await scenario({ visibility: 'hidden' });
check('visibilitychange con la pestaña oculta: no hace nada', r.resumed === 0 && r.calls === 0);
{
  const s = mem(); markOAuthPending(s, NOW - 1000);
  const doc = emitter({ visibilityState: 'visible' }); const win = emitter(); let resumed = 0; let calls = 0;
  watchOAuthResume({ storage: s, win, doc, nowMs: () => NOW, hasUser: async () => { calls++; await new Promise((x) => setTimeout(x, 20)); return true; }, onResume: () => { resumed++; } });
  await Promise.all([doc.emit('visibilitychange'), win.emit('focus')]);
  check('visibilitychange y focus juntos: un solo chequeo y una sola navegación', resumed === 1 && calls === 1);
}
r = await scenario({ events: [] });
check('al desuscribir se sacan los dos listeners', (() => { r.stop(); return r.doc.count('visibilitychange') === 0 && r.win.count('focus') === 0; })());

console.log('código: uso en las páginas');
const rd = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const login = rd('../app/login/page.tsx');
const reg = rd('../app/register/page.tsx');
const cb = rd('../app/auth/callback/route.ts');
const ok = rd('../app/registro-ok/page.tsx');
check('login: marca el indicador ANTES de signInWithOAuth', login.indexOf('markOAuthPending(') > 0 && login.indexOf('markOAuthPending(') < login.indexOf('supabase.auth.signInWithOAuth('));
check('register: marca el indicador ANTES de signInWithOAuth', reg.indexOf('markOAuthPending(') > 0 && reg.indexOf('markOAuthPending(') < reg.indexOf('.auth.signInWithOAuth('));
check('login y register escuchan con watchOAuthResume y van a /dashboard', login.includes('watchOAuthResume(') && reg.includes('watchOAuthResume(') && login.includes("router.replace('/dashboard')") && reg.includes("router.replace('/dashboard')"));
check('register: el OAuth y la sesión usan un cliente de @supabase/ssr (PKCE + cookies), no el supabase plano', reg.includes("from '@supabase/ssr'") && reg.includes('getAuthClient().auth.signInWithOAuth(') && !reg.includes('supabase.auth.signInWithOAuth('));
check('register: el registro manual sigue con el supabase plano', reg.includes('supabase.auth.signUp('));
check('registro-ok: lee la sesión con un cliente de cookies (@supabase/ssr), no con el supabase plano', ok.includes("from '@supabase/ssr'") && !ok.includes("@/lib/supabase"));
check('registro-ok: limpia el indicador solo en standalone', ok.includes('clearOAuthPendingIfStandalone(window)'));
check('callback: limpia el indicador solo si display-mode es standalone', cb.includes("matchMedia('(display-mode: standalone)').matches) localStorage.removeItem('${OAUTH_PENDING_KEY}')"));
check('sin enlaces intent:// ni cambios al manifiesto', ![login, reg, cb, ok].some((t) => t.includes('intent://')));

if (failures > 0) {
  console.error(`\n${failures} verificaciones fallaron`);
  process.exit(1);
}
console.log('\ntodo ok');
