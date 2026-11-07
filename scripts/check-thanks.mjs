// Verificación del mail de agradecimiento (lib/email/thanks.ts): variantes, elección de la variante,
// escape de HTML y bordes de fecha en hora Argentina. Sin red.
//
//   node scripts/check-thanks.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { thanksEmail, chooseThanksMode, cardLabel, THANKS_PLAN_URL } from '../lib/email/thanks.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const at = (iso) => new Date(iso);

// Alta el 6/11/2026 a las 15:00 AR → día 1 = 6/11, último día de prueba (14) = 19/11, vence 00:00 AR del 20/11
const CREATED = '2026-11-06T18:00:00Z';
const FIRST_CHARGE = at('2026-11-20T03:00:00Z'); // 00:00 AR del 20/11

console.log('chooseThanksMode: estado y borde del último día (hora Argentina)');
{
  const base = { status: 'trialing', createdAt: CREATED, trialEndsAt: null };
  check('día 1 de la prueba → trial', chooseThanksMode({ ...base, now: at('2026-11-06T19:00:00Z') }) === 'trial');
  check('día 13 a las 23:59 AR → trial', chooseThanksMode({ ...base, now: at('2026-11-19T02:59:00Z') }) === 'trial');
  check('día 14 a las 00:00 AR → trial_expired (último día)', chooseThanksMode({ ...base, now: at('2026-11-19T03:00:00Z') }) === 'trial_expired');
  check('día 14 a las 23:59 AR → trial_expired', chooseThanksMode({ ...base, now: at('2026-11-20T02:59:00Z') }) === 'trial_expired');
  check('día 15 a las 00:00 AR (vence la prueba) → trial_expired', chooseThanksMode({ ...base, now: at('2026-11-20T03:00:00Z') }) === 'trial_expired');
  check('días después de vencida → trial_expired', chooseThanksMode({ ...base, now: at('2026-11-28T15:00:00Z') }) === 'trial_expired');
}
{
  const base = { createdAt: CREATED, trialEndsAt: null, now: at('2026-11-10T15:00:00Z') };
  check('cancelled → reactivation', chooseThanksMode({ ...base, status: 'cancelled' }) === 'reactivation');
  check('paused → reactivation', chooseThanksMode({ ...base, status: 'paused' }) === 'reactivation');
  check('active → null (no se manda)', chooseThanksMode({ ...base, status: 'active' }) === null);
  check('authorized → null', chooseThanksMode({ ...base, status: 'authorized' }) === null);
  check('estado null/desconocido → null', chooseThanksMode({ ...base, status: null }) === null && chooseThanksMode({ ...base, status: 'raro' }) === null);
}
{
  // trial_ends_at ya guardado (p. ej. gracia de un cliente migrado): manda la fecha guardada
  const grace = '2026-12-15T03:00:00Z';
  check('trial_ends_at guardado en el futuro → trial aunque sea el día 14 por created_at',
    chooseThanksMode({ status: 'trialing', createdAt: CREATED, trialEndsAt: grace, now: at('2026-11-19T15:00:00Z') }) === 'trial');
  check('trial_ends_at guardado ya pasado → trial_expired',
    chooseThanksMode({ status: 'trialing', createdAt: CREATED, trialEndsAt: '2026-11-01T03:00:00Z', now: at('2026-11-10T15:00:00Z') }) === 'trial_expired');
  check('día anterior al cobro guardado → trial_expired (último día)',
    chooseThanksMode({ status: 'trialing', createdAt: CREATED, trialEndsAt: grace, now: at('2026-12-14T15:00:00Z') }) === 'trial_expired');
  check('sin created_at ni trial_ends_at → trial_expired (sin fecha que decir)',
    chooseThanksMode({ status: 'trialing', createdAt: null, trialEndsAt: null, now: at('2026-11-10T15:00:00Z') }) === 'trial_expired');
}

console.log('variante trial');
{
  const m = thanksEmail({ mode: 'trial', name: 'Pizzería Ñandú', plan: 'light', cardBrand: 'visa', cardLast4: '4242', firstChargeDate: FIRST_CHARGE });
  check('asunto de agradecimiento', m.subject.includes('Gracias'));
  check('primer cobro en fecha larga en hora Argentina', m.html.includes('20 de noviembre de 2026') && m.text.includes('20 de noviembre de 2026'));
  check('precio del plan', m.html.includes('$20.000') && m.text.includes('$20.000') && m.html.includes('Plan Light'));
  check('sin cobro hasta esa fecha', m.text.includes('no se te cobra nada'));
  check('marca y últimos 4', m.html.includes('Visa terminada en 4242') && m.text.includes('Visa terminada en 4242'));
  check('nombre del local', m.html.includes('Pizzería Ñandú') && m.text.includes('Pizzería Ñandú'));
  check('link al plan y WhatsApp', m.html.includes(THANKS_PLAN_URL) && m.text.includes(THANKS_PLAN_URL) && m.html.includes('wa.me/5492324313123') && m.text.includes('wa.me/5492324313123'));
  const go = thanksEmail({ mode: 'trial', name: 'x', plan: 'go', firstChargeDate: FIRST_CHARGE });
  const plus = thanksEmail({ mode: 'trial', name: 'x', plan: 'plus', firstChargeDate: FIRST_CHARGE });
  check('precios de go y plus', go.text.includes('$29.500') && plus.text.includes('$47.000'));
  const sinFecha = thanksEmail({ mode: 'trial', name: 'x', plan: 'go', firstChargeDate: null });
  check('sin fecha: no inventa una', !/\d{1,2} de \w+ de \d{4}/.test(sinFecha.text) && sinFecha.text.includes('cuando termina tu prueba'));
}

