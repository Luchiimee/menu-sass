// GET /api/checkout/mp/status?id=<uuid> — estado de un pedido pendiente de MP.
// PÚBLICO: lo consulta la pantalla de retorno (?mp=...&ref=<id>). El uuid del
// pendiente (122 bits aleatorios) hace de credencial. Devuelve solo
// { state, order_id? }; la lógica está en lib/mpCheckoutPublic.ts. Límite por IP
// (lib/rateLimit.ts): al pasarse, 429 (MpReturn espacia las consultas); si no se puede
// contar, sigue sin límite (falla abierto).

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getCheckoutStatus } from '@/lib/mpCheckoutPublic';
import { limitByIp } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const limited = await limitByIp(req, 'public', RATE_LIMITS.publicPerIp, 'open');
  if (limited) return limited;

  const id = new URL(req.url).searchParams.get('id');
  const result = await getCheckoutStatus(getSupabaseAdmin(), id);
  return NextResponse.json(result.body, {
    status: result.http,
    headers: { 'Cache-Control': 'no-store' },
  });
}
