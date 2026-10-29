// Verificación de lib/mpSellerTokenCore.ts con base, cifrado y OAuth FALSOS: sin red,
// sin Supabase, sin MP. Foco: un fallo de cifrado NO cambia el estado de la fila;
// solo un rechazo real de MP (4xx, invalid_grant) la pasa a 'error'.
//
//   node scripts/check-mp-seller-token.mjs   (Node >= 22.18 / 24: importa .ts directo)

import crypto from 'node:crypto';
import { refreshIfNeededCore } from '../lib/mpSellerTokenCore.ts';

const RID = '11111111-1111-4111-8111-111111111111';
const DAY = 24 * 60 * 60 * 1000;

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

// base falsa de una sola tabla; cuenta los updates
function makeDb(row) {
  const db = {
    row,
    updates: [],
    from() {
      const filters = [];
      let op = 'select';
      let values = null;
      const run = () => {
        if (op === 'select') return { data: db.row, error: null };
        if (!db.row || !filters.every((f) => f(db.row))) return { data: [], error: null };
        db.updates.push(values);
        db.row = { ...db.row, ...values };
        return { data: [{ restaurant_id: RID }], error: null };
      };
      const q = {
        select() { return q; },
        eq(col, val) { filters.push((r) => r[col] === val); return q; },
        update(v) { op = 'update'; values = v; return q; },
        maybeSingle() { return Promise.resolve(run()); },
        then(res, rej) { return Promise.resolve(run()).then(res, rej); },
      };
      return q;
    },
  };
  return db;
}

// cifrado falso: "enc:" + texto; con key=false falla como crypto.ts sin clave
function makeCrypto({ key = true } = {}) {
  const fail = () => { throw new Error('MP_TOKEN_ENC_KEY no está configurada: no se pueden cifrar ni descifrar tokens.'); };
  return {
    encrypt: (s) => (key ? `enc:${s}` : fail()),
    decrypt: (s) => (key ? s.replace(/^enc:/, '') : fail()),
  };
}

const baseRow = (over = {}) => ({
  restaurant_id: RID,
  access_token_enc: 'enc:ACCESS',
  refresh_token_enc: 'enc:REFRESH',
  expires_at: new Date(Date.now() + 1 * DAY).toISOString(), // vence pronto → intenta refrescar
  status: 'connected',
  last_error: null,
  ...over,
});

function makeDeps(db, { key = true, mp } = {}) {
  const calls = { mp: 0 };
  return {
    calls,
    deps: {
      db,
      ...makeCrypto({ key }),
      getOAuthConfig: () => ({ clientId: 'cid', clientSecret: 'secret' }),
      requestMpToken: async () => { calls.mp++; return mp ?? { ok: false, detail: 'sin definir' }; },
      expiresAtFrom: (s) => new Date(Date.now() + s * 1000).toISOString(),
    },
  };
}

// silenciar console.error esperado, pero capturar lo logueado para revisar que no filtre valores
const logged = [];
const origError = console.error;
console.error = (...a) => { logged.push(a.join(' ')); };

console.log('sin MP_TOKEN_ENC_KEY (el caso de localhost con la base de producción)');
{
  const db = makeDb(baseRow());
  const { deps, calls } = makeDeps(db, { key: false });
  const r = await refreshIfNeededCore(deps, RID);
  check('devuelve fallo (token null, failure crypto)', r.token === null && r.failure === 'crypto');
  check('la fila NO cambia (status connected, last_error null)', db.row.status === 'connected' && db.row.last_error === null);
  check('ningún update a la base', db.updates.length === 0);
  check('no se llamó a MP', calls.mp === 0);
  check('se logueó el error', logged.some((l) => l.includes('MP_TOKEN_ENC_KEY')));
  check('el log no contiene tokens', !logged.some((l) => l.includes('ACCESS') || l.includes('REFRESH')));
}

