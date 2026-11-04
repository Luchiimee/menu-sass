// Validación de la cotización de envío en el pago con Mercado Pago (etapa 4 del pago con envío
// por zonas). La usa POST /api/checkout/mp entre las credenciales y computeOrderTotal. Sin imports
// con alias (@/): se prueba con scripts/check-checkout-quote-gate.mjs.
//
// Reglas:
//   - Solo se exige con envío y zonas activas (plan distinto de Light y delivery_zones_enabled).
//     Retiro, tarifa fija sin zonas y plan Light no cambian: si viene una cotización, se ignora.
//   - La firma y el vencimiento los verifica verifyQuote (lib/deliveryQuote.ts) con
//     CHECKOUT_QUOTE_SECRET; tiene que ser de este restaurante y de esta dirección.
//   - La dirección del pedido se acepta si, normalizada, es igual a la cotizada o empieza con
//     "<cotizada> (entre " (el checkout agrega las entre calles así).
//   - La distancia se RECALCULA desde las coordenadas firmadas hasta la ubicación ACTUAL del local
//     (si el dueño lo movió después de cotizar, cuenta la ubicación nueva). distanceM de la
//     cotización queda solo para auditoría. El costo lo recalcula computeOrderTotal con la
//     configuración actual: el de la cotización no se cobra.
//   - No es de un solo uso: reusarla dentro de los 15 minutos crea otro pedido al mismo precio.

import { createHash } from 'node:crypto';
import { verifyQuote, normalizeQuoteAddress } from './deliveryQuote.ts';
import { haversineKm, toNumber } from './deliveryZones.ts';

export type QuoteGateError =
  | 'cotizacion_no_disponible'   // falta CHECKOUT_QUOTE_SECRET
  | 'cotizacion_requerida'
  | 'cotizacion_invalida'
  | 'cotizacion_vencida'
  | 'cotizacion_no_coincide'
  | 'local_sin_ubicacion';

export type QuoteAudit = {
  zone_position: number;
  distance_m: number;          // de la cotización (auditoría)
  distance_m_actual: number;   // recalculada contra la ubicación actual del local
  quoted_cost: number;
  quote_exp: string;           // ISO
  lat: number;
  lng: number;
  quote_fp: string;            // huella del token (sha-256, 16 caracteres): nunca el token completo
};

export type QuoteGateResult =
  | { ok: true; distanceKm: number | undefined; audit: QuoteAudit | null }
  | { ok: false; status: 400 | 409 | 503; error: QuoteGateError };

export type QuoteGateInput = {
  orderType: string;
  restaurant: { id: string; subscription_plan?: unknown; delivery_zones_enabled?: unknown; delivery_lat?: unknown; delivery_lng?: unknown };
  address: string;
  quote: unknown;
  secret: string | null | undefined;
  now?: number;
};

export function quoteFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 16);
}

// ¿La dirección del pedido es la cotizada (con o sin "(entre …)")?
export function addressMatchesQuote(orderAddress: string, quotedAddress: string): boolean {
  const order = normalizeQuoteAddress(orderAddress);
  return order === quotedAddress || order.startsWith(`${quotedAddress} (entre `);
}

export function checkDeliveryQuote(input: QuoteGateInput): QuoteGateResult {
  const { orderType, restaurant } = input;
  const zonesEnabled = restaurant.subscription_plan !== 'light' && !!restaurant.delivery_zones_enabled;
  if (orderType !== 'delivery' || !zonesEnabled) return { ok: true, distanceKm: undefined, audit: null };

  const secret = typeof input.secret === 'string' ? input.secret.trim() : '';
  if (!secret) return { ok: false, status: 503, error: 'cotizacion_no_disponible' };

  if (input.quote === undefined || input.quote === null || input.quote === '') {
    return { ok: false, status: 400, error: 'cotizacion_requerida' };
  }

  const verified = verifyQuote(input.quote, secret, input.now ?? Date.now());
  if (!verified.ok) {
    if (verified.reason === 'vencida') return { ok: false, status: 409, error: 'cotizacion_vencida' };
    return { ok: false, status: 400, error: 'cotizacion_invalida' };
  }
  const q = verified.payload;

  if (q.restaurantId !== String(restaurant.id).toLowerCase() || !addressMatchesQuote(input.address, q.address)) {
    return { ok: false, status: 400, error: 'cotizacion_no_coincide' };
  }

  const centerLat = toNumber(restaurant.delivery_lat);
  const centerLng = toNumber(restaurant.delivery_lng);
  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) return { ok: false, status: 409, error: 'local_sin_ubicacion' };

  const distanceKm = haversineKm(q.lat, q.lng, centerLat, centerLng);
  return {
    ok: true,
    distanceKm,
    audit: {
      zone_position: q.zonePosition,
      distance_m: q.distanceM,
      distance_m_actual: Math.round(distanceKm * 1000),
      quoted_cost: q.cost,
      quote_exp: new Date(q.exp).toISOString(),
      lat: q.lat,
      lng: q.lng,
      quote_fp: quoteFingerprint(input.quote as string),
    },
  };
}
