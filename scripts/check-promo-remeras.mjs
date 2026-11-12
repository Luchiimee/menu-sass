// Verificación de lib/promoRemeras.ts: ventana de registro de noviembre (hora Argentina), orden por primer pago,
// puestos 1 a 10, plazo del 15/12 y exclusión de correos. Sin red.
//
//   node scripts/check-promo-remeras.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  PROMO_EXCLUDED_EMAILS, PROMO_REMERAS_SLOTS, PROMO_REGISTRATION_START, PROMO_REGISTRATION_END_EXCLUSIVE, PROMO_PAYMENT_DEADLINE,
  parseTime, isRegisteredInPromoWindow, isPaidAfterDeadline, buildPromoRemeras, buildPromoRemerasResponse,
} from '../lib/promoRemeras.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const row = (id, created, paid, extra = {}) => ({
  id, name: `Local ${id}`, owner_email: `${id}@mail.com`, created_at: created, first_paid_at: paid,
  subscription_plan: 'go', subscription_status: paid ? 'active' : 'trialing', ...extra,
});
const NOV = '2026-11-10T15:00:00Z';

console.log('constantes');
check('10 cupos', PROMO_REMERAS_SLOTS === 10);
check('ventana: 1/11 00:00 AR a 1/12 00:00 AR (exclusivo)', PROMO_REGISTRATION_START === '2026-11-01T00:00:00-03:00' && PROMO_REGISTRATION_END_EXCLUSIVE === '2026-12-01T00:00:00-03:00');
check('plazo de pago: 15/12 23:59:59.999 AR', PROMO_PAYMENT_DEADLINE === '2026-12-15T23:59:59.999-03:00');
check('inicio = 2026-11-01T03:00:00Z', parseTime(PROMO_REGISTRATION_START) === Date.parse('2026-11-01T03:00:00Z'));

console.log('parseTime');
check('ISO válido', parseTime('2026-11-10T15:00:00Z') === Date.parse('2026-11-10T15:00:00Z'));
check('Date', parseTime(new Date('2026-11-10T15:00:00Z')) === Date.parse('2026-11-10T15:00:00Z'));
check('null, undefined, vacío, número, objeto, texto basura: null', [null, undefined, '', 5, {}, 'no es fecha', 'x'].every((v) => parseTime(v) === null));

console.log('ventana de registro (hora Argentina)');
check('31/10 23:59:59.999 AR: afuera', !isRegisteredInPromoWindow('2026-11-01T02:59:59.999Z'));
check('1/11 00:00:00 AR: adentro', isRegisteredInPromoWindow('2026-11-01T03:00:00Z'));
check('30/11 23:59:59.999 AR: adentro', isRegisteredInPromoWindow('2026-12-01T02:59:59.999Z'));
check('1/12 00:00:00 AR: afuera', !isRegisteredInPromoWindow('2026-12-01T03:00:00Z'));
check('1/11 00:30 UTC (31/10 21:30 AR): afuera', !isRegisteredInPromoWindow('2026-11-01T00:30:00Z'));
check('fecha inválida o nula: afuera', !isRegisteredInPromoWindow(null) && !isRegisteredInPromoWindow('x') && !isRegisteredInPromoWindow(undefined));
check('con offset -03:00 explícito', isRegisteredInPromoWindow('2026-11-01T00:00:00-03:00') && !isRegisteredInPromoWindow('2026-10-31T23:59:59-03:00'));

console.log('plazo de pago');
check('15/12 23:59:59.999 AR: en plazo', !isPaidAfterDeadline('2026-12-16T02:59:59.999Z'));
check('16/12 00:00:00 AR: fuera de plazo', isPaidAfterDeadline('2026-12-16T03:00:00Z'));
check('sin fecha de pago: no está fuera de plazo', !isPaidAfterDeadline(null) && !isPaidAfterDeadline('x'));

console.log('buildPromoRemeras: filtro y orden');
{
  const out = buildPromoRemeras([
    row('afuera-oct', '2026-10-31T20:00:00Z', '2026-11-05T12:00:00Z'),
    row('afuera-dic', '2026-12-01T03:00:00Z', '2026-12-02T12:00:00Z'),
    row('sin-pago-1', '2026-11-02T12:00:00Z', null),
    row('b', NOV, '2026-12-03T12:00:00Z'),
    row('a', NOV, '2026-11-20T12:00:00Z'),
    row('c', NOV, '2026-12-10T12:00:00Z'),
  ]);
  check('solo los de noviembre', out.map((o) => o.id).sort().join(',') === 'a,b,c,sin-pago-1');
  check('orden por primer pago, nulos al final', out.map((o) => o.id).join(',') === 'a,b,c,sin-pago-1');
  check('puestos 1, 2, 3 y el sin pago sin puesto', out.map((o) => o.puesto).join(',') === '1,2,3,');
  check('sin pago: first_paid_at null y no fuera de plazo', out[3].first_paid_at === null && out[3].fuera_de_plazo === false);
  check('campos en español', out[0].nombre === 'Local a' && out[0].email_dueno === 'a@mail.com' && out[0].plan === 'go' && out[0].estado === 'active');
}

