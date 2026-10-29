// POST /api/checkout/mp — checkout online con Mercado Pago (MP Connect, fase 2).
// PÚBLICO: lo llama el cliente del menú, sin sesión. Recalcula el total desde la
// base (lib/checkoutPricing.ts), guarda el pedido en pending_mp_orders y crea una
// preference en la cuenta de MP del restaurante. Devuelve solo { init_point, ref, total }.
// El pedido real (orders) lo crea el webhook en la fase 3: acá no se toca orders.
//
// TODO(rate limit): esta ruta es pública y escribe en la base y llama a MP por
// cada request. El repo no tiene rate limit todavía: ponerlo (por IP y por
// restaurante) ANTES de abrir MP_CONNECT_PUBLIC. Hoy solo la usan los admins.
//
// Nunca se loguean tokens, el body del cliente ni respuestas de MP: solo
// códigos y ids.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { refreshIfNeeded, checkoutTokenOutcome } from '@/lib/mpSellerToken';
import { isMpCheckoutEnabled } from '@/lib/mpCheckoutAccess';
import { isRestaurantOpen } from '@/lib/businessHours';
import { CheckoutError, computeOrderTotal } from '@/lib/checkoutPricing';
import { totalsMatch } from '@/lib/mpClientCheckout';

export const dynamic = 'force-dynamic';

const MP_PREFERENCES_URL = 'https://api.mercadopago.com/checkout/preferences';
const MAX_BODY_BYTES = 64 * 1024;
const MAX_NAME = 80;
const MAX_PHONE = 30;
const MAX_ADDRESS = 200;
const MAX_NOTES = 500;
const PENDING_TTL_MS = 30 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

// string opcional/obligatorio con largo máximo; cualquier otro tipo es inválido
function readText(value: unknown, max: number, required: boolean): string | null | undefined {
  if (value === undefined || value === null || value === '') return required ? undefined : '';
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (text.length === 0) return required ? undefined : '';
  if (text.length > max) return undefined;
  return text;
}

async function markFailed(pendingId: string) {
  const { error } = await getSupabaseAdmin()
    .from('pending_mp_orders')
    .update({ status: 'failed' })
    .eq('id', pendingId)
    .eq('status', 'pending');
  if (error) console.error(`[checkout/mp] no se pudo marcar failed ${pendingId}:`, error.message);
}

