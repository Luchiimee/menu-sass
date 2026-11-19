// Verificación de los mails de ciclo de vida (lib/email/dates.ts, lifecycle.ts, layout.ts). Sin red.
//
//   node scripts/check-lifecycle-emails.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { diaArg, diasDesde, addDays, fechaLargaArg, inicioDiaArg } from '../lib/email/dates.ts';
import {
  selectTrialEnding, selectTrialFollowup, selectCardCheck, cardCheckEmail, selectPaymentFailed, paymentFailedEmail, paymentFailedReason, dedupeKeyFor, trialEndingEmail, trialFollowupEmail, trialEndDate, trialLastDay, dedupeKey, PLAN_URL, WA_TEXT_ENDING, WA_TEXT_FOLLOWUP,
} from '../lib/email/lifecycle.ts';
import { escapeHtml } from '../lib/email/layout.ts';
import { WHATSAPP_NUMBER, whatsappLink } from '../lib/email/contact.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const ADMINS = ['admin@snappy.uno'];
// "ahora" fijo: mediodía argentino (15:00Z) del 2026-11-20
const NOW = new Date('2026-11-20T15:00:00Z');
// alta N días de calendario antes de NOW, a la misma hora
const created = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();

const base = (over = {}) => ({
  id: 'r1', name: 'Pizzería Ñandú', owner_email: 'dueno@x.com', created_at: created(10),
  subscription_status: 'trialing', mp_card_id: null, mp_preapproval_id: null,
  trial_ends_at: null, grace_period_until: null, ...over,
});
const ending = (over, now = NOW) => selectTrialEnding([base(over)], now, ADMINS).length === 1;
const followup = (over, now = NOW) => selectTrialFollowup([base(over)], now, ADMINS).length === 1;

console.log('fechas en hora Argentina');
{
  check('diaArg: 02:30Z es todavía el día anterior', diaArg(new Date('2026-11-20T02:30:00Z')) === '2026-11-19');
  check('diaArg: 03:00Z ya es el día nuevo', diaArg(new Date('2026-11-20T03:00:00Z')) === '2026-11-20');
  check('diasDesde: mismo día = 0', diasDesde('2026-11-20T10:00:00Z', NOW) === 0);
  check('diasDesde: 10 días', diasDesde(created(10), NOW) === 10);
  check('diasDesde: alta 23:50 AR y ahora 00:10 AR del día siguiente = 1 día',
    diasDesde('2026-11-19T02:50:00Z', new Date('2026-11-19T03:10:00Z')) === 1);
  check('diasDesde: fecha inválida o vacía → null', diasDesde('nada', NOW) === null && diasDesde(null, NOW) === null);
  check('addDays suma 24 hs exactas', addDays(new Date('2026-11-01T12:00:00Z'), 14).toISOString() === '2026-11-15T12:00:00.000Z');
  check('fechaLargaArg: 02:00Z del 15 es 14 de noviembre en Argentina',
    fechaLargaArg(new Date('2026-11-15T02:00:00Z')) === '14 de noviembre de 2026');
}

console.log('trial_ending: bordes de ventana (días 10 a 13)');
{
  const dias = { 9: false, 10: true, 11: true, 13: true, 14: false };
  for (const [d, esperado] of Object.entries(dias)) {
    check(`día ${d} → ${esperado ? 'entra' : 'no entra'}`, ending({ created_at: created(Number(d)) }) === esperado);
  }
  check('estado null (sin plan elegido) también entra', ending({ subscription_status: null }));
}

