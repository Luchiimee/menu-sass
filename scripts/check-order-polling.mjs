// Verificación de lib/orderPolling.ts: estados finales, intervalo, backoff y generación del id. Sin red.
//
//   node scripts/check-order-polling.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  POLL_INTERVAL_MS, MAX_BACKOFF_MS, NOT_FOUND_STOP_AFTER, INITIAL_POLL_STATE,
  pickOrderAttempt, isDuplicateOrderIdError, FINAL_GRACE_MS, CLEAR_AFTER_FINAL_MS, shouldClearOrder, isAwaitingPayment, MIN_RESUME_GAP_MS, isTabHidden, shouldResumeOnVisible, isFinalStatus, shouldStopPolling, backoffDelay, nextPoll, newOrderId,
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

console.log('shouldStopPolling: estado final Y pago resuelto');
{
  const T0 = 1_000_000;
  const MIN = 60_000;
  const o = (over) => ({ status: 'entregado', orderType: 'delivery', paymentMethod: 'transferencia', pagoConfirmado: false, ...over });
  check('tope de 30 minutos', FINAL_GRACE_MS === 30 * MIN);
  check('final con pago confirmado: corta', shouldStopPolling(o({ pagoConfirmado: true }), T0, T0));
  check('final con Mercado Pago confirmado: corta', shouldStopPolling(o({ paymentMethod: 'mercadopago', pagoConfirmado: true }), T0, T0));
  check('final con transferencia sin confirmar: sigue', !shouldStopPolling(o(), T0, T0));
  check('transferencia sin confirmar a los 29 min: sigue', !shouldStopPolling(o(), T0, T0 + 29 * MIN));
  check('transferencia sin confirmar a los 5 min: sigue', !shouldStopPolling(o(), T0, T0 + 5 * MIN));
  check('Mercado Pago sin confirmar: sigue', !shouldStopPolling(o({ paymentMethod: 'mercadopago' }), T0, T0));
  check('efectivo final: corta', shouldStopPolling(o({ paymentMethod: 'efectivo' }), T0, T0));
  check('medio de pago desconocido o null: corta', shouldStopPolling(o({ paymentMethod: 'otro' }), T0, T0) && shouldStopPolling(o({ paymentMethod: null }), T0, T0));
  check('tope de 30 minutos: corta aunque falte confirmar', shouldStopPolling(o(), T0, T0 + 30 * MIN));
  check('pasado el tope: corta', shouldStopPolling(o(), T0, T0 + 31 * MIN));
  check('sin momento de estado final y sin confirmar: sigue', !shouldStopPolling(o(), null, T0 + 999 * MIN));
  for (const s of ['pendiente', 'recibido', 'en_proceso', 'en_camino']) {
    check("no final (" + s + ") con efectivo: sigue", !shouldStopPolling(o({ status: s, paymentMethod: 'efectivo' }), null, T0));
    check("no final (" + s + ") con pago confirmado: sigue", !shouldStopPolling(o({ status: s, pagoConfirmado: true }), null, T0));
  }
  check('no final aunque haya pasado el tope: sigue', !shouldStopPolling(o({ status: 'en_camino' }), T0, T0 + 60 * MIN));
  check('completado con transferencia sin confirmar: sigue', !shouldStopPolling(o({ status: 'completado' }), T0, T0));
  check('cancelado con transferencia sin confirmar: corta (no espera pago)', shouldStopPolling(o({ status: 'cancelado' }), T0, T0));
  // mesa: mismo criterio que antes (solo el estado)
  const m = (over) => ({ orderType: 'mesa', paymentMethod: 'transferencia', pagoConfirmado: false, ...over });
  check('mesa completado sin confirmar: corta', shouldStopPolling(m({ status: 'completado' }), T0, T0));
  check('mesa cancelado: corta', shouldStopPolling(m({ status: 'cancelado' }), T0, T0));
  check('mesa entregado: sigue (falta pagar)', !shouldStopPolling(m({ status: 'entregado' }), T0, T0));
  check('mesa en_proceso: sigue', !shouldStopPolling(m({ status: 'en_proceso' }), T0, T0));
  check('campos faltantes: no tira', shouldStopPolling({}, null, T0) === false && shouldStopPolling({ status: 'entregado' }, T0, T0) === true);
}