console.log('descifrado inválido (clave distinta / texto corrupto)');
{
  const db = makeDb(baseRow());
  const { deps } = makeDeps(db);
  deps.decrypt = () => { throw new Error('Unsupported state or unable to authenticate data'); };
  const r = await refreshIfNeededCore(deps, RID);
  check('fallo crypto y fila sin cambios', r.token === null && r.failure === 'crypto' && db.updates.length === 0 && db.row.status === 'connected');
}

console.log('refresh rechazado por MP');
{
  const db = makeDb(baseRow());
  const { deps } = makeDeps(db, { mp: { ok: false, detail: 'oauth_token http=400 invalid_grant', httpStatus: 400, code: 'invalid_grant' } });
  const r = await refreshIfNeededCore(deps, RID);
  check('invalid_grant → fallo rejected', r.token === null && r.failure === 'rejected');
  check("invalid_grant → status pasa a 'error'", db.row.status === 'error');
  check('last_error con el detalle de MP, sin tokens', db.row.last_error === 'oauth_token http=400 invalid_grant');
}
{
  const db = makeDb(baseRow());
  const { deps } = makeDeps(db, { mp: { ok: false, detail: 'oauth_token http=401 unauthorized', httpStatus: 401 } });
  await refreshIfNeededCore(deps, RID);
  check("401 de MP → 'error'", db.row.status === 'error');
}

console.log('fallos transitorios: la fila no cambia');
for (const [name, mp] of [
  ['sin respuesta (red)', { ok: false, detail: 'oauth_token red: fetch failed' }],
  ['MP 500', { ok: false, detail: 'oauth_token http=500 x', httpStatus: 500 }],
  ['MP 503', { ok: false, detail: 'oauth_token http=503 x', httpStatus: 503 }],
  ['MP 429 (rate limit)', { ok: false, detail: 'oauth_token http=429 x', httpStatus: 429 }],
]) {
  const db = makeDb(baseRow());
  const { deps } = makeDeps(db, { mp });
  const r = await refreshIfNeededCore(deps, RID);
  check(`${name} → transient, sin update`, r.token === null && r.failure === 'transient' && db.updates.length === 0 && db.row.status === 'connected');
}

console.log('caminos que siguen igual');
{
  const db = makeDb(baseRow({ expires_at: new Date(Date.now() + 30 * DAY).toISOString() }));
  const { deps, calls } = makeDeps(db);
  const r = await refreshIfNeededCore(deps, RID);
  check('token vigente: lo devuelve sin refrescar ni tocar la fila', r.token === 'ACCESS' && !r.refreshed && calls.mp === 0 && db.updates.length === 0);
}
{
  const db = makeDb(baseRow());
  const { deps } = makeDeps(db, { mp: { ok: true, data: { access_token: 'NEW_A', refresh_token: 'NEW_R', expires_in: 15552000 } } });
  const r = await refreshIfNeededCore(deps, RID);
  check('refresh OK: devuelve el token nuevo y lo guarda cifrado', r.token === 'NEW_A' && r.refreshed && db.row.access_token_enc === 'enc:NEW_A' && db.row.refresh_token_enc === 'enc:NEW_R' && db.row.status === 'connected');
}
{
  const db = makeDb(baseRow({ status: 'error' }));
  const { deps } = makeDeps(db);
  const r = await refreshIfNeededCore(deps, RID);
  check("fila ya en 'error': sin credenciales, no toca nada", r.token === null && r.failure === 'no_credentials' && db.updates.length === 0);
}
{
  const db = makeDb(baseRow());
  const { deps } = makeDeps(db, { key: true, mp: { ok: true, data: { access_token: 'N', refresh_token: 'M', expires_in: 100 } } });
  deps.encrypt = () => { throw new Error('MP_TOKEN_ENC_KEY inválida'); };
  const r = await refreshIfNeededCore(deps, RID);
  check('refresh OK pero no cifra: fallo crypto y la fila no cambia', r.token === null && r.failure === 'crypto' && db.updates.length === 0 && db.row.status === 'connected');
}

console.error = origError;
if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
