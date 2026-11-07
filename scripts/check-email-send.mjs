// Verificación de lib/email/send.ts (proveedores de mail, errores, timeout, claves). Sin red.
//
//   node scripts/check-email-send.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { sendEmail, EMAIL_FROM } from '../lib/email/send.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const KEY_R = 'clave-resend-secreta-123';
const msg = { to: 'dueno@x.com', subject: 'Hola', html: '<p>hola</p>', text: 'hola' };
const respond = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

// fetch falso que guarda las llamadas
function fakeFetch(handler) {
  const calls = [];
  const fn = async (url, init) => { calls.push({ url, init }); return handler(url, init); };
  fn.calls = calls;
  return fn;
}

// captura console.log / console.error para verificar que no se filtre la clave
async function captureLogs(fn) {
  const lines = [];
  const orig = { log: console.log, error: console.error, warn: console.warn };
  console.log = console.error = console.warn = (...a) => lines.push(a.map(String).join(' '));
  try { return { result: await fn(), lines }; } finally { Object.assign(console, orig); }
}

console.log('resend');
{
  const f = fakeFetch(() => respond(200, { id: 're_123' }));
  const r = await sendEmail(msg, { fetchImpl: f, env: { RESEND_API_KEY: KEY_R } });
  check('ok con id', r.ok === true && r.id === 're_123');
  check('POST a api.resend.com/emails', f.calls[0].url === 'https://api.resend.com/emails' && f.calls[0].init.method === 'POST');
  check('Authorization Bearer', f.calls[0].init.headers.Authorization === `Bearer ${KEY_R}`);
  const body = JSON.parse(f.calls[0].init.body);
  check('remitente Equipo Snappy <hola@updates.snappy.uno>', body.from === 'Equipo Snappy <hola@updates.snappy.uno>' && EMAIL_FROM === body.from);
  check('manda to, subject, html y text', body.to === msg.to && body.subject === msg.subject && body.html === msg.html && body.text === msg.text);
  check('la clave no va en el body', !f.calls[0].init.body.includes(KEY_R));
}
{
  const f = fakeFetch(() => respond(200, null));
  const r = await sendEmail(msg, { fetchImpl: f, env: { EMAIL_PROVIDER: 'resend', RESEND_API_KEY: KEY_R } });
  check('respuesta ok sin id → ok con id null', r.ok === true && r.id === null);
}
{
  const f = fakeFetch(() => respond(422, { message: `detalle sensible ${KEY_R} dueno@x.com` }));
  const r = await sendEmail(msg, { fetchImpl: f, env: { RESEND_API_KEY: KEY_R } });
  check('4xx → error resend_http_422', r.ok === false && r.error === 'resend_http_422');
  check('el error no incluye el cuerpo de la respuesta', !JSON.stringify(r).includes('detalle') && !JSON.stringify(r).includes(KEY_R));
}
{
  const f = fakeFetch(() => respond(503, { message: 'caído' }));
  const r = await sendEmail(msg, { fetchImpl: f, env: { RESEND_API_KEY: KEY_R } });
  check('5xx → error resend_http_503', r.ok === false && r.error === 'resend_http_503');
}
{
  const f = fakeFetch(() => { throw new Error(`ECONNRESET con ${KEY_R}`); });
  const r = await sendEmail(msg, { fetchImpl: f, env: { RESEND_API_KEY: KEY_R } });
  check('error de red → network_error, sin el mensaje original', r.ok === false && r.error === 'network_error' && !JSON.stringify(r).includes(KEY_R));
}
{
  const f = fakeFetch((url, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  }));
  const t0 = Date.now();
  const r = await sendEmail(msg, { fetchImpl: f, env: { RESEND_API_KEY: KEY_R }, timeoutMs: 30 });
  check('timeout → error timeout', r.ok === false && r.error === 'timeout');
  check('corta cerca del tiempo pedido', Date.now() - t0 < 1000);
}
{
  const f = fakeFetch(() => respond(200, { id: 'x' }));
  const r = await sendEmail(msg, { fetchImpl: f, env: {} });
  check('sin RESEND_API_KEY → resend_not_configured y no llama a la red', r.ok === false && r.error === 'resend_not_configured' && f.calls.length === 0);
}
{
  const f = fakeFetch(() => respond(200, { id: 'x' }));
  await sendEmail(msg, { fetchImpl: f, env: { EMAIL_PROVIDER: '  RESEND ', RESEND_API_KEY: KEY_R } });
  check('EMAIL_PROVIDER se normaliza (espacios y mayúsculas)', f.calls.length === 1 && f.calls[0].url.includes('resend.com'));
}

