// Mantenimiento de pending_mp_orders (docs/sql/11_mp_pending_orders.sql).
// SOLO servidor.

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

// Pasa a 'expired' los pedidos 'pending' cuyo expires_at ya pasó. Solo toca el
// estado: no borra filas. Devuelve cuántos expiró, o null si falló (se loguea).
export async function expirePendingMpOrders(): Promise<number | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('pending_mp_orders')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select('id');
  if (error) {
    console.error('[pendingMpOrders] no se pudieron expirar los vencidos:', error.message);
    return null;
  }
  return data?.length ?? 0;
}
