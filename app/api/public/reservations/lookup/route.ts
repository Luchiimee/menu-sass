// POST /api/public/reservations/lookup — el cliente final consulta SU reserva por teléfono (sin sesión).
// Body { restaurantId, phone }. Devuelve { reservation } con la lista cerrada de columnas de
// lib/publicReservation.ts (nunca admin_notes ni el teléfono), o { reservation: null } si no hay.
// POST y no GET para que el teléfono no quede en las URLs ni en los logs.
// Límite (lib/rateLimit.ts): 10 cada 10 min por IP; FALLA CERRADO (es un dato personal: sin contador no se responde).
// Nunca se loguean datos del cliente ni el body: solo códigos.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { limitByIp } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';
import { PUBLIC_RESERVATION_SELECT, RESERVATION_MAX_BODY_BYTES, parseLookupRequest, toPublicReservation } from '@/lib/publicReservation';

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

  const parsed = parseLookupRequest(body);
  if (!parsed.ok) return fail('datos_invalidos', 400);

  const limited = await limitByIp(req, 'reslookup', RATE_LIMITS.reservationLookupPerIp, 'closed');
  if (limited) {
    limited.headers.set('Cache-Control', 'no-store');
    return limited;
  }

  const { data, error } = await getSupabaseAdmin()
    .from('reservations')
    .select(PUBLIC_RESERVATION_SELECT)
    .eq('restaurant_id', parsed.value.restaurantId)
    .eq('customer_phone', parsed.value.phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`[public/reservations/lookup] error_datos ${error.code ?? 'sin_codigo'}`);
    return fail('error_datos', 500);
  }
  return NextResponse.json(
    { reservation: data ? toPublicReservation(data as unknown as Record<string, unknown>) : null },
    { headers: NO_STORE },
  );
}
