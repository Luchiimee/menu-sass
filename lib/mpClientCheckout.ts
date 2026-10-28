// Piezas puras del checkout con Mercado Pago que comparten el navegador y el
// servidor. Sin imports con alias (@/) ni dependencias: se prueba con
// scripts/check-mp-client-checkout.mjs.
//
//   - convertCartForMp: carrito del CartContext → cart de POST /api/checkout/mp
//   - totalsMatch: total que ve el cliente vs total que calcula el servidor
//   - mpErrorMessage: código de error del servidor → mensaje para el cliente

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export const UUID_RE = new RegExp(`^${UUID}$`, 'i');
// Renglón de variación: id `${productId}-${índice}` (ver app/[slug]/page.tsx)
const VARIATION_ID_RE = new RegExp(`^(${UUID})-(\\d{1,3})$`, 'i');

// Mismos topes que lib/checkoutPricing.ts (MAX_CART_ITEMS / MAX_QUANTITY)
export const MAX_CART_LINES = 50;
export const MAX_LINE_QUANTITY = 50;

export type MpCartItem = {
  productId: string;
  variationIndex?: number;
  extras: { extraId: string; qty: number }[];
  quantity: number;
};

export type MpCartReason =
  | 'vacio'                 // carrito vacío o con demasiados renglones
  | 'combo'                 // combo / destacado ("hero-item"): no es un producto
  | 'producto_no_convertible' // id que no es de un producto del menú
  | 'cantidad'              // cantidad fuera de rango
  | 'extra_no_convertible';

export type MpCartResult = { ok: true; items: MpCartItem[] } | { ok: false; reason: MpCartReason };

function isQty(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= MAX_LINE_QUANTITY;
}

// precio y nombre NO viajan: el servidor recalcula todo desde la base.
export function convertCartForMp(cart: any[] | null | undefined): MpCartResult {
  if (!Array.isArray(cart) || cart.length === 0 || cart.length > MAX_CART_LINES) {
    return { ok: false, reason: 'vacio' };
  }
  const items: MpCartItem[] = [];
  for (const line of cart) {
    const id = String(line?.id ?? '');
    // El combo del menú viaja como "hero-item" (el servidor responde combo_no_soportado)
    if (id.startsWith('hero')) return { ok: false, reason: 'combo' };

    let productId: string;
    let variationIndex: number | undefined;
    const variation = id.match(VARIATION_ID_RE);
    if (UUID_RE.test(id)) {
      productId = id;
    } else if (variation) {
      productId = variation[1];
      variationIndex = Number(variation[2]);
    } else {
      return { ok: false, reason: 'producto_no_convertible' };
    }

    if (!isQty(line.quantity)) return { ok: false, reason: 'cantidad' };

    const seen = new Set<string>();
    const extras: { extraId: string; qty: number }[] = [];
    for (const e of line.extrasList ?? []) {
      if (!e || !(Number(e.quantity) > 0)) continue; // un extra en 0 no cuenta
      if (typeof e.id !== 'string' || e.id.length === 0 || e.id.length > 64 || seen.has(e.id) || !isQty(e.quantity)) {
        return { ok: false, reason: 'extra_no_convertible' };
      }
      seen.add(e.id);
      extras.push({ extraId: e.id, qty: e.quantity }); // cantidad POR UNIDAD, igual que el servidor
    }

    items.push({
      productId,
      ...(variationIndex === undefined ? {} : { variationIndex }),
      extras,
      quantity: line.quantity,
    });
  }
  return { ok: true, items };
}

// Tolerancia de 1 centavo: el cliente suma con flotantes y el servidor redondea una vez.
export function totalsMatch(clientTotal: unknown, serverTotal: unknown): boolean {
  const a = Number(clientTotal);
  const b = Number(serverTotal);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(Math.round(a * 100) - Math.round(b * 100)) <= 1;
}

const MESSAGES: Record<string, string> = {
  carrito_invalido: 'Hay un problema con tu carrito. Revisalo e intentá de nuevo.',
  combo_no_soportado: 'El combo destacado todavía no se puede pagar con Mercado Pago. Sacalo del carrito o elegí otro medio de pago.',
  mesa_no_soportada: 'Mercado Pago no está disponible para pedidos en mesa.',
  tipo_pedido_invalido: 'Elegí si es delivery o retiro e intentá de nuevo.',
  restaurante_no_encontrado: 'No encontramos el local. Recargá la página.',
  no_disponible: 'El pago con Mercado Pago no está disponible en este momento. Elegí otro medio de pago.',
  mp_no_conectado: 'Este local no puede recibir pagos con Mercado Pago ahora. Elegí otro medio de pago.',
  cerrado: 'El local está cerrado en este momento.',
  producto_no_encontrado: 'Algún producto de tu carrito ya no está disponible. Revisalo.',
  producto_no_disponible: 'Algún producto de tu carrito ya no está disponible. Revisalo.',
  variacion_invalida: 'Algún producto de tu carrito cambió. Sacalo y volvé a agregarlo.',
  extra_invalido: 'Algún extra de tu carrito cambió. Sacalo y volvé a agregarlo.',
  cupon_invalido: 'El cupón ya no es válido. Quitalo e intentá de nuevo.',
  total_invalido: 'No pudimos calcular el total de tu pedido. Revisá el carrito.',
  nombre_invalido: 'Revisá tu nombre y apellido.',
  telefono_invalido: 'Revisá tu teléfono.',
  direccion_invalida: 'Revisá la dirección de entrega.',
  notas_invalidas: 'Tu aclaración es demasiado larga.',
  body_demasiado_grande: 'Tu carrito es demasiado grande para pagarlo online.',
  mp_error: 'Mercado Pago no respondió. Intentá de nuevo en unos minutos.',
  error_datos: 'Tuvimos un problema para procesar tu pedido. Intentá de nuevo.',
};

