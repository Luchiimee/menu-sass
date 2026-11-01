// Montos de un pedido GUARDADO para mostrarlos (seguimiento del cliente, comanda), sin
// imports con alias (@/) para probarlo con scripts/check-order-totals.mjs.
//
// La fuente de verdad es orders.total (lo que el cliente confirmó). Hasta este cambio,
// discount_amount guardaba solo el cupón: el descuento automático (efectivo / porcentaje)
// quedaba únicamente dentro de total. Para esos pedidos viejos (y los de Mercado Pago, que
// siguen guardando solo el cupón) el descuento se completa por diferencia:
// productos + envío − total. Nunca se recalculan envío ni total.

export type OrderTotalsInput = {
  items?: unknown;
  delivery_cost?: unknown;
  discount_amount?: unknown;
  total?: unknown;
};

export type OrderDisplayTotals = { subtotal: number; envio: number; descuento: number; total: number };

// Número desde number o string numérico; null, '' u otra cosa → NaN
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return NaN;
}

const orZero = (value: unknown) => {
  const n = toNumber(value);
  return Number.isFinite(n) ? n : 0;
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Productos con extras: (precio + Σ extra.precio × extra.cantidad) × cantidad, como el checkout
export function itemsSubtotal(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc: number, item: any) => {
    const extras = Array.isArray(item?.extrasList)
      ? item.extrasList.reduce((a: number, e: any) => a + orZero(e?.price) * orZero(e?.quantity), 0)
      : 0;
    return acc + (orZero(item?.price) + extras) * orZero(item?.quantity);
  }, 0);
}

// null si el pedido no tiene un total válido: no se inventa uno
export function orderDisplayTotals(order: OrderTotalsInput | null | undefined): OrderDisplayTotals | null {
  if (!order) return null;
  const total = toNumber(order.total);
  if (!Number.isFinite(total)) return null;

  const subtotal = round2(itemsSubtotal(order.items));
  const envio = Math.max(0, round2(orZero(order.delivery_cost)));
  // Descuento: el guardado o, si es mayor, la diferencia con el total. discount_amount puede
  // tener solo una parte (pedidos viejos y los de Mercado Pago guardan solo el cupón): como el
  // total es la fuente de verdad, lo que falta para cerrar también es descuento.
  const saved = toNumber(order.discount_amount);
  const byDifference = Math.max(0, round2(subtotal + envio - total));
  const descuento = Number.isFinite(saved) && saved > 0 ? Math.max(round2(saved), byDifference) : byDifference;

  return { subtotal, envio, descuento, total: round2(total) };
}
