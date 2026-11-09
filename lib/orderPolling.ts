// Consulta periódica del pedido (reemplaza el Realtime anónimo): intervalo, backoff y estados
// finales. Lógica pura, sin imports con alias (@/) para probarla con scripts/check-order-polling.mjs.
// El cliente que hace los fetch está en lib/orderPollClient.ts.
//
// Estados finales (mismos que CartFooter usaba para limpiar el pedido, líneas "estadosFinales"):
//   mesa            completado, cancelado   (entregado = el plato está en la mesa, falta pagar)
//   delivery/retiro entregado, completado, cancelado
//
// Fin de la consulta (shouldStopPolling): estado final Y (el pago ya está confirmado, o el medio de pago
// no requiere confirmación, p. ej. efectivo). Con delivery o retiro pagado por transferencia o Mercado Pago
// el local puede confirmar el pago DESPUÉS de entregar: se sigue consultando hasta que se confirme o
// pasen 30 minutos desde que el estado se vio final (tope duro). Cancelado y mesa cortan por estado.
//
// Ritmo: cada 8 s mientras no se cumpla eso. Si falla la red (o el servidor responde 5xx / 429)
// se espacia 16 s y luego 30 s (tope) y vuelve a 8 s apenas responde bien. Un 404 repetido
// (pedido borrado) corta la consulta: no tiene sentido seguir preguntando por algo que no existe.

export const POLL_INTERVAL_MS = 8_000;
export const MAX_BACKOFF_MS = 30_000;
export const NOT_FOUND_STOP_AFTER = 3;
export const FINAL_GRACE_MS = 30 * 60_000;

// Medios de pago que el local confirma a mano o que traen confirmación propia. Cualquier otro
// (efectivo, tarjeta en el local) no requiere confirmación.
const CONFIRMABLE_PAYMENT_METHODS = ['transferencia', 'mercadopago'];

const FINAL_MESA = ['completado', 'cancelado'];
const FINAL_OTHER = ['entregado', 'completado', 'cancelado'];

export function isFinalStatus(status: unknown, orderType: unknown): boolean {
  if (typeof status !== 'string') return false;
  return (orderType === 'mesa' ? FINAL_MESA : FINAL_OTHER).includes(status);
}

export type OrderForPolling = {
  status?: unknown;
  orderType?: unknown;
  paymentMethod?: unknown;
  pagoConfirmado?: unknown;
};

// ¿El pedido espera todavía la confirmación de su pago? Solo delivery o retiro pagados por
// transferencia o Mercado Pago, sin confirmar y no cancelados (mesa y cancelado no esperan pago).
export function isAwaitingPayment(order: OrderForPolling): boolean {
  if (order.status === 'cancelado' || order.orderType === 'mesa') return false;
  if (order.pagoConfirmado === true) return false;
  return typeof order.paymentMethod === 'string' && CONFIRMABLE_PAYMENT_METHODS.includes(order.paymentMethod);
}

// ¿Se limpia el carrito y el seguimiento del pedido? msSinceFinal = tiempo desde que el estado pasó a
// final (en el navegador, desde que se vio; en ClearCartLogic, desde updated_at).
//   - estado final y pasaron 5 minutos: se limpia
//   - salvo que siga esperando la confirmación del pago (transferencia / Mercado Pago sin confirmar):
//     entonces se espera hasta 30 minutos (el mismo tope que la consulta)
export const CLEAR_AFTER_FINAL_MS = 5 * 60_000;

export function shouldClearOrder(order: OrderForPolling, msSinceFinal: number): boolean {
  if (!isFinalStatus(order.status, order.orderType)) return false;
  if (!(msSinceFinal >= CLEAR_AFTER_FINAL_MS)) return false; // también cubre NaN
  if (isAwaitingPayment(order)) return msSinceFinal >= FINAL_GRACE_MS;
  return true;
}

// ¿Se deja de consultar? finalSeenAt = momento (ms) en que se vio por primera vez el estado final,
// o null si todavía no lo es. now = momento actual (ms).
export function shouldStopPolling(order: OrderForPolling, finalSeenAt: number | null, now: number): boolean {
  if (!isFinalStatus(order.status, order.orderType)) return false;
  // cancelado, mesa, pago confirmado o medio sin confirmación: alcanza con el estado final
  if (!isAwaitingPayment(order)) return true;
  return finalSeenAt !== null && now - finalSeenAt >= FINAL_GRACE_MS;
}