export function mpErrorMessage(code: unknown): string {
  return (typeof code === 'string' && MESSAGES[code]) || 'No pudimos iniciar el pago. Intentá de nuevo.';
}

// ---------------------------------------------------------------------------
// Vuelta de Mercado Pago (?mp=success|pending|failure&ref=<id del pendiente>)
// ---------------------------------------------------------------------------

export type ReturnMode = 'success' | 'pending' | 'failure';
export type StatusState = 'pending' | 'paid' | 'order_created' | 'failed' | 'expired';

// Respaldo en localStorage, guardado ANTES de ir a MP. La navegación a MP descarta
// el estado de React, así que también guarda el carrito para poder devolverlo.
export const MP_PENDING_KEY = 'snappy_mp_pending';
const MP_PENDING_TTL_MS = 24 * 60 * 60 * 1000;

// Parámetros que MP agrega a la vuelta. Se ignoran y se sacan de la URL.
export const MP_RETURN_PARAMS = [
  'mp', 'ref', 'collection_id', 'collection_status', 'payment_id', 'status',
  'external_reference', 'payment_type', 'merchant_order_id', 'preference_id',
  'site_id', 'processing_mode', 'merchant_account_id',
];

// Solo lee mp y ref (los nuestros). null si la URL no es una vuelta de MP.
export function parseReturnParams(params: { get(name: string): string | null }): { mp: ReturnMode; ref: string | null } | null {
  const mp = params.get('mp');
  if (mp !== 'success' && mp !== 'pending' && mp !== 'failure') return null;
  const ref = params.get('ref');
  return { mp, ref: ref && UUID_RE.test(ref) ? ref.toLowerCase() : null };
}

export type StoredMpPending = { ref: string; metodoEnvio: 'delivery' | 'retiro'; ts: number; restaurantId: string; cart: any[] };

export function parseStoredMpPending(raw: string | null, restaurantId: string, now: number): StoredMpPending | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return null;
    if (typeof v.ref !== 'string' || !UUID_RE.test(v.ref)) return null;
    if (typeof v.ts !== 'number' || !Number.isFinite(v.ts) || now - v.ts > MP_PENDING_TTL_MS || v.ts - now > 5 * 60 * 1000) return null;
    if (v.restaurantId !== restaurantId) return null;
    if (v.metodoEnvio !== 'delivery' && v.metodoEnvio !== 'retiro') return null;
    return { ref: v.ref.toLowerCase(), metodoEnvio: v.metodoEnvio, ts: v.ts, restaurantId, cart: Array.isArray(v.cart) ? v.cart : [] };
  } catch {
    return null;
  }
}

export const POLL_START_MS = 2000;
export const POLL_MAX_MS = 5000;
export const POLL_BACKOFF_MAX_MS = 20000;
export const SLOW_AFTER_MS = 60000;

// Intervalo entre consultas: 2 s que sube de a poco hasta 5 s; ante 429 o error de
// red se duplica (hasta 20 s).
export function nextPollDelay(current: number, outcome: 'ok' | 'rate_limited' | 'error'): number {
  if (outcome === 'ok') return Math.min(Math.round(current * 1.25), POLL_MAX_MS);
  return Math.min(current * 2, POLL_BACKOFF_MAX_MS);
}

export type Decision = 'order_created' | 'wait_pending' | 'wait_paid' | 'recheck' | 'failure';

// Qué hacer con una respuesta de /status. 'failed' puede pasar a 'paid' (un pago
// rechazado no cierra la preference), así que antes de dar el caso por perdido se
// consulta una vez más ('recheck').
export function decideNext(args: { state: StatusState | 'not_found'; mode: ReturnMode; recheckDone: boolean }): Decision {
  const { state, mode, recheckDone } = args;
  if (state === 'order_created') return 'order_created';
  if (state === 'paid') return 'wait_paid';
  const failureLike = state === 'failed' || state === 'expired' || state === 'not_found'
    || (state === 'pending' && mode === 'failure');
  if (!failureLike) return 'wait_pending';
  return recheckDone ? 'failure' : 'recheck';
}
