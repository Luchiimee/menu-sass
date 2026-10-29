// GET /api/cron/mp-refresh — cron diario de MP Connect.
// Refresca los tokens de vendedor que vencen en menos de 30 días y marca
// 'error' los que MP rechaza (lo hace refreshIfNeeded; un fallo de cifrado o de red
// no cambia la fila). También expira los pedidos
// pendientes de pago vencidos (pending_mp_orders). No devuelve ni loguea
// tokens: solo conteos e ids de restaurante.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { refreshIfNeeded } from '@/lib/mpSellerToken';
import { expirePendingMpOrders } from '@/lib/pendingMpOrders';

export const dynamic = 'force-dynamic';

const THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Independiente del refresh: si falla (p. ej. falta la tabla) no corta el cron
  const expiredOrders = await expirePendingMpOrders();

  const limit = new Date(Date.now() + THRESHOLD_MS).toISOString();
  const { data: rows, error } = await getSupabaseAdmin()
    .from('restaurant_mp_credentials')
    .select('restaurant_id')
    .eq('status', 'connected')
    .lt('expires_at', limit);

  if (error) {
    console.error('[cron/mp-refresh] error en query:', error.message);
    return NextResponse.json({ error: 'query' }, { status: 500 });
  }

  let refreshed = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows ?? []) {
    const { token, refreshed: didRefresh } = await refreshIfNeeded(row.restaurant_id, THRESHOLD_MS);
    if (didRefresh) refreshed++;
    else if (!token) {
      failed++;
      console.error(`[cron/mp-refresh] ${row.restaurant_id}: no se pudo refrescar (ver last_error)`);
    } else skipped++; // otro proceso lo refrescó en el medio
  }

  const summary = { processed: rows?.length ?? 0, refreshed, failed, skipped, expiredOrders };
  console.log('[cron/mp-refresh] Resumen:', summary);
  return NextResponse.json(summary);
}
