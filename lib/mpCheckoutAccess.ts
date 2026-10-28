// Quién puede cobrar online con MP Connect. SOLO servidor (service_role).
// La regla está en lib/mpCheckoutGate.ts (interruptor del dueño + lanzamiento +
// plan/suscripción); acá solo se conecta con la base y con access/planAccess reales.

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { canUseMpConnect } from '@/lib/access';
import { requirePlan } from '@/lib/planAccess';
import { isMpCheckoutEnabledCore } from '@/lib/mpCheckoutGate';

export async function isMpCheckoutEnabled(restaurant: { id: string }): Promise<boolean> {
  return isMpCheckoutEnabledCore(restaurant, {
    db: getSupabaseAdmin(),
    canUseMpConnect,
    requirePlan,
  });
}
