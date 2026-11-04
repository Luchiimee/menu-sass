// Cotización de envío firmada (etapa 3 del pago con Mercado Pago con envío por zonas). El
// servidor calcula el envío de una dirección (POST /api/checkout/mp/quote) y lo firma con un
// vencimiento corto; el pago (etapa 4) solo va a aceptar ese precio. Sin imports con alias (@/):
// se prueba con scripts/check-delivery-quote.mjs.
//
// Token: <payload en base64url>.<HMAC-SHA256 del payload en base64url>. El payload NO está
// cifrado (solo firmado): no lleva datos del cliente más allá de la dirección que él mismo
// escribió. Secreto: CHECKOUT_QUOTE_SECRET (nunca se incluye en errores ni logs).

import { createHmac, timingSafeEqual } from 'node:crypto';

export const QUOTE_TTL_MS = 15 * 60 * 1000;
const MAX_TOKEN_LENGTH = 2000;

export type QuotePayload = {
  restaurantId: string;
  address: string;      // normalizada con normalizeQuoteAddress
  lat: number;
  lng: number;
  distanceM: number;
  zonePosition: number;
  cost: number;
  exp: number;          // ms desde epoch
};

export type QuoteVerification =
  | { ok: true; payload: QuotePayload }
  | { ok: false; reason: 'firma_invalida' | 'vencida' | 'formato_invalido' };

// Minúsculas, sin espacios de más (para comparar la dirección cotizada con la del pago)
export function normalizeQuoteAddress(address: string): string {
  return String(address ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const b64url = (buf: Buffer) => buf.toString('base64url');
const hmac = (data: string, secret: string) => createHmac('sha256', secret).update(data).digest();

export function signQuote(
  payload: Omit<QuotePayload, 'exp' | 'address'> & { address: string },
  secret: string,
  now: number = Date.now()
): { token: string; payload: QuotePayload } {
  if (typeof secret !== 'string' || secret.length === 0) throw new Error('signQuote: falta el secreto de firma');
  const full: QuotePayload = {
    restaurantId: String(payload.restaurantId).toLowerCase(),
    address: normalizeQuoteAddress(payload.address),
    lat: payload.lat,
    lng: payload.lng,
    distanceM: payload.distanceM,
    zonePosition: payload.zonePosition,
    cost: payload.cost,
    exp: now + QUOTE_TTL_MS,
  };
  const body = b64url(Buffer.from(JSON.stringify(full), 'utf8'));
  return { token: `${body}.${b64url(hmac(body, secret))}`, payload: full };
}

const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

function parsePayload(body: string): QuotePayload | null {
  let data: any;
  try {
    data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const { restaurantId, address, lat, lng, distanceM, zonePosition, cost, exp } = data;
  if (typeof restaurantId !== 'string' || restaurantId === '' || typeof address !== 'string' || address === '') return null;
  if (![lat, lng, distanceM, zonePosition, cost, exp].every(isNum)) return null;
  return { restaurantId, address, lat, lng, distanceM, zonePosition, cost, exp };
}

// Vigente mientras now < exp: justo en exp ya está vencida.
export function verifyQuote(token: unknown, secret: string, now: number = Date.now()): QuoteVerification {
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: 'formato_invalido' };
  }
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) {
    return { ok: false, reason: 'formato_invalido' };
  }
  if (typeof secret !== 'string' || secret.length === 0) return { ok: false, reason: 'firma_invalida' };

  // Primero la firma (en tiempo constante), después se lee el contenido
  const expected = hmac(parts[0], secret);
  const given = Buffer.from(parts[1], 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: 'firma_invalida' };

  const payload = parsePayload(parts[0]);
  if (!payload) return { ok: false, reason: 'formato_invalido' };
  if (now >= payload.exp) return { ok: false, reason: 'vencida' };
  return { ok: true, payload };
}

// ¿La cotización es para este restaurante y esta dirección? (la usa el pago, etapa 4)
export function quoteMatches(payload: QuotePayload, expected: { restaurantId: string; address: string }): boolean {
  return payload.restaurantId === String(expected.restaurantId).toLowerCase()
    && payload.address === normalizeQuoteAddress(expected.address);
}