console.log('headers opcionales');
{
  const headers = {
    'List-Unsubscribe': '<https://snappy.uno/baja?t=abc>',
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
  const f = fakeFetch(() => respond(200, { id: 're_h' }));
  const r = await sendEmail({ ...msg, headers }, { fetchImpl: f, env: { RESEND_API_KEY: KEY_R } });
  const body = JSON.parse(f.calls[0].init.body);
  check('con headers: ok', r.ok === true && r.id === 're_h');
  check('con headers: van en el campo headers del body', JSON.stringify(body.headers) === JSON.stringify(headers));
  check('con headers: el resto del body no cambia', body.to === msg.to && body.subject === msg.subject && body.html === msg.html && body.text === msg.text && body.from === EMAIL_FROM);
  check('con headers: la clave sigue sin ir en el body', !f.calls[0].init.body.includes(KEY_R));
}
{
  const f = fakeFetch(() => respond(200, { id: 're_n' }));
  await sendEmail(msg, { fetchImpl: f, env: { RESEND_API_KEY: KEY_R } });
  const body = JSON.parse(f.calls[0].init.body);
  check('sin headers: el body no trae el campo headers', !('headers' in body));
  check('sin headers: body idéntico al de siempre', JSON.stringify(Object.keys(body)) === JSON.stringify(['from', 'to', 'subject', 'html', 'text']));
}
{
  const f = fakeFetch(() => respond(200, { id: 're_e' }));
  await sendEmail({ ...msg, headers: {} }, { fetchImpl: f, env: { RESEND_API_KEY: KEY_R } });
  check('headers vacío: no se manda el campo', !('headers' in JSON.parse(f.calls[0].init.body)));
}
{
  const f = fakeFetch(() => respond(200, {}));
  const { result, lines } = await captureLogs(() => sendEmail({ ...msg, headers: { 'List-Unsubscribe': '<https://snappy.uno/baja?t=TOKEN-SECRETO>' } }, { fetchImpl: f, env: { EMAIL_PROVIDER: 'console' } }));
  check('console: no imprime los headers (llevan el token)', result.ok === true && !lines.join(' ').includes('TOKEN-SECRETO') && f.calls.length === 0);
}

console.log('consola y proveedor desconocido');
{
  const f = fakeFetch(() => respond(200, {}));
  const { result, lines } = await captureLogs(() => sendEmail(msg, { fetchImpl: f, env: { EMAIL_PROVIDER: 'console', RESEND_API_KEY: KEY_R } }));
  check('console: ok y no llama a la red', result.ok === true && f.calls.length === 0);
  check('console: imprime destinatario y asunto', lines.some((l) => l.includes(msg.to) && l.includes(msg.subject)));
  check('console: no imprime el cuerpo ni la clave', !lines.join('\n').includes(msg.html) && !lines.join('\n').includes(KEY_R));
}
{
  const f = fakeFetch(() => respond(200, {}));
  const r = await sendEmail(msg, { fetchImpl: f, env: { EMAIL_PROVIDER: 'sendgrid', RESEND_API_KEY: KEY_R } });
  check('proveedor desconocido → unknown_provider, sin red', r.ok === false && r.error === 'unknown_provider' && f.calls.length === 0);
}
{
  // EnvíaloSimple ya no existe como proveedor
  const f = fakeFetch(() => respond(200, {}));
  const r = await sendEmail(msg, { fetchImpl: f, env: { EMAIL_PROVIDER: 'envialosimple', ENVIALOSIMPLE_API_KEY: 'x', RESEND_API_KEY: KEY_R } });
  check('EMAIL_PROVIDER=envialosimple → unknown_provider, sin red', r.ok === false && r.error === 'unknown_provider' && f.calls.length === 0);
}

console.log('las claves no aparecen en ningún resultado ni log');
{
  const cases = [
    () => respond(500, { message: KEY_R }),
    () => { throw new Error(KEY_R); },
    () => respond(200, { id: 'ok' }),
  ];
  let leaked = false;
  for (const handler of cases) {
    const { result, lines } = await captureLogs(() => sendEmail(msg, { fetchImpl: fakeFetch(handler), env: { RESEND_API_KEY: KEY_R } }));
    if (JSON.stringify(result).includes(KEY_R) || lines.join('\n').includes(KEY_R)) leaked = true;
  }
  check('ni en resultados ni en logs', !leaked);
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
