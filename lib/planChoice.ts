// Decide si un local puede ELEGIR o cambiar su plan sin pasar por un flujo de cobro.
// Función pura, sin imports con alias (se prueba sin red: scripts/check-plan-choice.mjs).
//
//   'allow'            el plan es light/go/plus y el local está en trialing o sin estado:
//                      alcanza con escribir subscription_plan (no hay cobro que ajustar).
//   'use_billing_flow' active, authorized, paused, cancelled (o cualquier otro estado): el cambio
//                      tiene que pasar por /api/subscriptions/change o save-card, con cobro.
//   'invalid_plan'     el plan pedido no es exactamente 'light', 'go' o 'plus'.

export type PlanChangeDecision = 'allow' | 'use_billing_flow' | 'invalid_plan';

const VALID_PLANS = ['light', 'go', 'plus'];

export function decidePlanChange(
  status: string | null | undefined,
  _currentPlan: string | null | undefined,
  requestedPlan: unknown,
): PlanChangeDecision {
  if (typeof requestedPlan !== 'string' || !VALID_PLANS.includes(requestedPlan)) return 'invalid_plan';
  if (status === null || status === undefined || status === '' || status === 'trialing') return 'allow';
  return 'use_billing_flow';
}

// Puerta de /api/subscriptions/change para la rama SIN suscripción activa (la que solo escribe
// subscription_plan, sin cobro). Con suscripción activa (preapproval + active/authorized) la puerta
// no aplica: ahí manda el flujo de cobro y prorrateo de la ruta.
//   { ok: true }                                  seguir como hoy
//   { ok: false, status: 400, code: 'INVALID_PLAN' }
//   { ok: false, status: 409, code: 'USE_BILLING_FLOW' }   no escribir nada
export type ChangePlanGateRestaurant = {
  mp_preapproval_id?: string | null;
  subscription_status?: string | null;
  subscription_plan?: string | null;
} | null | undefined;

export type ChangePlanGate = { ok: true } | { ok: false; status: 400 | 409; code: 'INVALID_PLAN' | 'USE_BILLING_FLOW' };

export function changePlanGate(restaurant: ChangePlanGateRestaurant, requestedPlan: unknown): ChangePlanGate {
  const status = restaurant?.subscription_status;
  const hasActiveSub = !!restaurant?.mp_preapproval_id && (status === 'active' || status === 'authorized');
  if (hasActiveSub) return { ok: true };

  const decision = decidePlanChange(status, restaurant?.subscription_plan, requestedPlan);
  if (decision === 'invalid_plan') return { ok: false, status: 400, code: 'INVALID_PLAN' };
  if (decision === 'use_billing_flow') return { ok: false, status: 409, code: 'USE_BILLING_FLOW' };
  return { ok: true };
}