export async function POST(req: Request) {
  // --- URL pública de la app: sin ella no se llama a MP ni se escribe nada ---
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/+$/, '');
  if (!appUrl) {
    console.error('[checkout/mp] falta NEXT_PUBLIC_APP_URL: no se puede armar notification_url ni back_urls');
    return fail('config', 500);
  }

  // --- Body ---
  let body: any;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return fail('body_demasiado_grande', 413);
    body = JSON.parse(raw);
  } catch {
    return fail('body_invalido', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('body_invalido', 400);

  const restaurantId = body.restaurant_id;
  if (typeof restaurantId !== 'string' || !UUID.test(restaurantId)) return fail('restaurante_invalido', 400);

  const orderType = body.order_type;
  if (orderType === 'mesa') return fail('mesa_no_soportada', 400);
  if (orderType !== 'delivery' && orderType !== 'retiro') return fail('tipo_pedido_invalido', 400);

  const customerName = readText(body.customer_name, MAX_NAME, true);
  const customerPhone = readText(body.customer_phone, MAX_PHONE, true);
  const address = readText(body.address, MAX_ADDRESS, orderType === 'delivery');
  const notes = readText(body.notes, MAX_NOTES, false);
  const couponCode = readText(body.coupon_code, 50, false);
  if (customerName === undefined) return fail('nombre_invalido', 400);
  if (customerPhone === undefined) return fail('telefono_invalido', 400);
  if (address === undefined) return fail('direccion_invalida', 400);
  if (notes === undefined) return fail('notas_invalidas', 400);
  if (couponCode === undefined) return fail('cupon_invalido', 400);
  // Opcional: el total que ve el cliente. Si no coincide con el calculado, no se crea nada.
  const expectedTotal = body.expected_total;
  if (expectedTotal !== undefined && expectedTotal !== null
    && !(typeof expectedTotal === 'number' && Number.isFinite(expectedTotal))) {
    return fail('total_esperado_invalido', 400);
  }

  const db = getSupabaseAdmin();

  // --- Restaurante ---
  const { data: restaurant, error: restError } = await db
    .from('restaurants')
    .select('id, name, slug, always_open, is_open, business_hours')
    .eq('id', restaurantId)
    .maybeSingle();
  if (restError) {
    console.error('[checkout/mp] error leyendo restaurante:', restError.message);
    return fail('error_datos', 500);
  }
  if (!restaurant) return fail('restaurante_no_encontrado', 404);

  // Lanzamiento + plan + suscripción no pausada/cancelada/vencida
  if (!(await isMpCheckoutEnabled(restaurant))) return fail('no_disponible', 403);
  if (!isRestaurantOpen(restaurant)) return fail('cerrado', 409);

  // MP conectado
  const { data: cred, error: credError } = await db
    .from('restaurant_mp_credentials')
    .select('status')
    .eq('restaurant_id', restaurant.id)
    .maybeSingle();
  if (credError) {
    console.error('[checkout/mp] error leyendo credenciales:', credError.message);
    return fail('error_datos', 500);
  }
  if (!cred || cred.status !== 'connected') return fail('mp_no_conectado', 409);

  // --- Total (recalculado desde la base) ---
  let priced;
  try {
    priced = await computeOrderTotal(restaurant.id, body.cart, orderType, { db, couponCode });
  } catch (err: any) {
    if (err instanceof CheckoutError) {
      if (err.code === 'error_datos') {
        console.error('[checkout/mp] error calculando total:', err.message);
        return fail('error_datos', 500);
      }
      return fail(err.code, 400);
    }
    console.error('[checkout/mp] error inesperado calculando total:', err?.message);
    return fail('error_datos', 500);
  }

  // El cliente vio otro total (menú o cupón cambiaron): se frena ANTES de escribir nada
  if (typeof expectedTotal === 'number' && !totalsMatch(expectedTotal, priced.total)) {
    return NextResponse.json({ error: 'total_distinto', total: priced.total }, { status: 409 });
  }

  // --- Pedido pendiente ---
  const expiresAt = new Date(Date.now() + PENDING_TTL_MS);
  const { data: pending, error: insertError } = await db
    .from('pending_mp_orders')
    .insert({
      restaurant_id: restaurant.id,
      status: 'pending',
      total_amount: priced.total,
      expires_at: expiresAt.toISOString(),
      payload: {
        order_type: orderType,
        customer: { name: customerName, phone: customerPhone, address, notes },
        coupon_code: priced.couponCode,
        auto_rule_id: priced.autoRuleId,
        lines: priced.lines,
        amounts: {
          subtotal: priced.subtotal,
          coupon_discount: priced.couponDiscount,
          auto_discount: priced.autoDiscount,
          discount_total: priced.discountTotal,
          shipping: priced.shipping,
          total: priced.total,
        },
      },
    })
    .select('id')
    .single();
  if (insertError || !pending) {
    console.error('[checkout/mp] no se pudo guardar el pedido pendiente:', insertError?.message);
    return fail('error_datos', 500);
  }
  const pendingId: string = pending.id;

  // --- Preference en la cuenta de MP del restaurante ---
  const tokenResult = await refreshIfNeeded(restaurant.id);
  const outcome = checkoutTokenOutcome(tokenResult);
  if (outcome.kind !== 'ok') {
    console.error(`[checkout/mp] ${restaurant.id}: sin token de MP utilizable (${tokenResult.failure ?? 'desconocido'}, pending ${pendingId})`);
    // Fallo de cifrado o transitorio: el pendiente queda pending (vence solo) y no se
    // toca restaurant_mp_credentials; el cliente puede reintentar.
    if (outcome.markPendingFailed) await markFailed(pendingId);
    return fail(outcome.error, outcome.status);
  }
  const token = outcome.token;

  const menuUrl = `${appUrl}/${restaurant.slug}`;
  const preference = {
    items: [
      {
        id: pendingId,
        title: `Pedido en ${restaurant.name}`.slice(0, 120),
        quantity: 1,
        unit_price: priced.total,
        currency_id: 'ARS',
      },
    ],
    external_reference: pendingId,
    // rid: el webhook lo usa para elegir el token del vendedor y lo contrasta con
    // pending_mp_orders.restaurant_id (la firma de MP no lo cubre)
    notification_url: `${appUrl}/api/mp/webhook?rid=${restaurant.id}`,
    // ref = id del pendiente: la pantalla de retorno lo usa con /api/checkout/mp/status.
    // Es nuestro; los parámetros que MP agrega a la vuelta (status, payment_id...) no se usan.
    back_urls: {
      success: `${menuUrl}?mp=success&ref=${pendingId}`,
      pending: `${menuUrl}?mp=pending&ref=${pendingId}`,
      failure: `${menuUrl}?mp=failure&ref=${pendingId}`,
    },
    auto_return: 'approved',
    // Sin pagos en efectivo (Rapipago, Pago Fácil...): se acreditan horas después y la
    // fila pending vence a los 30 min. Campo según la doc de Checkout Pro:
    // payment_methods.excluded_payment_types: [{ id: 'ticket' }].
    payment_methods: { excluded_payment_types: [{ id: 'ticket' }] },
    expires: true,
    expiration_date_from: new Date().toISOString(),
    expiration_date_to: expiresAt.toISOString(),
  };

  let initPoint: string | null = null;
  let preferenceId: string | null = null;
  try {
    const res = await fetch(MP_PREFERENCES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(preference),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data?.init_point !== 'string' || typeof data?.id !== 'string') {
      // Solo status y código corto de MP: nada del cuerpo.
      const code = String(data?.error || data?.status || 'respuesta_invalida').slice(0, 60);
      console.error(`[checkout/mp] preference falló (pending ${pendingId}): http=${res.status} ${code}`);
    } else {
      initPoint = data.init_point;
      preferenceId = data.id;
    }
  } catch (err: any) {
    console.error(`[checkout/mp] preference sin respuesta (pending ${pendingId}): ${String(err?.name ?? 'error')}`);
  }

  if (!initPoint || !preferenceId) {
    await markFailed(pendingId);
    return fail('mp_error', 502);
  }

  const { error: updateError } = await db
    .from('pending_mp_orders')
    .update({ mp_preference_id: preferenceId })
    .eq('id', pendingId);
  if (updateError) {
    // No bloquea: el pago puede seguir y el webhook se resuelve por external_reference.
    console.error(`[checkout/mp] no se pudo guardar mp_preference_id (pending ${pendingId}):`, updateError.message);
  }

  return NextResponse.json({ init_point: initPoint, ref: pendingId, total: priced.total });
}
