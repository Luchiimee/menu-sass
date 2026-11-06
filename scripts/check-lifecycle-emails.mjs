// Verificación de los mails de ciclo de vida (lib/email/dates.ts, lifecycle.ts, layout.ts). Sin red.
//
//   node scripts/check-lifecycle-emails.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { diaArg, diasDesde, addDays, fechaLargaArg } from '../lib/email/dates.ts';
import {
  selectTrialEnding, selectTrialFollowup, trialEndingEmail, trialFollowupEmail, trialEndDate, dedupeKey, PLAN_URL, WA_TEXT_ENDING, WA_TEXT_FOLLOWUP,
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
  // alta el 1/11 a las 23:30 AR (02:30Z del 2/11): el fin es el 15/11 a las 23:30 AR, no el 16
  const fin = trialEndDate('2026-11-02T02:30:00Z');
  check('alta 23:30 AR → fin el 15 de noviembre', fechaLargaArg(fin) === '15 de noviembre de 2026');
  check('alta 00:10 AR → fin 14 días después', fechaLargaArg(trialEndDate('2026-11-01T03:10:00Z')) === '15 de noviembre de 2026');
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
  const end = trialEndDate('2026-11-02T02:30:00Z');
  const a = trialEndingEmail({ name: 'Pizzería Ñandú', endDate: end });
  check('ending: asunto con la fecha', a.subject.includes('15 de noviembre de 2026'));
  check('ending: html y texto con la fecha', a.html.includes('15 de noviembre de 2026') && a.text.includes('15 de noviembre de 2026'));
  check('ending: botón principal "Cargar mi tarjeta" a /dashboard/plan', a.html.includes(`href="${PLAN_URL}"`) && a.html.includes('Cargar mi tarjeta') && a.text.includes(PLAN_URL));
  check('ending: link chico de WhatsApp', a.html.includes(`href="${whatsappLink(WA_TEXT_ENDING)}"`) && a.html.includes('¿Dudas?') && a.text.includes(whatsappLink(WA_TEXT_ENDING)));
  check('ending: mismo layout (header negro, logo, footer)', a.html.includes('#15160E') && a.html.includes('logo-snappy.svg') && a.html.includes('hola@snappy.uno'));

  const f = trialFollowupEmail({ name: 'Pizzería Ñandú' });
  check('followup: asunto y texto', f.subject.includes('venció') && f.text.includes('¿Necesitás ayuda?'));
  check('followup: botón principal "Hablar por WhatsApp" con el texto precargado',
    f.html.includes(`href="${whatsappLink('Hola, probé Snappy y quiero ayuda para empezar')}"`) && f.html.includes('Hablar por WhatsApp'));
  check('followup: link secundario al plan', f.html.includes('href="https://snappy.uno/dashboard/plan"') && f.text.includes(PLAN_URL));
  check('followup: invita a escribir por WhatsApp', f.text.includes('escribinos por WhatsApp'));
  check('ningún mail pide "responder este mail"', ![a.html, a.text, f.html, f.text].some((x) => /respond/i.test(x)));

  const evil = '<script>alert(1)</script> & "x"';
  for (const [n, m] of [['ending', trialEndingEmail({ name: evil, endDate: end })], ['followup', trialFollowupEmail({ name: evil })]]) {
    check(`${n}: el nombre se escapa en el html`, !m.html.includes('<script>') && m.html.includes('&lt;script&gt;') && m.html.includes('&amp;'));
  }
  check('sin nombre → "tu local"', trialFollowupEmail({ name: null }).text.includes('tu local'));
  check('escapeHtml', escapeHtml(`<a href="x">'&`) === '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
