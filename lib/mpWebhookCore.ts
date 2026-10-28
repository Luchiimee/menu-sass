// Lógica del webhook de pagos de MP Connect (POST /api/mp/webhook). SOLO servidor.
//
// Sin imports con alias (@/): se prueba con scripts/check-mp-webhook.mjs usando
// una base y un MP falsos inyectados (`deps`).
//
// Modelo de confianza: del aviso solo se toma data.id (firmado) y el ?rid de la
// URL (NO firmado, lo pone nuestra notification_url). Todo lo demás sale de
// consultar el pago en MP con el token del restaurante `rid` y de pending_mp_orders:
//   - el pago tiene que ser de esa cuenta (collector_id == mp_user_id guardado);
//   - su external_reference tiene que ser una fila de ESE restaurante;
//   - monto exacto en centavos, ARS y status approved.
// El pedido se arma solo con el payload guardado por /api/checkout/mp.
//
// Idempotencia: candado atómico pending|failed → paid, y el pedido se inserta con
// id = id de la fila pending (clave primaria: un segundo insert da 23505).
//
// Nunca se loguean tokens ni cuerpos de MP: solo ids y códigos.

import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// payment_status de un pedido pagado con MP. Un solo lugar por si la base tiene
// un check con otro valor.
export const PAYMENT_STATUS_PAID = 'pagado';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAYMENT_ID = /^\d{1,20}$/;
const UNIQUE_VIOLATION = '23505';

export type FetchPaymentResult =
  | { kind: 'ok'; payment: any }
  | { kind: 'no_token' }    // sin token utilizable para ese restaurante
  | { kind: 'not_found' }   // MP respondió 401/403/404: el pago no es de esa cuenta
  | { kind: 'transient' };  // red, 429 o 5xx: conviene que MP reintente

export type WebhookDeps = {
  db: SupabaseClient;
  fetchPayment: (restaurantId: string, paymentId: string) => Promise<FetchPaymentResult>;
};

export type WebhookInput = {
  secret: string | undefined;
  searchParams: URLSearchParams;
  xSignature: string | null;
  xRequestId: string | null;
  rawBody: string;
};

export type WebhookResponse = { http: 200 | 401 | 500; result: string };

const ok = (result: string): WebhookResponse => ({ http: 200, result });
const retry = (result: string): WebhookResponse => ({ http: 500, result });

