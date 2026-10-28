// Cálculo del total de un pedido para el checkout online de MP Connect.
// SOLO servidor: lo usa POST /api/checkout/mp con el cliente service_role.
//
// Todo se recalcula desde la base: del carrito del cliente solo se leen ids,
// variationIndex y cantidades. Ningún precio, nombre ni descuento viene del
// body. Réplica de la lógica de components/CartFooter.tsx (subtotal, cupón,
// reglas automáticas, envío) con estas diferencias deliberadas:
//   - la regla de efectivo NO se aplica (el pago online no es efectivo);
//   - el envío por zonas es SIEMPRE zona 2 (ver shippingCost);
//   - el descuento total se limita al 100% del subtotal y total <= 0 es error;
//   - se redondea a 2 decimales UNA sola vez, al final.
//
// Sin imports con alias (@/): se puede probar con scripts/check-checkout-pricing.mjs
// pasando un cliente de base falso en `deps.db`.

import type { SupabaseClient } from '@supabase/supabase-js';

export const MAX_CART_ITEMS = 50;
export const MAX_QUANTITY = 50;
export const MAX_COUPON_LENGTH = 50;

export type CheckoutErrorCode =
  | 'carrito_invalido'
  | 'combo_no_soportado'
  | 'tipo_pedido_invalido'
  | 'mesa_no_soportada'
  | 'restaurante_no_encontrado'
  | 'producto_no_encontrado'
  | 'producto_no_disponible'
  | 'variacion_invalida'
  | 'extra_invalido'
  | 'cupon_invalido'
  | 'total_invalido'
  | 'error_datos';

export class CheckoutError extends Error {
  code: CheckoutErrorCode;
  constructor(code: CheckoutErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'CheckoutError';
    this.code = code;
  }
}

export type CheckoutCartItem = {
  productId: string;
  variationIndex?: number;
  extras: { extraId: string; qty: number }[];
  quantity: number;
};

export type CheckoutOrderType = 'delivery' | 'retiro';

export type PricedLine = {
  productId: string;
  variationIndex: number | null;
  name: string;
  unitBase: number;
  extras: { extraId: string; name: string; price: number; qty: number }[];
  quantity: number;
  lineTotal: number;
};

export type OrderTotal = {
  lines: PricedLine[];
  subtotal: number;
  couponCode: string | null;
  couponDiscount: number;
  autoRuleId: string | null;
  autoDiscount: number;
  discountTotal: number;
  shipping: number;
  total: number;
};

export type PricingDeps = {
  db: SupabaseClient;
  couponCode?: string | null;
  now?: Date;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ---------------------------------------------------------------------------
// Regla única de "se puede comprar online". Los productos no tienen flag de
// disponibilidad en la base: se puede comprar si tiene un precio calculable.
// (Los combos / hero-item no son filas de products: se rechazan antes.)
// ---------------------------------------------------------------------------
export function isProductPurchasable(product: any): boolean {
  if (!product || !product.id) return false;
  if (product.sale_type === 'peso') {
    return Array.isArray(product.variations) && product.variations.length > 0;
  }
  const price = Number(product.price);
  return Number.isFinite(price) && price > 0;
}

// Las variaciones solo cuentan en productos 'peso' (igual que getProductDisplayPrice).
function usesVariations(product: any): boolean {
  return product.sale_type === 'peso' && Array.isArray(product.variations) && product.variations.length > 0;
}

function isPositiveInt(n: unknown, max: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= max;
}

// Valida y normaliza el carrito del body. Cualquier forma inesperada es error.
export function parseCheckoutCart(raw: unknown): CheckoutCartItem[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_CART_ITEMS) {
    throw new CheckoutError('carrito_invalido', 'El carrito está vacío o tiene demasiados ítems.');
  }
  return raw.map((it: any) => {
    if (!it || typeof it !== 'object') throw new CheckoutError('carrito_invalido');
    const { productId, variationIndex, extras, quantity } = it;
    if (typeof productId !== 'string' || productId.length === 0 || productId.length > 64) {
      throw new CheckoutError('carrito_invalido');
    }
    // El combo / destacado del menú viaja como "hero-item": no es un producto.
    if (productId.startsWith('hero')) throw new CheckoutError('combo_no_soportado');
    if (!isPositiveInt(quantity, MAX_QUANTITY)) throw new CheckoutError('carrito_invalido');
    if (variationIndex !== undefined && variationIndex !== null
      && !(typeof variationIndex === 'number' && Number.isInteger(variationIndex) && variationIndex >= 0 && variationIndex < 1000)) {
      throw new CheckoutError('carrito_invalido');
    }
    const extraList = extras ?? [];
    if (!Array.isArray(extraList) || extraList.length > MAX_CART_ITEMS) throw new CheckoutError('carrito_invalido');
    const seen = new Set<string>();
    const cleanExtras = extraList.map((e: any) => {
      if (!e || typeof e.extraId !== 'string' || e.extraId.length === 0 || e.extraId.length > 64
        || !isPositiveInt(e.qty, MAX_QUANTITY) || seen.has(e.extraId)) {
        throw new CheckoutError('carrito_invalido');
      }
      seen.add(e.extraId);
      return { extraId: e.extraId, qty: e.qty as number };
    });
    return {
      productId,
      ...(variationIndex === undefined || variationIndex === null ? {} : { variationIndex }),
      extras: cleanExtras,
      quantity,
    };
  });
}

