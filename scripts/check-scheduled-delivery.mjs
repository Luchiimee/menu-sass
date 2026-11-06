// Verificación de lib/scheduledDelivery.ts (regla de plan de "Turnos de entrega"). Sin red.
//
//   node scripts/check-scheduled-delivery.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { canUseScheduledDelivery, isScheduledDeliveryActive } from '../lib/scheduledDelivery.ts';

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

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
