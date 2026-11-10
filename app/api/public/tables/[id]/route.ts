// GET /api/public/tables/[id] — nombre de UNA mesa para la etiqueta del QR (?mesa=<id>), sin la clave
// pública sobre `tables`. PÚBLICO: el id de la mesa (UUID) hace de token. Devuelve solo { name }.
// Id inválido o inexistente: 404 { error: 'not_found' } igual en los dos casos.
// Límite: publicPerIp (60 por minuto por IP); si no se puede contar, deja pasar.
// ADITIVO: nada del cliente llama todavía a este endpoint.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { limitByIp } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';
import { isValidTableId } from '@/lib/publicTable';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const notFound = () => NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limited = await limitByIp(req, 'public', RATE_LIMITS.publicPerIp, 'open');
  if (limited) {
    limited.headers.set('Cache-Control', 'no-store');
    return limited;
  }

  const { id } = await ctx.params;
  if (!isValidTableId(id)) return notFound();

  const { data, error } = await getSupabaseAdmin()
    .from('tables')
    .select('name')
    .eq('id', id.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error(`[public/tables] error_datos ${error.code ?? 'sin_codigo'}`);
    return NextResponse.json({ error: 'error_datos' }, { status: 500, headers: NO_STORE });
  }
  const name = (data as { name?: unknown } | null)?.name;
  if (typeof name !== 'string' || name.length === 0) return notFound();
  return NextResponse.json({ name }, { headers: NO_STORE });
}
