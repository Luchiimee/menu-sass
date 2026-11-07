// Verificación de la baja (lib/email/unsubscribeAction.ts) con una base falsa. Sin red.
// Además revisa por código que GET /baja no puede escribir y que /api/baja solo exporta POST.
//
//   node scripts/check-unsubscribe-action.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { readFileSync } from 'node:fs';
import { processUnsubscribe } from '../lib/email/unsubscribeAction.ts';
import { signUnsubToken } from '../lib/email/unsubscribe.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const SECRET = 'secreto-de-prueba-para-la-baja-123';
const EMAIL = 'dueno@gmail.com';

// Base falsa: email_unsubscribes con "on conflict do nothing"
function fakeInsert({ fails = false, throws = false } = {}) {
  const table = new Set();
  const calls = [];
  const fn = async (emailLower) => {
    calls.push(emailLower);
    if (throws) throw new Error('boom con datos sensibles dueno@gmail.com');
    if (fails) return { ok: false };
    table.add(emailLower); // add sobre un Set = on conflict do nothing
    return { ok: true };
  };
  fn.table = table;
  fn.calls = calls;
  return fn;
}

console.log('token válido');
{
  const ins = fakeInsert();
  const r = await processUnsubscribe(signUnsubToken(EMAIL, SECRET), SECRET, ins);
  check('200 { ok: true }', r.status === 200 && r.body.ok === true);
  check('inserta el email en minúsculas, una vez', ins.calls.length === 1 && ins.calls[0] === EMAIL && ins.table.has(EMAIL));
}
{
  const ins = fakeInsert();
  await processUnsubscribe(signUnsubToken('Dueno@Gmail.COM', SECRET), SECRET, ins);
  check('un email con mayúsculas se guarda en minúsculas', ins.calls[0] === EMAIL);
}
{
  const ins = fakeInsert();
  const t = signUnsubToken(EMAIL, SECRET);
  const r1 = await processUnsubscribe(t, SECRET, ins);
  const r2 = await processUnsubscribe(t, SECRET, ins);
  check('darse de baja dos veces: ambas 200 y una sola fila (on conflict do nothing)', r1.status === 200 && r2.status === 200 && ins.table.size === 1);
}

console.log('token inválido: no escribe y no da detalles');
{
  const good = signUnsubToken(EMAIL, SECRET);
  const [payload, sig] = good.split('.');
  const cases = {
    'firma alterada': `${payload}.${sig.slice(0, -1)}${sig.slice(-1) === 'A' ? 'B' : 'A'}`,
    'token cortado': good.slice(0, 10),
    'secreto distinto': signUnsubToken(EMAIL, 'otro-secreto-distinto'),
    'basura': 'no-es-un-token',
    'vacío': '',
    'null': null,
    'undefined': undefined,
  };
  for (const [name, token] of Object.entries(cases)) {
    const ins = fakeInsert();
    const r = await processUnsubscribe(token, SECRET, ins);
    check(`${name}: 400 invalid_token y no inserta`, r.status === 400 && r.body.code === 'invalid_token' && ins.calls.length === 0);
  }
  const bodies = new Set();
  for (const token of Object.values(cases)) bodies.add(JSON.stringify((await processUnsubscribe(token, SECRET, fakeInsert())).body));
  check('todas las causas dan la misma respuesta genérica', bodies.size === 1);
}
{
  const ins = fakeInsert();
  const r = await processUnsubscribe(signUnsubToken(EMAIL, SECRET), '', ins);
  const r2 = await processUnsubscribe(signUnsubToken(EMAIL, SECRET), undefined, ins);
  check('sin secreto en el servidor: 400 genérico y no inserta', r.status === 400 && r2.status === 400 && ins.calls.length === 0);
}

console.log('falla de la base');
{
  const t = signUnsubToken(EMAIL, SECRET);
  const r = await processUnsubscribe(t, SECRET, fakeInsert({ fails: true }));
  check('insert con error → 500 server_error', r.status === 500 && r.body.code === 'server_error');
  const r2 = await processUnsubscribe(t, SECRET, fakeInsert({ throws: true }));
  check('insert que tira excepción → 500 server_error', r2.status === 500);
  check('la respuesta no trae el email ni el detalle', !JSON.stringify(r2).includes('dueno') && !JSON.stringify(r2).includes('sensibles') && !JSON.stringify(r).includes('dueno'));
}

console.log('GET nunca escribe');
{
  const page = readFileSync(new URL('../app/baja/page.tsx', import.meta.url), 'utf8');
  check('app/baja/page.tsx no importa Supabase ni la acción de baja', !/supabase/i.test(page) && !/unsubscribeAction|processUnsubscribe|email_unsubscribes/.test(page));
  check('app/baja/page.tsx solo verifica el token', page.includes('verifyUnsubToken'));
  const api = readFileSync(new URL('../app/api/baja/route.ts', import.meta.url), 'utf8');
  check('/api/baja exporta POST y ningún GET', /export async function POST/.test(api) && !/export (async )?function (GET|PUT|PATCH|DELETE)/.test(api));
  const form = readFileSync(new URL('../app/baja/BajaForm.tsx', import.meta.url), 'utf8');
  check('el token va en el body del POST (JSON)', form.includes("method: 'POST'") && form.includes('JSON.stringify({ t: token })'));
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
