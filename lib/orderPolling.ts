// Consulta periódica del pedido (reemplaza el Realtime anónimo): intervalo, backoff y estados
// finales. Lógica pura, sin imports con alias (@/) para probarla con scripts/check-order-polling.mjs.
// El cliente que hace los fetch está en lib/orderPollClient.ts.
//
// Estados finales (mismos que CartFooter usaba para limpiar el pedido, líneas "estadosFinales"):
//   mesa            completado, cancelado   (entregado = el plato está en la mesa, falta pagar)
//   delivery/retiro entregado, completado, cancelado
//
// Ritmo: cada 8 s mientras el estado no sea final. Si falla la red (o el servidor responde 5xx / 429)
// se espacia 16 s y luego 30 s (tope) y vuelve a 8 s apenas responde bien. Un 404 repetido
// (pedido borrado) corta la consulta: no tiene sentido seguir preguntando por algo que no existe.

export const POLL_INTERVAL_MS = 8_000;
export const MAX_BACKOFF_MS = 30_000;
export const NOT_FOUND_STOP_AFTER = 3;

const FINAL_MESA = ['completado', 'cancelado'];
const FINAL_OTHER = ['entregado', 'completado', 'cancelado'];

export function isFinalStatus(status: unknown, orderType: unknown): boolean {
  if (typeof status !== 'string') return false;
  return (orderType === 'mesa' ? FINAL_MESA : FINAL_OTHER).includes(status);
}

// Espera tras `failures` errores seguidos: 0 → 8 s, 1 → 16 s, 2 o más → 30 s
export function backoffDelay(failures: number): number {
  const n = Number.isFinite(failures) && failures > 0 ? Math.floor(failures) : 0;
  return Math.min(MAX_BACKOFF_MS, POLL_INTERVAL_MS * 2 ** n);
}

export type PollState = { failures: number; notFound: number };
export const INITIAL_POLL_STATE: PollState = { failures: 0, notFound: 0 };

export type PollOutcome =
  | { kind: 'ok'; status: unknown; orderType: unknown }
  | { kind: 'not_found' }
  | { kind: 'error' };

export type PollDecision = { state: PollState; stop: boolean; delayMs: number };

// Qué hacer después de una respuesta: si se corta y cuánto esperar para la próxima
export function nextPoll(state: PollState, outcome: PollOutcome): PollDecision {
  if (outcome.kind === 'ok') {
    const next = INITIAL_POLL_STATE;
    return { state: next, stop: isFinalStatus(outcome.status, outcome.orderType), delayMs: POLL_INTERVAL_MS };
  }
  if (outcome.kind === 'not_found') {
    const notFound = state.notFound + 1;
    const next = { failures: state.failures + 1, notFound };
    return { state: next, stop: notFound >= NOT_FOUND_STOP_AFTER, delayMs: backoffDelay(next.failures) };
  }
  const next = { failures: state.failures + 1, notFound: state.notFound };
  return { state: next, stop: false, delayMs: backoffDelay(next.failures) };
}

// UUID v4 para el id del pedido, generado en el navegador. crypto.randomUUID solo existe en
// contextos seguros (https / localhost): sin él se arma uno con getRandomValues.
type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: (a: Uint8Array) => Uint8Array;
};

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
