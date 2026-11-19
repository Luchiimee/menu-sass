// Qué tarjeta se muestra en "Mi plan" (lib/cardDisplay.ts). Sin red.
//   node scripts/check-card-display.mjs   (Node >= 22.18 / 24: importa .ts directo)
import { pickShownCard, cardBrandName } from '../lib/cardDisplay.ts';

let failures = 0;
const check = (name, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) failures++; };
const listed = { brand: 'visa', last4: '4242', expMonth: 3, expYear: 2029 };

console.log('pickShownCard');
{
  let c = pickShownCard({ last4: '9980', brand: 'debvisa' }, null);
  check('reactivó con suscripción: listado vacío → se muestra la guardada', c?.last4 === '9980' && c.brand === 'debvisa' && c.expMonth === 0);
  c = pickShownCard({ last4: '9980', brand: '' }, listed);
  check('el listado trae una tarjeta VIEJA → manda la guardada, sin el vencimiento de la vieja', c?.last4 === '9980' && c.expMonth === 0 && c.brand === '');
  c = pickShownCard({ last4: '4242', brand: '' }, listed);
  check('el listado trae la misma → suma marca y vencimiento', c?.last4 === '4242' && c.brand === 'visa' && c.expMonth === 3 && c.expYear === 2029);
  c = pickShownCard({ last4: '', brand: '' }, listed);
  check('sin dato guardado → el listado, como antes', c === listed);
  check('sin dato guardado ni listado → null', pickShownCard({}, null) === null && pickShownCard({ last4: null }, null) === null);
  check('últimos 4 inválidos → se ignoran', pickShownCard({ last4: '12' }, null) === null && pickShownCard({ last4: '12345' }, null) === null && pickShownCard({ last4: 4242 }, null) === null);
}
console.log('cardBrandName');
{
  check('marcas conocidas', cardBrandName('debvisa') === 'Visa Débito' && cardBrandName('master') === 'Mastercard' && cardBrandName(' VISA ') === 'Visa');
  check('desconocida, vacía o nula → Tarjeta', cardBrandName('xyz') === 'Tarjeta' && cardBrandName('') === 'Tarjeta' && cardBrandName(null) === 'Tarjeta');
}
console.log(failures ? `\n${failures} FALLARON` : '\nTodo OK');
process.exit(failures ? 1 : 0);
