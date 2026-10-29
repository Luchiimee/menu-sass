// Token de Mercado Pago del VENDEDOR (cada restaurante), para MP Connect.
// getSellerAccessToken() es la ÚNICA forma de obtenerlo: lo descifra y, si
// está por vencer, lo refresca. SOLO servidor; nunca devolverlo al navegador
// ni loguearlo. La lógica (y cuándo se cambia el estado de la fila) está en
// lib/mpSellerTokenCore.ts; acá solo se conecta con la base, el cifrado y el OAuth.

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { encrypt, decrypt } from '@/lib/crypto';
import { getOAuthConfig, requestMpToken, expiresAtFrom } from '@/lib/mpOAuth';
import {
  refreshIfNeededCore, REFRESH_THRESHOLD_MS, type SellerTokenResult,
} from '@/lib/mpSellerTokenCore';

export { REFRESH_THRESHOLD_MS };
export type { SellerTokenResult };

export function refreshIfNeeded(
  restaurantId: string,
  thresholdMs: number = REFRESH_THRESHOLD_MS
): Promise<SellerTokenResult> {
  return refreshIfNeededCore(
    { db: getSupabaseAdmin(), encrypt, decrypt, getOAuthConfig, requestMpToken, expiresAtFrom },
    restaurantId,
    thresholdMs
  );
}

export async function getSellerAccessToken(restaurantId: string): Promise<string | null> {
  const { token } = await refreshIfNeeded(restaurantId, REFRESH_THRESHOLD_MS);
  return token;
}
