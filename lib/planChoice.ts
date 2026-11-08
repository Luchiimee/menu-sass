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
