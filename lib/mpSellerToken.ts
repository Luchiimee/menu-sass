// Token de Mercado Pago del VENDEDOR (cada restaurante), para MP Connect.
// getSellerAccessToken() es la ÚNICA forma de obtenerlo: lo descifra y, si
// está por vencer, lo refresca. SOLO servidor; nunca devolverlo al navegador
// ni loguearlo.

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { encrypt, decrypt } from '@/lib/crypto';
import { getOAuthConfig, requestMpToken, expiresAtFrom } from '@/lib/mpOAuth';

const DAY_MS = 24 * 60 * 60 * 1000;
export const REFRESH_THRESHOLD_MS = 7 * DAY_MS;

type CredentialRow = {
  restaurant_id: string;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  expires_at: string | null;
  status: string;
};

async function readRow(restaurantId: string): Promise<CredentialRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('restaurant_mp_credentials')
    .select('restaurant_id, access_token_enc, refresh_token_enc, expires_at, status')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (error) {
    console.error(`[mpSellerToken] error leyendo credenciales de ${restaurantId}:`, error.message);
    return null;
  }
  return data as CredentialRow | null;
}

async function markFailed(restaurantId: string, status: 'expired' | 'error', lastError: string) {
  const { error } = await getSupabaseAdmin()
    .from('restaurant_mp_credentials')
    .update({ status, last_error: lastError.slice(0, 200), updated_at: new Date().toISOString() })
    .eq('restaurant_id', restaurantId);
  if (error) console.error(`[mpSellerToken] no se pudo marcar ${status} a ${restaurantId}:`, error.message);
}

// Refresca el token si vence en menos de thresholdMs. Devuelve el access_token
// vigente (refrescado o no) o null si no hay credenciales usables.
export async function refreshIfNeeded(
  restaurantId: string,
  thresholdMs: number = REFRESH_THRESHOLD_MS
): Promise<{ token: string | null; refreshed: boolean }> {
  const row = await readRow(restaurantId);
  if (!row || row.status !== 'connected' || !row.access_token_enc || !row.refresh_token_enc) {
    return { token: null, refreshed: false };
  }

  let accessToken: string;
  let refreshToken: string;
  try {
    accessToken = decrypt(row.access_token_enc);
    refreshToken = decrypt(row.refresh_token_enc);
  } catch (err: any) {
    console.error(`[mpSellerToken] no se pudo descifrar el token de ${restaurantId}:`, err?.message);
    await markFailed(restaurantId, 'error', 'decrypt');
    return { token: null, refreshed: false };
  }

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (expiresAt - Date.now() > thresholdMs) {
    return { token: accessToken, refreshed: false };
  }

  const config = getOAuthConfig();
  if (!config) {
    console.error('[mpSellerToken] faltan variables MP_OAUTH_*: no se puede refrescar.');
    return { token: expiresAt > Date.now() ? accessToken : null, refreshed: false };
  }

  const result = await requestMpToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  if (!result.ok) {
    // Si otro proceso ya refrescó (MP rota el refresh_token), el nuestro queda
    // inválido: antes de marcar vencido, releemos la fila.
    const current = await readRow(restaurantId);
    if (current && current.status === 'connected' && current.refresh_token_enc !== row.refresh_token_enc && current.access_token_enc) {
      try {
        return { token: decrypt(current.access_token_enc), refreshed: false };
      } catch { /* cae al marcado de abajo */ }
    }
    console.error(`[mpSellerToken] refresh falló para ${restaurantId}: ${result.detail}`);
    await markFailed(restaurantId, 'expired', result.detail);
    return { token: null, refreshed: false };
  }

  let accessEnc: string;
  let refreshEnc: string;
  try {
    accessEnc = encrypt(result.data.access_token);
    refreshEnc = encrypt(result.data.refresh_token);
  } catch (err: any) {
    console.error(`[mpSellerToken] no se pudo cifrar el token refrescado de ${restaurantId}:`, err?.message);
    return { token: null, refreshed: false };
  }

  // Update condicionado al refresh_token que usamos: si otro proceso refrescó
  // en el medio, no pisamos sus tokens (los nuestros ya no valen).
  const { data: updated, error } = await getSupabaseAdmin()
    .from('restaurant_mp_credentials')
    .update({
      access_token_enc: accessEnc,
      refresh_token_enc: refreshEnc,
      expires_at: expiresAtFrom(result.data.expires_in),
      status: 'connected',
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('restaurant_id', restaurantId)
    .eq('refresh_token_enc', row.refresh_token_enc)
    .select('restaurant_id');

  if (error) {
    console.error(`[mpSellerToken] no se pudo guardar el token refrescado de ${restaurantId}:`, error.message);
    return { token: null, refreshed: false };
  }
  if (!updated || updated.length === 0) {
    const current = await readRow(restaurantId);
    try {
      return { token: current?.access_token_enc ? decrypt(current.access_token_enc) : null, refreshed: false };
    } catch {
      return { token: null, refreshed: false };
    }
  }

  return { token: result.data.access_token, refreshed: true };
}

export async function getSellerAccessToken(restaurantId: string): Promise<string | null> {
  const { token } = await refreshIfNeeded(restaurantId, REFRESH_THRESHOLD_MS);
  return token;
}
