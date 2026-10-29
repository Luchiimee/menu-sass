// Lógica de getSellerAccessToken sin imports con alias (@/): las dependencias llegan
// inyectadas, así se prueba con scripts/check-mp-seller-token.mjs. lib/mpSellerToken.ts
// la conecta con la base, el cifrado y el OAuth reales.
//
// El estado de la fila ('error') se reserva para fallos REALES contra Mercado Pago:
// el refresh rechazado con 4xx (invalid_grant, etc.). Un fallo de ESTE servidor (falta
// o es inválida MP_TOKEN_ENC_KEY, no descifra) o transitorio (red, 5xx, 429) NO toca la
// fila: otro servidor con la clave correcta (p. ej. producción) sigue usándola. Solo se
// loguea, sin valores.

import type { SupabaseClient } from '@supabase/supabase-js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const REFRESH_THRESHOLD_MS = 7 * DAY_MS;

type CredentialRow = {
  restaurant_id: string;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  expires_at: string | null;
  status: string;
};

// Por qué no hay token. 'crypto' y 'transient' no cambian la fila.
export type SellerTokenFailure = 'no_credentials' | 'crypto' | 'transient' | 'rejected';
export type SellerTokenResult = { token: string | null; refreshed: boolean; failure?: SellerTokenFailure };

export type MpTokenResultLike =
  | { ok: true; data: { access_token: string; refresh_token: string; expires_in: number } }
  | { ok: false; detail: string; httpStatus?: number; code?: string };

export type SellerTokenDeps = {
  db: SupabaseClient;
  encrypt: (plaintext: string) => string;
  decrypt: (payload: string) => string;
  getOAuthConfig: () => { clientId: string; clientSecret: string } | null;
  requestMpToken: (body: Record<string, string>) => Promise<MpTokenResultLike>;
  expiresAtFrom: (expiresInSeconds: number) => string;
};

// ¿MP rechazó el refresh de verdad? 4xx salvo 408/429 (reintentables). Sin respuesta
// de MP (red) o 5xx → transitorio.
export function isRealRefreshRejection(r: { httpStatus?: number }): boolean {
  const s = r.httpStatus;
  return typeof s === 'number' && s >= 400 && s < 500 && s !== 408 && s !== 429;
}

