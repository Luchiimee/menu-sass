// GET /api/public/discount-rules?rid=<uuid> — reglas de descuento automático ACTIVAS de un local (envío gratis,
// % por monto, % por pagar en efectivo). PÚBLICO: las lee el carrito del menú, sin sesión.
//
// Por qué existe: desde docs/sql/19 la tabla discount_rules solo la lee el dueño (RLS), así que el navegador del
// cliente ya no las veía y el carrito mostraba el total SIN descuentos, mientras que el servidor
// (POST /api/checkout/order y /api/checkout/mp) sí los aplica. Acá se sirven con service_role y una lista cerrada
// de columnas (son condiciones comerciales que el cliente ve igual en el total; ningún dato privado del local).
// Límite por IP (lib/rateLimit.ts): al pasarse 429; si no se puede contar, sigue (falla abierto).

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { limitByIp } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RULE_COLUMNS = 'id, tipo, monto_minimo, porcentaje, acumulable_efectivo, gana_si_no_acumula, activo';

export async function GET(req: Request) {
  const limited = await limitByIp(req, 'public', RATE_LIMITS.publicPerIp, 'open', { rules: [] });
  if (limited) return limited;

  const rid = new URL(req.url).searchParams.get('rid');
  if (!rid || !UUID.test(rid)) return NextResponse.json({ error: 'restaurante_invalido' }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from('discount_rules')
    .select(RULE_COLUMNS)
    .eq('restaurant_id', rid)
    .eq('activo', true);
  if (error) {
    console.error('[public/discount-rules] error leyendo reglas:', error.code ?? 'sin código');
    return NextResponse.json({ error: 'error_datos' }, { status: 500 });
  }
  return NextResponse.json(
    { rules: data ?? [] },
    // cache corto: un cambio del dueño tarda hasta 30 s en verse
    { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30' } },
  );
}
