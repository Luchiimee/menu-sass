// Verificación de lib/orderPolling.ts: estados finales, intervalo, backoff y generación del id. Sin red.
//
//   node scripts/check-order-polling.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  POLL_INTERVAL_MS, MAX_BACKOFF_MS, NOT_FOUND_STOP_AFTER, INITIAL_POLL_STATE,
  isFinalStatus, backoffDelay, nextPoll, newOrderId,
} from '../lib/orderPolling.ts';
import { isValidOrderId } from '../lib/publicOrder.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

console.log('constantes');
check('intervalo de 8 segundos', POLL_INTERVAL_MS === 8000);
check('backoff con tope de 30 segundos', MAX_BACKOFF_MS === 30000);

console.log('isFinalStatus');
for (const s of ['entregado', 'completado', 'cancelado']) {
  check(`delivery: ${s} es final`, isFinalStatus(s, 'delivery'));
  check(`retiro: ${s} es final`, isFinalStatus(s, 'retiro'));
}
check('mesa: completado es final', isFinalStatus('completado', 'mesa'));
check('mesa: cancelado es final', isFinalStatus('cancelado', 'mesa'));
check('mesa: entregado NO es final (falta pagar)', !isFinalStatus('entregado', 'mesa'));
for (const s of ['pendiente', 'recibido', 'en_proceso', 'en_camino']) {
  check(`${s} no es final (delivery ni mesa)`, !isFinalStatus(s, 'delivery') && !isFinalStatus(s, 'mesa'));
}
check('order_type desconocido o null: reglas de delivery', isFinalStatus('entregado', null) && isFinalStatus('entregado', undefined));
check('status null / número / vacío: no es final', !isFinalStatus(null, 'delivery') && !isFinalStatus(5, 'delivery') && !isFinalStatus('', 'delivery'));

console.log('backoffDelay');
check('0 errores → 8 s', backoffDelay(0) === 8000);
check('1 error → 16 s', backoffDelay(1) === 16000);
check('2 errores → 30 s (tope)', backoffDelay(2) === 30000);
check('10 errores → 30 s', backoffDelay(10) === 30000);
check('nunca pasa de 30 s', [0, 1, 2, 3, 5, 20, 1000].every((n) => backoffDelay(n) <= 30000));
check('negativo y NaN → 8 s', backoffDelay(-1) === 8000 && backoffDelay(NaN) === 8000);
check('Infinity (no es un conteo válido) → 8 s', backoffDelay(Infinity) === 8000);

console.log('nextPoll');
{
  const ok = nextPoll(INITIAL_POLL_STATE, { kind: 'ok', status: 'pendiente', orderType: 'delivery' });
  check('ok y no final: sigue, espera 8 s', !ok.stop && ok.delayMs === 8000);
  const fin = nextPoll(INITIAL_POLL_STATE, { kind: 'ok', status: 'entregado', orderType: 'delivery' });
  check('ok y final: corta', fin.stop);
  const mesaEnt = nextPoll(INITIAL_POLL_STATE, { kind: 'ok', status: 'entregado', orderType: 'mesa' });
  check('mesa entregado: sigue', !mesaEnt.stop);
  const mesaFin = nextPoll(INITIAL_POLL_STATE, { kind: 'ok', status: 'completado', orderType: 'mesa' });
  check('mesa completado: corta', mesaFin.stop);

  const e1 = nextPoll(INITIAL_POLL_STATE, { kind: 'error' });
  check('1er error: sigue, 16 s', !e1.stop && e1.delayMs === 16000 && e1.state.failures === 1);
  const e2 = nextPoll(e1.state, { kind: 'error' });
  check('2do error: sigue, 30 s', !e2.stop && e2.delayMs === 30000);
  const e3 = nextPoll(e2.state, { kind: 'error' });
  check('3er error: sigue, sigue en 30 s', !e3.stop && e3.delayMs === 30000);
  const e50 = Array.from({ length: 50 }).reduce((st) => nextPoll(st, { kind: 'error' }).state, INITIAL_POLL_STATE);
  check('los errores de red nunca cortan la consulta', !nextPoll(e50, { kind: 'error' }).stop);
  const back = nextPoll(e3.state, { kind: 'ok', status: 'pendiente', orderType: 'delivery' });
  check('tras un error, un ok vuelve a 8 s y limpia los contadores', back.delayMs === 8000 && back.state.failures === 0 && back.state.notFound === 0);

  let st = INITIAL_POLL_STATE;
  let d;
  for (let i = 1; i <= NOT_FOUND_STOP_AFTER; i++) {
    d = nextPoll(st, { kind: 'not_found' });
    st = d.state;
    if (i < NOT_FOUND_STOP_AFTER) check(`404 número ${i}: todavía no corta`, !d.stop);
  }
  check(`${NOT_FOUND_STOP_AFTER} 404 seguidos: corta`, d.stop);
  const nfThenOk = nextPoll(nextPoll(INITIAL_POLL_STATE, { kind: 'not_found' }).state, { kind: 'ok', status: 'pendiente', orderType: 'x' });
  check('un ok entre 404 reinicia la cuenta', nfThenOk.state.notFound === 0);
  const nfMix = nextPoll(nextPoll(nextPoll(INITIAL_POLL_STATE, { kind: 'not_found' }).state, { kind: 'error' }).state, { kind: 'not_found' });
  check('un error de red entre dos 404 no reinicia la cuenta', nfMix.state.notFound === 2 && !nfMix.stop);
  check('el estado no se muta', INITIAL_POLL_STATE.failures === 0 && INITIAL_POLL_STATE.notFound === 0);
}

console.log('newOrderId');
{
  const a = newOrderId();
  check('devuelve un UUID v4 válido para el endpoint', isValidOrderId(a));
  check('dos ids distintos', newOrderId() !== a);

  const viaRandomUUID = newOrderId({ randomUUID: () => '3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f' });
  check('usa crypto.randomUUID si existe', viaRandomUUID === '3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f');

  const fake = { getRandomValues: (arr) => { arr.fill(0xff); return arr; } };
  const f = newOrderId(fake);
  check('sin randomUUID arma un v4 válido (bytes en 0xff)', isValidOrderId(f));
  const zero = newOrderId({ getRandomValues: (arr) => { arr.fill(0); return arr; } });
  check('sin randomUUID arma un v4 válido (bytes en 0)', isValidOrderId(zero) && zero === '00000000-0000-4000-8000-000000000000');
  let threw = false;
  try { newOrderId({}); } catch { threw = true; }
  check('sin ningún generador seguro tira (no inventa un id predecible)', threw);
  for (let i = 0; i < 200; i++) if (!isValidOrderId(newOrderId({ getRandomValues: (arr) => { for (let j = 0; j < arr.length; j++) arr[j] = Math.floor(Math.random() * 256); return arr; } }))) { check('200 ids armados a mano válidos', false); break; }
  check('200 ids armados a mano válidos', true);
}

console.log(failures === 0 ? '\nTodo ok' : `\n${failures} fallas`);
process.exit(failures === 0 ? 0 : 1);
