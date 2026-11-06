// Control de plan del lado del servidor para API routes.
//
// Misma intención que app/dashboard/layout.tsx:125-138 (que todavía usa la cuenta vieja con
// Math.ceil: se migra a lib/trial en otro paso):
//   - prueba vencida: status 'trialing' y la prueba terminó a las 00:00 hora Argentina del
//     día 15 desde created_at (regla única en lib/trial.ts); un local con tarjeta guardada
//     (mp_card_id) no se bloquea: espera el cobro del cron;
//   - 'paused' o 'cancelled';
//   - la ventana de gracia (grace_period_until futura) nunca bloquea;
//   - los admins (ADMIN_EMAILS) no se bloquean por estado, pero SÍ por plan
//     (igual que /dashboard/pagos: "sin excepción para admins").

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isPlanId, type PlanId } from '@/lib/plans';
import { isAdminEmail } from '@/lib/access';
import { isTrialBlocking } from '@/lib/trial';

export type PlanAccessResult =
  | { ok: true; restaurant: { id: string; plan: PlanId } }
  | { ok: false; status: 403 | 404 | 500; reason: 'no_restaurant' | 'plan' | 'trial_expired' | 'paused' | 'cancelled' | 'error' };

export async function requirePlan(userId: string, allowedPlans: PlanId[]): Promise<PlanAccessResult> {
  const { data: rest, error } = await getSupabaseAdmin()
    .from('restaurants')
    .select('id, subscription_plan, subscription_status, created_at, grace_period_until, owner_email, mp_card_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[planAccess] error leyendo restaurante:', error.message);
    return { ok: false, status: 500, reason: 'error' };
  }
  if (!rest) return { ok: false, status: 404, reason: 'no_restaurant' };

  const plan = rest.subscription_plan;
  if (!isPlanId(plan) || !allowedPlans.includes(plan)) {
    return { ok: false, status: 403, reason: 'plan' };
  }

  const inGrace = !!rest.grace_period_until && new Date(rest.grace_period_until) > new Date();
  const isAdmin = isAdminEmail(rest.owner_email);

  if (!inGrace && !isAdmin) {
    const status = rest.subscription_status;
    if (status === 'paused') return { ok: false, status: 403, reason: 'paused' };
    if (status === 'cancelled') return { ok: false, status: 403, reason: 'cancelled' };
    if (isTrialBlocking({ status, createdAt: rest.created_at, hasCard: !!rest.mp_card_id, now: new Date() })) {
      return { ok: false, status: 403, reason: 'trial_expired' };
    }
  }

  return { ok: true, restaurant: { id: rest.id, plan } };
}