// x-signature: "ts=...,v1=..." — manifest id:{data.id};request-id:{x-request-id};ts:{ts};
// HMAC-SHA256 con el secreto de la app, comparado en tiempo constante.
export function isValidMpSignature(
  secret: string,
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null
): boolean {
  if (!xSignature || !dataId) return false;
  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k?.trim(), v?.trim()];
    })
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  // un data.id alfanumérico va en minúsculas según MP
  const id = /[a-zA-Z]/.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${xRequestId};ts:${ts};`;
  const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
  } catch {
    return false; // largos distintos
  }
}

// Punto de entrada: firma (fail closed) → tipo → pago.
export async function handleWebhookRequest(input: WebhookInput, deps: WebhookDeps): Promise<WebhookResponse> {
  if (!input.secret) {
    console.error('[mp/webhook] MP_CONNECT_WEBHOOK_SECRET no configurado — rechazado (fail closed)');
    return { http: 401, result: 'sin_secreto' };
  }

  let body: any = {};
  try {
    body = JSON.parse(input.rawBody);
  } catch {
    body = {};
  }
  const rawId = input.searchParams.get('data.id') ?? body?.data?.id ?? null;
  const dataId = rawId == null ? null : String(rawId);

  if (!isValidMpSignature(input.secret, input.xSignature, input.xRequestId, dataId)) {
    console.error('[mp/webhook] firma inválida o ausente — rechazado');
    return { http: 401, result: 'firma_invalida' };
  }

  const type = body?.type ?? input.searchParams.get('type');
  if (type !== 'payment') return ok('ignorado');

  return processPayment(input.searchParams.get('rid'), dataId, deps);
}

type Cust = { name?: string; phone?: string; address?: string; notes?: string };

// items de orders: mismo formato que el carrito (id, name, price, quantity,
// uniqueId, extrasList[{id, name, price, quantity}]).
function buildItems(lines: any[]) {
  return lines.map((l, i) => {
    const id = l.variationIndex != null ? `${l.productId}-${l.variationIndex}` : String(l.productId);
    return {
      id,
      name: l.name,
      price: l.unitBase,
      quantity: l.quantity,
      uniqueId: `${id}-${i + 1}`,
      extrasList: (l.extras || []).map((e: any) => ({ id: e.extraId, name: e.name, price: e.price, quantity: e.qty })),
    };
  });
}

function isUsablePayload(p: any): boolean {
  return !!p
    && Array.isArray(p.lines) && p.lines.length > 0
    && (p.order_type === 'delivery' || p.order_type === 'retiro')
    && !!p.customer && typeof p.customer.name === 'string'
    && !!p.amounts && Number.isFinite(Number(p.amounts.shipping)) && Number.isFinite(Number(p.amounts.coupon_discount));
}

// Crea el pedido real. Devuelve 'created' | 'exists' | 'error'.
async function createOrder(db: SupabaseClient, pending: any, restaurantId: string): Promise<'created' | 'exists' | 'error'> {
  const payload = pending.payload;
  const customer: Cust = payload.customer;

  const { data: restaurant, error: restError } = await db
    .from('restaurants')
    .select('id, subscription_plan, current_shift_id')
    .eq('id', restaurantId)
    .maybeSingle();
  if (restError || !restaurant) {
    console.error(`[mp/webhook] pending ${pending.id}: no se pudo leer el restaurante:`, restError?.message);
    return 'error';
  }

  // Turno: el activo o get_or_create_shift. Si falla NO se pierde el pedido: se
  // crea con shift_id null y se loguea.
  let shiftId: string | null = restaurant.current_shift_id ?? null;
  if (!shiftId) {
    const { data: autoShift, error: shiftError } = await db.rpc('get_or_create_shift', { p_restaurant_id: restaurantId });
    if (shiftError) {
      console.error(`[mp/webhook] pending ${pending.id}: get_or_create_shift falló — pedido sin turno:`, shiftError.message);
    } else {
      shiftId = autoShift ?? null;
    }
  }

  const { error: insertError } = await db.from('orders').insert({
    id: pending.id, // idempotencia: un segundo insert viola la clave primaria
    restaurant_id: restaurantId,
    customer_name: customer.name,
    customer_phone: customer.phone ?? '',
    address: payload.order_type === 'delivery' ? (customer.address ?? '') : '',
    order_type: payload.order_type,
    payment_method: 'mercadopago',
    total: Number(pending.total_amount),
    status: 'pendiente',
    delivery_cost: Number(payload.amounts.shipping),
    origin_plan: restaurant.subscription_plan,
    items: buildItems(payload.lines),
    table_number: null,
    description: customer.notes ?? '',
    coupon_code: payload.coupon_code ?? null,
    discount_amount: Number(payload.amounts.coupon_discount) || 0, // solo el cupón, como el checkout actual
    scheduled_delivery_time: 'Inmediato',
    shift_id: shiftId,
    pago_confirmado: true,
    payment_status: PAYMENT_STATUS_PAID,
  });
  if (insertError) {
    if ((insertError as any).code === UNIQUE_VIOLATION) return 'exists';
    console.error(`[mp/webhook] pending ${pending.id}: no se pudo crear el pedido:`, insertError.message);
    return 'error';
  }
  return 'created';
}

async function linkOrder(db: SupabaseClient, pendingId: string) {
  const { error } = await db.from('pending_mp_orders').update({ order_id: pendingId }).eq('id', pendingId);
  if (error) {
    // No es grave: el pedido existe y el id coincide con el de la fila.
    console.error(`[mp/webhook] pending ${pendingId}: no se pudo guardar order_id:`, error.message);
  }
}

async function processPayment(rid: string | null, paymentId: string | null, deps: WebhookDeps): Promise<WebhookResponse> {
  const { db } = deps;

  if (!rid || !UUID.test(rid)) {
    console.error('[mp/webhook] aviso sin rid válido en la URL');
    return ok('rid_invalido');
  }
  if (!paymentId || !PAYMENT_ID.test(paymentId)) return ok('id_invalido');

  // Credenciales del restaurante: dan el token (vía fetchPayment) y el mp_user_id
  const { data: cred, error: credError } = await db
    .from('restaurant_mp_credentials')
    .select('mp_user_id, status')
    .eq('restaurant_id', rid)
    .maybeSingle();
  if (credError) {
    console.error(`[mp/webhook] rid ${rid}: error leyendo credenciales:`, credError.message);
    return retry('error_datos');
  }
  if (!cred || cred.status !== 'connected' || !cred.mp_user_id) {
    console.error(`[mp/webhook] rid ${rid}: sin credenciales conectadas`);
    return ok('sin_credenciales');
  }

  // El pago se consulta en MP con el token del vendedor: el cuerpo del aviso no se usa
  const fetched = await deps.fetchPayment(rid, paymentId);
  if (fetched.kind === 'transient') return retry('mp_no_disponible');
  if (fetched.kind === 'no_token') {
    console.error(`[mp/webhook] rid ${rid}: sin token utilizable`);
    return ok('sin_token');
  }
  if (fetched.kind === 'not_found') return ok('pago_no_encontrado');
  const payment = fetched.payment;

  if (String(payment?.id) !== paymentId) return ok('pago_distinto');
  if (String(payment.collector_id) !== String(cred.mp_user_id)) {
    console.error(`[mp/webhook] rid ${rid}: el pago ${paymentId} no es de la cuenta conectada`);
    return ok('collector_distinto');
  }

  const ref = payment.external_reference;
  if (typeof ref !== 'string' || !UUID.test(ref)) return ok('sin_referencia');

  const { data: pending, error: pendingError } = await db
    .from('pending_mp_orders')
    .select('*')
    .eq('id', ref)
    .maybeSingle();
  if (pendingError) {
    console.error(`[mp/webhook] error leyendo pending ${ref}:`, pendingError.message);
    return retry('error_datos');
  }
  if (!pending) {
    console.error(`[mp/webhook] pago ${paymentId}: external_reference sin fila pending`);
    return ok('pending_inexistente');
  }
  if (String(pending.restaurant_id) !== rid) {
    console.error(`[mp/webhook] pago ${paymentId}: la fila ${ref} es de otro restaurante que rid ${rid}`);
    return ok('restaurante_distinto');
  }

  // --- Estados que no crean pedido ---
  const status = payment.status;
  if (status !== 'approved') {
    if (status === 'rejected' || status === 'cancelled') {
      const { error } = await db
        .from('pending_mp_orders')
        .update({ status: 'failed' })
        .eq('id', ref)
        .eq('status', 'pending');
      if (error) {
        console.error(`[mp/webhook] pending ${ref}: no se pudo marcar failed:`, error.message);
        return retry('error_datos');
      }
      return ok('rechazado');
    }
    return ok('no_aprobado'); // pending, in_process, authorized, refunded...
  }

  // --- Aprobado: moneda y monto exacto en centavos ---
  if (payment.currency_id !== 'ARS') {
    console.error(`[mp/webhook] pago ${paymentId}: moneda ${String(payment.currency_id).slice(0, 8)} != ARS`);
    return ok('moneda_distinta');
  }
  const paidCents = Math.round(Number(payment.transaction_amount) * 100);
  const expectedCents = Math.round(Number(pending.total_amount) * 100);
  if (!Number.isFinite(paidCents) || paidCents !== expectedCents) {
    console.error(`[mp/webhook] pago ${paymentId}: monto distinto del pedido ${ref} (${paidCents} vs ${expectedCents} centavos)`);
    return ok('monto_distinto');
  }
  if (!isUsablePayload(pending.payload)) {
    console.error(`[mp/webhook] pending ${ref}: payload inutilizable — cobro sin pedido, reconciliar a mano`);
    return ok('payload_invalido');
  }

  // --- Idempotencia ---
  if (pending.status === 'expired') {
    console.error(`[mp/webhook] pago ${paymentId} aprobado sobre pending ${ref} EXPIRADO — reconciliar a mano`);
    return ok('expirado');
  }
  if (pending.status === 'paid') {
    if (pending.order_id) return ok('ya_procesado');
    if (pending.mp_payment_id && String(pending.mp_payment_id) !== paymentId) {
      console.error(`[mp/webhook] pending ${ref} ya cobrado con otro pago (${pending.mp_payment_id}); pago ${paymentId} duplicado — reconciliar`);
      return ok('pago_duplicado');
    }
    // Cobrado pero sin pedido (la creación falló antes): reintento de recuperación
  } else {
    // Candado atómico: solo uno pasa de pending|failed a paid. 'failed' entra porque
    // un pago rechazado no cierra la preference: el cliente puede reintentar y aprobar.
    const { data: locked, error: lockError } = await db
      .from('pending_mp_orders')
      .update({ status: 'paid', mp_payment_id: paymentId })
      .eq('id', ref)
      .in('status', ['pending', 'failed'])
      .select('id');
    if (lockError) {
      console.error(`[mp/webhook] pending ${ref}: error tomando el candado:`, lockError.message);
      return retry('error_datos');
    }
    if (!locked || locked.length === 0) return ok('ya_tomado'); // otro aviso lo tomó
  }

  // --- Pedido ---
  const created = await createOrder(db, pending, rid);
  if (created === 'error') {
    console.error(`[mp/webhook] COBRO SIN PEDIDO: pending ${ref}, pago ${paymentId} (fila en 'paid', order_id nulo)`);
    return retry('pedido_no_creado'); // MP reintenta y entra por la recuperación
  }
  await linkOrder(db, ref);
  return ok(created === 'created' ? 'pedido_creado' : 'ya_procesado');
}
