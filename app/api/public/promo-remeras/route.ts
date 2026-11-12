// GET /api/public/promo-remeras — contador público de la promo de remeras: { registered, slots: 10 }.
// Lee (service role, lista cerrada de columnas: id, owner_email, created_at) los locales creados entre el 2026-11-01 y
// el 2026-11-30 (hora Argentina), sin los correos de prueba (PROMO_EXCLUDED_EMAILS) ni los admin (mismo criterio que el
// ranking de SuperAdmin). registered cuenta todos, con o sin cobro y sin tope. No consulta ni devuelve datos de cobros.
// La lógica está en lib/promoRemeras.ts (scripts/check-promo-remeras.mjs). Devuelve solo números: ni correos ni datos
// de locales.
// Cache de CDN de 60 s. Límite por IP del endpoint público existente (lib/rateLimit, scope 'public'); si no se
// puede contar, deja pasar. Un error de la base responde 500 sin cache. Los logs llevan solo un código corto.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { ADMIN_EMAILS } from '@/lib/access';
import { limitByIp } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';
import {
  PROMO_REGISTRATION_START,
  PROMO_REGISTRATION_END_EXCLUSIVE,
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
    .select('id, owner_email, created_at')
    .gte('created_at', new Date(PROMO_REGISTRATION_START).toISOString())
    .lt('created_at', new Date(PROMO_REGISTRATION_END_EXCLUSIVE).toISOString())
    .limit(MAX_ROWS);

  if (error) {
    console.error(`[public/promo-remeras] error_datos ${error.code ?? 'sin_codigo'}`);
    return NextResponse.json({ error: 'error_datos' }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json(
    buildPromoCounter((data ?? []) as PromoRestaurantRow[], { excludeEmails: ADMIN_EMAILS }),
    { headers: CACHED },
  );
}
