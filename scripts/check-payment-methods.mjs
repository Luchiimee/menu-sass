// Verificación de lib/paymentMethods.ts: la regla "no quedar sin medios de pago" de la
// pantalla Pagos y la preselección del checkout. Sin red ni base.
//
//   node scripts/check-payment-methods.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  activeMethodsCount, canTurnOff, methodsAfterMpDisconnect, availableCount, pickPaymentMethod,
  LAST_METHOD_MESSAGE, MP_DISABLED_MESSAGE, NO_METHODS_MESSAGE,
} from '../lib/paymentMethods.ts';

let failures = 0;
let total = 0;
function check(name, cond, extra = '') {
  total++;
  if (cond) console.log(`  ok   ${name}`);
  else { failures++; console.log(`  FAIL ${name} ${extra}`); }
}
const S = (efectivo, transferencia, mpEnabled, mpConnected) => ({ efectivo, transferencia, mpEnabled, mpConnected });

console.log('activeMethodsCount (MP cuenta solo conectado Y con el interruptor)');
check('los tres activos = 3', activeMethodsCount(S(true, true, true, true)) === 3);
check('MP encendido pero desconectado no cuenta', activeMethodsCount(S(false, false, true, false)) === 0);
check('MP conectado pero apagado no cuenta', activeMethodsCount(S(false, false, false, true)) === 0);
check('solo MP conectado y encendido = 1', activeMethodsCount(S(false, false, true, true)) === 1);
check('efectivo + transferencia = 2', activeMethodsCount(S(true, true, false, false)) === 2);

console.log('canTurnOff (no dejar apagar el último medio activo)');
check('con los tres, se puede apagar cualquiera',
  canTurnOff(S(true, true, true, true), 'efectivo') && canTurnOff(S(true, true, true, true), 'transferencia') && canTurnOff(S(true, true, true, true), 'mercadopago'));
check('efectivo es el único activo → no se apaga', !canTurnOff(S(true, false, false, false), 'efectivo'));
check('transferencia es la única activa → no se apaga', !canTurnOff(S(false, true, false, true), 'transferencia'));
check('MP es el único activo → no se apaga', !canTurnOff(S(false, false, true, true), 'mercadopago'));
check('MP encendido pero DESCONECTADO no sostiene: efectivo no se apaga', !canTurnOff(S(true, false, true, false), 'efectivo'));
check('MP conectado y encendido sostiene: se puede apagar efectivo', canTurnOff(S(true, false, true, true), 'efectivo'));
check('con dos activos se puede apagar uno', canTurnOff(S(true, true, false, false), 'efectivo'));
check('apagar el interruptor de MP con efectivo activo se permite', canTurnOff(S(true, false, true, true), 'mercadopago'));
check('apagar MP sin otro medio activo no se permite', !canTurnOff(S(false, false, true, true), 'mercadopago'));

console.log('desconectar MP');
check('desconectar con efectivo activo deja 1', methodsAfterMpDisconnect(S(true, false, true, true)) === 1);
check('desconectar siendo el único medio deja 0 (se avisa, no se bloquea)', methodsAfterMpDisconnect(S(false, false, true, true)) === 0);

console.log('pickPaymentMethod (preselección del checkout)');
const A = (efectivo, transferencia, mercadopago) => ({ efectivo, transferencia, mercadopago });
check('se mantiene el elegido si sigue disponible', pickPaymentMethod('transferencia', A(true, true, true)) === 'transferencia');
check('uno solo (efectivo) → preseleccionado', pickPaymentMethod('transferencia', A(true, false, false)) === 'efectivo');
check('uno solo (transferencia) → preseleccionado', pickPaymentMethod('efectivo', A(false, true, false)) === 'transferencia');
check('uno solo (MP) → preseleccionado', pickPaymentMethod('efectivo', A(false, false, true)) === 'mercadopago');
check('el elegido dejó de estar disponible → el primero disponible', pickPaymentMethod('mercadopago', A(false, true, false)) === 'transferencia');
check('el elegido sigue disponible aunque haya otro antes en el orden', pickPaymentMethod('mercadopago', A(false, true, true)) === 'mercadopago');
check('MP elegido y se oculta → vuelve a efectivo', pickPaymentMethod('mercadopago', A(true, true, false)) === 'efectivo');
check('ninguno disponible → null', pickPaymentMethod('efectivo', A(false, false, false)) === null);
check('valor desconocido → el primero disponible', pickPaymentMethod('cripto', A(false, true, true)) === 'transferencia');
check('availableCount', availableCount(A(true, false, true)) === 2 && availableCount(A(false, false, false)) === 0);

console.log('mensajes');
check('textos pedidos',
  MP_DISABLED_MESSAGE === 'Mercado Pago desactivado. Activá efectivo o transferencia para seguir recibiendo pedidos'
  && NO_METHODS_MESSAGE === 'Este local no está recibiendo pedidos por ahora'
  && /al menos un medio/.test(LAST_METHOD_MESSAGE));

if (failures > 0) {
  console.log(`\n${failures} de ${total} casos FALLARON`);
  process.exit(1);
}
console.log(`\nTodos los casos OK (${total})`);
