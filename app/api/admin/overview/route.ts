// GET /api/admin/overview — datos de /admin/snappy (SuperAdmin) sin leer profiles, restaurants ni snappylinks
// desde el navegador. Solo hasAdminSnappyAccess (401 sin sesión, 403 sin acceso). Lee con service role y devuelve
// { rows: [{ profile, restaurant|null }], truncated } con columnas acotadas (lib/adminOverview): sin mp_card_id ni
// mp_preapproval_id (solo has_card) y sin snappylinks (la pantalla no lo muestra).
// Los logs llevan solo un código corto: nunca correos ni datos de locales.

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { hasAdminSnappyAccess } from '@/lib/access';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { ADMIN_PROFILE_SELECT, ADMIN_RESTAURANT_SELECT, buildAdminOverview } from '@/lib/adminOverview';

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
  const [profiles, restaurants] = await Promise.all([
    fetchAllPages<Record<string, unknown>>((from, to) =>
      db.from('profiles').select(ADMIN_PROFILE_SELECT).order('id', { ascending: true }).range(from, to) as never),
    fetchAllPages<Record<string, unknown>>((from, to) =>
      db.from('restaurants').select(ADMIN_RESTAURANT_SELECT).order('id', { ascending: true }).range(from, to) as never),
  ]);

  const error = profiles.error ?? restaurants.error;
  if (error) {
    console.error(`[admin/overview] error_datos ${error.code ?? 'sin_codigo'}`);
    return NextResponse.json({ error: 'error_datos' }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json(
    { rows: buildAdminOverview(profiles.data, restaurants.data), truncated: profiles.truncated || restaurants.truncated },
    { headers: NO_STORE },
  );
}
