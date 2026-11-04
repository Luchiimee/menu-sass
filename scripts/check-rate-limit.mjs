// Verificación de lib/rateLimitCore.ts (límite de uso del checkout con MP): claves, hash de
// la IP y decisión de respuesta. Sin red, sin base.
//
//   node scripts/check-rate-limit.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  RATE_LIMITS, clientIp, hashIp, ipKey, restaurantKey, parseLimitRow, decideRateLimit, rateLimitResponse,
} from '../lib/rateLimitCore.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}
const headers = (h) => ({ get: (name) => h[name.toLowerCase()] ?? null });
const SALT = 'sal-de-prueba';

console.log('límites iniciales');
check('POST: 10 por IP cada 10 minutos', RATE_LIMITS.checkoutPerIp.limit === 10 && RATE_LIMITS.checkoutPerIp.windowSeconds === 600);
check('POST: 60 por restaurante cada 10 minutos', RATE_LIMITS.checkoutPerRestaurant.limit === 60 && RATE_LIMITS.checkoutPerRestaurant.windowSeconds === 600);
check('/available y /status: 60 por IP por minuto', RATE_LIMITS.publicPerIp.limit === 60 && RATE_LIMITS.publicPerIp.windowSeconds === 60);

console.log('IP del cliente');
check('x-real-ip primero', clientIp(headers({ 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' })) === '1.2.3.4');
check('sin x-real-ip: primera de x-forwarded-for', clientIp(headers({ 'x-forwarded-for': ' 5.6.7.8 , 10.0.0.1' })) === '5.6.7.8');
check('IPv6', clientIp(headers({ 'x-real-ip': '2001:db8::1' })) === '2001:db8::1');
check('sin cabeceras → null', clientIp(headers({})) === null);
check('cabecera vacía o absurdamente larga → se ignora',
  clientIp(headers({ 'x-real-ip': '   ', 'x-forwarded-for': '7.7.7.7' })) === '7.7.7.7' && clientIp(headers({ 'x-real-ip': 'x'.repeat(65) })) === null);

console.log('hash de la IP');
const h1 = hashIp('1.2.3.4', SALT);
check('estable (misma IP y sal → mismo hash)', h1 === hashIp('1.2.3.4', SALT));
check('distinto por IP', h1 !== hashIp('1.2.3.5', SALT));
check('distinto con otra sal', h1 !== hashIp('1.2.3.4', 'otra-sal'));
check('sha-256 hex (64 caracteres) y sin la IP en texto', /^[0-9a-f]{64}$/.test(h1) && !h1.includes('1.2.3.4'));

console.log('claves');
check('checkout por IP', ipKey('checkout', h1) === `checkout:ip:${h1}`);
check('consultas por IP (separada del checkout)', ipKey('public', h1) === `public:ip:${h1}` && ipKey('public', h1) !== ipKey('checkout', h1));
check('sin IP → contador compartido "desconocida"', ipKey('checkout', null) === 'checkout:ip:desconocida');
check('por restaurante, en minúsculas',
  restaurantKey('0350A66F-ABA3-4EC0-B5C0-DA24B104B750') === 'checkout:rid:0350a66f-aba3-4ec0-b5c0-da24b104b750');
check('largo dentro del límite de la tabla (≤ 200)', ipKey('checkout', h1).length <= 200 && restaurantKey('0350a66f-aba3-4ec0-b5c0-da24b104b750').length <= 200);

console.log('respuesta de check_rate_limit');
check('fila válida (array)', JSON.stringify(parseLimitRow([{ allowed: true, current_count: 3, retry_after: 42 }])) === JSON.stringify({ allowed: true, retryAfter: 42 }));
check('retry_after inválido → 1', parseLimitRow([{ allowed: false, retry_after: null }]).retryAfter === 1);
check('sin filas, null o allowed no booleano → null',
  parseLimitRow([]) === null && parseLimitRow(null) === null && parseLimitRow([{ allowed: 'true', retry_after: 1 }]) === null);

console.log('decisión');
const ok = (...results) => ({ ok: true, results });
check('todo dentro del límite → pasa', decideRateLimit(ok({ allowed: true, retryAfter: 5 }), 'closed').kind === 'allow');
{
  const d = decideRateLimit(ok({ allowed: true, retryAfter: 5 }, { allowed: false, retryAfter: 120 }), 'closed');
  check('una clave pasada del límite → 429 con su Retry-After', d.kind === 'limited' && d.retryAfter === 120);
}
check('falla de la base en POST (closed) → no disponible', decideRateLimit({ ok: false }, 'closed').kind === 'unavailable');
check('falla de la base en consultas (open) → pasa', decideRateLimit({ ok: false }, 'open').kind === 'allow');
check('pasado del límite también en open → 429', decideRateLimit(ok({ allowed: false, retryAfter: 30 }), 'open').kind === 'limited');

console.log('respuesta HTTP');
{
  const r = rateLimitResponse({ kind: 'limited', retryAfter: 120 });
  check('429 con Retry-After y mensaje en español', r.status === 429 && r.headers['Retry-After'] === '120'
    && r.body.error === 'demasiados_intentos' && r.body.message === 'Hiciste demasiados intentos. Probá de nuevo en 2 minutos.');
  check('segundos cuando falta menos de un minuto', rateLimitResponse({ kind: 'limited', retryAfter: 45 }).body.message.endsWith('45 segundos.'));
}
{
  const r = rateLimitResponse({ kind: 'unavailable' });
  check('503 al fallar cerrado', r.status === 503 && r.body.error === 'limite_no_disponible' && typeof r.body.message === 'string');
}
check('extra se suma al body ({ available: false })', rateLimitResponse({ kind: 'limited', retryAfter: 10 }, { available: false }).body.available === false);
check('pasa → sin respuesta', rateLimitResponse({ kind: 'allow' }) === null);

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
