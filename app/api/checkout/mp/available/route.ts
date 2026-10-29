// GET /api/checkout/mp/available?rid=<uuid> — ¿el restaurante puede cobrar con MP?
// PÚBLICO: lo consulta el checkout para decidir si muestra "Pagar con Mercado Pago".
// Devuelve SOLO { available: boolean }: nunca el motivo ni emails (la lógica de
// lanzamiento/admin queda en el servidor). TODO de rate limit en lib/mpCheckoutPublic.ts.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isMpCheckoutEnabled } from '@/lib/mpCheckoutAccess';
import { getCheckoutAvailability } from '@/lib/mpCheckoutPublic';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const rid = new URL(req.url).searchParams.get('rid');
  const result = await getCheckoutAvailability({ db: getSupabaseAdmin(), isEnabled: isMpCheckoutEnabled }, rid);
  return NextResponse.json(result, {
    // cache corto: un cambio de plan o de conexión tarda hasta 30 s en verse
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30' },
  });
}
