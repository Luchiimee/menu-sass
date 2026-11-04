// Cotización de envío del lado del navegador (etapa 5 del pago con Mercado Pago con envío por
// zonas): cuándo pedirla, cuándo sirve, qué envío mostrar y cómo leer la respuesta de
// POST /api/checkout/mp/quote. Sin imports con alias (@/) ni de servidor (nada de node:crypto):
// va al bundle del checkout y se prueba con scripts/check-mp-quote-client.mjs.
//
// Opción B del diseño: se cotiza apenas el navegador calculó una zona válida y solo si Mercado
// Pago está disponible. Mercado Pago aparece con envío solo con una cotización utilizable para la
// dirección actual.

import { normalizeQuoteAddress } from './quoteAddress.ts';
import { canCalculateCost } from './geoResult.ts';

// Una cotización deja de servir 60 s antes de vencer, para que no venza en el camino al servidor
export const QUOTE_SAFETY_MARGIN_MS = 60 * 1000;

export type MpQuote = {
  token: string;
  cost: number;
  zone: { position: number; maxKm: number; distanceM: number };
  expiresAt: number;   // ms desde epoch
  address: string;     // dirección cotizada, normalizada con normalizeStreetForQuote
};

export type QuoteErrorCode =
  | 'fuera_de_cobertura' | 'sin_altura' | 'parcial' | 'sin_resultados' | 'fuera_de_bounds'
  | 'demasiados_intentos' | 'no_disponible' | 'respuesta_invalida' | string;

export type ParsedQuote =
  | { ok: true; quote: Omit<MpQuote, 'address'> }
  | { ok: false; code: QuoteErrorCode; message: string; retryAfterSeconds?: number };

// La misma normalización que el servidor (lib/quoteAddress.ts) y sin un "(entre …)" final, por si
// el cliente lo escribió en la calle en vez de en "Entre calles".
export function normalizeStreetForQuote(direccionCalle: string): string {
  const sinEntre = String(direccionCalle ?? '').replace(/\s*\(\s*entre\b.*$/i, '');
  return normalizeQuoteAddress(sinEntre);
}

export function isQuoteUsable(quote: MpQuote | null | undefined, direccionCalle: string, now: number): boolean {
  if (!quote || typeof quote.token !== 'string' || quote.token === '') return false;
  if (!Number.isFinite(quote.expiresAt) || now >= quote.expiresAt - QUOTE_SAFETY_MARGIN_MS) return false;
  const address = normalizeStreetForQuote(direccionCalle);
  return address !== '' && quote.address === address;
}

export function shouldRequestQuote(input: {
  metodoEnvio: string;
  deliveryZonesEnabled: boolean;
  mpAvailable: boolean;
  zoneStatus: string | null;
  direccionCalle: string;
  currentQuote: MpQuote | null | undefined;
  now: number;
}): boolean {
  if (input.metodoEnvio !== 'delivery' || !input.deliveryZonesEnabled || !input.mpAvailable) return false;
  if (input.zoneStatus !== 'zone1' && input.zoneStatus !== 'zone2') return false;
  if (!canCalculateCost(input.direccionCalle)) return false;   // con altura (algún número)
  return !isQuoteUsable(input.currentQuote, input.direccionCalle, input.now);
}

// Envío a mostrar y a mandar en expected_total cuando se paga con Mercado Pago. El servidor cotiza
// el precio de lista; el envío gratis por monto lo aplica el pago (la misma regla que el navegador).
export function mpShipping(quote: Pick<MpQuote, 'cost'> | null | undefined, autoFreeShipping: boolean): number {
  if (autoFreeShipping) return 0;
  return quote && Number.isFinite(quote.cost) && quote.cost >= 0 ? quote.cost : 0;
}

const FALLBACK: Record<string, string> = {
  fuera_de_cobertura: 'Lo sentimos, no llegamos a tu zona.',
  sin_altura: 'Necesitamos la altura de la calle para calcular el envío.',
  parcial: 'No encontramos exactamente esa dirección. Revisá la calle y el número.',
  sin_resultados: 'No encontramos esa dirección. Revisá la calle y el número.',
  fuera_de_bounds: 'No encontramos esa dirección en la zona del local. Revisá la calle y el número.',
  demasiados_intentos: 'Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo.',
  no_disponible: 'Mercado Pago no está disponible para envíos en este momento.',
  respuesta_invalida: 'No pudimos calcular el envío para pago online. Probá de nuevo.',
};
const GEO_CODES = ['fuera_de_cobertura', 'sin_altura', 'parcial', 'sin_resultados', 'fuera_de_bounds'];

const fail = (code: string, message?: unknown, retryAfterSeconds?: number): ParsedQuote => ({
  ok: false,
  code,
  message: typeof message === 'string' && message.trim() !== '' ? message : (FALLBACK[code] ?? FALLBACK.no_disponible),
  ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
});

// status: HTTP de /api/checkout/mp/quote. json: el body ya parseado, o null si no era JSON.
// retryAfter: el header Retry-After (solo cuenta en 429).
export function parseQuoteResponse(status: number, json: unknown, retryAfter?: string | null): ParsedQuote {
  const body = json && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>) : null;
  const serverCode = typeof body?.error === 'string' ? body.error : null;

  if (status === 200) {
    const token = body?.quote;
    const cost = body?.cost;
    const zone = body?.zone as Record<string, unknown> | undefined;
    const expiresAt = typeof body?.expires_at === 'string' ? Date.parse(body.expires_at) : NaN;
    if (typeof token !== 'string' || token === '' || typeof cost !== 'number' || !Number.isFinite(cost) || cost < 0
      || !zone || typeof zone.position !== 'number' || typeof zone.max_km !== 'number' || typeof zone.distance_m !== 'number'
      || !Number.isFinite(expiresAt)) {
      return fail('respuesta_invalida');
    }
    return { ok: true, quote: { token, cost, zone: { position: zone.position, maxKm: zone.max_km, distanceM: zone.distance_m }, expiresAt } };
  }

  if (!body) return fail('respuesta_invalida');
  if (status === 422) {
    return serverCode && GEO_CODES.includes(serverCode) ? fail(serverCode, body.message) : fail('respuesta_invalida');
  }
  if (status === 429) {
    const seconds = Number(retryAfter);
    return fail('demasiados_intentos', body.message, Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined);
  }
  if (status === 403 || status === 409 || status === 503) {
    // El código exacto (sin_zonas, mp_no_conectado, cotizacion_no_disponible…) queda para logs;
    // para el cliente es "no disponible" con el mensaje del servidor si vino.
    return fail(serverCode ?? 'no_disponible', body.message ?? FALLBACK.no_disponible);
  }
  return fail('respuesta_invalida');
}
