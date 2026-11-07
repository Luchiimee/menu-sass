// Verificación del token de baja (lib/email/unsubscribe.ts). Sin red.
//
//   node scripts/check-unsubscribe.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  signUnsubToken, verifyUnsubToken, unsubscribeUrl, unsubscribeApiUrl, unsubscribeHeaders, normalizeEmail,
  UNSUBSCRIBE_BASE_URL, UNSUBSCRIBE_API_URL,
} from '../lib/email/unsubscribe.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const SECRET = 'secreto-de-prueba-largo-123';
const OTHER = 'otro-secreto-distinto-456';
const EMAIL = 'dueno@gmail.com';

async function captureLogs(fn) {
  const lines = [];
  const orig = { log: console.log, error: console.error, warn: console.warn };
  console.log = console.error = console.warn = (...a) => lines.push(a.map(String).join(' '));
  try { return { result: await fn(), lines }; } finally { Object.assign(console, orig); }
}

console.log('ida y vuelta');
{
  const t = signUnsubToken(EMAIL, SECRET);
  check('el token tiene la forma <base64url>.<base64url>', typeof t === 'string' && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t));
  check('verifica y devuelve el email', verifyUnsubToken(t, SECRET) === EMAIL);
  check('el token es determinístico', signUnsubToken(EMAIL, SECRET) === t);
  check('el email no aparece en claro en el token', !t.includes('gmail'));
  const raro = signUnsubToken('a.b+c_d@sub.dominio.com.ar', SECRET);
  check('email con punto, + y guion bajo', verifyUnsubToken(raro, SECRET) === 'a.b+c_d@sub.dominio.com.ar');
  const acento = signUnsubToken('ñandú@correo.com', SECRET);
  check('email con caracteres no ASCII', verifyUnsubToken(acento, SECRET) === 'ñandú@correo.com');
}

console.log('mayúsculas y espacios en el email');
{
  const a = signUnsubToken('Dueno@Gmail.COM', SECRET);
  const b = signUnsubToken('dueno@gmail.com', SECRET);
  const c = signUnsubToken('  DUENO@gmail.com ', SECRET);
  check('el mismo token sin importar mayúsculas ni espacios', a === b && b === c);
  check('verify devuelve el email en minúsculas', verifyUnsubToken(a, SECRET) === 'dueno@gmail.com');
}

console.log('firma alterada');
{
  const t = signUnsubToken(EMAIL, SECRET);
  const [payload, sig] = t.split('.');
  const flip = (s) => s.slice(0, -1) + (s.slice(-1) === 'A' ? 'B' : 'A');
  check('firma con el último carácter cambiado', verifyUnsubToken(`${payload}.${flip(sig)}`, SECRET) === null);
  check('firma con el primer carácter cambiado', verifyUnsubToken(`${payload}.${(sig[0] === 'A' ? 'B' : 'A') + sig.slice(1)}`, SECRET) === null);
  const otroPayload = Buffer.from('victima@gmail.com').toString('base64url');
  check('payload de otro email con la firma original', verifyUnsubToken(`${otroPayload}.${sig}`, SECRET) === null);
  check('payload alterado', verifyUnsubToken(`${flip(payload)}.${sig}`, SECRET) === null);
  check('firma vacía', verifyUnsubToken(`${payload}.`, SECRET) === null);
}

console.log('token cortado o mal formado');
{
  const t = signUnsubToken(EMAIL, SECRET);
  check('cortado a la mitad', verifyUnsubToken(t.slice(0, Math.floor(t.length / 2)), SECRET) === null);
  check('sin el último carácter', verifyUnsubToken(t.slice(0, -1), SECRET) === null);
  check('sin punto', verifyUnsubToken(t.replace('.', ''), SECRET) === null);
  check('con tres partes', verifyUnsubToken(`${t}.extra`, SECRET) === null);
  check('string vacío', verifyUnsubToken('', SECRET) === null);
  check('solo un punto', verifyUnsubToken('.', SECRET) === null);
  check('caracteres fuera de base64url', verifyUnsubToken('a b.c d', SECRET) === null && verifyUnsubToken('abc+/=.def', SECRET) === null);
  check('null, undefined y tipos raros', verifyUnsubToken(null, SECRET) === null && verifyUnsubToken(undefined, SECRET) === null && verifyUnsubToken(123, SECRET) === null && verifyUnsubToken({}, SECRET) === null);
}

