// GET /api/public/tables?restaurant=<uuid> — mesas de un local para el selector del cliente, sin la
// clave pública sobre `tables`. PÚBLICO. Lista cerrada de columnas (lib/publicTable): devuelve solo
// { id, name, reserved }, nunca description, needs_attention ni reservation_info.
// Respuesta uniforme: un id inválido, un local inexistente o un local sin mesas dan lo mismo,
// { tables: [] } con 200. Límite: publicPerIp (60 por minuto por IP); si no se puede contar, deja pasar.
// ADITIVO: nada del cliente llama todavía a este endpoint.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { limitByIp } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';
import { isValidRestaurantId } from '@/lib/publicOrder';
import { PUBLIC_TABLE_SELECT, toPublicTable } from '@/lib/publicTable';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const MAX_TABLES = 500;

export async function GET(req: Request) {
  const limited = await limitByIp(req, 'public', RATE_LIMITS.publicPerIp, 'open', { tables: [] });
  if (limited) {
    limited.headers.set('Cache-Control', 'no-store');
    return limited;
  }

  const restaurant = new URL(req.url).searchParams.get('restaurant');
  if (!isValidRestaurantId(restaurant)) return NextResponse.json({ tables: [] }, { headers: NO_STORE });

  const { data, error } = await getSupabaseAdmin()
    .from('tables')
    .select(PUBLIC_TABLE_SELECT)
    .eq('restaurant_id', restaurant.toLowerCase())
    .order('name', { ascending: true })
    .limit(MAX_TABLES);

  if (error) {
    console.error(`[public/tables] error_datos ${error.code ?? 'sin_codigo'}`);
    return NextResponse.json({ error: 'error_datos' }, { status: 500, headers: NO_STORE });
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return NextResponse.json({ tables: rows.map(toPublicTable) }, { headers: NO_STORE });
}