console.log('nextPoll: momento en que se vio el estado final');
{
  const T0 = 5_000_000;
  const MIN = 60_000;
  const tr = (status) => ({ kind: 'ok', status, orderType: 'delivery', paymentMethod: 'transferencia', pagoConfirmado: false });
  const a = nextPoll(INITIAL_POLL_STATE, tr('en_camino'), T0);
  check('no final: finalSeenAt null y sigue', a.state.finalSeenAt === null && !a.stop);
  const b = nextPoll(a.state, tr('entregado'), T0 + 10 * MIN);
  check('primer estado final: se anota el momento y sigue', b.state.finalSeenAt === T0 + 10 * MIN && !b.stop);
  const c = nextPoll(b.state, tr('entregado'), T0 + 25 * MIN);
  check('a los 15 min de verlo final: conserva el momento original y sigue', c.state.finalSeenAt === T0 + 10 * MIN && !c.stop);
  const d = nextPoll(c.state, tr('entregado'), T0 + 40 * MIN);
  check('a los 30 min de verlo final: corta', d.stop);
  const e = nextPoll(b.state, { ...tr('entregado'), pagoConfirmado: true }, T0 + 12 * MIN);
  check('se confirma el pago estando final: corta', e.stop);
  const err = nextPoll(b.state, { kind: 'error' }, T0 + 11 * MIN);
  check('un error de red no borra el momento del estado final', err.state.finalSeenAt === T0 + 10 * MIN && !err.stop);
  const f = nextPoll(b.state, tr('en_camino'), T0 + 12 * MIN);
  check('si vuelve a no ser final, se borra el momento', f.state.finalSeenAt === null);
  check('efectivo final: corta en la primera respuesta', nextPoll(INITIAL_POLL_STATE, { ...tr('entregado'), paymentMethod: 'efectivo' }, T0).stop);
}

console.log('isAwaitingPayment');
{
  const o = (over) => ({ status: 'entregado', orderType: 'delivery', paymentMethod: 'transferencia', pagoConfirmado: false, ...over });
  check('transferencia sin confirmar: espera', isAwaitingPayment(o()));
  check('Mercado Pago sin confirmar: espera', isAwaitingPayment(o({ paymentMethod: 'mercadopago' })));
  check('retiro con transferencia sin confirmar: espera', isAwaitingPayment(o({ orderType: 'retiro' })));
  check('pago confirmado: no espera', !isAwaitingPayment(o({ pagoConfirmado: true })));
  check('efectivo: no espera', !isAwaitingPayment(o({ paymentMethod: 'efectivo' })));
  check('medio null / desconocido: no espera', !isAwaitingPayment(o({ paymentMethod: null })) && !isAwaitingPayment(o({ paymentMethod: 'otro' })));
  check('cancelado: no espera', !isAwaitingPayment(o({ status: 'cancelado' })));
  check('mesa: no espera', !isAwaitingPayment(o({ orderType: 'mesa' })));
  check('pagoConfirmado null o undefined cuenta como sin confirmar', isAwaitingPayment(o({ pagoConfirmado: null })) && isAwaitingPayment(o({ pagoConfirmado: undefined })));
}

console.log('shouldClearOrder (limpieza del carrito)');
{
  const MIN = 60_000;
  const o = (over) => ({ status: 'entregado', orderType: 'delivery', paymentMethod: 'transferencia', pagoConfirmado: false, ...over });
  check('5 minutos y 30 minutos como constantes', CLEAR_AFTER_FINAL_MS === 5 * MIN && FINAL_GRACE_MS === 30 * MIN);
  check('efectivo final a los 4 min: no limpia', !shouldClearOrder(o({ paymentMethod: 'efectivo' }), 4 * MIN));
  check('efectivo final a los 5 min: limpia', shouldClearOrder(o({ paymentMethod: 'efectivo' }), 5 * MIN));
  check('efectivo final a los 6 min: limpia', shouldClearOrder(o({ paymentMethod: 'efectivo' }), 6 * MIN));
  check('transferencia confirmada a los 5 min: limpia', shouldClearOrder(o({ pagoConfirmado: true }), 5 * MIN));
  check('Mercado Pago confirmado a los 5 min: limpia', shouldClearOrder(o({ paymentMethod: 'mercadopago', pagoConfirmado: true }), 5 * MIN));
  check('transferencia sin confirmar a los 6 min: NO limpia', !shouldClearOrder(o(), 6 * MIN));
  check('transferencia sin confirmar a los 29 min: NO limpia', !shouldClearOrder(o(), 29 * MIN));
  check('transferencia sin confirmar a los 30 min: limpia (tope)', shouldClearOrder(o(), 30 * MIN));
  check('transferencia sin confirmar a las 2 horas: limpia', shouldClearOrder(o(), 120 * MIN));
  check('Mercado Pago sin confirmar a los 10 min: NO limpia', !shouldClearOrder(o({ paymentMethod: 'mercadopago' }), 10 * MIN));
  check('cancelado con transferencia sin confirmar a los 5 min: limpia', shouldClearOrder(o({ status: 'cancelado' }), 5 * MIN));
  check('no final: nunca limpia (ni pasadas 2 horas)', ['pendiente', 'recibido', 'en_proceso', 'en_camino'].every((s) => !shouldClearOrder(o({ status: s, paymentMethod: 'efectivo' }), 120 * MIN)));
  check('completado con efectivo a los 5 min: limpia', shouldClearOrder(o({ status: 'completado', paymentMethod: 'efectivo' }), 5 * MIN));
  // mesa: solo completado / cancelado son finales (entregado = falta pagar)
  const m = (over) => ({ orderType: 'mesa', paymentMethod: 'transferencia', pagoConfirmado: false, ...over });
  check('mesa entregado a las 2 horas: NO limpia (falta pagar)', !shouldClearOrder(m({ status: 'entregado' }), 120 * MIN));
  check('mesa completado a los 4 min: no limpia', !shouldClearOrder(m({ status: 'completado' }), 4 * MIN));
  check('mesa completado a los 5 min: limpia (aunque la transferencia no esté confirmada)', shouldClearOrder(m({ status: 'completado' }), 5 * MIN));
  check('mesa cancelado a los 5 min: limpia', shouldClearOrder(m({ status: 'cancelado' }), 5 * MIN));
  check('updated_at inválido (NaN): no limpia', !shouldClearOrder(o({ paymentMethod: 'efectivo' }), NaN));
  check('tiempo negativo (reloj adelantado): no limpia', !shouldClearOrder(o({ paymentMethod: 'efectivo' }), -1000));
  check('coherente con shouldStopPolling: el mismo pedido sin confirmar no corta la consulta antes del tope',
    !shouldStopPolling(o(), 0, 29 * MIN) && !shouldClearOrder(o(), 29 * MIN));
}

