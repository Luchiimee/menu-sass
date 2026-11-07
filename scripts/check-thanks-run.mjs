// Verificación de sendThanks (lib/email/thanksRun.ts) con una base falsa que simula el unique de
// email_log. Sin red. Lo importante: NUNCA lanza, no repite el gracias y no filtra datos personales.
//
//   node scripts/check-thanks-run.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { sendThanks, emailLogThanksDb, thanksDedupeKey, THANKS_MAX_WAIT_MS } from '../lib/email/thanksRun.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const RID = '5b0c1a2e-1111-4222-8333-444455556666';
const EMAIL = 'dueno.secreto@gmail.com';
const NAME = 'Pizzería Secreta';
const restaurant = (over = {}) => ({ id: RID, owner_email: EMAIL, name: NAME, ...over });

// Base falsa: email_log con unique (kind, dedupe_key)
function fakeDb({ reserveThrows = false, reserveResult = null, markThrows = false } = {}) {
  const log = new Map();
  const calls = { reserve: [], markSent: [], markFailed: [] };
  const db = {
    async reserve(row) {
      calls.reserve.push(row);
      if (reserveThrows) throw new Error(`boom reserva ${EMAIL}`);
      if (reserveResult) return reserveResult;
      if (log.has(row.dedupe_key)) return 'duplicate';
      log.set(row.dedupe_key, { status: 'pending', ...row });
      return 'reserved';
    },
    async markSent(key, providerId) {
      calls.markSent.push([key, providerId]);
      if (markThrows) throw new Error('boom mark');
      log.set(key, { ...log.get(key), status: 'sent', provider_id: providerId });
    },
    async markFailed(key, error) {
      calls.markFailed.push([key, error]);
      if (markThrows) throw new Error('boom mark');
      log.set(key, { ...log.get(key), status: 'failed', error });
    },
  };
  return { db, log, calls };
}

function fakeSend(handler = () => ({ ok: true, id: 're_1' })) {
  const sent = [];
  const fn = async (msg) => { sent.push(msg); return handler(msg); };
  fn.sent = sent;
  return fn;
}

function logger() {
  const lines = [];
  const fn = (l) => lines.push(l);
  fn.lines = lines;
  return fn;
}

const base = (db, send, extra = {}) => ({
  db, send, restaurant: restaurant(), mode: 'trial', plan: 'go', cardBrand: 'visa', cardLast4: '4242',
  firstChargeDate: new Date('2026-11-20T03:00:00Z'), ...extra,
});

console.log('el primer gracias sale');
{
  const { db, log, calls } = fakeDb();
  const send = fakeSend();
  const lg = logger();
  const r = await sendThanks(base(db, send, { log: lg }));
  check('resultado sent', r.outcome === 'sent' && r.code === undefined);
  check('reserva kind thanks, dedupe_key thanks:<id> y el destinatario', calls.reserve.length === 1 && calls.reserve[0].kind === 'thanks' && calls.reserve[0].dedupe_key === `thanks:${RID}` && calls.reserve[0].restaurant_id === RID && calls.reserve[0].to_email === EMAIL);
  check('thanksDedupeKey', thanksDedupeKey(RID) === `thanks:${RID}`);
  check('se manda un mail al dueño, con asunto de gracias y la fecha', send.sent.length === 1 && send.sent[0].to === EMAIL && send.sent[0].subject.includes('Gracias') && send.sent[0].text.includes('20 de noviembre de 2026'));
  check('queda sent con el id del proveedor', log.get(`thanks:${RID}`).status === 'sent' && log.get(`thanks:${RID}`).provider_id === 're_1');
  check('no loguea nada cuando sale bien', lg.lines.length === 0);
  check('el resultado no trae datos personales', !JSON.stringify(r).includes('secret') && !JSON.stringify(r).includes('Secreta'));
  check('el mail no lleva headers de baja (mail de servicio)', send.sent[0].headers === undefined);
}