console.log('variante trial_expired');
{
  const m = thanksEmail({ mode: 'trial_expired', name: 'Local', plan: 'go', cardBrand: 'master', cardLast4: '1111', firstChargeDate: FIRST_CHARGE });
  check('"tu primer cobro se hace en breve"', m.html.includes('Tu primer cobro se hace en breve') && m.text.includes('Tu primer cobro se hace en breve'));
  check('con el precio', m.text.includes('$29.500'));
  const dice = (t) => /termina (el|tu|la)|prueba termina|fin de (tu|la) prueba/i.test(t);
  check('no dice cuándo termina la prueba', !dice(m.text) && !dice(m.html));
  check('no da ninguna fecha', !/\d{1,2} de [a-z]+ de \d{4}/i.test(m.text) && !/\d{1,2} de [a-z]+ de \d{4}/i.test(m.html));
  check('no dice "no se te cobra nada"', !m.text.includes('no se te cobra nada'));
}

console.log('variante reactivation');
{
  const m = thanksEmail({ mode: 'reactivation', name: 'Local', plan: 'plus', cardBrand: 'visa', cardLast4: '4242', firstChargeDate: FIRST_CHARGE });
  check('el cobro se hizo ahora', m.text.includes('se hizo ahora') && m.text.includes('$47.000'));
  check('sin fecha de próximo cobro', !/próximo cobro|primer cobro|\d{1,2} de noviembre/.test(m.text) && !m.text.includes('2026-'));
  check('suscripción activa y tarjeta', m.text.includes('está activa') && m.text.includes('Visa terminada en 4242'));
}

console.log('mail de servicio: sin baja');
for (const mode of ['trial', 'trial_expired', 'reactivation']) {
  const m = thanksEmail({ mode, name: 'Local', plan: 'go', firstChargeDate: FIRST_CHARGE });
  check(`${mode}: sin link ni texto de baja`, !/baja/i.test(m.html) && !/baja/i.test(m.text) && !/unsubscribe/i.test(m.html + m.text) && !('headers' in m));
}

console.log('escape de HTML');
{
  const evil = '<script>alert("x")</script> & "co\'mo"';
  for (const mode of ['trial', 'trial_expired', 'reactivation']) {
    const m = thanksEmail({ mode, name: evil, plan: 'go', firstChargeDate: FIRST_CHARGE });
    check(`${mode}: el nombre sale escapado en el HTML`, !m.html.includes('<script>') && m.html.includes('&lt;script&gt;') && m.html.includes('&amp;') && m.html.includes('&quot;'));
    check(`${mode}: el texto plano lleva el nombre tal cual`, m.text.includes(evil));
  }
  const evilBrand = thanksEmail({ mode: 'trial', name: 'x', plan: 'go', cardBrand: '<img src=x onerror=alert(1)>', cardLast4: '4242', firstChargeDate: FIRST_CHARGE });
  check('marca con HTML se descarta', !evilBrand.html.includes('onerror') && !evilBrand.html.includes('alert(1)') && evilBrand.html.includes('tarjeta terminada en 4242'));
}

console.log('nombre vacío');
for (const empty of [null, undefined, '', '   ']) {
  const m = thanksEmail({ mode: 'trial', name: empty, plan: 'go', firstChargeDate: FIRST_CHARGE });
  check(`${JSON.stringify(empty)} → "tu local"`, m.html.includes('<strong>tu local</strong>') && m.text.includes('para tu local'));
}

console.log('tarjeta: con y sin datos');
{
  check('sin marca ni últimos 4 → sin línea de tarjeta', cardLabel(null, null) === null && cardLabel('', '') === null && cardLabel(undefined, undefined) === null);
  const m = thanksEmail({ mode: 'trial', name: 'x', plan: 'go', firstChargeDate: FIRST_CHARGE });
  check('el mail sale igual sin tarjeta y sin "terminada en"', !m.text.includes('terminada en') && m.text.includes('Guardamos tu tarjeta para x.'));
  check('solo últimos 4', cardLabel(null, '1234') === 'tarjeta terminada en 1234');
  check('solo marca', cardLabel('visa', null) === 'tarjeta Visa');
  check('últimos 4 inválidos se ignoran', cardLabel('visa', '12') === 'tarjeta Visa' && cardLabel('visa', '12345') === 'tarjeta Visa' && cardLabel('visa', 'abcd') === 'tarjeta Visa');
  check('marcas conocidas', cardLabel('master', '0001') === 'Mastercard terminada en 0001' && cardLabel('amex', '0002') === 'American Express terminada en 0002');
}

console.log('plan desconocido');
{
  const m = thanksEmail({ mode: 'trial', name: 'x', plan: 'raro', firstChargeDate: FIRST_CHARGE });
  check('no inventa un precio', !m.text.includes('$') && m.text.includes('del valor de tu plan'));
  const n = thanksEmail({ mode: 'trial_expired', name: 'x', plan: null });
  check('plan nulo tampoco', !n.text.includes('$') && n.text.includes('del valor de tu plan'));
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
