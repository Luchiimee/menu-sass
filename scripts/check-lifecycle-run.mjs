// Verificación de la corrida de mails de ciclo de vida (lib/email/lifecycleRun.ts) con una base falsa
// que simula el unique de email_log y la carrera "cargó la tarjeta entre la selección y el envío". Sin red.
//
//   node scripts/check-lifecycle-run.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { runLifecycleEmails, maskEmail, MAX_SENDS_PER_RUN } from '../lib/email/lifecycleRun.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const ADMINS = ['admin@snappy.uno'];
const NOW = new Date('2026-11-20T15:00:00Z');
const created = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();
const rest = (id, dias, over = {}) => ({
  id, name: `Local ${id}`, owner_email: `${id}@gmail.com`, created_at: created(dias),
  subscription_status: 'trialing', mp_card_id: null, mp_preapproval_id: null,
  trial_ends_at: null, grace_period_until: null, ...over,
});

// Base falsa: `table` son las filas de restaurants, `log` el email_log con su unique (kind, dedupe_key).
function fakeDb(table, { logged = [], reread = {} } = {}) {
  const log = new Map(logged.map((k) => [k, { status: 'sent' }]));
  const calls = { reserve: 0, markSent: 0, markFailed: 0 };
  const db = {
    async listCandidates() { return table; },
    // `reread`: cómo está el local cuando se vuelve a leer (simula cambios entre la selección y el envío)
    async getRestaurant(id) { return reread[id] ?? table.find((r) => r.id === id) ?? null; },
    async loggedKeys(keys) { return new Set(keys.filter((k) => log.has(k))); },
    async reserve(row) {
      calls.reserve++;
      if (log.has(row.dedupe_key)) return 'duplicate';
      log.set(row.dedupe_key, { status: 'pending', ...row });
      return 'reserved';
    },
    async markSent(kind, key, providerId) { calls.markSent++; log.set(key, { ...log.get(key), status: 'sent', provider_id: providerId }); },
    async markFailed(kind, key, error) { calls.markFailed++; log.set(key, { ...log.get(key), status: 'failed', error }); },
  };
  return { db, log, calls };
}

function fakeSend(handler = () => ({ ok: true, id: 're_1' })) {
  const sent = [];
  const fn = async (msg) => { sent.push(msg); return handler(msg); };
  fn.sent = sent;
  return fn;
}

const run = (db, send, extra = {}) => runLifecycleEmails({ db, send, now: NOW, adminEmails: ADMINS, dry: false, ...extra });

console.log('email enmascarado');
{
  check('a***@gmail.com', maskEmail('ana@gmail.com') === 'a***@gmail.com');
  check('sin arroba → ***', maskEmail('nada') === '***');
  check('con espacios', maskEmail('  Luis@x.com ') === 'L***@x.com');
}

console.log('dry=1: informa, no envía ni escribe');
{
  const { db, log, calls } = fakeDb([rest('a1', 11), rest('b1', 25), rest('c1', 5)]);
  const send = fakeSend();
  const r = await run(db, send, { dry: true });
  check('lista los dos candidatos con kind, restaurant_id y email enmascarado',
    r.candidates.length === 2 &&
    r.candidates.some((c) => c.kind === 'trial_ending' && c.restaurant_id === 'a1' && c.email === 'a***@gmail.com') &&
    r.candidates.some((c) => c.kind === 'trial_followup' && c.restaurant_id === 'b1' && c.email === 'b***@gmail.com'));
  check('no manda nada', send.sent.length === 0 && r.sent === 0);
  check('no escribe en email_log', calls.reserve === 0 && calls.markSent === 0 && calls.markFailed === 0 && log.size === 0);
  check('el resultado no trae mails completos', !JSON.stringify(r).includes('a1@gmail.com'));
}

console.log('corrida real');
{
  const { db, log } = fakeDb([rest('a1', 11), rest('b1', 25), rest('c1', 5)]);
  const send = fakeSend();
  const r = await run(db, send);
  check('manda 2 mails (uno de cada tipo)', send.sent.length === 2 && r.sent === 2 && r.failed === 0);
  check('a1 recibe el aviso de fin de prueba', send.sent.some((m) => m.to === 'a1@gmail.com' && m.subject.includes('termina el')));
  check('b1 recibe el seguimiento con WhatsApp', send.sent.some((m) => m.to === 'b1@gmail.com' && m.html.includes('wa.me/5492324313123')));
  check('email_log queda en sent con el id del proveedor',
    log.get('trial_ending:a1')?.status === 'sent' && log.get('trial_ending:a1')?.provider_id === 're_1' &&
    log.get('trial_followup:b1')?.status === 'sent');

  const r2 = await run(db, send);
  check('segunda corrida: no repite (ya está en email_log)', send.sent.length === 2 && r2.sent === 0 && r2.skipped.already_logged === 2);
}

