// OAuth de Mercado Pago para MP Connect (la cuenta de CADA restaurante).
// Independiente del cobro de suscripciones de Snappy (lib/mercadopagoBilling.ts
// y MERCADO_PAGO_ACCESS_TOKEN): acá se usan las credenciales de la aplicación
// OAuth (MP_OAUTH_CLIENT_ID / MP_OAUTH_CLIENT_SECRET) y los tokens del vendedor.
//
// SOLO servidor. Nunca loguear ni devolver tokens: los errores se reducen a
// status HTTP + código de error de MP.

import crypto from 'crypto';

export const MP_AUTH_URL = 'https://auth.mercadopago.com/authorization';
export const MP_TOKEN_URL = 'https://api.mercadopago.com/oauth/token';
export const MP_USERS_ME_URL = 'https://api.mercadopago.com/users/me';

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export function getOAuthConfig() {
  const clientId = process.env.MP_OAUTH_CLIENT_ID;
  const clientSecret = process.env.MP_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.MP_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

// PKCE: code_verifier aleatorio (43 caracteres base64url) y su challenge S256.
export function createPkcePair() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function createState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export type MpTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id?: number | string;
};

export type MpTokenResult =
  | { ok: true; data: MpTokenResponse }
  | { ok: false; detail: string }; // detail: sin tokens, apto para logs y last_error

// POST /oauth/token (canje de code o refresh). Devuelve un detalle corto si falla.
export async function requestMpToken(body: Record<string, string>): Promise<MpTokenResult> {
  try {
    const res = await fetch(MP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.access_token || !data?.refresh_token) {
      const code = data?.error || data?.message || 'respuesta_invalida';
      return { ok: false, detail: `oauth_token http=${res.status} ${String(code).slice(0, 80)}` };
    }
    return {
      ok: true,
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: Number(data.expires_in) || 0,
        user_id: data.user_id,
      },
    };
  } catch (err: any) {
    return { ok: false, detail: `oauth_token red: ${String(err?.message ?? err).slice(0, 80)}` };
  }
}

export function expiresAtFrom(expiresInSeconds: number): string {
  // Si MP no manda expires_in, asumimos 6 meses (valor habitual de MP) para
  // que el cron intente refrescarlo con tiempo.
  const seconds = expiresInSeconds > 0 ? expiresInSeconds : 180 * 24 * 60 * 60;
  return new Date(Date.now() + seconds * 1000).toISOString();
}
