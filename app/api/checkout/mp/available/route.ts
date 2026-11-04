// GET /api/checkout/mp/available?rid=<uuid> — ¿el restaurante puede cobrar con MP?
// PÚBLICO: lo consulta el checkout para decidir si muestra "Pagar con Mercado Pago".
// Devuelve SOLO { available: boolean }: nunca el motivo ni emails (la lógica de
// lanzamiento/admin queda en el servidor). Límite por IP (lib/rateLimit.ts): al pasarse,
// 429 con { available: false }; si no se puede contar, sigue sin límite (falla abierto).

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isMpCheckoutEnabled } from '@/lib/mpCheckoutAccess';
import { getCheckoutAvailability } from '@/lib/mpCheckoutPublic';
import { limitByIp } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const limited = await limitByIp(req, 'public', RATE_LIMITS.publicPerIp, 'open', { available: false });
  if (limited) return limited;

  const rid = new URL(req.url).searchParams.get('rid');
  const result = await getCheckoutAvailability({ db: getSupabaseAdmin(), isEnabled: isMpCheckoutEnabled }, rid);
  return NextResponse.json(result, {
    // cache corto: un cambio de plan o de conexión tarda hasta 30 s en verse
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30' },
  });
}