async function readRow(db: SupabaseClient, restaurantId: string): Promise<CredentialRow | null> {
  const { data, error } = await db
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

async function markFailed(db: SupabaseClient, restaurantId: string, status: 'expired' | 'error', lastError: string) {
  const { error } = await db
    .from('restaurant_mp_credentials')
    .update({ status, last_error: lastError.slice(0, 200), updated_at: new Date().toISOString() })
    .eq('restaurant_id', restaurantId);
  if (error) console.error(`[mpSellerToken] no se pudo marcar ${status} a ${restaurantId}:`, error.message);
}

// Refresca el token si vence en menos de thresholdMs. Devuelve el access_token
// vigente (refrescado o no) o null (con `failure`) si no hay credenciales usables.
export async function refreshIfNeededCore(
  deps: SellerTokenDeps,
  restaurantId: string,
  thresholdMs: number = REFRESH_THRESHOLD_MS
): Promise<SellerTokenResult> {
  const { db } = deps;
  const row = await readRow(db, restaurantId);
  if (!row || row.status !== 'connected' || !row.access_token_enc || !row.refresh_token_enc) {
    return { token: null, refreshed: false, failure: 'no_credentials' };
  }

  let accessToken: string;
  let refreshToken: string;
  try {
    accessToken = deps.decrypt(row.access_token_enc);
    refreshToken = deps.decrypt(row.refresh_token_enc);
  } catch (err: any) {
    // Falla de ESTE servidor (clave ausente/inválida/distinta): la fila no cambia.
    console.error(`[mpSellerToken] no se pudo descifrar el token de ${restaurantId} (¿MP_TOKEN_ENC_KEY?): ${String(err?.message ?? 'error').slice(0, 120)}`);
    return { token: null, refreshed: false, failure: 'crypto' };
  }

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (expiresAt - Date.now() > thresholdMs) {
    return { token: accessToken, refreshed: false };
  }

  const config = deps.getOAuthConfig();
  if (!config) {
    console.error('[mpSellerToken] faltan variables MP_OAUTH_*: no se puede refrescar.');
    return expiresAt > Date.now()
      ? { token: accessToken, refreshed: false }
      : { token: null, refreshed: false, failure: 'transient' };
  }

  const result = await deps.requestMpToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  if (!result.ok) {
    // Si otro proceso ya refrescó (MP rota el refresh_token), el nuestro queda
    // inválido: antes de marcar, releemos la fila.
    const current = await readRow(db, restaurantId);
    if (current && current.status === 'connected' && current.refresh_token_enc !== row.refresh_token_enc && current.access_token_enc) {
      try {
        return { token: deps.decrypt(current.access_token_enc), refreshed: false };
      } catch { /* cae a lo de abajo */ }
    }
    console.error(`[mpSellerToken] refresh falló para ${restaurantId}: ${result.detail}`);
    if (!isRealRefreshRejection(result)) {
      // Red, 5xx o 429: no es un rechazo de MP, la fila queda como está.
      return { token: null, refreshed: false, failure: 'transient' };
    }
    await markFailed(db, restaurantId, 'error', result.detail);
    return { token: null, refreshed: false, failure: 'rejected' };
  }

  let accessEnc: string;
  let refreshEnc: string;
  try {
    accessEnc = deps.encrypt(result.data.access_token);
    refreshEnc = deps.encrypt(result.data.refresh_token);
  } catch (err: any) {
    console.error(`[mpSellerToken] no se pudo cifrar el token refrescado de ${restaurantId}: ${String(err?.message ?? 'error').slice(0, 120)}`);
    return { token: null, refreshed: false, failure: 'crypto' };
  }

  // Update condicionado al refresh_token que usamos: si otro proceso refrescó
  // en el medio, no pisamos sus tokens (los nuestros ya no valen).
  const { data: updated, error } = await db
    .from('restaurant_mp_credentials')
    .update({
      access_token_enc: accessEnc,
      refresh_token_enc: refreshEnc,
      expires_at: deps.expiresAtFrom(result.data.expires_in),
      status: 'connected',
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('restaurant_id', restaurantId)
    .eq('refresh_token_enc', row.refresh_token_enc)
    .select('restaurant_id');

  if (error) {
    console.error(`[mpSellerToken] no se pudo guardar el token refrescado de ${restaurantId}:`, error.message);
    return { token: null, refreshed: false, failure: 'transient' };
  }
  if (!updated || updated.length === 0) {
    const current = await readRow(db, restaurantId);
    try {
      return { token: current?.access_token_enc ? deps.decrypt(current.access_token_enc) : null, refreshed: false };
    } catch {
      return { token: null, refreshed: false, failure: 'crypto' };
    }
  }

  return { token: result.data.access_token, refreshed: true };
}

// Qué hace POST /api/checkout/mp con el resultado de refreshIfNeeded:
//  - token ok → seguir;
//  - fallo de cifrado o transitorio → 503 reintentable; el pendiente NO se marca failed
//    (vence solo) y las credenciales no se tocan;
//  - sin credenciales o rechazo real de MP → 409 mp_no_conectado, pendiente failed.
export type CheckoutTokenOutcome =
  | { kind: 'ok'; token: string }
  | { kind: 'retry'; status: 503; error: 'mp_temporalmente_no_disponible'; markPendingFailed: false }
  | { kind: 'not_connected'; status: 409; error: 'mp_no_conectado'; markPendingFailed: true };

export function checkoutTokenOutcome(r: SellerTokenResult): CheckoutTokenOutcome {
  if (r.token) return { kind: 'ok', token: r.token };
  if (r.failure === 'crypto' || r.failure === 'transient') {
    return { kind: 'retry', status: 503, error: 'mp_temporalmente_no_disponible', markPendingFailed: false };
  }
  return { kind: 'not_connected', status: 409, error: 'mp_no_conectado', markPendingFailed: true };
}
