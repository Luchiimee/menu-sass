// GET /api/mp/callback — vuelta del OAuth de Mercado Pago.
// Valida el state (existe, un solo uso, < 10 min, del usuario de la sesión),
// canjea el code con PKCE, guarda los tokens CIFRADOS y vuelve a /dashboard/pagos.
// Nunca loguea ni devuelve tokens.

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { requirePlan } from '@/lib/planAccess';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { encrypt } from '@/lib/crypto';
import {
  MP_USERS_ME_URL, OAUTH_STATE_TTL_MS, expiresAtFrom, getOAuthConfig, requestMpToken,
} from '@/lib/mpOAuth';

export const dynamic = 'force-dynamic';

function back(req: Request, result: 'connected' | 'error', reason?: string) {
  const qs = result === 'connected' ? 'mp=connected' : `mp=error&reason=${reason ?? 'unknown'}`;
  return NextResponse.redirect(new URL(`/dashboard/pagos?${qs}`, req.url));
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const code = params.get('code');
  const state = params.get('state');
  const mpError = params.get('error');

  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  // El state se consume siempre (un solo uso), aunque el usuario haya cancelado.
  let stateRow: { restaurant_id: string; user_id: string; code_verifier: string; created_at: string } | null = null;
  if (state) {
    const { data, error } = await getSupabaseAdmin()
      .from('mp_oauth_states')
      .delete()
      .eq('state', state)
      .select('restaurant_id, user_id, code_verifier, created_at')
      .maybeSingle();
    if (error) {
      console.error('[mp/callback] error leyendo state:', error.message);
      return back(req, 'error', 'state');
    }
    stateRow = data;
  }

  if (mpError) {
    console.error(`[mp/callback] MP devolvió error: ${mpError.slice(0, 80)}`);
    return back(req, 'error', 'denied');
  }
  if (!code || !stateRow) return back(req, 'error', 'state');
  if (stateRow.user_id !== user.id) {
    console.error('[mp/callback] state de otro usuario');
    return back(req, 'error', 'state');
  }
  if (Date.now() - new Date(stateRow.created_at).getTime() > OAUTH_STATE_TTL_MS) {
    return back(req, 'error', 'expired');
  }

  const access = await requirePlan(user.id, ['go', 'plus']);
  if (!access.ok) return back(req, 'error', access.reason === 'plan' ? 'plan' : 'account');
  if (access.restaurant.id !== stateRow.restaurant_id) {
    console.error('[mp/callback] el state no corresponde al restaurante del usuario');
    return back(req, 'error', 'state');
  }

  const config = getOAuthConfig();
  if (!config) {
    console.error('[mp/callback] faltan variables MP_OAUTH_*');
    return back(req, 'error', 'config');
  }

  // Canje del code (PKCE)
  const token = await requestMpToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    code_verifier: stateRow.code_verifier,
  });
  if (!token.ok) {
    console.error(`[mp/callback] canje falló: ${token.detail}`);
    return back(req, 'error', 'exchange');
  }

  // Datos de la cuenta: solo id y nickname/email
  let mpUserId: string | null = token.data.user_id != null ? String(token.data.user_id) : null;
  let mpNickname: string | null = null;
  try {
    const me = await fetch(MP_USERS_ME_URL, {
      headers: { Authorization: `Bearer ${token.data.access_token}` },
      cache: 'no-store',
    });
    if (me.ok) {
      const profile = await me.json();
      mpUserId = profile?.id != null ? String(profile.id) : mpUserId;
      mpNickname = profile?.nickname || profile?.email || null;
    } else {
      console.error(`[mp/callback] /users/me http=${me.status}`);
    }
  } catch (err: any) {
    console.error('[mp/callback] /users/me falló:', err?.message);
  }

  let accessEnc: string;
  let refreshEnc: string;
  try {
    accessEnc = encrypt(token.data.access_token);
    refreshEnc = encrypt(token.data.refresh_token);
  } catch (err: any) {
    console.error('[mp/callback] no se pudo cifrar:', err?.message);
    return back(req, 'error', 'config');
  }

  const now = new Date().toISOString();
  const { error: saveError } = await getSupabaseAdmin()
    .from('restaurant_mp_credentials')
    .upsert(
      {
        restaurant_id: access.restaurant.id,
        mp_user_id: mpUserId,
        mp_nickname: mpNickname,
        access_token_enc: accessEnc,
        refresh_token_enc: refreshEnc,
        expires_at: expiresAtFrom(token.data.expires_in),
        status: 'connected',
        connected_at: now,
        updated_at: now,
        last_error: null,
      },
      { onConflict: 'restaurant_id' }
    );
  if (saveError) {
    console.error('[mp/callback] no se pudieron guardar las credenciales:', saveError.message);
    return back(req, 'error', 'save');
  }

  return back(req, 'connected');
}
