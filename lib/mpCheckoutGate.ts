// Puerta de acceso al checkout con Mercado Pago, sin imports con alias (@/): las
// dependencias llegan inyectadas, así se prueba con scripts/check-mp-checkout-access.mjs.
// lib/mpCheckoutAccess.ts la conecta con la base y con access/planAccess reales.
//
// Reglas, todas necesarias:
//   1. el dueño activó "Cobrar con Mercado Pago" (restaurants.mp_checkout_enabled
//      === true; columna ausente, null o error de lectura → false);
//   2. lanzamiento: MP_CONNECT_PUBLIC activo o el dueño es admin (canUseMpConnect);
//   3. plan GO o Plus y suscripción no bloqueada (pausada, cancelada o prueba
//      vencida), con la misma regla que requirePlan aplicada al user_id dueño.
// Las credenciales 'connected' las verifican por separado /available y el POST.

import type { SupabaseClient } from '@supabase/supabase-js';

export type MpGateDeps = {
  db: SupabaseClient;
  canUseMpConnect: (ownerEmail?: string | null) => boolean;
  requirePlan: (userId: string, plans: any[]) => Promise<any>;
};

export async function isMpCheckoutEnabledCore(restaurant: { id: string }, deps: MpGateDeps): Promise<boolean> {
  const { data, error } = await deps.db
    .from('restaurants')
    .select('id, user_id, owner_email, mp_checkout_enabled')
    .eq('id', restaurant.id)
    .maybeSingle();
  if (error) {
    // Incluye "la columna no existe": falla cerrado
    console.error('[mpCheckoutAccess] error leyendo restaurante:', error.message);
    return false;
  }
  if (!data || !data.user_id) return false;

  // Interruptor del dueño: estrictamente true (null, undefined o false → no)
  if (data.mp_checkout_enabled !== true) return false;

  if (!deps.canUseMpConnect(data.owner_email)) return false;

  const access = await deps.requirePlan(data.user_id, ['go', 'plus']);
  // requirePlan busca por user_id: tiene que ser este mismo restaurante
  return !!access?.ok && access.restaurant?.id === data.id;
}