console.log('trial_ending: exclusiones');
{
  check('con tarjeta (mp_card_id) → no', !ending({ mp_card_id: 'c1' }));
  check('con preapproval → no', !ending({ mp_preapproval_id: 'p1' }));
  check('active → no', !ending({ subscription_status: 'active' }));
  check('authorized → no', !ending({ subscription_status: 'authorized' }));
  check('paused → no', !ending({ subscription_status: 'paused' }));
  check('cancelled → no', !ending({ subscription_status: 'cancelled' }));
  check('admin (mayúsculas y espacios) → no', !ending({ owner_email: ' Admin@Snappy.uno ' }));
  check('gracia futura → no', !ending({ grace_period_until: '2026-12-01T00:00:00Z' }));
  check('gracia vencida → sí', ending({ grace_period_until: '2026-11-01T00:00:00Z' }));
  check('sin email → no', !ending({ owner_email: null }) && !ending({ owner_email: '  ' }));
  check('sin created_at → no', !ending({ created_at: null }));
}

console.log('trial_followup: bordes de ventana (días 20 a 30)');
{
  const dias = { 19: false, 20: true, 25: true, 30: true, 31: false };
  for (const [d, esperado] of Object.entries(dias)) {
    check(`día ${d} → ${esperado ? 'entra' : 'no entra'}`, followup({ created_at: created(Number(d)) }) === esperado);
  }
}

console.log('trial_followup: exclusiones');
{
  const c = { created_at: created(25) };
  check('base (día 25) entra', followup(c));
  check('con tarjeta → no', !followup({ ...c, mp_card_id: 'c1' }));
  check('con preapproval → no', !followup({ ...c, mp_preapproval_id: 'p1' }));
  check('con trial_ends_at → no', !followup({ ...c, trial_ends_at: '2026-11-10T00:00:00Z' }));
  check('active → no', !followup({ ...c, subscription_status: 'active' }));
  check('paused (cobro fallido) → no', !followup({ ...c, subscription_status: 'paused' }));
  check('cancelled → no', !followup({ ...c, subscription_status: 'cancelled' }));
  check('admin → no', !followup({ ...c, owner_email: 'admin@snappy.uno' }));
  check('gracia futura → no', !followup({ ...c, grace_period_until: '2026-12-01T00:00:00Z' }));
  check('sin email → no', !followup({ ...c, owner_email: '' }));
  check('trial_ending y followup nunca coinciden en el mismo día',
    [9, 10, 13, 14, 19, 20, 30, 31].every((d) => !(ending({ created_at: created(d) }) && followup({ created_at: created(d) }))));
}

console.log('fecha de fin de la prueba (hora Argentina)');
{
  // fin = 00:00 AR del día 15 contado desde el alta (día del alta = día 1) = 03:00Z
  check('inicioDiaArg: 00:00 AR = 03:00Z', inicioDiaArg(new Date('2026-11-01T20:00:00Z')).toISOString() === '2026-11-01T03:00:00.000Z');
  check('alta 12:00 AR del 1/11 → fin 03:00Z del 15/11', trialEndDate('2026-11-01T15:00:00Z').toISOString() === '2026-11-15T03:00:00.000Z');
  check('alta 12:00 AR del 1/11 → último día: 14 de noviembre', fechaLargaArg(trialLastDay('2026-11-01T15:00:00Z')) === '14 de noviembre de 2026');
  // alta a las 23:30 AR del 1/11 (02:30Z del 2/11): sigue siendo el día 1 → termina igual el 14
  check('alta 23:30 AR del 1/11 → último día 14 de noviembre', fechaLargaArg(trialLastDay('2026-11-02T02:30:00Z')) === '14 de noviembre de 2026');
  check('alta 23:30 AR del 1/11 → fin 03:00Z del 15/11', trialEndDate('2026-11-02T02:30:00Z').toISOString() === '2026-11-15T03:00:00.000Z');
  // alta a las 00:10 AR del 2/11 (03:10Z): ya es el día 2 → termina el 15
  check('alta 00:10 AR del 2/11 → último día 15 de noviembre', fechaLargaArg(trialLastDay('2026-11-02T03:10:00Z')) === '15 de noviembre de 2026');
  // el día 14 es el último con prueba y el 15 ya no (por día de calendario, diasDesde 13 y 14)
  const alta = '2026-11-01T15:00:00Z';
  check('el día 13 desde el alta (14.º día) todavía tiene prueba', new Date('2026-11-14T20:00:00Z') < trialEndDate(alta) && diasDesde(alta, new Date('2026-11-14T20:00:00Z')) === 13);
  check('el día 14 desde el alta (15.º día) ya no', new Date('2026-11-15T03:00:00Z') >= trialEndDate(alta) && diasDesde(alta, new Date('2026-11-15T20:00:00Z')) === 14);
  check('dedupe_key = <kind>:<restaurant_id>', dedupeKey('trial_ending', 'abc') === 'trial_ending:abc');
}

