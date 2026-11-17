// POST /api/public/reservations — el cliente final reserva una mesa desde el menú público (sin sesión).
// Antes el navegador insertaba directo en `reservations` con la clave pública; ahora el servidor valida
// (lib/publicReservation.ts) y escribe con service_role.
// Respuestas: 200 { ok: true } | 400 datos_invalidos | 404 no_disponible | 409 { fecha_pasada | dia_bloqueado | ya_tiene_reserva }
//   429/503 por límite de uso.
// Límite (lib/rateLimit.ts): 10 cada 10 min por IP y 100 cada 10 min por local; FALLA CERRADO (es una escritura
//   que avisa al dueño: si no se puede contar, no se crea).
// Nunca se loguean datos del cliente ni el body: solo códigos e ids.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { limitByIp, limitByRestaurant } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';
import { RESERVATION_MAX_BODY_BYTES, parseReservationRequest } from '@/lib/publicReservation';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: NO_STORE });

export async function POST(req: Request) {
  const raw = await req.text().catch(() => '');
  if (raw.length === 0 || raw.length > RESERVATION_MAX_BODY_BYTES) return fail('datos_invalidos', 400);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail('datos_invalidos', 400);
  }

  const parsed = parseReservationRequest(body);
  if (!parsed.ok) return fail(parsed.error, 400);
  const r = parsed.value;

  const ipLimited = await limitByIp(req, 'reservation', RATE_LIMITS.reservationPerIp, 'closed');
  if (ipLimited) return ipLimited;
  const ridLimited = await limitByRestaurant(r.restaurantId, RATE_LIMITS.reservationPerRestaurant, 'closed', 'reservation');
  if (ridLimited) return ridLimited;

  const db = getSupabaseAdmin();

  const { data: rest, error: restErr } = await db
    .from('restaurants')
    .select('id, reservations_enabled')
    .eq('id', r.restaurantId)
    .maybeSingle();
  if (restErr) {
    console.error(`[public/reservations] error_local ${restErr.code ?? 'sin_codigo'} rid=${r.restaurantId}`);
    return fail('error_datos', 500);
  }
  if (!rest || !rest.reservations_enabled) return fail('no_disponible', 404);

  const { data: blocked, error: blockedErr } = await db
    .from('blocked_dates')
    .select('id')
    .eq('restaurant_id', r.restaurantId)
    .eq('blocked_date', r.date)
    .limit(1);
  if (blockedErr) {
    console.error(`[public/reservations] error_bloqueo ${blockedErr.code ?? 'sin_codigo'} rid=${r.restaurantId}`);
    return fail('error_datos', 500);
  }
  if (blocked && blocked.length > 0) return fail('dia_bloqueado', 409);

  const { data: dup, error: dupErr } = await db
    .from('reservations')
    .select('id')
    .eq('restaurant_id', r.restaurantId)
    .eq('customer_phone', r.phone)
    .neq('status', 'cancelada')
    .limit(1);
  if (dupErr) {
    console.error(`[public/reservations] error_duplicada ${dupErr.code ?? 'sin_codigo'} rid=${r.restaurantId}`);
    return fail('error_datos', 500);
  }
  if (dup && dup.length > 0) return fail('ya_tiene_reserva', 409);

  const { error: insErr } = await db.from('reservations').insert({
    restaurant_id: r.restaurantId,
    customer_name: r.name,
    customer_lastname: r.lastname,
    customer_phone: r.phone,
    reservation_date: r.date,
    reservation_time: r.time,
    guests: r.guests,
    notes: r.notes || null,
    status: 'pendiente',
  });
  if (insErr) {
    console.error(`[public/reservations] error_insert ${insErr.code ?? 'sin_codigo'} rid=${r.restaurantId}`);
    return fail('error_datos', 500);
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
