// Verificación de lib/registrationTracking.ts: heurística de registro nuevo con Google, destino del callback y
// deduplicación por usuario. Sin red.
//
//   node scripts/check-registration-tracking.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { readFileSync } from 'node:fs';

import {
  NEW_USER_WINDOW_MS, MAX_SIGNIN_GAP_MS, REGISTRATION_OK_PATH,
  isLikelyNewGoogleUser, callbackDestination, registrationStorageKey, claimRegistrationEvent,
} from '../lib/registrationTracking.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const NOW = new Date('2026-11-14T15:00:00Z');
const ago = (s) => new Date(NOW.getTime() - s * 1000).toISOString();
const user = (createdSecAgo, lastSecAgo, provider = 'google') => ({
  id: 'u1', created_at: ago(createdSecAgo), last_sign_in_at: ago(lastSecAgo), app_metadata: { provider },
});

console.log('constantes');
check('ventana de 120 s', NEW_USER_WINDOW_MS === 120_000);
check('ruta del paso intermedio', REGISTRATION_OK_PATH === '/registro-ok');

console.log('heurística de registro nuevo con Google');
check('creado hace 3 s, último ingreso hace 2 s: nuevo', isLikelyNewGoogleUser(user(3, 2), NOW));
check('creado hace 119 s, último ingreso hace 118 s: nuevo', isLikelyNewGoogleUser(user(119, 118), NOW));
check('creado hace 121 s: fuera de la ventana', !isLikelyNewGoogleUser(user(121, 120), NOW));
check('cuenta vieja (30 días) que entra ahora: no es nuevo', !isLikelyNewGoogleUser(user(30 * 86400, 1), NOW));
check('creado hace 100 s pero último ingreso hace 1 s (brecha 99 s > 60 s): no', !isLikelyNewGoogleUser(user(100, 1), NOW));
check('brecha justa de 60 s: nuevo', isLikelyNewGoogleUser(user(90, 30), NOW));
check('proveedor email (link de confirmación): no cuenta', !isLikelyNewGoogleUser(user(3, 2, 'email'), NOW));
check('sin proveedor: no cuenta', !isLikelyNewGoogleUser({ created_at: ago(3), last_sign_in_at: ago(2) }, NOW));
check('sin last_sign_in_at: no cuenta (precaución)', !isLikelyNewGoogleUser({ created_at: ago(3), app_metadata: { provider: 'google' } }, NOW));
check('fechas inválidas: no cuenta', !isLikelyNewGoogleUser({ created_at: 'x', last_sign_in_at: 'y', app_metadata: { provider: 'google' } }, NOW));
check('null / undefined: no cuenta', !isLikelyNewGoogleUser(null, NOW) && !isLikelyNewGoogleUser(undefined, NOW));
check('creado 3 s en el futuro (reloj corrido): tolerado', isLikelyNewGoogleUser(user(-3, -3), NOW));
check('creado 60 s en el futuro: no cuenta', !isLikelyNewGoogleUser(user(-60, -60), NOW));
check('ventana ampliada (10 min) para la página intermedia', isLikelyNewGoogleUser(user(300, 299), NOW, 600_000) && !isLikelyNewGoogleUser(user(300, 299), NOW));
check('acepta objetos Date', isLikelyNewGoogleUser({ created_at: new Date(NOW.getTime() - 3000), last_sign_in_at: new Date(NOW.getTime() - 2000), app_metadata: { provider: 'google' } }, NOW));

console.log('destino del callback');
check('nuevo con Google y next por defecto: /registro-ok', callbackDestination('/dashboard', user(3, 2), NOW) === '/registro-ok');
check('login existente: /dashboard', callbackDestination('/dashboard', user(30 * 86400, 1), NOW) === '/dashboard');
check('recuperar contraseña (next=/new-password) no cambia', callbackDestination('/new-password', user(3, 2), NOW) === '/new-password');
check('otro destino no cambia', callbackDestination('/dashboard/orders', user(3, 2), NOW) === '/dashboard/orders');
check('sin usuario: next', callbackDestination('/dashboard', undefined, NOW) === '/dashboard');

