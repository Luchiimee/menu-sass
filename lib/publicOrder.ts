// Lectura PÚBLICA de un pedido por su id (GET /api/public/order/[id]): lista cerrada de columnas,
// validación del id y filtro de la fila y de los renglones. Sin imports con alias (@/) para
// probarlo con scripts/check-public-order.mjs.
//
// El id (UUID v4 aleatorio) es el único "token": quien lo conoce puede ver el estado de ESE pedido.
// Nunca se devuelve nada del cliente (nombre, teléfono, dirección, notas), ni cupón, ni turno de
// caja, ni datos internos o de Mercado Pago.

export const PUBLIC_ORDER_COLUMNS = [
  'id',
  'restaurant_id',
  'status',
  'payment_status',
  'pago_confirmado',
  'payment_method',
  'order_type',
  'scheduled_delivery_time',
  'total',
  'delivery_cost',
  'discount_amount',
  'items',
  'updated_at',
] as const;

export type PublicOrderColumn = (typeof PUBLIC_ORDER_COLUMNS)[number];

// Para .select(): la misma lista, nunca '*'
export const PUBLIC_ORDER_SELECT = PUBLIC_ORDER_COLUMNS.join(', ');

export type PublicOrderExtra = { id: unknown; name: unknown; price: unknown; quantity: unknown };
export type PublicOrderItem = {
  id: unknown;
  name: unknown;
  price: unknown;
  quantity: unknown;
  uniqueId: unknown;
  extrasList: PublicOrderExtra[];
};
export type PublicOrder = Record<Exclude<PublicOrderColumn, 'items'>, unknown> & { items: PublicOrderItem[] };

// UUID v4 estricto (versión 4, variante 8/9/a/b), mayúsculas o minúsculas
const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Cualquier UUID (para el ?restaurant=): el id de un local no tiene por qué ser v4
const ANY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidOrderId(id: unknown): id is string {
  return typeof id === 'string' && ORDER_ID.test(id);
}

export function isValidRestaurantId(id: unknown): id is string {
  return typeof id === 'string' && ANY_UUID.test(id);
}

// El carrito guarda en cada renglón el producto entero (todas sus columnas); acá se copian solo
// los campos que muestra el seguimiento. Un renglón que no es objeto se descarta.
function toPublicItem(raw: unknown): PublicOrderItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const it = raw as Record<string, unknown>;
  const extras = Array.isArray(it.extrasList) ? it.extrasList : [];
  return {
    id: it.id,
    name: it.name,
    price: it.price,
    quantity: it.quantity,
    uniqueId: it.uniqueId,
    extrasList: extras
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
      .map((e) => ({ id: e.id, name: e.name, price: e.price, quantity: e.quantity })),
  };
}

// Copia SOLO las columnas permitidas (nunca spread). Una columna extra en la fila se descarta.
export function toPublicOrder(row: Record<string, unknown>): PublicOrder {
  const items = Array.isArray(row.items)
    ? row.items.map(toPublicItem).filter((i): i is PublicOrderItem => i !== null)
    : [];
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    status: row.status,
    payment_status: row.payment_status,
    pago_confirmado: row.pago_confirmado,
    payment_method: row.payment_method,
    order_type: row.order_type,
    scheduled_delivery_time: row.scheduled_delivery_time,
    total: row.total,
    delivery_cost: row.delivery_cost,
    discount_amount: row.discount_amount,
    items,
    updated_at: row.updated_at,
  };
}