console.log('pestaña oculta');
{
  check('hidden → oculta', isTabHidden('hidden'));
  check('visible → no oculta', !isTabHidden('visible'));
  check('sin dato (SSR / navegador viejo) → no oculta: consulta', !isTabHidden(undefined) && !isTabHidden(null) && !isTabHidden(''));
  check('prerender u otro valor → no oculta', !isTabHidden('prerender'));
  check('mínimo de 2 s entre consultas al volver', MIN_RESUME_GAP_MS === 2000);
  check('nunca consultó: retoma', shouldResumeOnVisible(null, 1000));
  check('consultó hace 500 ms: no repite', !shouldResumeOnVisible(10_000, 10_500));
  check('consultó hace 1999 ms: no repite', !shouldResumeOnVisible(10_000, 11_999));
  check('consultó hace 2 s: retoma', shouldResumeOnVisible(10_000, 12_000));
  check('consultó hace 5 min: retoma', shouldResumeOnVisible(10_000, 10_000 + 5 * 60_000));
}

console.log('pickOrderAttempt: id por intento de envío');
{
  let n = 0;
  const make = () => 'id-' + (++n);
  const a = pickOrderAttempt(null, 'A', make);
  check('primer intento: id nuevo', a.id === 'id-1' && a.sig === 'A');
  const b = pickOrderAttempt(a, 'A', make);
  check('reintento con el mismo contenido: MISMO id', b.id === 'id-1' && n === 1);
  const c = pickOrderAttempt(b, 'B', make);
  check('contenido distinto: id nuevo', c.id === 'id-2' && c.sig === 'B');
  const d = pickOrderAttempt(null, 'B', make);
  check('tras completarse (se vuelve a null): id nuevo aunque el contenido sea igual', d.id === 'id-3');
  check('no muta el intento anterior', a.id === 'id-1' && a.sig === 'A');
}

console.log('isDuplicateOrderIdError (23505)');
{
  const pg = (over) => ({ code: '23505', message: 'duplicate key value violates unique constraint "orders_pkey"', details: 'Key (id)=(3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f) already exists.', ...over });
  check('23505 sobre la clave id: éxito', isDuplicateOrderIdError(pg()));
  check('23505 sobre otra columna: no es éxito', !isDuplicateOrderIdError(pg({ message: 'duplicate key value violates unique constraint "orders_numero_key"', details: 'Key (numero)=(15) already exists.' })));
  check('23505 sobre columnas compuestas que arrancan con otra: no es éxito', !isDuplicateOrderIdError(pg({ details: 'Key (restaurant_id, numero)=(a, 3) already exists.' })));
  check('23505 sin detalle: éxito (el código alcanza)', isDuplicateOrderIdError({ code: '23505' }));
  check('detalle null: éxito', isDuplicateOrderIdError({ code: '23505', message: null, details: null }));
  check('otro código (RLS 42501): no', !isDuplicateOrderIdError({ code: '42501', message: 'new row violates row-level security policy' }));
  check('otro código (23503 clave foránea): no', !isDuplicateOrderIdError({ code: '23503' }));
  check('error de red sin código: no', !isDuplicateOrderIdError({ message: 'Failed to fetch' }));
  check('null / undefined: no', !isDuplicateOrderIdError(null) && !isDuplicateOrderIdError(undefined));
  check('código como número: no', !isDuplicateOrderIdError({ code: 23505 }));
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