// ---------------------------------------------------------------------------
// Envío
// ---------------------------------------------------------------------------
// TODO(opción A — geocodificar en servidor antes de abrir al público): hoy el
// servidor NO recibe coordenadas ni geocodifica la dirección, así que con envío
// por zonas se cobra SIEMPRE la zona 2 (la más cara), igual que hace
// CartFooter cuando la dirección no se encuentra (forcedZone = 'zone2').
// Lo que hace hoy el CartFooter fuera de la zona 2: zoneStatus = 'outside',
// envío = 0 y el botón queda bloqueado ("Lo sentimos, no llegamos a tu zona").
// Acá ese caso no puede darse porque nunca se mide distancia.
function shippingCost(restaurant: any, orderType: CheckoutOrderType, freeShipping: boolean): number {
  if (orderType !== 'delivery' || freeShipping) return 0;
  const zonesEnabled = restaurant.subscription_plan !== 'light' && !!restaurant.delivery_zones_enabled;
  const cost = zonesEnabled ? restaurant.delivery_zone2_cost : restaurant.delivery_cost;
  return Number(cost) || 0;
}

// ---------------------------------------------------------------------------
// Descuento automático (discount_rules). Misma selección que CartFooter, sin
// la rama de efectivo: gana la regla por monto con mayor umbral que el
// subtotal alcanza. monto_minimo vacío/blanco = sin umbral (se ignora la regla).
// ---------------------------------------------------------------------------
function parseMonto(val: any): number | null {
  if (val == null) return null;
  const trimmed = String(val).trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

function pickAutoRule(rules: any[], subtotal: number): any | undefined {
  return [...rules]
    .filter((r) => r.tipo !== 'efectivo' && parseMonto(r.monto_minimo) != null)
    .sort((a, b) => parseMonto(b.monto_minimo)! - parseMonto(a.monto_minimo)!)
    .find((r) => subtotal >= parseMonto(r.monto_minimo)!);
}

// ---------------------------------------------------------------------------
// Cupón: se revalida contra la base (nunca se confía en un descuento del cliente).
// ---------------------------------------------------------------------------
async function loadCoupon(db: SupabaseClient, restaurantId: string, rawCode: string, now: Date) {
  const code = rawCode.trim().toUpperCase();
  if (code.length === 0 || code.length > MAX_COUPON_LENGTH) throw new CheckoutError('cupon_invalido');
  const { data: coupon, error } = await db
    .from('coupons')
    .select('code, is_active, starts_at, expires_at, discount_percent')
    .eq('restaurant_id', restaurantId)
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new CheckoutError('error_datos', `cupón: ${error.message}`);
  if (!coupon || coupon.is_active !== true) throw new CheckoutError('cupon_invalido');
  // starts_at nulo no bloquea (igual que el CartFooter: now < Invalid Date es falso)
  if (coupon.starts_at && now < new Date(coupon.starts_at)) throw new CheckoutError('cupon_invalido');
  if (coupon.expires_at && now > new Date(coupon.expires_at)) throw new CheckoutError('cupon_invalido');
  const percent = Number(coupon.discount_percent);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) throw new CheckoutError('cupon_invalido');
  return { code: String(coupon.code), percent };
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new CheckoutError('error_datos', `${what}: ${res.error.message}`);
  return (res.data ?? ([] as unknown)) as T;
}

