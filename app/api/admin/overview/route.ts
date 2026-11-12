// GET /api/admin/overview — datos de /admin/snappy (SuperAdmin) sin leer profiles, restaurants ni snappylinks
// desde el navegador. Solo hasAdminSnappyAccess (401 sin sesión, 403 sin acceso). Lee con service role y devuelve
// { rows: [{ profile, restaurant|null }], truncated } con columnas acotadas (lib/adminOverview): sin mp_card_id ni
// mp_preapproval_id (solo has_card) y sin snappylinks (la pantalla no lo muestra).
// first_paid_at (docs/sql/23_first_paid_at.sql) se pide en una consulta APARTE y tolerante: si la columna todavía
// no existe en la base (42703) o esa consulta falla, la lista sale igual con first_paid_at: null.
// Los logs llevan solo un código corto: nunca correos ni datos de locales.

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { hasAdminSnappyAccess } from '@/lib/access';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { ADMIN_FIRST_PAID_SELECT, ADMIN_PROFILE_SELECT, ADMIN_RESTAURANT_SELECT, buildAdminOverview } from '@/lib/adminOverview';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401, headers: NO_STORE });
  if (!hasAdminSnappyAccess(user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403, headers: NO_STORE });
  }

  const db = getSupabaseAdmin();
  // Más de 1000 filas: se pagina (orden estable por id).
  const [profiles, restaurants, firstPaid] = await Promise.all([
    fetchAllPages<Record<string, unknown>>((from, to) =>
      db.from('profiles').select(ADMIN_PROFILE_SELECT).order('id', { ascending: true }).range(from, to) as never),
    fetchAllPages<Record<string, unknown>>((from, to) =>
      db.from('restaurants').select(ADMIN_RESTAURANT_SELECT).order('id', { ascending: true }).range(from, to) as never),
    // Consulta aparte y tolerante: first_paid_at puede no existir todavía (docs/sql/23_first_paid_at.sql sin correr).
    fetchAllPages<Record<string, unknown>>((from, to) =>
      db.from('restaurants').select(ADMIN_FIRST_PAID_SELECT).order('id', { ascending: true }).range(from, to) as never),
  ]);

  const error = profiles.error ?? restaurants.error;
  if (error) {
    console.error(`[admin/overview] error_datos ${error.code ?? 'sin_codigo'}`);
    return NextResponse.json({ error: 'error_datos' }, { status: 500, headers: NO_STORE });
  }

  // Si la columna no existe (42703) o la consulta falla, la lista sigue con first_paid_at: null. Solo un código corto en el log.
  let firstPaidRows = firstPaid.data;
  if (firstPaid.error) {
    console.error(`[admin/overview] ${firstPaid.error.code === '42703' ? 'first_paid_at_no_existe' : `first_paid_at_error ${firstPaid.error.code ?? 'sin_codigo'}`}`);
    firstPaidRows = [];
  }

  return NextResponse.json(
    { rows: buildAdminOverview(profiles.data, restaurants.data, firstPaidRows), truncated: profiles.truncated || restaurants.truncated },
    { headers: NO_STORE },
  );
}