console.log('deduplicación por usuario');
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, v), m }; };
let n = 0;
const newId = () => `id-${++n}`;
const st = mem();
const first = claimRegistrationEvent(st, 'u1', newId);
check('la primera vez da un id y lo guarda', first === 'id-1' && st.m.get(registrationStorageKey('u1')) === 'id-1');
check('la segunda vez del mismo usuario: null (no se repite)', claimRegistrationEvent(st, 'u1', newId) === null);
check('otro usuario: id nuevo', claimRegistrationEvent(st, 'u2', newId) !== null);
check('la clave usa el id de usuario solo en el almacenamiento local', registrationStorageKey('u1') === 'snappy_cr_u1');
check('sin id de usuario: null', claimRegistrationEvent(st, '', newId) === null);
check('sin almacenamiento: no se puede deduplicar, da id', typeof claimRegistrationEvent(null, 'u1', newId) === 'string');
const broken = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
check('almacenamiento que lanza: da id y no revienta', typeof claimRegistrationEvent(broken, 'u1', newId) === 'string');

console.log('código: privacidad y rutas');
const px = readFileSync(new URL('../components/MetaPixel.tsx', import.meta.url), 'utf8');
check('MetaPixel: /registro-ok entre las rutas permitidas', /ALLOWED_PATHS = new Set\(\[[^\]]*REGISTRATION_OK_PATH/.test(px));
check('MetaPixel: sigue sin permitir /dashboard ni /auth/callback', !/ALLOWED_PATHS = new Set\(\[[^\]]*(dashboard|auth)/.test(px));
check('MetaPixel: el evento sale sin parámetros personales (objeto vacío + eventID aleatorio)', px.includes(`'CompleteRegistration', {}, { eventID: eventId }`));
check('MetaPixel: fbq disponible = initialized + callMethod + ruta permitida', /return initialized && typeof window\.fbq\?\.callMethod === 'function' && ALLOWED_PATHS\.has\(window\.location\.pathname\)/.test(px));
check('MetaPixel: guard síncrono por módulo (Set por usuario)', px.includes('const registrationInFlight = new Set<string>()') && px.includes('registrationInFlight.has(userId)'));
const fireStart = px.indexOf('const fire = () =>');
const claimAt = px.indexOf('claimRegistrationEvent(storage, userId, newEventId)');
const trackAt = px.indexOf("window.fbq?.('track', 'CompleteRegistration'");
check('MetaPixel: la clave se escribe dentro de fire(), después de fbqReady() y justo antes de fbq(track)', fireStart > 0 && px.indexOf('if (fbqReady())', fireStart) > fireStart && claimAt > px.indexOf('if (fbqReady())', fireStart) && trackAt > claimAt);
check('MetaPixel: sin claim fuera de fire() (no se consume la clave antes de que el píxel esté listo)', px.split('claimRegistrationEvent(').length === 2);
const priv = readFileSync(new URL('../app/privacy/page.tsx', import.meta.url), 'utf8');
check('privacidad: nombra PageView, CompleteRegistration y /registro-ok', priv.includes('(PageView)') && priv.includes('(CompleteRegistration)') && priv.includes('/registro-ok'));
check('privacidad: no afirma consentimiento explícito', !/consentimiento explícito/i.test(priv));
check('MetaPixel: init sin datos de usuario', px.includes(`fbq?.('init', PIXEL_ID)`));
const reg = readFileSync(new URL('../app/register/page.tsx', import.meta.url), 'utf8');
check('register: Google vuelve por /auth/callback', reg.includes('/auth/callback') && !reg.includes('origin}/dashboard'));
check('register: solo cuenta si hay identidades (correo ya registrado no cuenta)', reg.includes('identities?.length ?? 0) > 0) trackCompleteRegistration'));
const cb = readFileSync(new URL('../app/auth/callback/route.ts', import.meta.url), 'utf8');
check('callback: usa callbackDestination solo en el flujo del código', cb.includes('callbackDestination(next, exchanged?.user)') && cb.includes('destination = type === \'recovery\''));

if (failures > 0) {
  console.error(`\n${failures} verificaciones fallaron`);
  process.exit(1);
}
console.log('\ntodo ok');
