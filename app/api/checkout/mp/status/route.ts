// GET /api/checkout/mp/status?id=<uuid> — estado de un pedido pendiente de MP.
// PÚBLICO: lo consulta la pantalla de retorno (?mp=...&ref=<id>). El uuid del
// pendiente (122 bits aleatorios) hace de credencial. Devuelve solo
// { state, order_id? }; la lógica y el TODO de rate limit están en
// lib/mpCheckoutPublic.ts.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getCheckoutStatus } from '@/lib/mpCheckoutPublic';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  const result = await getCheckoutStatus(getSupabaseAdmin(), id);
  return NextResponse.json(result.body, {
    status: result.http,
    headers: { 'Cache-Control': 'no-store' },
  });
}
