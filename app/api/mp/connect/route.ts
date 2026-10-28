// GET /api/mp/connect — inicia el OAuth (con PKCE) para vincular la cuenta de
// Mercado Pago del restaurante. Redirige a MP; al volver, /api/mp/callback.

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { requirePlan } from '@/lib/planAccess';
import { canUseMpConnect } from '@/lib/access';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  MP_AUTH_URL, OAUTH_STATE_TTL_MS, createPkcePair, createState, getOAuthConfig,
} from '@/lib/mpOAuth';

export const dynamic = 'force-dynamic';

function back(req: Request, reason: string) {
  return NextResponse.redirect(new URL(`/dashboard/pagos?mp=error&reason=${reason}`, req.url));
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  // Disponibilidad (lib/access.ts): antes de tocar la base o llamar a MP
  if (!canUseMpConnect(user.email)) return back(req, 'no_disponible');

  const access = await requirePlan(user.id, ['go', 'plus']);
  if (!access.ok) return back(req, access.reason === 'plan' ? 'plan' : 'account');

  const config = getOAuthConfig();
  if (!config) {
    console.error('[mp/connect] faltan variables MP_OAUTH_CLIENT_ID / MP_OAUTH_CLIENT_SECRET / MP_OAUTH_REDIRECT_URI');
    return back(req, 'config');
  }

  const supabase = getSupabaseAdmin();

  // Limpieza de estados vencidos (best effort)
  await supabase
    .from('mp_oauth_states')
    .delete()
    .lt('created_at', new Date(Date.now() - OAUTH_STATE_TTL_MS).toISOString());

  const state = createState();
  const { verifier, challenge } = createPkcePair();

  const { error } = await supabase.from('mp_oauth_states').insert({
    state,
    restaurant_id: access.restaurant.id,
    user_id: user.id,
    code_verifier: verifier,
  });
  if (error) {
    console.error('[mp/connect] no se pudo guardar el state:', error.message);
    return back(req, 'state');
  }

  const url = new URL(MP_AUTH_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('platform_id', 'mp');
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return NextResponse.redirect(url.toString());
}
