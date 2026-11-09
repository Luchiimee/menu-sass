// Límite de uso (servidor): cuenta en la base con check_rate_limit (docs/sql/15_rate_limits.sql)
// y devuelve la respuesta 429/503 si no deja pasar. SOLO servidor. La lógica pura (claves,
// hash, decisión) está en lib/rateLimitCore.ts.
//
// Los logs nunca llevan la IP, su hash ni el id del restaurante: solo el tipo de clave.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  clientIp, hashIp, ipKey, orderKey, restaurantKey, parseLimitRow, decideRateLimit, rateLimitResponse,
  type LimitRule, type LimitScope, type FailMode, type LimitCheckResult, type LimitOutcome,
} from '@/lib/rateLimitCore';

type Check = { key: string | null; rule: LimitRule; label: string };

// Cuenta cada clave en orden; si una ya no entra, no suma en las siguientes.
// key null (falta la sal de la IP) o cualquier error de la base → { ok: false }.
async function runChecks(checks: Check[]): Promise<LimitOutcome> {
  const results: LimitCheckResult[] = [];
  for (const check of checks) {
    if (!check.key) {
      console.error(`[rateLimit] ${check.label}: falta RATE_LIMIT_IP_SALT`);
      return { ok: false };
    }
    const { data, error } = await getSupabaseAdmin().rpc('check_rate_limit', {
      p_key: check.key,
      p_limit: check.rule.limit,
      p_window_seconds: check.rule.windowSeconds,
    });
    if (error) {
      console.error(`[rateLimit] ${check.label}: check_rate_limit falló (${error.code ?? 'sin código'})`);
      return { ok: false };
    }
    const result = parseLimitRow(data);
    if (!result) {
      console.error(`[rateLimit] ${check.label}: respuesta inesperada de check_rate_limit`);
      return { ok: false };
    }
    results.push(result);
    if (!result.allowed) break;
  }
  return { ok: true, results };
}

function ipKeyFor(req: Request, scope: LimitScope): string | null {
  const salt = (process.env.RATE_LIMIT_IP_SALT ?? '').trim();
  if (!salt) return null;
  const ip = clientIp(req.headers);
  return ipKey(scope, ip ? hashIp(ip, salt) : null);
}

async function enforce(checks: Check[], failMode: FailMode, extra?: Record<string, unknown>): Promise<NextResponse | null> {
  const decision = decideRateLimit(await runChecks(checks), failMode);
  const response = rateLimitResponse(decision, extra);
  return response ? NextResponse.json(response.body, { status: response.status, headers: response.headers }) : null;
}

// Límite por IP. Devuelve la respuesta a enviar, o null si la request puede seguir.
export function limitByIp(req: Request, scope: LimitScope, rule: LimitRule, failMode: FailMode, extra?: Record<string, unknown>) {
  return enforce([{ key: ipKeyFor(req, scope), rule, label: `${scope}:ip` }], failMode, extra);
}

// Límite del seguimiento de un pedido: por IP y por pedido (las dos claves se cuentan en orden;
// si una no deja pasar, la otra no suma). Cada una falla según failMode.
export function limitByIpAndOrder(req: Request, orderId: string, ipRule: LimitRule, orderRule: LimitRule, failMode: FailMode) {
  return enforce(
    [
      { key: ipKeyFor(req, 'order'), rule: ipRule, label: 'order:ip' },
      { key: orderKey(orderId), rule: orderRule, label: 'order:id' },
    ],
    failMode,
  );
}

// Límite por restaurante (POST /api/checkout/mp y /quote).
export function limitByRestaurant(restaurantId: string, rule: LimitRule, failMode: FailMode, scope: 'checkout' | 'quote' = 'checkout') {
  return enforce([{ key: restaurantKey(restaurantId, scope), rule, label: `${scope}:rid` }], failMode);
}