// ---------------------------------------------------------------------------
export async function computeOrderTotal(
  restaurantId: string,
  rawCart: unknown,
  orderType: string,
  deps: PricingDeps
): Promise<OrderTotal> {
  const { db } = deps;
  const now = deps.now ?? new Date();

  if (orderType === 'mesa') throw new CheckoutError('mesa_no_soportada');
  if (orderType !== 'delivery' && orderType !== 'retiro') throw new CheckoutError('tipo_pedido_invalido');
  const type: CheckoutOrderType = orderType;

  const cart = parseCheckoutCart(rawCart);

  // --- Restaurante ---
  const { data: restaurant, error: restError } = await db
    .from('restaurants')
    .select('id, subscription_plan, delivery_cost, delivery_zones_enabled, delivery_zone2_cost')
    .eq('id', restaurantId)
    .maybeSingle();
  if (restError) throw new CheckoutError('error_datos', `restaurante: ${restError.message}`);
  if (!restaurant) throw new CheckoutError('restaurante_no_encontrado');

  // --- Productos (deben ser del restaurante) ---
  const productIds = [...new Set(cart.map((c) => c.productId))];
  const products: any[] = unwrap(
    await db.from('products').select('id, restaurant_id, name, price, sale_type, variations').in('id', productIds),
    'productos'
  );
  const productById = new Map(products.map((p) => [String(p.id), p]));

  // --- Extras elegidos y su vínculo con cada producto ---
  const extraIds = [...new Set(cart.flatMap((c) => c.extras.map((e) => e.extraId)))];
  let extraById = new Map<string, any>();
  let links = new Set<string>();
  if (extraIds.length > 0) {
    const extras: any[] = unwrap(
      await db.from('extras').select('id, restaurant_id, name, price, is_available').in('id', extraIds),
      'extras'
    );
    extraById = new Map(extras.map((e) => [String(e.id), e]));
    const rels: any[] = unwrap(
      await db.from('product_extras').select('product_id, extra_id').in('product_id', productIds),
      'product_extras'
    );
    links = new Set(rels.map((r) => `${r.product_id}|${r.extra_id}`));
  }

  // --- Renglones ---
  const lines: PricedLine[] = cart.map((item) => {
    const product = productById.get(item.productId);
    if (!product || String(product.restaurant_id) !== String(restaurantId)) {
      throw new CheckoutError('producto_no_encontrado');
    }
    if (!isProductPurchasable(product)) throw new CheckoutError('producto_no_disponible');

    let unitBase: number;
    let name: string = String(product.name ?? '');
    let variationIndex: number | null = null;
    if (usesVariations(product)) {
      const v = item.variationIndex;
      if (v === undefined || v >= product.variations.length) throw new CheckoutError('variacion_invalida');
      const variation = product.variations[v];
      unitBase = Number(variation?.price);
      variationIndex = v;
      if (variation?.label) name = `${name} (${variation.label})`;
    } else {
      if (item.variationIndex !== undefined) throw new CheckoutError('variacion_invalida');
      unitBase = Number(product.price);
    }
    if (!Number.isFinite(unitBase) || unitBase <= 0) throw new CheckoutError('producto_no_disponible');

    const extras = item.extras.map((e) => {
      const extra = extraById.get(e.extraId);
      const price = Number(extra?.price);
      if (
        !extra ||
        String(extra.restaurant_id) !== String(restaurantId) ||
        extra.is_available === false ||
        !links.has(`${product.id}|${extra.id}`) ||
        !Number.isFinite(price) || price < 0
      ) {
        throw new CheckoutError('extra_invalido');
      }
      return { extraId: String(extra.id), name: String(extra.name ?? ''), price, qty: e.qty };
    });

    // (precio + Σ extra.precio × extra.qtyPorUnidad) × cantidad
    const extrasPerUnit = extras.reduce((acc, e) => acc + e.price * e.qty, 0);
    return {
      productId: String(product.id),
      variationIndex,
      name,
      unitBase,
      extras,
      quantity: item.quantity,
      lineTotal: (unitBase + extrasPerUnit) * item.quantity,
    };
  });

  const subtotal = lines.reduce((acc, l) => acc + l.lineTotal, 0);

  // --- Cupón ---
  let coupon: { code: string; percent: number } | null = null;
  const rawCoupon = deps.couponCode;
  if (rawCoupon != null && String(rawCoupon).trim() !== '') {
    coupon = await loadCoupon(db, restaurantId, String(rawCoupon), now);
  }
  const couponDiscount = coupon ? (subtotal * coupon.percent) / 100 : 0;

  // --- Regla automática (cupón + regla se suman, como en el CartFooter) ---
  const rules: any[] = unwrap(
    await db.from('discount_rules').select('*').eq('restaurant_id', restaurantId).eq('activo', true),
    'reglas de descuento'
  );
  const rule = pickAutoRule(rules, subtotal);
  const freeShipping = rule?.tipo === 'envio_gratis' || rule?.tipo === 'porcentaje_envio_gratis';
  let autoDiscount = 0;
  if (rule?.tipo === 'porcentaje' || rule?.tipo === 'porcentaje_envio_gratis') {
    const pct = Number(rule.porcentaje);
    if (Number.isFinite(pct) && pct > 0) autoDiscount = (subtotal * pct) / 100;
  }

  // --- Total ---
  // El descuento total no puede pasar del 100% del subtotal.
  const discountTotal = Math.min(couponDiscount + autoDiscount, subtotal);
  const shipping = shippingCost(restaurant, type, freeShipping);
  const totalRaw = subtotal - discountTotal + shipping;
  if (!Number.isFinite(totalRaw) || totalRaw <= 0) throw new CheckoutError('total_invalido');

  // Único redondeo del total. Los parciales se redondean solo para mostrarlos.
  const total = round2(totalRaw);
  if (total <= 0) throw new CheckoutError('total_invalido');

  return {
    lines: lines.map((l) => ({ ...l, lineTotal: round2(l.lineTotal) })),
    subtotal: round2(subtotal),
    couponCode: coupon?.code ?? null,
    couponDiscount: round2(couponDiscount),
    autoRuleId: rule?.id != null ? String(rule.id) : null,
    autoDiscount: round2(autoDiscount),
    discountTotal: round2(discountTotal),
    shipping: round2(shipping),
    total,
  };
}