console.log('buildPromoRemeras: puestos 1 a 10');
{
  const rows = [];
  for (let i = 1; i <= 12; i++) rows.push(row(`l${String(i).padStart(2, '0')}`, NOV, `2026-11-${String(10 + i).padStart(2, '0')}T12:00:00Z`));
  // 12 pagaron en plazo (los días 11 a 22 de noviembre): solo 10 tienen puesto
  const out = buildPromoRemeras(rows);
  check('12 locales, 10 con puesto', out.filter((o) => o.puesto !== null).length === 10);
  check('puestos del 1 al 10 en orden', out.slice(0, 10).every((o, i) => o.puesto === i + 1));
  check('el 11 y el 12 sin puesto y en plazo', out[10].puesto === null && out[11].puesto === null && !out[10].fuera_de_plazo && !out[11].fuera_de_plazo);
  check('máximo 10 puestos aunque haya más', Math.max(...out.map((o) => o.puesto ?? 0)) === 10);
}

console.log('buildPromoRemeras: fuera de plazo no ocupa cupo');
{
  const rows = [
    row('tarde', NOV, '2026-12-16T03:00:00Z'),            // 16/12 00:00 AR: fuera de plazo
    row('justo', NOV, '2026-12-16T02:59:59.999Z'),        // 15/12 23:59:59.999 AR: en plazo
    row('temprano', NOV, '2026-11-15T12:00:00Z'),
  ];
  const out = buildPromoRemeras(rows);
  check('orden: temprano, justo, tarde', out.map((o) => o.id).join(',') === 'temprano,justo,tarde');
  check('justo tiene puesto 2 y no está fuera de plazo', out[1].puesto === 2 && out[1].fuera_de_plazo === false);
  check('tarde: fuera_de_plazo y sin puesto', out[2].puesto === null && out[2].fuera_de_plazo === true);
  // 10 en plazo + 1 tarde: el tarde no cambia los puestos
  const diez = [];
  for (let i = 1; i <= 10; i++) diez.push(row(`p${i}`, NOV, `2026-11-${10 + i}T12:00:00Z`));
  const con = buildPromoRemeras([...diez, row('tarde2', NOV, '2026-12-20T12:00:00Z')]);
  check('10 en plazo conservan sus puestos con uno tarde', con.slice(0, 10).every((o, i) => o.puesto === i + 1) && con[10].puesto === null && con[10].fuera_de_plazo);
}

console.log('buildPromoRemeras: empates y estabilidad');
{
  const mismoPago = '2026-11-20T12:00:00Z';
  const out = buildPromoRemeras([
    row('z', '2026-11-05T12:00:00Z', mismoPago),
    row('y', '2026-11-03T12:00:00Z', mismoPago),
    row('x', '2026-11-03T12:00:00Z', mismoPago),
  ]);
  check('empate de pago: gana el que se registró antes y, si empata, el id', out.map((o) => o.id).join(',') === 'x,y,z');
  const sinPago = buildPromoRemeras([row('q', '2026-11-09T12:00:00Z', null), row('p', '2026-11-04T12:00:00Z', null)]);
  check('sin pago: orden por fecha de registro', sinPago.map((o) => o.id).join(',') === 'p,q');
  const a = buildPromoRemeras([row('1', NOV, '2026-11-12T12:00:00Z'), row('2', NOV, '2026-11-11T12:00:00Z')]);
  const b = buildPromoRemeras([row('2', NOV, '2026-11-11T12:00:00Z'), row('1', NOV, '2026-11-12T12:00:00Z')]);
  check('el resultado no depende del orden de entrada', JSON.stringify(a) === JSON.stringify(b));
}

