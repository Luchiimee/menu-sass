// GET /api/public/order/[id] — el cliente final lee SU pedido sin la clave pública.
// PÚBLICO: el id (UUID v4 aleatorio) hace de token. Devuelve { order } con lista cerrada de
// columnas (lib/publicOrder.ts): nunca nombre, teléfono, dirección, notas, cupón ni turno.
//   ?restaurant=<uuid>  → devuelve SOLO { belongs: boolean } (¿el pedido es de ese local?)
// Id inválido o inexistente: 404 { error: 'not_found' } igual en los dos casos.
// Límite por IP (lib/rateLimit.ts): 120 por minuto; si no se puede contar, deja pasar.
// Los logs llevan solo un código corto y el id del pedido.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { limitByIp } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';
import { PUBLIC_ORDER_SELECT, isValidOrderId, isValidRestaurantId, toPublicOrder } from '@/lib/publicOrder';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const notFound = () => NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await limitByIp(req, 'order', RATE_LIMITS.orderPerIp, 'open');
  if (limited) {
    limited.headers.set('Cache-Control', 'no-store');
    return limited;
  }

  const { id } = await ctx.params;
  if (!isValidOrderId(id)) return notFound();
  const orderId = id.toLowerCase();

  const restaurant = new URL(req.url).searchParams.get('restaurant');
  if (restaurant !== null && !isValidRestaurantId(restaurant)) return notFound();

  const { data, error } = await getSupabaseAdmin()
    .from('orders')
    .select(PUBLIC_ORDER_SELECT)
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    console.error(`[public/order] error_datos ${error.code ?? 'sin_codigo'} order=${orderId}`);
    return NextResponse.json({ error: 'error_datos' }, { status: 500, headers: NO_STORE });
  }
  if (!data) return notFound();

  const row = data as unknown as Record<string, unknown>;
  if (restaurant !== null) {
    const belongs = String(row.restaurant_id ?? '').toLowerCase() === restaurant.toLowerCase();
    return NextResponse.json({ belongs }, { headers: NO_STORE });
  }
  return NextResponse.json({ order: toPublicOrder(row) }, { headers: NO_STORE });
}