// Pestaña oculta: no se consulta ni se reprograma (el cliente que cambió a WhatsApp no gasta red ni
// servidor). Al volver a verla se consulta de inmediato, con un mínimo de 2 s entre consultas para que
// cambiar de pestaña muchas veces seguidas no dispare una ráfaga.
export const MIN_RESUME_GAP_MS = 2_000;

export function isTabHidden(visibilityState: unknown): boolean {
  return visibilityState === 'hidden';
}

export function shouldResumeOnVisible(lastPollAt: number | null, now: number): boolean {
  return lastPollAt === null || now - lastPollAt >= MIN_RESUME_GAP_MS;
}

// Espera tras `failures` errores seguidos: 0 → 8 s, 1 → 16 s, 2 o más → 30 s
export function backoffDelay(failures: number): number {
  const n = Number.isFinite(failures) && failures > 0 ? Math.floor(failures) : 0;
  return Math.min(MAX_BACKOFF_MS, POLL_INTERVAL_MS * 2 ** n);
}

export type PollState = { failures: number; notFound: number; finalSeenAt: number | null };
export const INITIAL_POLL_STATE: PollState = { failures: 0, notFound: 0, finalSeenAt: null };

export type PollOutcome =
  | ({ kind: 'ok' } & OrderForPolling)
  | { kind: 'not_found' }
  | { kind: 'error' };

export type PollDecision = { state: PollState; stop: boolean; delayMs: number };

// Qué hacer después de una respuesta: si se corta y cuánto esperar para la próxima
export function nextPoll(state: PollState, outcome: PollOutcome, now: number = Date.now()): PollDecision {
  if (outcome.kind === 'ok') {
    // Se anota cuándo se vio por primera vez el estado final; si deja de serlo, se borra
    const finalSeenAt = isFinalStatus(outcome.status, outcome.orderType) ? (state.finalSeenAt ?? now) : null;
    const next: PollState = { failures: 0, notFound: 0, finalSeenAt };
    return { state: next, stop: shouldStopPolling(outcome, finalSeenAt, now), delayMs: POLL_INTERVAL_MS };
  }
  if (outcome.kind === 'not_found') {
    const notFound = state.notFound + 1;
    const next: PollState = { ...state, failures: state.failures + 1, notFound };
    return { state: next, stop: notFound >= NOT_FOUND_STOP_AFTER, delayMs: backoffDelay(next.failures) };
  }
  const next: PollState = { ...state, failures: state.failures + 1 };
  return { state: next, stop: false, delayMs: backoffDelay(next.failures) };
}

// UUID v4 para el id del pedido, generado en el navegador. crypto.randomUUID solo existe en
// contextos seguros (https / localhost): sin él se arma uno con getRandomValues.
type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: (a: Uint8Array) => Uint8Array;
};

// Id por intento de envío: un reintento con el MISMO contenido (p. ej. tras un corte de red cuando el
// insert sí llegó) reutiliza el id; si el contenido cambió se genera uno nuevo. sig = firma del pedido.
export type OrderAttempt = { id: string; sig: string };

export function pickOrderAttempt(prev: OrderAttempt | null, sig: string, makeId: () => string): OrderAttempt {
  return prev && prev.sig === sig ? prev : { id: makeId(), sig };
}

// Postgres 23505 = clave duplicada. Sobre el id propio significa "este pedido ya está guardado": el
// reintento se toma como éxito. Si el detalle nombra OTRA columna única, no lo es.
export function isDuplicateOrderIdError(error: { code?: unknown; message?: unknown; details?: unknown } | null | undefined): boolean {
  if (!error || error.code !== '23505') return false;
  const text = `${typeof error.message === 'string' ? error.message : ''} ${typeof error.details === 'string' ? error.details : ''}`;
  // El detalle de Postgres es "Key (columna)=(valor) already exists."; si la columna no es id, es otra
  return !/Key \((?!id\))[^)]*\)/i.test(text);
}

export function newOrderId(c: CryptoLike | undefined = (globalThis as { crypto?: CryptoLike }).crypto): string {
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error('no hay generador de números aleatorios seguro');
  }
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // versión 4
  b[8] = (b[8] & 0x3f) | 0x80; // variante
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
