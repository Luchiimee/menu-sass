// Fuente única de verdad para los planes y sus precios.
// Sin imports de servidor: se usa tanto en API routes como en componentes cliente.

export const PLAN_IDS = ['light', 'go', 'plus'] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_PRICES: Record<PlanId, number> = {
  light: 15000,
  go:    22000,
  plus:  35000,
};

// Precios tachados que se muestran en la UI (explícitos, no calculados).
export const PLAN_ORIGINAL_PRICES: Record<PlanId, number> = {
  light: 19500,
  go:    28600,
  plus:  45500,
};

const FALLBACK_PLAN_AMOUNT = 22000;

export function isPlanId(plan: unknown): plan is PlanId {
  return typeof plan === 'string' && (PLAN_IDS as readonly string[]).includes(plan);
}

export function getPlanAmount(plan: string | null | undefined): number {
  if (isPlanId(plan)) return PLAN_PRICES[plan];
  console.error(`[plans] getPlanAmount: plan desconocido (${JSON.stringify(plan)}) — usando fallback ${FALLBACK_PLAN_AMOUNT}`);
  return FALLBACK_PLAN_AMOUNT;
}

// $15.000
export function formatARS(n: number): string {
  return `$${n.toLocaleString('es-AR')}`;
}
