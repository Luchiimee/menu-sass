// Límite de uso de los endpoints públicos del checkout con Mercado Pago: claves, hash de la
// IP y decisión de respuesta. Sin imports con alias (@/) para probarlo con
// scripts/check-rate-limit.mjs. El contador vive en la base (docs/sql/15_rate_limits.sql,
// función check_rate_limit) y lo llama lib/rateLimit.ts.
//
// Claves (una por ruta y tipo, para que las ventanas de 1 y 10 minutos no se mezclen):
//   checkout:ip:<hash>   POST /api/checkout/mp, por IP
//   checkout:rid:<uuid>  POST /api/checkout/mp, por restaurante
//   public:ip:<hash>     GET /api/checkout/mp/available y /status, por IP
//   quote:ip:<hash>      POST /api/checkout/mp/quote, por IP
//   order:ip:<hash>      GET /api/public/order/[id], por IP
//   order:id:<uuid>      GET /api/public/order/[id], por pedido
//   quote:rid:<uuid>     POST /api/checkout/mp/quote, por restaurante
// La IP nunca se guarda ni se loguea: solo su sha-256 con sal (RATE_LIMIT_IP_SALT).

import { createHash } from 'node:crypto';

export type LimitRule = { limit: number; windowSeconds: number };

// Límites iniciales: cambiarlos acá
export const RATE_LIMITS = {
  // Crear un pago: cada request escribe en pending_mp_orders y crea una preference en MP
  checkoutPerIp: { limit: 10, windowSeconds: 10 * 60 },
  checkoutPerRestaurant: { limit: 60, windowSeconds: 10 * 60 },
  // Consultas del checkout (¿hay MP? / estado del pago)
  publicPerIp: { limit: 60, windowSeconds: 60 },
  // Seguimiento del pedido: cada cliente consulta cada 5 s (~12 por minuto, ~13 con la limpieza del carrito), y el wifi de un local
  // pone a muchos detrás de la misma IP pública: tope alto por IP y tope bajo por pedido
  orderPerIp: { limit: 600, windowSeconds: 60 },
  orderPerOrder: { limit: 30, windowSeconds: 60 },
  // Llamar al mozo (POST /api/public/table/call): pocas llamadas por IP y menos por pedido (contador propio,
  // no comparte clave con el seguimiento del pedido)
  tableCallPerIp: { limit: 10, windowSeconds: 60 },
  tableCallPerOrder: { limit: 3, windowSeconds: 60 },
  // Cotizar un envío: cada una puede costar una llamada a Google Geocoding (más bajo que el pago)
  quotePerIp: { limit: 6, windowSeconds: 10 * 60 },
  quotePerRestaurant: { limit: 40, windowSeconds: 10 * 60 },
  // Importar productos desde CSV (POST /api/products/import): hasta 500 filas por request, así que pocas por local
  importPerRestaurant: { limit: 6, windowSeconds: 10 * 60 },
} satisfies Record<string, LimitRule>;

export type LimitScope = 'checkout' | 'public' | 'quote' | 'order' | 'tablecall' | 'import';

// En Vercel, x-real-ip y x-forwarded-for los pone la plataforma con la IP del cliente
// (sobrescribe lo que mande el cliente). Se prefiere x-real-ip; si no, la primera de
// x-forwarded-for. Sin ninguna (ej. local) → null.
export function clientIp(headers: { get(name: string): string | null }): string | null {
  const clean = (v: string | null | undefined) => {
    const s = (v ?? '').trim();
    return s.length > 0 && s.length <= 64 ? s : null;
  };
  return clean(headers.get('x-real-ip')) ?? clean((headers.get('x-forwarded-for') ?? '').split(',')[0]);
}

export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

// Sin IP, todas esas requests comparten un mismo contador
export function ipKey(scope: LimitScope, ipHash: string | null): string {
  return `${scope}:ip:${ipHash ?? 'desconocida'}`;
}

// Un contador por pedido (el id ya se validó como UUID v4 antes de llegar acá)
export function orderKey(orderId: string): string {
  return `order:id:${orderId.toLowerCase()}`;
}

export function restaurantKey(restaurantId: string, scope: Exclude<LimitScope, 'public'> = 'checkout'): string {
  return `${scope}:rid:${restaurantId.toLowerCase()}`;
}

// Un contador por pedido para llamar al mozo (el id ya se validó como UUID v4). Clave distinta de orderKey.
export function tableCallKey(orderId: string): string {
  return `tablecall:id:${orderId.toLowerCase()}`;
}

export type LimitCheckResult = { allowed: boolean; retryAfter: number };

// Fila que devuelve check_rate_limit vía rpc (array con una fila). null si no tiene la forma esperada.
export function parseLimitRow(data: unknown): LimitCheckResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const { allowed, retry_after } = row as { allowed?: unknown; retry_after?: unknown };
  if (typeof allowed !== 'boolean') return null;
  const retryAfter = Number(retry_after);
  return { allowed, retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : 1 };
}

// closed: si no se pudo contar, no se deja pasar (crear pagos). open: se deja pasar (consultas).
export type FailMode = 'closed' | 'open';

export type RateDecision =
  | { kind: 'allow' }
  | { kind: 'limited'; retryAfter: number }
  | { kind: 'unavailable' };

export type LimitOutcome = { ok: true; results: LimitCheckResult[] } | { ok: false };

export function decideRateLimit(outcome: LimitOutcome, failMode: FailMode): RateDecision {
  if (!outcome.ok) return failMode === 'closed' ? { kind: 'unavailable' } : { kind: 'allow' };
  const blocked = outcome.results.filter((r) => !r.allowed);
  if (blocked.length === 0) return { kind: 'allow' };
  return { kind: 'limited', retryAfter: Math.max(1, ...blocked.map((r) => r.retryAfter)) };
}

function waitText(seconds: number): string {
  if (seconds < 60) return seconds === 1 ? '1 segundo' : `${seconds} segundos`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
}

export type LimitResponse = { status: 429 | 503; headers: Record<string, string>; body: Record<string, unknown> };

// Respuesta para una decisión que no deja pasar (null si deja pasar). extra se suma al body
// (ej. { available: false } en /available, para que el checkout lo lea igual que antes).
export function rateLimitResponse(decision: RateDecision, extra: Record<string, unknown> = {}): LimitResponse | null {
  if (decision.kind === 'limited') {
    return {
      status: 429,
      headers: { 'Retry-After': String(decision.retryAfter), 'Cache-Control': 'no-store' },
      body: {
        ...extra,
        error: 'demasiados_intentos',
        message: `Hiciste demasiados intentos. Probá de nuevo en ${waitText(decision.retryAfter)}.`,
      },
    };
  }
  if (decision.kind === 'unavailable') {
    return {
      status: 503,
      headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
      body: {
        ...extra,
        error: 'limite_no_disponible',
        message: 'No pudimos iniciar el pago en este momento. Probá de nuevo en unos minutos.',
      },
    };
  }
  return null;
}
