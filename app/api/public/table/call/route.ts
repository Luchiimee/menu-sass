// POST /api/public/table/call — "Llamar al mozo" sin la clave pública sobre `tables`.
// Body: { order_id } (UUID v4). PÚBLICO: el id del pedido (aleatorio) hace de token, igual que el
// seguimiento. La mesa NO la elige el cliente: se deduce del pedido.
//   1. el pedido debe existir, no estar completado ni cancelado y tener restaurant_id y table_number
//      (orders.table_number guarda el NOMBRE de la mesa: ver lib/publicTable);
//   2. se buscan las mesas de ESE local y pickTableByName compara el nombre por igualdad (sin
//      comodines): 'one' → update({ needs_attention: true }) solo sobre esa mesa y { ok: true };
//      'none' → 404; 'many' (nombre repetido) → 409. En 'none' y 'many' NO se escribe.
// Todas las respuestas de error llevan un cuerpo genérico (nada del pedido ni de la mesa).
// Límite (lib/rateLimit): 10 por minuto por IP y 3 por minuto por pedido, con contadores propios;
// si no se puede contar, deja pasar. Los logs llevan solo un código corto y el id del pedido.
// ADITIVO: nada del cliente llama todavía a este endpoint.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { limitTableCall } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';
import { isValidOrderId, isValidRestaurantId } from '@/lib/publicOrder';
import { pickTableByName } from '@/lib/publicTable';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const FINAL_STATUSES = ['completado', 'cancelado'];
const MAX_TABLES = 500;

const badRequest = () => NextResponse.json({ error: 'bad_request' }, { status: 400, headers: NO_STORE });
const notFound = () => NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
const ambiguous = () => NextResponse.json({ error: 'ambiguous' }, { status: 409, headers: NO_STORE });
const serverError = () => NextResponse.json({ error: 'error_datos' }, { status: 500, headers: NO_STORE });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest();
  }
  const orderIdRaw = body && typeof body === 'object' ? (body as { order_id?: unknown }).order_id : undefined;
  // Un id inválido no toca el contador ni la base
  if (!isValidOrderId(orderIdRaw)) return badRequest();
  const orderId = orderIdRaw.toLowerCase();

  const limited = await limitTableCall(req, orderId, RATE_LIMITS.tableCallPerIp, RATE_LIMITS.tableCallPerOrder, 'open');
  if (limited) {
    limited.headers.set('Cache-Control', 'no-store');
    return limited;
  }

  const db = getSupabaseAdmin();

  const order = await db
    .from('orders')
    .select('id, restaurant_id, status, table_number')
    .eq('id', orderId)
    .maybeSingle();
  if (order.error) {
    console.error(`[public/table/call] error_pedido ${order.error.code ?? 'sin_codigo'} order=${orderId}`);
    return serverError();
  }
  const o = order.data as { restaurant_id?: unknown; status?: unknown; table_number?: unknown } | null;
  if (!o) return notFound();
  if (typeof o.status === 'string' && FINAL_STATUSES.includes(o.status)) return notFound();
  if (!isValidRestaurantId(o.restaurant_id) || typeof o.table_number !== 'string' || o.table_number.trim().length === 0) {
    return notFound();
  }
  const restaurantId = o.restaurant_id.toLowerCase();

  const tables = await db
    .from('tables')
    .select('id, name')
    .eq('restaurant_id', restaurantId)
    .limit(MAX_TABLES);
  if (tables.error) {
    console.error(`[public/table/call] error_mesas ${tables.error.code ?? 'sin_codigo'} order=${orderId}`);
    return serverError();
  }

  const pick = pickTableByName((tables.data ?? []) as unknown as { id: string; name: unknown }[], o.table_number);
  if (pick.kind === 'none') return notFound();
  if (pick.kind === 'many') {
    console.error(`[public/table/call] mesa_repetida order=${orderId}`);
    return ambiguous();
  }

  // Solo needs_attention, solo esa mesa y solo de ese local
  const upd = await db
    .from('tables')
    .update({ needs_attention: true })
    .eq('id', pick.row.id)
    .eq('restaurant_id', restaurantId)
    .select('id');
  if (upd.error) {
    console.error(`[public/table/call] error_update ${upd.error.code ?? 'sin_codigo'} order=${orderId}`);
    return serverError();
  }
  if (!upd.data || upd.data.length !== 1) return notFound();

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