console.log('el segundo gracias del mismo local se omite');
{
  const { db, calls } = fakeDb();
  const send = fakeSend();
  await sendThanks(base(db, send));
  const r2 = await sendThanks(base(db, send));
  check('duplicate y no se envía de nuevo', r2.outcome === 'duplicate' && send.sent.length === 1 && calls.markSent.length === 1);
  const otro = await sendThanks(base(db, send, { restaurant: restaurant({ id: 'otro-local', owner_email: 'otro@x.com' }) }));
  check('otro local sí recibe el suyo', otro.outcome === 'sent' && send.sent.length === 2);
}
{
  const { db } = fakeDb({ reserveResult: 'duplicate' });
  const send = fakeSend();
  const r = await sendThanks(base(db, send));
  check('si el unique rechaza, no se envía', r.outcome === 'duplicate' && send.sent.length === 0);
}

console.log('si sendEmail falla: queda failed, sin excepción');
{
  const { db, log, calls } = fakeDb();
  const send = fakeSend(() => ({ ok: false, error: 'resend_http_422' }));
  const lg = logger();
  const r = await sendThanks(base(db, send, { log: lg }));
  check('resultado failed con código corto', r.outcome === 'failed' && r.code === 'THANKS_SEND_FAILED');
  check('email_log queda failed con el error corto', log.get(`thanks:${RID}`).status === 'failed' && log.get(`thanks:${RID}`).error === 'resend_http_422' && calls.markFailed.length === 1);
  check('log con código y restaurant.id', lg.lines.length === 1 && lg.lines[0] === `[thanks] code=THANKS_SEND_FAILED restaurant=${RID}`);
}
{
  const { db, log } = fakeDb();
  const send = async () => { throw new Error(`explotó con ${EMAIL}`); };
  let thrown = false;
  let r;
  try { r = await sendThanks(base(db, send)); } catch { thrown = true; }
  check('un send que lanza no se propaga', !thrown && r.outcome === 'failed');
  check('queda failed send_exception', log.get(`thanks:${RID}`).error === 'send_exception');
}

console.log('si la reserva lanza: no sale el mail y no se propaga');
{
  const { db } = fakeDb({ reserveThrows: true });
  const send = fakeSend();
  const lg = logger();
  let thrown = false;
  let r;
  try { r = await sendThanks(base(db, send, { log: lg })); } catch { thrown = true; }
  check('no lanza', !thrown);
  check('no se envía', send.sent.length === 0);
  check('resultado reserve_error', r.outcome === 'reserve_error' && r.code === 'THANKS_RESERVE_ERROR');
  check('el log lleva restaurant.id y no el email ni el detalle', lg.lines[0] === `[thanks] code=THANKS_RESERVE_ERROR restaurant=${RID}` && !lg.lines.join(' ').includes('secreto') && !lg.lines.join(' ').includes('boom'));
}
{
  const { db } = fakeDb({ reserveResult: 'error' });
  const send = fakeSend();
  const r = await sendThanks(base(db, send));
  check('reserva con error (p. ej. el check de kind) → no se envía', r.outcome === 'reserve_error' && send.sent.length === 0);
}

console.log('otros bordes');
{
  const { db, calls } = fakeDb();
  const send = fakeSend();
  for (const empty of [null, '', '   ']) {
    const r = await sendThanks(base(db, send, { restaurant: restaurant({ owner_email: empty }) }));
    check(`sin email (${JSON.stringify(empty)}): no reserva ni envía`, r.outcome === 'no_email' && calls.reserve.length === 0 && send.sent.length === 0);
  }
}
{
  const { db } = fakeDb({ markThrows: true });
  const send = fakeSend();
  let thrown = false;
  let r;
  try { r = await sendThanks(base(db, send)); } catch { thrown = true; }
  check('si marcar sent falla no se propaga', !thrown && r.outcome === 'sent' && r.code === 'THANKS_MARK_ERROR');
}
{
  // plantilla que falla: modo inválido no debe romper (cae a la variante de reactivación) y nombre raro tampoco
  const { db } = fakeDb();
  const send = fakeSend();
  let thrown = false;
  try { await sendThanks(base(db, send, { restaurant: restaurant({ name: 123 }), cardLast4: { raro: true } })); } catch { thrown = true; }
  check('datos raros no lanzan', !thrown);
}