console.log('secreto distinto, vacío o ausente');
{
  const t = signUnsubToken(EMAIL, SECRET);
  check('secreto distinto → null', verifyUnsubToken(t, OTHER) === null);
  check('secreto vacío → null', verifyUnsubToken(t, '') === null && verifyUnsubToken(t, '   ') === null);
  check('secreto undefined/null → null', verifyUnsubToken(t, undefined) === null && verifyUnsubToken(t, null) === null);
  check('firmar sin secreto → null', signUnsubToken(EMAIL, '') === null && signUnsubToken(EMAIL, undefined) === null && signUnsubToken(EMAIL, null) === null);
  check('un token firmado con secreto vacío no existe', signUnsubToken(EMAIL, '') === null);
}

console.log('email inválido');
{
  for (const bad of ['', '   ', 'sin-arroba', '@x.com', 'a@', 'a@b@c', 'a b@x.com', null, undefined, 42, 'x'.repeat(260) + '@x.com']) {
    check(`no se firma ${JSON.stringify(bad)?.slice(0, 20)}`, signUnsubToken(bad, SECRET) === null);
  }
  check('normalizeEmail', normalizeEmail('  A@B.com ') === 'a@b.com' && normalizeEmail('nada') === null);
}

console.log('un token firmado con un payload que no es un email normalizado no pasa');
{
  // Alguien con el secreto firma "A@X.com" sin normalizar: verify lo rechaza (no es la forma que emitimos)
  const { createHmac } = await import('node:crypto');
  const payload = Buffer.from('A@X.com').toString('base64url');
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  check('payload con mayúsculas firmado a mano → null', verifyUnsubToken(`${payload}.${sig}`, SECRET) === null);
}

console.log('unsubscribeUrl');
{
  const u = unsubscribeUrl(EMAIL, SECRET);
  check('https://snappy.uno/baja?t=<token>', u === `${UNSUBSCRIBE_BASE_URL}?t=${signUnsubToken(EMAIL, SECRET)}` && u.startsWith('https://snappy.uno/baja?t='));
  check('la URL verifica', verifyUnsubToken(new URL(u).searchParams.get('t'), SECRET) === EMAIL);
  check('sin secreto → null', unsubscribeUrl(EMAIL, '') === null && unsubscribeUrl(EMAIL, undefined) === null);
  check('email inválido → null', unsubscribeUrl('nada', SECRET) === null);
}

console.log('endpoint de un clic y headers');
{
  const api = unsubscribeApiUrl(EMAIL, SECRET);
  check('https://snappy.uno/api/baja?t=<token>', api === `${UNSUBSCRIBE_API_URL}?t=${signUnsubToken(EMAIL, SECRET)}` && api.startsWith('https://snappy.uno/api/baja?t='));
  check('sin secreto → null', unsubscribeApiUrl(EMAIL, '') === null);
  const h = unsubscribeHeaders(api);
  check('List-Unsubscribe entre <>', h['List-Unsubscribe'] === `<${api}>`);
  check('List-Unsubscribe-Post de un clic', h['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click');
  check('sin mailto:', !h['List-Unsubscribe'].includes('mailto:'));
  check('sin URL → sin headers', unsubscribeHeaders(null) === undefined && unsubscribeHeaders(undefined) === undefined && unsubscribeHeaders('') === undefined);
}

console.log('el secreto no aparece en resultados ni en logs');
{
  const t = signUnsubToken(EMAIL, SECRET);
  const { result, lines } = await captureLogs(() => [
    signUnsubToken(EMAIL, SECRET), verifyUnsubToken(t, SECRET), verifyUnsubToken(t, OTHER),
    verifyUnsubToken('basura', SECRET), verifyUnsubToken(null, SECRET), unsubscribeUrl(EMAIL, SECRET),
    unsubscribeUrl('mal', SECRET),
  ]);
  const todo = JSON.stringify(result) + lines.join('\n');
  check('ni el secreto ni su base64 en resultados', !todo.includes(SECRET) && !todo.includes(Buffer.from(SECRET).toString('base64url')));
  check('no se loguea nada', lines.length === 0);
  check('nunca lanza excepciones', (() => { try { verifyUnsubToken(Symbol('x'), SECRET); signUnsubToken({}, SECRET); return true; } catch { return false; } })());
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
