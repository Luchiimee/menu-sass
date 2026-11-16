// Validación del body de POST /api/checkout/order (pedidos de efectivo / transferencia / mesa).
// Lógica pura, sin imports con alias (@/): se prueba con scripts/check-order-checkout.mjs.
//
// Del navegador solo se aceptan datos de contacto, ids, cantidades y el total que vio el cliente
// (expected_total) y el envío que mostró (delivery_cost). Ningún precio, nombre de producto ni descuento
// viaja ni se usa: el servidor lo calcula todo en lib/checkoutPricing.ts.

export const ORDER_MAX_BODY_BYTES = 64 * 1024;
export const ORDER_MAX_NAME = 80;
export const ORDER_MAX_PHONE = 30;
export const ORDER_MAX_ADDRESS = 200;
export const ORDER_MAX_NOTES = 500;
export const ORDER_MAX_TABLE = 30;
export const ORDER_MAX_SLOT = 40;
export const ORDER_MAX_COUPON = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OfflinePaymentMethod = 'efectivo' | 'transferencia';
export type OfflineOrderType = 'delivery' | 'retiro' | 'mesa';

export type OrderRequest = {
  restaurantId: string;
  orderId: string;
  orderType: OfflineOrderType;
  paymentMethod: OfflinePaymentMethod;
  customerName: string;
  customerPhone: string;
  address: string;
  tableNumber: string | null;
  notes: string;
  couponCode: string;
  scheduledDeliveryTime: string;
  cart: unknown;
  expectedTotal: number | null;
  clientShipping: number | null;
};

export type OrderRequestResult =
  | { ok: true; value: OrderRequest }
  | { ok: false; error: string; status: 400 };

// string con largo máximo; cualquier otro tipo es inválido (undefined). Vacío → '' (o inválido si es obligatorio).
function readText(value: unknown, max: number, required: boolean): string | undefined {
  if (value === undefined || value === null || value === '') return required ? undefined : '';
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (text.length === 0) return required ? undefined : '';
  if (text.length > max) return undefined;
  return text;
}

function bad(error: string): OrderRequestResult {
  return { ok: false, error, status: 400 };
}

export function parseOrderRequest(body: unknown): OrderRequestResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('body_invalido');
  const b = body as Record<string, unknown>;

  const restaurantId = b.restaurant_id;
  if (typeof restaurantId !== 'string' || !UUID.test(restaurantId)) return bad('restaurante_invalido');
  const orderId = b.order_id;
  if (typeof orderId !== 'string' || !UUID.test(orderId)) return bad('pedido_invalido');

  const orderType = b.order_type;
  if (orderType !== 'delivery' && orderType !== 'retiro' && orderType !== 'mesa') return bad('tipo_pedido_invalido');
  const paymentMethod = b.payment_method;
  if (paymentMethod !== 'efectivo' && paymentMethod !== 'transferencia') return bad('metodo_pago_invalido');

  const customerName = readText(b.customer_name, ORDER_MAX_NAME, true);
  const customerPhone = readText(b.customer_phone, ORDER_MAX_PHONE, false);
  const address = readText(b.address, ORDER_MAX_ADDRESS, orderType === 'delivery');
  const tableNumber = readText(b.table_number, ORDER_MAX_TABLE, orderType === 'mesa');
  const notes = readText(b.notes, ORDER_MAX_NOTES, false);
  const couponCode = readText(b.coupon_code, ORDER_MAX_COUPON, false);
  const slot = readText(b.scheduled_delivery_time, ORDER_MAX_SLOT, false);
  if (customerName === undefined) return bad('nombre_invalido');
  if (customerPhone === undefined) return bad('telefono_invalido');
  if (address === undefined) return bad('direccion_invalida');
  if (tableNumber === undefined) return bad('mesa_invalida');
  if (notes === undefined) return bad('notas_invalidas');
  if (couponCode === undefined) return bad('cupon_invalido');
  if (slot === undefined) return bad('horario_invalido');

  const num = (v: unknown): number | null | undefined => {
    if (v === undefined || v === null) return null;
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  };
  const expectedTotal = num(b.expected_total);
  const clientShipping = num(b.delivery_cost);
  if (expectedTotal === undefined) return bad('total_esperado_invalido');
  if (clientShipping === undefined) return bad('envio_invalido');

  return {
    ok: true,
    value: {
      restaurantId,
      orderId: orderId.toLowerCase(),
      orderType,
      paymentMethod,
      customerName,
      customerPhone,
      address: orderType === 'delivery' ? address : '',
      tableNumber: orderType === 'mesa' ? tableNumber : null,
      notes,
      couponCode,
      scheduledDeliveryTime: slot || 'Inmediato',
      cart: b.cart,
      expectedTotal,
      clientShipping,
    },
  };
}
