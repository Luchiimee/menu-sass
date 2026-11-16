// POST /api/checkout/order — crea pedidos de efectivo / transferencia / mesa (menú público, sin sesión).
//
// Antes el navegador insertaba el pedido directo en `orders` con el total que él mismo calculaba. Ahora el
// servidor recalcula todo desde la base (lib/checkoutPricing.ts con la opción `offline`) y crea el pedido con
// service_role: del cliente solo se leen ids, cantidades, datos de contacto, el total que vio (expected_total,
// si no coincide se frena con 409 total_distinto) y el envío que mostró (solo con zonas, y únicamente si es
// el costo de alguna zona configurada). Mercado Pago NO pasa por acá: tiene su ruta (/api/checkout/mp).
//
// Idempotencia: el id lo genera el navegador (se conserva entre reintentos con el mismo contenido). Si el id
// ya existe (23505 sobre el id) se responde éxito sin escribir de nuevo.
// Límite de uso: por IP y por restaurante, FALLA ABIERTO (es un freno anti-abuso, no de integridad: si el
// contador no responde, el pedido pasa).
// Nunca se loguean datos del cliente ni el body: solo códigos e ids.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { CheckoutError, computeOrderTotal } from '@/lib/checkoutPricing';
import { totalsMatch } from '@/lib/mpClientCheckout';
import { buildOrderItems } from '@/lib/orderItems';
import { ORDER_MAX_BODY_BYTES, parseOrderRequest } from '@/lib/orderCheckout';
import { isDuplicateOrderIdError } from '@/lib/orderPolling';
import { limitByIp, limitByRestaurant } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';

export const dynamic = 'force-dynamic';

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  // --- Límite por IP (antes de leer el body o la base) ---
  const ipLimited = await limitByIp(req, 'neworder', RATE_LIMITS.newOrderPerIp, 'open');
  if (ipLimited) return ipLimited;

  // --- Body ---
  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > ORDER_MAX_BODY_BYTES) return fail('body_demasiado_grande', 413);
    body = JSON.parse(raw);
  } catch {
    return fail('body_invalido', 400);
  }
  const parsed = parseOrderRequest(body);
  if (!parsed.ok) return fail(parsed.error, parsed.status);
  const o = parsed.value;

  const db = getSupabaseAdmin();

  // --- Restaurante ---
  const { data: restaurant, error: restError } = await db
    .from('restaurants')
    .select('id, subscription_plan, current_shift_id')
    .eq('id', o.restaurantId)
    .maybeSingle();
  if (restError) {
    console.error('[checkout/order] error leyendo restaurante:', restError.message);
    return fail('error_datos', 500);
  }
  if (!restaurant) return fail('restaurante_no_encontrado', 404);

  // --- Total (recalculado desde la base) ---
  let priced;
  try {
    priced = await computeOrderTotal(restaurant.id, o.cart, o.orderType, {
      db,
      couponCode: o.couponCode,
      offline: { paymentMethod: o.paymentMethod, clientShipping: o.clientShipping },
    });
  } catch (err: any) {
    if (err instanceof CheckoutError) {
      if (err.code === 'error_datos') {
        console.error('[checkout/order] error calculando total:', err.message);
        return fail('error_datos', 500);
      }
      return fail(err.code, 400);
    }
    console.error('[checkout/order] error inesperado calculando total:', err?.message);
    return fail('error_datos', 500);
  }

  // El cliente vio otro total (menú, cupón o descuentos cambiaron): se frena ANTES de escribir nada
  if (o.expectedTotal !== null && !totalsMatch(o.expectedTotal, priced.total)) {
    return NextResponse.json({ error: 'total_distinto', total: priced.total }, { status: 409 });
  }

  // --- Límite por restaurante (después de validar: solo cuentan los pedidos que llegarían a crearse) ---
  const restaurantLimited = await limitByRestaurant(restaurant.id, RATE_LIMITS.newOrderPerRestaurant, 'open', 'neworder');
  if (restaurantLimited) return restaurantLimited;

  // --- Turno de caja: el activo o get_or_create_shift. Si falla NO se pierde el pedido (shift_id null) ---
  let shiftId: string | null = restaurant.current_shift_id ?? null;
  if (!shiftId) {
    const { data: autoShift, error: shiftError } = await db.rpc('get_or_create_shift', { p_restaurant_id: restaurant.id });
    if (shiftError) {
      console.error(`[checkout/order] pedido ${o.orderId}: get_or_create_shift falló — pedido sin turno:`, shiftError.message);
    } else {
      shiftId = autoShift ?? null;
    }
  }

  // --- Pedido ---
  const { error: insertError } = await db.from('orders').insert({
    id: o.orderId,
    restaurant_id: restaurant.id,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    address: o.address,
    order_type: o.orderType,
    payment_method: o.paymentMethod,
    total: priced.total,
    status: 'pendiente',
    delivery_cost: priced.shipping,
    origin_plan: restaurant.subscription_plan,
    items: buildOrderItems(priced.lines),
    table_number: o.tableNumber,
    description: o.notes,
    coupon_code: priced.couponCode,
    discount_amount: priced.discountTotal,
    scheduled_delivery_time: o.scheduledDeliveryTime,
    shift_id: shiftId,
    payment_status: 'pendiente',
    pago_confirmado: false,
  });
  if (insertError && !isDuplicateOrderIdError(insertError)) {
    console.error(`[checkout/order] pedido ${o.orderId}: no se pudo crear:`, insertError.code, insertError.message);
    return fail('error_datos', 500);
  }

  return NextResponse.json({
    order_id: o.orderId,
    total: priced.total,
    delivery_cost: priced.shipping,
    discount_amount: priced.discountTotal,
    duplicate: !!insertError,
  });
}
