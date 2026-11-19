// fetchKeepingSession (lib/keepSession.ts): ante un 401 renueva la sesión una vez y repite el pedido. Sin red.
//   node scripts/check-keep-session.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { fetchKeepingSession, KEEP_SESSION_EVERY_MS } from '../lib/keepSession.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

// fetch falso: devuelve los estados de la lista, en orden, y anota las llamadas
function fakeFetch(statuses) {
  const calls = [];
  globalThis.fetch = async (url) => { calls.push(url); return { status: statuses[Math.min(calls.length - 1, statuses.length - 1)] }; };
  return calls;
}
const client = (refresh) => {
  const c = { refreshed: 0 };
  c.auth = { getSession: async () => ({}), refreshSession: async () => { c.refreshed++; return refresh(); } };
  return c;
};

console.log('fetchKeepingSession');
{
  let calls = fakeFetch([200]);
  let c = client(() => ({ error: null }));
  let r = await fetchKeepingSession(c, '/api/x');
  check('200: un solo pedido y no renueva', r.status === 200 && calls.length === 1 && c.refreshed === 0);

  calls = fakeFetch([403]);
  c = client(() => ({ error: null }));
  r = await fetchKeepingSession(c, '/api/x');
  check('403 (sin permiso) NO renueva ni repite', r.status === 403 && calls.length === 1 && c.refreshed === 0);

  calls = fakeFetch([401, 200]);
  c = client(() => ({ error: null }));
  r = await fetchKeepingSession(c, '/api/x');
  check('401 → renueva una vez y repite: llega el 200', r.status === 200 && calls.length === 2 && c.refreshed === 1);

  calls = fakeFetch([401, 401]);
  c = client(() => ({ error: null }));
  r = await fetchKeepingSession(c, '/api/x');
  check('401 de nuevo tras renovar: devuelve el 401 y no insiste más', r.status === 401 && calls.length === 2 && c.refreshed === 1);

  calls = fakeFetch([401]);
  c = client(() => ({ error: new Error('refresh_token_not_found') }));
  r = await fetchKeepingSession(c, '/api/x');
  check('la renovación falla: devuelve el 401 original, sin repetir', r.status === 401 && calls.length === 1 && c.refreshed === 1);

  calls = fakeFetch([401]);
  c = client(() => { throw new Error('sin red'); });
  r = await fetchKeepingSession(c, '/api/x');
  check('la renovación tira una excepción: devuelve el 401, no explota', r.status === 401 && calls.length === 1);

  calls = fakeFetch([401, 200]);
  c = client(() => ({ error: null }));
  await fetchKeepingSession(c, '/api/x', { cache: 'no-store' });
  check('repite con la misma URL', calls[0] === '/api/x' && calls[1] === '/api/x');
}

check('renueva cada pocos minutos (menos que la vida del token de 1 hora)', KEEP_SESSION_EVERY_MS > 0 && KEEP_SESSION_EVERY_MS <= 10 * 60 * 1000);

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
