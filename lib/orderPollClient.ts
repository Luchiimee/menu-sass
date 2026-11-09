// Cliente de la consulta periódica del pedido (SOLO navegador): una sola consulta por pedido,
// compartida entre todos los componentes que lo siguen (CartFooter y OrderTracker). Lee de
// GET /api/public/order/[id] (lib/publicOrder.ts); no usa la clave pública de Supabase.
// La lógica de ritmo y backoff está en lib/orderPolling.ts (probada en scripts/check-order-polling.mjs).

import { INITIAL_POLL_STATE, nextPoll, type PollState } from './orderPolling';
import { isValidOrderId } from './publicOrder';

export type PublicOrderView = {
  id: string;
  restaurant_id: string;
  status: string;
  payment_status: string | null;
  pago_confirmado: boolean | null;
  payment_method: string | null;
  order_type: string | null;
  scheduled_delivery_time: string | null;
  total: unknown;
  delivery_cost: unknown;
  discount_amount: unknown;
  items: any[];
  updated_at: string | null;
};

export type FetchOrderResult =
  | { kind: 'ok'; order: PublicOrderView }
  | { kind: 'not_found' }
  | { kind: 'error' };

// Una consulta suelta. Nunca tira: red caída, 429 y 5xx son 'error'; 404 es 'not_found'.
export async function fetchPublicOrder(id: string): Promise<FetchOrderResult> {
  if (!isValidOrderId(id)) return { kind: 'not_found' };
  try {
    const res = await fetch(`/api/public/order/${id}`, { cache: 'no-store' });
    if (res.status === 404) return { kind: 'not_found' };
    if (!res.ok) return { kind: 'error' };
    const json = await res.json().catch(() => null);
    if (!json || typeof json !== 'object' || !json.order) return { kind: 'error' };
    return { kind: 'ok', order: json.order as PublicOrderView };
  } catch {
    return { kind: 'error' };
  }
}

type Listener = (order: PublicOrderView) => void;
type Channel = {
  listeners: Set<Listener>;
  timer: ReturnType<typeof setTimeout> | null;
  state: PollState;
  last: PublicOrderView | null;
  stopped: boolean;   // estado final o pedido inexistente: no se consulta más
  inflight: boolean;
  closed: boolean;    // sin oyentes: se ignora lo que llegue
};

const channels = new Map<string, Channel>();
let visibilityHooked = false;

async function poll(id: string, ch: Channel) {
  if (ch.closed || ch.stopped || ch.inflight) return;
  ch.inflight = true;
  const result = await fetchPublicOrder(id);
  ch.inflight = false;
  if (ch.closed) return;

  const decision = nextPoll(
    ch.state,
    result.kind === 'ok'
      ? { kind: 'ok', status: result.order.status, orderType: result.order.order_type }
      : { kind: result.kind },
  );
  ch.state = decision.state;

  if (result.kind === 'ok') {
    ch.last = result.order;
    ch.listeners.forEach((cb) => {
      try { cb(result.order); } catch (e) { console.error('[orderPoll] oyente falló:', e); }
    });
  }

  if (decision.stop) {
    ch.stopped = true;
    return;
  }
  ch.timer = setTimeout(() => { ch.timer = null; void poll(id, ch); }, decision.delayMs);
}

// Al volver a la pestaña se consulta ya (reemplaza la resincronización del canal que se caía)
function hookVisibility() {
  if (visibilityHooked || typeof document === 'undefined') return;
  visibilityHooked = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    channels.forEach((ch, id) => {
      if (ch.closed || ch.stopped || ch.inflight) return;
      if (ch.timer) { clearTimeout(ch.timer); ch.timer = null; }
      void poll(id, ch);
    });
  });
}

// Empieza (o se suma a) la consulta periódica del pedido. El oyente recibe enseguida la última
// respuesta si ya hay una y después cada respuesta nueva. Devuelve la función para dejar de oír;
// con el último oyente se corta la consulta.
export function subscribeToOrder(id: string, listener: Listener): () => void {
  if (!isValidOrderId(id)) return () => {};
  hookVisibility();

  let ch = channels.get(id);
  if (!ch) {
    ch = { listeners: new Set(), timer: null, state: INITIAL_POLL_STATE, last: null, stopped: false, inflight: false, closed: false };
    channels.set(id, ch);
  }
  const channel = ch;
  channel.listeners.add(listener);

  if (channel.last) {
    try { listener(channel.last); } catch (e) { console.error('[orderPoll] oyente falló:', e); }
  }
  if (!channel.timer && !channel.inflight && !channel.stopped) void poll(id, channel);

  return () => {
    channel.listeners.delete(listener);
    if (channel.listeners.size === 0) {
      channel.closed = true;
      if (channel.timer) clearTimeout(channel.timer);
      if (channels.get(id) === channel) channels.delete(id);
    }
  };
}
