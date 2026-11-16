// items de orders a partir de los renglones calculados por el servidor (lib/checkoutPricing.ts).
// Mismo formato que el carrito del navegador y que los pedidos de Mercado Pago (lib/mpWebhookCore.ts):
// id, name, price, quantity, uniqueId y extrasList[{id, name, price, quantity}].
// Sin imports con alias (@/): se prueba con scripts/check-order-checkout.mjs.

export type OrderLineInput = {
  productId: string;
  variationIndex: number | null;
  name: string;
  unitBase: number;
  quantity: number;
  extras: { extraId: string; name: string; price: number; qty: number }[];
};

export function buildOrderItems(lines: OrderLineInput[]) {
  return lines.map((l, i) => {
    const id = l.variationIndex != null ? `${l.productId}-${l.variationIndex}` : String(l.productId);
    return {
      id,
      name: l.name,
      price: l.unitBase,
      quantity: l.quantity,
      uniqueId: `${id}-${i + 1}`,
      extrasList: (l.extras || []).map((e) => ({ id: e.extraId, name: e.name, price: e.price, quantity: e.qty })),
    };
  });
}