console.log('unique(kind, dedupe_key): carrera entre dos corridas');
{
  // loggedKeys no ve la fila (otra corrida la reserva justo después), pero el unique la rechaza
  const { db, log, calls } = fakeDb([rest('a1', 11)]);
  log.set('trial_ending:a1', { status: 'pending' });
  db.loggedKeys = async () => new Set();
  const send = fakeSend();
  const r = await run(db, send);
  check('el insert rechazado por el unique se omite sin enviar', calls.reserve === 1 && send.sent.length === 0 && r.skipped.duplicate === 1);
  check('no toca la fila de la otra corrida', log.get('trial_ending:a1').status === 'pending' && calls.markSent === 0 && calls.markFailed === 0);
}

console.log('carrera: el local carga la tarjeta entre la selección y el envío');
{
  const original = rest('a1', 11);
  const { db, log, calls } = fakeDb([original, rest('a2', 12)], {
    reread: { a1: { ...original, mp_card_id: 'card_9' } },
  });
  const send = fakeSend();
  const r = await run(db, send);
  check('a1 (ahora con tarjeta) no recibe mail ni se reserva', !send.sent.some((m) => m.to === 'a1@gmail.com') && !log.has('trial_ending:a1'));
  check('se cuenta como cambiado', r.skipped.changed === 1);
  check('a2 sigue su camino', send.sent.length === 1 && send.sent[0].to === 'a2@gmail.com' && calls.reserve === 1);
}
{
  // otras formas de cambiar: se pausó, se volvió admin-gracia, se borró
  const o1 = rest('p1', 11), o2 = rest('g1', 11), o3 = rest('d1', 11);
  const { db } = fakeDb([o1, o2, o3], {
    reread: { p1: { ...o1, subscription_status: 'paused' }, g1: { ...o2, grace_period_until: '2026-12-01T00:00:00Z' }, d1: null },
  });
  // reread con null cae al `??` de la base falsa; se fuerza el "borrado" explícito:
  const orig = db.getRestaurant;
  db.getRestaurant = async (id) => (id === 'd1' ? null : orig(id));
  const send = fakeSend();
  const r = await run(db, send);
  check('pausado, con gracia o borrado: no se envía', send.sent.length === 0 && r.skipped.changed === 3);
}

console.log('un fallo no corta a los demás');
{
  const { db, log } = fakeDb([rest('a1', 11), rest('a2', 12), rest('a3', 13)]);
  const send = fakeSend((m) => (m.to === 'a1@gmail.com' ? { ok: false, error: 'resend_http_422' } : { ok: true, id: 're_ok' }));
  const r = await run(db, send);
  check('el que falla queda failed con el código corto', log.get('trial_ending:a1').status === 'failed' && log.get('trial_ending:a1').error === 'resend_http_422');
  check('los otros se envían', r.sent === 2 && r.failed === 1 && log.get('trial_ending:a2').status === 'sent' && log.get('trial_ending:a3').status === 'sent');
}
{
  const { db } = fakeDb([rest('a1', 11), rest('a2', 12)]);
  const orig = db.getRestaurant;
  db.getRestaurant = async (id) => { if (id === 'a1') throw new Error('boom con datos sensibles'); return orig(id); };
  const lines = [];
  const origErr = console.error;
  console.error = (...a) => lines.push(a.join(' '));
  let r;
  try { r = await run(db, fakeSend()); } finally { console.error = origErr; }
  check('una excepción en un local no corta la corrida', r.failed === 1 && r.sent === 1);
  check('no se loguea el mensaje de la excepción', !lines.join('\n').includes('sensibles'));
}
{
  const { db } = fakeDb([rest('a1', 11), rest('a2', 12)]);
  const send = async (m) => { if (m.to === 'a1@gmail.com') throw new Error('red'); return { ok: true, id: 'x' }; };
  const origErr = console.error;
  console.error = () => {};
  let r;
  try { r = await run(db, send); } finally { console.error = origErr; }
  check('sendEmail que tira excepción tampoco corta', r.failed === 1 && r.sent === 1);
}

console.log('tope por corrida');
{
  check('el tope es 50', MAX_SENDS_PER_RUN === 50);
  const rows = Array.from({ length: 60 }, (_, i) => rest(`l${i}`, 11));
  const { db } = fakeDb(rows);
  const send = fakeSend();
  const r = await run(db, send);
  check('manda 50 y deja 10 para la próxima corrida', send.sent.length === 50 && r.sent === 50 && r.skipped.over_limit === 10);

  const { db: db2 } = fakeDb(rows);
  const rd = await run(db2, fakeSend(), { dry: true });
  check('dry también informa hasta 50', rd.candidates.length === 50 && rd.skipped.over_limit === 10);
}

console.log('exclusiones se aplican en la corrida');
{
  const { db } = fakeDb([
    rest('adm', 11, { owner_email: 'admin@snappy.uno' }),
    rest('sin', 11, { owner_email: '' }),
    rest('tar', 11, { mp_card_id: 'c' }),
    rest('pau', 25, { subscription_status: 'paused' }),
    rest('can', 25, { subscription_status: 'cancelled' }),
  ]);
  const send = fakeSend();
  await run(db, send);
  check('ninguno recibe mail', send.sent.length === 0);
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