console.log('contacto por WhatsApp');
{
  check('número único', WHATSAPP_NUMBER === '5492324313123');
  check('link con el texto codificado', whatsappLink('Hola, probé Snappy y quiero ayuda para empezar') ===
    'https://wa.me/5492324313123?text=Hola%2C%20prob%C3%A9%20Snappy%20y%20quiero%20ayuda%20para%20empezar');
  check('el texto decodifica al original', decodeURIComponent(new URL(whatsappLink('¿Qué tal? & más')).searchParams.get('text')) === '¿Qué tal? & más');
  check('el link no tiene espacios ni comillas ni &', !/[\s"'<>&]/.test(whatsappLink('a b "c" <d> & e')));
}

console.log('plantillas');
{
  const end = trialLastDay('2026-11-01T15:00:00Z');
  const a = trialEndingEmail({ name: 'Pizzería Ñandú', lastDay: end });
  check('ending: asunto con la fecha', a.subject.includes('14 de noviembre de 2026'));
  check('ending: dice "termina el ... inclusive"', a.text.includes('termina el 14 de noviembre de 2026 inclusive') && a.subject.includes('termina el'));
  check('ending: html y texto con la fecha', a.html.includes('14 de noviembre de 2026') && a.text.includes('14 de noviembre de 2026'));
  check('ending: botón principal "Cargar mi tarjeta" a /dashboard/plan', a.html.includes(`href="${PLAN_URL}"`) && a.html.includes('Cargar mi tarjeta') && a.text.includes(PLAN_URL));
  check('ending: link chico de WhatsApp', a.html.includes(`href="${whatsappLink(WA_TEXT_ENDING)}"`) && a.html.includes('¿Dudas?') && a.text.includes(whatsappLink(WA_TEXT_ENDING)));
  check('ending: mismo layout (header negro, logo, footer)', a.html.includes('#15160E') && a.html.includes('logo-snappy-mail.png') && !a.html.includes('.svg') && a.html.includes('hola@snappy.uno'));

  const f = trialFollowupEmail({ name: 'Pizzería Ñandú' });
  check('followup: asunto y texto', f.subject.includes('venció') && f.text.includes('¿Necesitás ayuda?'));
  check('followup: botón principal "Hablar por WhatsApp" con el texto precargado',
    f.html.includes(`href="${whatsappLink('Hola, probé Snappy y quiero ayuda para empezar')}"`) && f.html.includes('Hablar por WhatsApp'));
  check('followup: link secundario al plan', f.html.includes('href="https://snappy.uno/dashboard/plan"') && f.text.includes(PLAN_URL));
  check('followup: invita a escribir por WhatsApp', f.text.includes('escribinos por WhatsApp'));
  check('ningún mail pide "responder este mail"', ![a.html, a.text, f.html, f.text].some((x) => /respond/i.test(x)));

  const evil = '<script>alert(1)</script> & "x"';
  for (const [n, m] of [['ending', trialEndingEmail({ name: evil, lastDay: end })], ['followup', trialFollowupEmail({ name: evil })]]) {
    check(`${n}: el nombre se escapa en el html`, !m.html.includes('<script>') && m.html.includes('&lt;script&gt;') && m.html.includes('&amp;'));
  }
  check('sin nombre → "tu local"', trialFollowupEmail({ name: null }).text.includes('tu local'));
  check('escapeHtml', escapeHtml(`<a href="x">'&`) === '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
}

console.log('card_check: aviso antes del primer cobro (1 a 2 días antes, trialing con tarjeta, sin cobro previo)');
{
  // Alta hace N días: la prueba termina 00:00 AR del día 15 → el cobro cae el día (alta + 14).
  // Con NOW = 20/11 12:00 AR: alta hace 12 días → cobro dentro de 2 días; hace 13 → mañana; hace 14 → hoy.
  const cc = (over, now = NOW) => selectCardCheck([base({ mp_card_id: 'c1', ...over })], now, ADMINS).length === 1;
  check('faltan 3 días (alta hace 11) → no', !cc({ created_at: created(11) }));
  check('faltan 2 días (alta hace 12) → sí', cc({ created_at: created(12) }));
  check('falta 1 día (alta hace 13) → sí', cc({ created_at: created(13) }));
  check('el día del cobro (alta hace 14) → no', !cc({ created_at: created(14) }));
  check('sin tarjeta → no (a ese le toca trial_ending)', !cc({ created_at: created(12), mp_card_id: null }));
  check('mp_card_id vacío o con espacios → no', !cc({ created_at: created(12), mp_card_id: '  ' }));
  check('ya activo → no', !cc({ created_at: created(12), subscription_status: 'active' }));
  check('pausado o cancelado → no', !cc({ created_at: created(12), subscription_status: 'paused' }) && !cc({ created_at: created(12), subscription_status: 'cancelled' }));
  check('ya cobró alguna vez (first_paid_at) → no', !cc({ created_at: created(12), first_paid_at: '2026-11-15T16:11:45Z' }));
  check('sin email → no', !cc({ created_at: created(12), owner_email: null }));
  check('admin → no', !cc({ created_at: created(12), owner_email: 'ADMIN@snappy.uno' }));
  check('usa trial_ends_at si está guardado: cobro en 1 día aunque el alta sea vieja',
    cc({ created_at: created(40), trial_ends_at: new Date(NOW.getTime() + 20 * 3600000).toISOString() }));
  check('created_at inválido y sin trial_ends_at → no', !cc({ created_at: 'nada' }));

  const m = cardCheckEmail({ name: 'Local ñ', chargeDate: new Date('2026-11-22T03:00:00Z'), plan: 'light', cardBrand: 'debvisa', cardLast4: '9980' });
  check('asunto con la fecha del cobro', m.subject.includes('22 de noviembre de 2026'));
  check('dice el monto del plan y la tarjeta', m.text.includes('$20.000') && m.text.includes('Visa Débito terminada en 9980'));
  check('pide revisar el DNI del titular', /DNI del titular/.test(m.text) && /DNI del titular/.test(m.html));
  check('lleva al panel del plan', m.text.includes(PLAN_URL) && m.html.includes(PLAN_URL));
  const sinDatos = cardCheckEmail({ name: null, chargeDate: new Date('2026-11-22T03:00:00Z') });
  check('sin plan ni tarjeta: texto genérico y sin "undefined"', sinDatos.text.includes('a la tarjeta que cargaste') && !/undefined|null/.test(sinDatos.text + sinDatos.html));
  check('el nombre se escapa', cardCheckEmail({ name: '<b>x</b>', chargeDate: new Date() }).html.includes('&lt;b&gt;'));
  check('no lleva link de baja (es un aviso del servicio, como trial_ending)', !/baja/i.test(m.text));
}

console.log('payment_failed: cobro rechazado (pausado con la gracia corriendo)');
{
  const NOWP = new Date('2026-11-20T15:00:00Z');
  const GRACE = '2026-11-23T10:00:00Z';
  const base = { id: 'p1', name: 'Local', owner_email: 'p1@gmail.com', created_at: '2026-01-10T12:00:00Z', subscription_status: 'paused', mp_card_id: 'c', mp_preapproval_id: null, trial_ends_at: null, grace_period_until: null, payment_grace_until: GRACE };
  const ids = (rows) => selectPaymentFailed(rows, NOWP, ['admin@snappy.uno']).map((r) => r.id);
  check('pausado con gracia futura → sí (aunque la cuenta sea vieja)', ids([base]).join() === 'p1');
  check('gracia vencida → no', ids([{ ...base, payment_grace_until: '2026-11-19T10:00:00Z' }]).length === 0);
  check('sin gracia → no', ids([{ ...base, payment_grace_until: null }]).length === 0);
  check('activo o cancelado con gracia vieja guardada → no', ids([{ ...base, subscription_status: 'active' }, { ...base, id: 'p2', subscription_status: 'cancelled' }]).length === 0);
  check('admin o sin email → no', ids([{ ...base, owner_email: 'admin@snappy.uno' }, { ...base, id: 'p3', owner_email: '' }]).length === 0);

  check('clave por rechazo: lleva el día en que vence la gracia', dedupeKeyFor('payment_failed', base) === 'payment_failed:p1:2026-11-23');
  check('otro rechazo (otra gracia) → otra clave', dedupeKeyFor('payment_failed', { ...base, payment_grace_until: '2026-12-23T10:00:00Z' }) === 'payment_failed:p1:2026-12-23');
  check('los demás tipos siguen con la clave de siempre', dedupeKeyFor('card_check', base) === 'card_check:p1' && dedupeKeyFor('trial_ending', base) === dedupeKey('trial_ending', 'p1'));

  const at = (iso) => ({ payment_grace_until: GRACE, last_charge_error: 'cc_rejected_insufficient_amount', last_charge_error_at: iso });
  check('motivo reciente → se usa el mensaje claro', /fondos suficientes/.test(paymentFailedReason(at('2026-11-20T10:00:00Z')) ?? ''));
  check('motivo viejo (de un rechazo anterior) → se ignora', paymentFailedReason(at('2026-10-20T10:00:00Z')) === null);
  check('motivo posterior a la gracia o sin fecha → se ignora', paymentFailedReason(at('2026-11-25T10:00:00Z')) === null && paymentFailedReason({ payment_grace_until: GRACE, last_charge_error: 'x', last_charge_error_at: null }) === null);
  check('sin motivo → null', paymentFailedReason({ payment_grace_until: GRACE, last_charge_error: null, last_charge_error_at: null }) === null);

  const m = paymentFailedEmail({ name: 'Local ñ', graceUntil: new Date(GRACE), reason: 'La tarjeta no tiene fondos suficientes. Probá con otra tarjeta.', plan: 'light', cardBrand: 'debvisa', cardLast4: '9980' });
  check('asunto con la fecha límite', m.subject.includes('hasta el') && m.subject.includes(fechaLargaArg(new Date(GRACE))));
  check('explica el motivo, los 3 días y la fecha', m.text.includes('fondos suficientes') && m.text.includes('3 días') && m.text.includes(fechaLargaArg(new Date(GRACE))));
  check('lleva plan y tarjeta', /\$22\.000|\$\d/.test(m.text) && m.text.includes('Visa'));
  check('botón a Mi plan y WhatsApp', m.html.includes(PLAN_URL) && m.text.includes(PLAN_URL) && m.html.includes('wa.me'));
  const gen = paymentFailedEmail({ name: null, graceUntil: new Date(GRACE) });
  check('sin motivo: texto general y sin "undefined"', gen.text.includes('Suele ser por') && !/undefined|null/.test(gen.text + gen.html));
  check('el nombre se escapa', paymentFailedEmail({ name: '<b>x</b>', graceUntil: new Date(GRACE) }).html.includes('&lt;b&gt;'));
  check('no lleva link de baja (aviso del servicio)', !/baja/i.test(m.text));
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
