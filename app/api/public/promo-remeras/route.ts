// GET /api/public/promo-remeras — contador público de la promo de remeras: { paid, slots: 10, full }.
// Cuenta (service role, lista cerrada de columnas) los locales creados entre el 2026-11-01 y el 2026-11-30 (hora
// Argentina) con first_paid_at no nulo y hasta el 2026-12-15 23:59:59 -03:00, sin los correos de prueba
// (PROMO_EXCLUDED_EMAILS) ni los admin. La lógica está en lib/promoRemeras.ts (scripts/check-promo-remeras.mjs).
// Devuelve solo números: ni correos ni datos de locales. paid va topeado en 10.
// Cache de CDN de 60 s. Límite por IP del endpoint público existente (lib/rateLimit, scope 'public'); si no se
// puede contar, deja pasar. Si falta la columna first_paid_at (42703) responde paid 0.
// Los logs llevan solo un código corto.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { ADMIN_EMAILS } from '@/lib/access';
import { limitByIp } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';
import {
  PROMO_REGISTRATION_START,
  PROMO_REGISTRATION_END_EXCLUSIVE,
  PROMO_PAYMENT_DEADLINE,
  PROMO_REMERAS_SLOTS,
  buildPromoCounter,
  type PromoRestaurantRow,
} from '@/lib/promoRemeras';

export const dynamic = 'force-dynamic';

const CACHED = { 'Cache-Control': 'public, s-maxage=60' };
const NO_STORE = { 'Cache-Control': 'no-store' };
const MAX_ROWS = 2000;

export async function GET(req: Request) {
  const limited = await limitByIp(req, 'public', RATE_LIMITS.publicPerIp, 'open');
  if (limited) {
    limited.headers.set('Cache-Control', 'no-store');
    return limited;
  }

  const { data, error } = await getSupabaseAdmin()
    .from('restaurants')
    .select('id, owner_email, created_at, first_paid_at')
    .gte('created_at', new Date(PROMO_REGISTRATION_START).toISOString())
    .lt('created_at', new Date(PROMO_REGISTRATION_END_EXCLUSIVE).toISOString())
    .not('first_paid_at', 'is', null)
    .lte('first_paid_at', new Date(PROMO_PAYMENT_DEADLINE).toISOString())
    .limit(MAX_ROWS);

  if (error) {
    // 42703 = columna inexistente (falta docs/sql/23_first_paid_at.sql): el contador queda en 0
    if (error.code === '42703') {
      console.error('[public/promo-remeras] falta_first_paid_at 42703');
      return NextResponse.json({ paid: 0, slots: PROMO_REMERAS_SLOTS, full: false }, { headers: CACHED });
    }
    console.error(`[public/promo-remeras] error_datos ${error.code ?? 'sin_codigo'}`);
    return NextResponse.json({ error: 'error_datos' }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json(
    buildPromoCounter((data ?? []) as PromoRestaurantRow[], { excludeEmails: ADMIN_EMAILS }),
    { headers: CACHED },
  );
}