console.log('buildPromoRemeras: exclusión y entradas raras');
{
  const rows = [row('admin', NOV, '2026-11-11T12:00:00Z', { owner_email: ' Admin@Snappy.COM ' }), row('real', NOV, '2026-11-12T12:00:00Z')];
  const out = buildPromoRemeras(rows, { excludeEmails: ['admin@snappy.com'] });
  check('excluye correos (sin distinguir mayúsculas ni espacios)', out.length === 1 && out[0].id === 'real' && out[0].puesto === 1);
  check('sin exclusiones entran todos', buildPromoRemeras(rows).length === 2);
  check('null, undefined y no array: []', buildPromoRemeras(null).length === 0 && buildPromoRemeras(undefined).length === 0 && buildPromoRemeras({}).length === 0);
  check('filas null o sin fecha se ignoran', buildPromoRemeras([null, { id: 'x' }, row('ok', NOV, null)]).map((o) => o.id).join(',') === 'ok');
  check('first_paid_at inválido cuenta como sin pago', buildPromoRemeras([row('m', NOV, 'basura')])[0].first_paid_at === null);
  const entrada = [row('b', NOV, '2026-11-12T12:00:00Z'), row('a', NOV, '2026-11-11T12:00:00Z')];
  const copia = JSON.stringify(entrada);
  buildPromoRemeras(entrada);
  check('no modifica la entrada', JSON.stringify(entrada) === copia);
}

console.log('cuentas de prueba (PROMO_EXCLUDED_EMAILS)');
{
  check('la constante tiene las dos cuentas de prueba, en minúsculas',
    PROMO_EXCLUDED_EMAILS.length === 2 && PROMO_EXCLUDED_EMAILS.includes('tamalu026@gmail.com') && PROMO_EXCLUDED_EMAILS.includes('luchiimee@gmail.com')
    && PROMO_EXCLUDED_EMAILS.every((e) => e === e.toLowerCase().trim()));
  const rows = [
    row('t1', NOV, '2026-11-11T09:00:00Z', { owner_email: 'tamalu026@gmail.com' }),
    row('t2', NOV, '2026-11-11T10:00:00Z', { owner_email: '  LuchiImee@Gmail.COM ' }),
    row('real1', NOV, '2026-11-12T12:00:00Z'),
    row('real2', NOV, '2026-11-13T12:00:00Z'),
  ];
  const out = buildPromoRemeras(rows);
  check('las cuentas de prueba no aparecen (sin pasar excludeEmails)', out.map((o) => o.id).join(',') === 'real1,real2');
  check('no ocupan puesto: el primero real es el puesto 1', out[0].puesto === 1 && out[1].puesto === 2);
  const r = buildPromoRemerasResponse(rows);
  check('no cuentan en registrados, con pago ni en plazo', r.total === 2 && r.con_pago === 2 && r.en_plazo === 2);
  const conAdmin = buildPromoRemeras([...rows, row('adm', NOV, '2026-11-10T00:00:00Z', { owner_email: 'admin@snappy.com' })], { excludeEmails: ['admin@snappy.com'] });
  check('conviven con la exclusión de admin que pasa quien llama', conAdmin.map((o) => o.id).join(',') === 'real1,real2');
  const parecidos = buildPromoRemeras([
    row('p1', NOV, '2026-11-11T09:00:00Z', { owner_email: 'tamalu0266@gmail.com' }),
    row('p2', NOV, '2026-11-11T10:00:00Z', { owner_email: 'luchiimee2@gmail.com' }),
    row('p3', NOV, '2026-11-11T11:00:00Z', { owner_email: 'xtamalu026@gmail.com' }),
    row('p4', NOV, '2026-11-11T12:00:00Z', { owner_email: 'tamalu026@gmail.com.ar' }),
    row('p5', NOV, '2026-11-11T13:00:00Z', { owner_email: 'luchiimee@gmail.co' }),
  ]);
  check('un correo parecido NO se excluye', parecidos.length === 5 && parecidos.map((o) => o.puesto).join(',') === '1,2,3,4,5');
}

console.log('buildPromoRemerasResponse');
{
  const r = buildPromoRemerasResponse([row('a', NOV, '2026-11-12T12:00:00Z'), row('b', NOV, null), row('c', NOV, '2026-12-17T12:00:00Z')]);
  check('cupos, ventana y plazo en ISO', r.cupos === 10 && r.registro_desde === '2026-11-01T03:00:00.000Z' && r.registro_hasta_exclusivo === '2026-12-01T03:00:00.000Z' && r.plazo_pago === '2026-12-16T02:59:59.999Z');
  check('total 3, con pago 2, en plazo 1', r.total === 3 && r.con_pago === 2 && r.en_plazo === 1);
  check('lista en orden: a, c, b', r.locales.map((l) => l.id).join(',') === 'a,c,b');
  check('respuesta vacía válida', buildPromoRemerasResponse([]).total === 0 && buildPromoRemerasResponse(null).locales.length === 0);
}

if (failures > 0) {
  console.log(`\n${failures} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\ntodo ok');
