// Control de plan del lado del servidor para API routes.
//
// Misma regla que app/dashboard/layout.tsx:125-138:
//   - prueba vencida: status 'trialing' y 14 días desde created_at (mismo
//     cálculo con Math.ceil que el layout);
//   - 'paused' o 'cancelled';
//   - la ventana de gracia (grace_period_until futura) nunca bloquea;
//   - los admins (ADMIN_EMAILS) no se bloquean por estado, pero SÍ por plan
//     (igual que /dashboard/pagos: "sin excepción para admins").

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isPlanId, type PlanId } from '@/lib/plans';
import { isAdminEmail } from '@/lib/access';

const TRIAL_DAYS = 14;
const DAY_MS = 1000 * 60 * 60 * 24;

export type PlanAccessResult =
  | { ok: true; restaurant: { id: string; plan: PlanId } }
  | { ok: false; status: 403 | 404 | 500; reason: 'no_restaurant' | 'plan' | 'trial_expired' | 'paused' | 'cancelled' | 'error' };

function isTrialExpired(createdAt: string | null): boolean {
  if (!createdAt) return false; // el layout asume 14 días restantes sin created_at
  const diffDays = Math.ceil(Math.abs(Date.now() - new Date(createdAt).getTime()) / DAY_MS);
  return TRIAL_DAYS - diffDays <= 0;
}

export async function requirePlan(userId: string, allowedPlans: PlanId[]): Promise<PlanAccessResult> {
  const { data: rest, error } = await getSupabaseAdmin()
    .from('restaurants')
    .select('id, subscription_plan, subscription_status, created_at, grace_period_until, owner_email')
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
    if (status === 'trialing' && isTrialExpired(rest.created_at)) {
      return { ok: false, status: 403, reason: 'trial_expired' };
    }
  }

  return { ok: true, restaurant: { id: rest.id, plan } };
}
