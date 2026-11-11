// GET /api/admin/promo-remeras — ranking de la promo de remeras para el SuperAdmin.
// Solo admins del panel interno (hasAdminSnappyAccess). Lee con service role los locales creados entre el
// 2026-11-01 y el 2026-11-30 (hora Argentina) y devuelve el orden por primer pago (restaurants.first_paid_at,
// docs/sql/23_first_paid_at.sql), con puesto 1 a 10 y la marca fuera_de_plazo. La lógica está en
// lib/promoRemeras.ts (probada sin red en scripts/check-promo-remeras.mjs).
// Sin first_paid_at en la base (el script 23 sin correr) responde 503 con un código corto.
// Los logs llevan solo un código corto: nunca correos ni datos de locales.

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { ADMIN_EMAILS, hasAdminSnappyAccess } from '@/lib/access';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  PROMO_REGISTRATION_START,
  PROMO_REGISTRATION_END_EXCLUSIVE,
  buildPromoRemerasResponse,
  type PromoRestaurantRow,
} from '@/lib/promoRemeras';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const MAX_ROWS = 2000;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401, headers: NO_STORE });
  if (!hasAdminSnappyAccess(user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403, headers: NO_STORE });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('restaurants')
    .select('id, name, owner_email, created_at, first_paid_at, subscription_plan, subscription_status')
    .gte('created_at', new Date(PROMO_REGISTRATION_START).toISOString())
    .lt('created_at', new Date(PROMO_REGISTRATION_END_EXCLUSIVE).toISOString())
    .limit(MAX_ROWS);

  if (error) {
    // 42703 = columna inexistente: falta correr docs/sql/23_first_paid_at.sql
    if (error.code === '42703') {
      console.error('[admin/promo-remeras] falta_first_paid_at 42703');
      return NextResponse.json({ error: 'falta_first_paid_at' }, { status: 503, headers: NO_STORE });
    }
    console.error(`[admin/promo-remeras] error_datos ${error.code ?? 'sin_codigo'}`);
    return NextResponse.json({ error: 'error_datos' }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json(
    buildPromoRemerasResponse((data ?? []) as PromoRestaurantRow[], { excludeEmails: ADMIN_EMAILS }),
    { headers: NO_STORE },
  );
}
