// Verificación de lib/deliveryQuote.ts (cotización de envío firmada). Sin red.
//
//   node scripts/check-delivery-quote.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { signQuote, verifyQuote, quoteMatches, normalizeQuoteAddress, QUOTE_TTL_MS } from '../lib/deliveryQuote.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const SECRET = 'secreto-de-prueba-NO-DEBE-APARECER';
const NOW = Date.UTC(2026, 10, 4, 15, 0, 0);
const RID = 'e6904df6-2ea2-4c53-a57a-feef6243fc00';
const base = { restaurantId: RID, address: '  Calle 16   1145, Mercedes ', lat: -34.652182, lng: -59.442417, distanceM: 490, zonePosition: 1, cost: 3500 };

// Rearma un token con el payload cambiado y la firma vieja
const tamper = (token, change) => {
  const [body, sig] = token.split('.');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  change(payload);
  return `${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}.${sig}`;
};

console.log('firma');
const { token, payload } = signQuote(base, SECRET, NOW);
{
  const v = verifyQuote(token, SECRET, NOW);
  check('firma válida → ok con el payload', v.ok && v.payload.cost === 3500 && v.payload.zonePosition === 1 && v.payload.distanceM === 490);
  check('dirección normalizada (minúsculas, sin espacios de más)', payload.address === 'calle 16 1145, mercedes' && v.payload.address === payload.address);
  check('vence a los 15 minutos', payload.exp === NOW + 15 * 60 * 1000 && QUOTE_TTL_MS === 900000);
  check('el token no lleva el secreto', !token.includes(SECRET) && !Buffer.from(token.split('.')[0], 'base64url').toString().includes(SECRET));
}

console.log('payload alterado (cualquier campo) → firma_invalida');
for (const [campo, change] of [
  ['restaurantId', (p) => { p.restaurantId = 'otro-restaurante'; }],
  ['address', (p) => { p.address = 'calle 16 1146, mercedes'; }],
  ['lat', (p) => { p.lat += 0.001; }],
  ['lng', (p) => { p.lng += 0.001; }],
  ['distanceM', (p) => { p.distanceM = 100; }],
  ['zonePosition', (p) => { p.zonePosition = 1; p.cost = 0; }],
  ['cost', (p) => { p.cost = 1; }],
  ['exp', (p) => { p.exp += 60 * 60 * 1000; }],
]) {
  const r = verifyQuote(tamper(token, change), SECRET, NOW);
  check(`${campo} cambiado`, !r.ok && r.reason === 'firma_invalida');
}

console.log('firma y secreto');
{
  const [body, sig] = token.split('.');
  const otherSig = sig.slice(0, -2) + (sig.endsWith('AA') ? 'BB' : 'AA');
  check('firma alterada → firma_invalida', verifyQuote(`${body}.${otherSig}`, SECRET, NOW).reason === 'firma_invalida');
  check('firma recortada → firma_invalida', verifyQuote(`${body}.${sig.slice(0, 10)}`, SECRET, NOW).reason === 'firma_invalida');
  check('secreto distinto → firma_invalida', verifyQuote(token, 'otro-secreto', NOW).reason === 'firma_invalida');
  check('secreto vacío al verificar → firma_invalida', verifyQuote(token, '', NOW).reason === 'firma_invalida');
  let threw = false; let msg = '';
  try { signQuote(base, '', NOW); } catch (e) { threw = true; msg = String(e.message); }
  check('firmar sin secreto lanza un error sin datos sensibles', threw && !msg.includes(SECRET));
  const r = verifyQuote(token, 'otro-secreto', NOW);
  check('el resultado nunca lleva el secreto', !JSON.stringify(r).includes(SECRET));
}

console.log('vencimiento (borde exacto)');
check('1 ms antes de exp → ok', verifyQuote(token, SECRET, payload.exp - 1).ok === true);
check('justo en exp → vencida', verifyQuote(token, SECRET, payload.exp).reason === 'vencida');
check('después → vencida', verifyQuote(token, SECRET, payload.exp + 1).reason === 'vencida');

console.log('otro restaurante / otra dirección');
check('mismo restaurante y dirección (con otro formato) → coincide',
  quoteMatches(payload, { restaurantId: RID.toUpperCase(), address: 'CALLE 16 1145,   Mercedes' }));
check('de otro restaurante → no coincide', !quoteMatches(payload, { restaurantId: '11111111-1111-4111-8111-111111111111', address: base.address }));
check('otra dirección → no coincide', !quoteMatches(payload, { restaurantId: RID, address: 'calle 16 1146, Mercedes' }));
check('normalizeQuoteAddress', normalizeQuoteAddress('  A\t B \n C ') === 'a b c');

console.log('token mal formado');
for (const [nombre, t] of [
  ['vacío', ''], ['null', null], ['número', 123], ['sin punto', 'abc'], ['tres partes', 'a.b.c'],
  ['caracteres no base64url', 'ab+c.de/f'], ['demasiado largo', 'a'.repeat(3000) + '.b'],
]) {
  check(`${nombre} → formato_invalido`, verifyQuote(t, SECRET, NOW).reason === 'formato_invalido');
}
{
  // Bien firmado pero con un payload que no es una cotización
  const body = Buffer.from(JSON.stringify({ hola: 1 })).toString('base64url');
  const { createHmac } = await import('node:crypto');
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
  check('firmado pero sin los campos de una cotización → formato_invalido', verifyQuote(`${body}.${sig}`, SECRET, NOW).reason === 'formato_invalido');
}

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
