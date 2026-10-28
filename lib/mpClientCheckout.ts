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
