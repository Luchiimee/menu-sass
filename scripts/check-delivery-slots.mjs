// Verificación de lib/deliverySlots.ts (turnos de entrega programada): hora Argentina, franjas hasta
// 00:00, franjas que cruzan la medianoche, tramo del día anterior y huso del navegador. Sin red.
//
//   node scripts/check-delivery-slots.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { generateSlots, argentinaClock } from '../lib/deliverySlots.ts';

let failures = 0;
function check(name, cond, extra) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${cond || extra === undefined ? '' : ' → ' + JSON.stringify(extra)}`);
  if (!cond) failures++;
}
const labels = (slots) => slots.map((s) => s.label);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Instantes (UTC) = hora Argentina + 3 h. Jueves 5/11/2026 es jueves.
const JUE_2132 = new Date('2026-11-06T00:32:00Z');   // jueves 21:32 ART
const VIE_0010 = new Date('2026-11-06T03:10:00Z');   // viernes 00:10 ART
const JUE_1000 = new Date('2026-11-05T13:00:00Z');   // jueves 10:00 ART

const agenda = (jueves, viernes) => ({ jueves, viernes });

console.log('hora y día en Argentina');
{
  const c = argentinaClock(JUE_2132);
  check('jueves 21:32', c.dayIndex === 4 && Math.round(c.minutes) === 21 * 60 + 32, c);
  const v = argentinaClock(VIE_0010);
  check('viernes 00:10 (aunque en UTC ya sea 03:10)', v.dayIndex === 5 && Math.round(v.minutes) === 10, v);
}

console.log('jueves 21:32, intervalo 15, aviso 30');
{
  const r = generateSlots(JUE_2132, agenda([{ from: '20:30', to: '00:00' }]), 15, 30);
  check('20:30-00:00 → 22:15 … 23:45, sin turnos "día siguiente"', same(labels(r), ['22:15','22:30','22:45','23:00','23:15','23:30','23:45']), labels(r));
}
{
  const r = generateSlots(JUE_2132, agenda([{ from: '20:30', to: '23:59' }]), 15, 30);
  check('20:30-23:59 → 22:15 … 23:45', same(labels(r), ['22:15','22:30','22:45','23:00','23:15','23:30','23:45']), labels(r));
}
{
  const r = generateSlots(JUE_2132, agenda([{ from: '22:00', to: '02:00' }]), 15, 30);
  const l = labels(r);
  check('22:00-02:00 cruza la medianoche: empieza 22:15 y termina 01:45 (día siguiente)', l[0] === '22:15' && l[l.length - 1] === '01:45 (día siguiente)', l);
  check('pasada la medianoche con hora real y sufijo', l.includes('00:00 (día siguiente)') && l.includes('00:15 (día siguiente)') && r.find((s) => s.time === '00:15')?.nextDay === true);
  check('antes de la medianoche sin sufijo', l.includes('23:45') && r.find((s) => s.time === '23:45')?.nextDay === false);
  check('cantidad: 22:15..23:45 (7) + 00:00..01:45 (8) = 15', l.length === 15, l.length);
}

console.log('aviso mínimo y bordes');
{
  const r = generateSlots(JUE_2132, agenda([{ from: '20:30', to: '00:00' }]), 15, 30);
  check('22:00 no sale (21:32 + 30 = 22:02)', !labels(r).includes('22:00'));
  const r2 = generateSlots(new Date('2026-11-06T00:30:00Z'), agenda([{ from: '20:30', to: '00:00' }]), 15, 30); // 21:30 + 30 = 22:00
  check('un turno justo en ahora + aviso no se ofrece (es estricto)', !labels(r2).includes('22:00') && labels(r2)[0] === '22:15', labels(r2));
  const r3 = generateSlots(JUE_2132, agenda([{ from: '20:30', to: '00:00' }]), 15, 0);
  check('sin aviso: primer turno 21:45', labels(r3)[0] === '21:45', labels(r3));
  const r4 = generateSlots(JUE_1000, agenda([{ from: '20:30', to: '00:00' }]), 60, 15);
  check('intervalo de 1 hora desde 20:30: 20:30, 21:30, 22:30, 23:30', same(labels(r4), ['20:30','21:30','22:30','23:30']), labels(r4));
}

console.log('00:10 con franja del día anterior');
{
  const r = generateSlots(VIE_0010, agenda([{ from: '22:00', to: '02:00' }], []), 15, 30);
  const l = labels(r);
  check('00:10 del viernes ofrece el tramo del jueves: 00:45 … 01:45, sin sufijo (ya es hoy)', same(l, ['00:45','01:00','01:15','01:30','01:45']), l);
  check('esos turnos no son "día siguiente"', r.every((s) => s.nextDay === false));
}
{
  const r = generateSlots(VIE_0010, agenda([{ from: '20:30', to: '00:00' }], []), 15, 30);
  check('franja de ayer que termina a las 00:00 no deja nada para hoy', r.length === 0, labels(r));
}
{
  const r = generateSlots(VIE_0010, agenda([{ from: '22:00', to: '02:00' }], [{ from: '00:30', to: '03:00' }]), 15, 30);
  const l = labels(r);
  check('tramo de ayer + franja de hoy: sin duplicados y en orden', same(l, ['00:45','01:00','01:15','01:30','01:45','02:00','02:15','02:30','02:45']), l);
}

console.log('franja vacía y datos raros');
check('sin franjas ese día → vacío', generateSlots(JUE_2132, agenda([], []), 15, 30).length === 0);
check('agenda null/undefined → vacío', generateSlots(JUE_2132, null, 15, 30).length === 0 && generateSlots(JUE_2132, undefined, 15, 30).length === 0);
check('día sin clave → vacío', generateSlots(JUE_2132, { lunes: [{ from: '20:30', to: '00:00' }] }, 15, 30).length === 0);
check('horas inválidas se ignoran', generateSlots(JUE_2132, agenda([{ from: 'xx', to: '00:00' }, { from: '23:00', to: '' }], []), 15, 30).length === 0);
{
  const r = generateSlots(new Date('2026-11-06T02:50:00Z'), agenda([{ from: '20:30', to: '00:00' }]), 15, 30); // 23:50 ART
  check('a las 23:50 con franja hasta 00:00: ya no quedan turnos', r.length === 0, labels(r));
}
{
  const r = generateSlots(JUE_2132, agenda([{ from: '20:30', to: '00:00' }]), 0, 30);
  check('intervalo 0 o inválido no cuelga: usa 30', labels(r)[0] === '22:30', labels(r));
}

console.log('huso del navegador distinto: mismo instante, mismos turnos');
{
  const expected = ['22:15','22:30','22:45','23:00','23:15','23:30','23:45'];
  const original = process.env.TZ;
  const results = {};
  for (const tz of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'America/Argentina/Buenos_Aires']) {
    process.env.TZ = tz;
    results[tz] = labels(generateSlots(JUE_2132, agenda([{ from: '20:30', to: '00:00' }], []), 15, 30));
  }
  if (original === undefined) delete process.env.TZ; else process.env.TZ = original;
  for (const tz of Object.keys(results)) check(`TZ=${tz}`, same(results[tz], expected), results[tz]);
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