console.log('no demora de más: tope de espera');
{
  check('el tope por defecto es de 4 s', THANKS_MAX_WAIT_MS === 4000);
  const { db } = fakeDb();
  const lento = async () => { await new Promise((r) => setTimeout(r, 400)); return { ok: true, id: 'tarde' }; };
  const lg = logger();
  const t0 = Date.now();
  const r = await sendThanks(base(db, lento, { maxMs: 30, log: lg }));
  check('devuelve timeout enseguida', r.outcome === 'timeout' && Date.now() - t0 < 300);
  check('log con código y restaurant.id', lg.lines[0] === `[thanks] code=THANKS_TIMEOUT restaurant=${RID}`);
  await new Promise((r2) => setTimeout(r2, 500)); // deja terminar el envío lento: no debe haber rechazos sin manejar
  check('el trabajo que sigue en segundo plano no rompe nada', true);
}

console.log('no consulta email_unsubscribes (mail de servicio)');
{
  const { db } = fakeDb();
  check('la base inyectada solo tiene reserve, markSent y markFailed', JSON.stringify(Object.keys(db).sort()) === JSON.stringify(['markFailed', 'markSent', 'reserve']));
  const r = await sendThanks(base(db, fakeSend()));
  check('funciona sin ninguna lista de bajas', r.outcome === 'sent');
}

console.log('adaptador de email_log (cliente de Supabase falso)');
{
  const calls = [];
  const client = {
    from(table) {
      const chain = {
        insert(row) { calls.push({ op: 'insert', table, row }); return Promise.resolve({ error: client.nextError ?? null }); },
        update(values) {
          const filters = [];
          const p = { then: (res) => res({ error: null }) };
          p.eq = (c, v) => { filters.push([c, v]); calls.push({ op: 'update', table, values, filters: [...filters] }); return p; };
          return p;
        },
      };
      return chain;
    },
  };
  const db = emailLogThanksDb(client);
  check('insert pending → reserved', (await db.reserve({ kind: 'thanks', dedupe_key: 'thanks:1', restaurant_id: '1', to_email: 'a@b.com' })) === 'reserved' && calls[0].row.status === 'pending' && calls[0].table === 'email_log');
  client.nextError = { code: '23505' };
  check('23505 → duplicate', (await db.reserve({ kind: 'thanks', dedupe_key: 'thanks:1', restaurant_id: '1', to_email: 'a@b.com' })) === 'duplicate');
  client.nextError = { code: '23514' };
  check('otro error (p. ej. check de kind) → error', (await db.reserve({ kind: 'thanks', dedupe_key: 'thanks:1', restaurant_id: '1', to_email: 'a@b.com' })) === 'error');
  await db.markSent('thanks:1', 're_9');
  await db.markFailed('thanks:1', 'resend_http_500');
  const upd = calls.filter((c) => c.op === 'update' && c.filters.length === 2); // una entrada por update completo (kind + dedupe_key)
  check('markSent y markFailed filtran por kind thanks y dedupe_key', upd.length === 2 && upd.every((u) => u.filters.some(([c, v]) => c === 'kind' && v === 'thanks')) && upd.every((u) => u.filters.some(([c, v]) => c === 'dedupe_key' && v === 'thanks:1')));
  check('markSent guarda sent, provider_id y sent_at; markFailed guarda failed y error', upd.some((u) => u.values.status === 'sent' && u.values.provider_id === 're_9' && u.values.sent_at) && upd.some((u) => u.values.status === 'failed' && u.values.error === 'resend_http_500'));
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
