// Quién puede cobrar online con MP Connect. SOLO servidor (service_role).
//
// Reglas, todas necesarias:
//   1. lanzamiento: MP_CONNECT_PUBLIC activo o el dueño es admin (ADMIN_EMAILS),
//      la misma puerta que lib/access.ts canUseMpConnect usa para conectar;
//   2. plan GO o Plus y suscripción no bloqueada (pausada, cancelada o prueba
//      vencida), con la misma regla que requirePlan aplicada al user_id dueño.

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { canUseMpConnect } from '@/lib/access';
import { requirePlan } from '@/lib/planAccess';

export async function isMpCheckoutEnabled(restaurant: { id: string }): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('restaurants')
    .select('id, user_id, owner_email')
    .eq('id', restaurant.id)
    .maybeSingle();
  if (error) {
    console.error('[mpCheckoutAccess] error leyendo restaurante:', error.message);
    return false;
  }
  if (!data || !data.user_id) return false;

  if (!canUseMpConnect(data.owner_email)) return false;

  const access = await requirePlan(data.user_id, ['go', 'plus']);
  // requirePlan busca por user_id: tiene que ser este mismo restaurante
  return access.ok && access.restaurant.id === data.id;
}
