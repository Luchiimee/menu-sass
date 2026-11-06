// Verificación de lib/scheduledDelivery.ts (regla de plan de "Turnos de entrega"). Sin red.
//
//   node scripts/check-scheduled-delivery.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { canUseScheduledDelivery, isScheduledDeliveryActive, normalizeDeliveryConfig } from '../lib/scheduledDelivery.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

console.log('acceso por plan');
check('light sin admin → no', canUseScheduledDelivery('light', false) === false);
check('light con admin → sí', canUseScheduledDelivery('light', true) === true);
check('go → sí', canUseScheduledDelivery('go', false) === true);
check('plus → sí', canUseScheduledDelivery('plus', false) === true);
check('mayúsculas y espacios: " Light " sin admin → no', canUseScheduledDelivery(' Light ', false) === false);
check('plan null / undefined → sí (igual que antes: solo light se bloquea)', canUseScheduledDelivery(null, false) === true && canUseScheduledDelivery(undefined, undefined) === true);

console.log('flag efectivo');
check('light con interruptor activo en la base → inactivo', isScheduledDeliveryActive(true, 'light', false) === false);
check('light admin con interruptor activo → activo', isScheduledDeliveryActive(true, 'light', true) === true);
check('go con interruptor activo → activo', isScheduledDeliveryActive(true, 'go', false) === true);
check('go con interruptor apagado → inactivo', isScheduledDeliveryActive(false, 'go', false) === false);
check('interruptor null/undefined → inactivo', isScheduledDeliveryActive(null, 'plus', false) === false && isScheduledDeliveryActive(undefined, 'plus', false) === false);

console.log('configuración de turnos (intervalo y aviso)');
const cfg = (c) => JSON.stringify(normalizeDeliveryConfig(c));
const is = (c, i, b) => { const n = normalizeDeliveryConfig(c); return n.intervalMinutes === i && n.bufferMinutes === b; };
check('caso real {"buffer":15,"interval":30,"buffer_minutes":30} → intervalo 30, aviso 30', is({ buffer: 15, interval: 30, buffer_minutes: 30 }, 30, 30), cfg({ buffer: 15, interval: 30, buffer_minutes: 30 }));
check('solo claves nuevas', is({ interval_minutes: 15, buffer_minutes: 60 }, 15, 60));
check('solo claves viejas', is({ interval: 60, buffer: 0 }, 60, 0));
check('la clave nueva gana sobre la vieja', is({ interval_minutes: 15, interval: 60, buffer_minutes: 0, buffer: 30 }, 15, 0));
check('config null / undefined / {} → 30 y 15', is(null, 30, 15) && is(undefined, 30, 15) && is({}, 30, 15));
check('no es un objeto (string, número, array) → 30 y 15', is('x', 30, 15) && is(7, 30, 15) && is([], 30, 15));
check('aviso 0 ("Sin tiempo de espera") es válido', is({ interval_minutes: 30, buffer_minutes: 0 }, 30, 0));
check('intervalo 0 o negativo → 30', is({ interval_minutes: 0 }, 30, 15) && is({ interval_minutes: -15 }, 30, 15));
check('aviso negativo → 15', is({ buffer_minutes: -5 }, 30, 15));
check('fuera de las opciones del panel (45, 20) → default', is({ interval_minutes: 45, buffer_minutes: 20 }, 30, 15));
check('no numéricos (texto, NaN, Infinity, null, objeto) → default', is({ interval_minutes: 'abc', buffer_minutes: NaN }, 30, 15) && is({ interval_minutes: Infinity, buffer_minutes: {} }, 30, 15) && is({ interval_minutes: null, buffer_minutes: null }, 30, 15));
check('números como texto ("15", " 60 ") se aceptan', is({ interval_minutes: '15', buffer_minutes: ' 60 ' }, 15, 60));
check('una clave nueva inválida no se rescata con la vieja: va al default', is({ interval_minutes: 45, interval: 60 }, 30, 15));

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
