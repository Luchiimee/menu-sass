// Lógica de los endpoints PÚBLICOS de consulta del checkout con MP Connect:
//   GET /api/checkout/mp/status?id=<uuid>      → estado de un pedido pendiente
//   GET /api/checkout/mp/available?rid=<uuid>  → si el restaurante puede cobrar con MP
// SOLO servidor. Sin imports con alias (@/): se prueba con
// scripts/check-mp-checkout-public.mjs usando una base falsa inyectada.
//
// Qué NO devuelven nunca: payload, montos, datos del cliente, restaurant_id, ids de
// MP, ni el motivo por el que MP no está disponible (ni emails admin).
//
// TODO(rate limit): ambos son públicos. El repo no tiene rate limit todavía; poner
// reglas de límite (firewall de Vercel sobre /api/checkout/mp/*) o un contador por
// IP y por id ANTES de abrir MP_CONNECT_PUBLIC. El cliente debe hacer backoff ante 429.

import type { SupabaseClient } from '@supabase/supabase-js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CheckoutState = 'pending' | 'paid' | 'order_created' | 'failed' | 'expired';

export type StatusResult =
  | { http: 200; body: { state: CheckoutState; order_id?: string } }
  | { http: 404; body: { error: 'not_found' } }
  | { http: 500; body: { error: 'error_datos' } };

const NOT_FOUND: StatusResult = { http: 404, body: { error: 'not_found' } };

// pending_mp_orders.status → state. 'paid' sin pedido sigue siendo 'paid'; con
// pedido (orders.id = id de la fila) pasa a 'order_created'. Se busca orders.id
// directo: no depende de la columna order_id (SQL 12) ni de que linkOrder haya andado.
export async function getCheckoutStatus(db: SupabaseClient, rawId: string | null | undefined): Promise<StatusResult> {
  // Id mal formado e id inexistente dan la misma respuesta.
  if (typeof rawId !== 'string' || !UUID.test(rawId)) return NOT_FOUND;
  const id = rawId.toLowerCase();

  const { data: pending, error } = await db
    .from('pending_mp_orders')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[checkout/mp/status] error leyendo el pendiente:', error.message);
    return { http: 500, body: { error: 'error_datos' } };
  }
  if (!pending) return NOT_FOUND;

  switch (pending.status) {
    case 'pending':
    case 'failed':
    case 'expired':
      return { http: 200, body: { state: pending.status } };
    case 'paid': {
      const { data: order, error: orderError } = await db
        .from('orders')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (orderError) {
        console.error('[checkout/mp/status] error leyendo el pedido:', orderError.message);
        return { http: 500, body: { error: 'error_datos' } };
      }
      if (order) return { http: 200, body: { state: 'order_created', order_id: id } };
      return { http: 200, body: { state: 'paid' } };
    }
    default:
      return NOT_FOUND; // valor que este código no conoce: no se filtra
  }
}

export type AvailableDeps = {
  db: SupabaseClient;
  // isMpCheckoutEnabled: lanzamiento (MP_CONNECT_PUBLIC / admin) + plan + suscripción
  isEnabled: (restaurant: { id: string }) => Promise<boolean>;
};

// Siempre { available: boolean }. Cualquier duda o error es false, sin motivo.
export async function getCheckoutAvailability(deps: AvailableDeps, rawRid: string | null | undefined): Promise<{ available: boolean }> {
  if (typeof rawRid !== 'string' || !UUID.test(rawRid)) return { available: false };
  const rid = rawRid.toLowerCase();

  try {
    if (!(await deps.isEnabled({ id: rid }))) return { available: false };

    const { data: cred, error } = await deps.db
      .from('restaurant_mp_credentials')
      .select('status')
      .eq('restaurant_id', rid)
      .maybeSingle();
    if (error) {
      console.error('[checkout/mp/available] error leyendo credenciales:', error.message);
      return { available: false };
    }
    return { available: !!cred && cred.status === 'connected' };
  } catch (err: any) {
    console.error('[checkout/mp/available] error inesperado:', err?.message);
    return { available: false };
  }
}
