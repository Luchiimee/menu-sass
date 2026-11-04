// POST /api/checkout/mp/quote — cotización de envío firmada (etapa 3 del pago con Mercado Pago con
// envío por zonas). PÚBLICO, sin sesión. Recibe { restaurant_id, address }, geocodifica la
// dirección en el servidor (lib/serverGeocode.ts), calcula la zona con el mismo camino que el pago
// (shippingCost de lib/checkoutPricing.ts: legacyZones + resolveZone) y devuelve
// { quote, cost, zone, expires_at } con la cotización firmada (lib/deliveryQuote.ts).
// TODAVÍA NO LA LLAMA NINGÚN CLIENTE (etapa 5) ni la exige el pago (etapa 4).
//
// - cost es el precio de lista de la zona: el envío gratis por monto lo resuelve el pago.
// - Fuera de cobertura o dirección que no se puede geocodificar: error en español, sin firmar nada.
// - Límite de uso propio (quote:ip 6 y quote:rid 40 cada 10 min) y falla CERRADA (503): fallar
//   abierto gastaría la cuota de Google.
// - Sin CHECKOUT_QUOTE_SECRET o GOOGLE_MAPS_SERVER_API_KEY: 503, sin llamar a Google.
// - Caché en memoria de 6 h por restaurante + dirección (lib/geocodeCache.ts): ahorro parcial, cada
//   instancia de Vercel tiene la suya.
// Nunca se loguean la dirección, la IP, la clave, el secreto ni la cotización.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isMpCheckoutEnabled } from '@/lib/mpCheckoutAccess';
import { shippingCost } from '@/lib/checkoutPricing';
import { haversineKm, legacyZones, normalizeZones, toNumber } from '@/lib/deliveryZones';
import { geocodeAddress, type ServerGeocodeResult } from '@/lib/serverGeocode';
import { signQuote, normalizeQuoteAddress } from '@/lib/deliveryQuote';
import { createTtlCache, geocodeCacheKey, isCacheableGeocode, GEOCODE_CACHE_TTL_MS, GEOCODE_CACHE_MAX_ENTRIES } from '@/lib/geocodeCache';
import { limitByIp, limitByRestaurant } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 4 * 1024;
const MIN_ADDRESS = 4;
const MAX_ADDRESS = 200;

const MESSAGES: Record<string, string> = {
  cotizacion_no_disponible: 'No podemos calcular el envío en este momento. Elegí otro medio de pago o probá más tarde.',
  body_invalido: 'Pedido inválido.',
  restaurante_invalido: 'Pedido inválido.',
  direccion_invalida: 'Ingresá la calle y el número de envío.',
  restaurante_no_encontrado: 'No encontramos el local.',
  no_disponible: 'Este local no cobra envíos con Mercado Pago.',
  mp_no_conectado: 'Este local no cobra envíos con Mercado Pago.',
  sin_zonas: 'Este local no usa zonas de envío.',
  local_sin_ubicacion: 'Este local todavía no puede cobrar envíos online. Elegí otro medio de pago.',
  zonas_mal_configuradas: 'Este local todavía no puede cobrar envíos online. Elegí otro medio de pago.',
  sin_altura: 'Necesitamos la altura de la calle para calcular el envío.',
  parcial: 'No encontramos exactamente esa dirección. Revisá la calle y el número.',
  sin_resultados: 'No encontramos esa dirección. Revisá la calle y el número.',
  fuera_de_bounds: 'No encontramos esa dirección en la zona del local. Revisá la calle y el número.',
  fuera_de_cobertura: 'Lo sentimos, no llegamos a tu zona.',
  geocodificacion_no_disponible: 'No pudimos calcular el envío en este momento. Probá de nuevo en unos minutos.',
  error_datos: 'Tuvimos un problema para calcular el envío. Probá de nuevo.',
};

function fail(error: keyof typeof MESSAGES, status: number) {
  return NextResponse.json({ error, message: MESSAGES[error] }, { status, headers: { 'Cache-Control': 'no-store' } });
}

// Resultados de Google por instancia (ver lib/geocodeCache.ts)
const geocodeCache = createTtlCache<ServerGeocodeResult>({ ttlMs: GEOCODE_CACHE_TTL_MS, maxEntries: GEOCODE_CACHE_MAX_ENTRIES });

export async function POST(req: Request) {
  // --- Configuración: sin secreto o sin clave no se cotiza (y no se llama a Google) ---
  const secret = (process.env.CHECKOUT_QUOTE_SECRET ?? '').trim();
  if (!secret || !(process.env.GOOGLE_MAPS_SERVER_API_KEY ?? '').trim()) {
    console.error('[checkout/mp/quote] falta CHECKOUT_QUOTE_SECRET o GOOGLE_MAPS_SERVER_API_KEY');
    return fail('cotizacion_no_disponible', 503);
  }

  // --- Límite por IP (falla cerrado) ---
  const ipLimited = await limitByIp(req, 'quote', RATE_LIMITS.quotePerIp, 'closed');
  if (ipLimited) return ipLimited;

  // --- Body ---
  let body: any;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return fail('body_invalido', 413);
    body = JSON.parse(raw);
  } catch {
    return fail('body_invalido', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('body_invalido', 400);

  const restaurantId = body.restaurant_id;
  if (typeof restaurantId !== 'string' || !UUID.test(restaurantId)) return fail('restaurante_invalido', 400);
  const address = typeof body.address === 'string' ? body.address.replace(/\s+/g, ' ').trim() : '';
  if (address.length < MIN_ADDRESS || address.length > MAX_ADDRESS || !/\d/.test(address)) return fail('direccion_invalida', 400);

  // --- Restaurante ---
  const db = getSupabaseAdmin();
  const { data: restaurant, error: restError } = await db
    .from('restaurants')
    .select('id, city, subscription_plan, delivery_cost, delivery_zones_enabled, delivery_lat, delivery_lng, delivery_zone1_km, delivery_zone1_cost, delivery_zone2_km, delivery_zone2_cost')
    .eq('id', restaurantId)
    .maybeSingle();
  if (restError) {
    console.error('[checkout/mp/quote] error leyendo restaurante:', restError.message);
    return fail('error_datos', 500);
  }
  if (!restaurant) return fail('restaurante_no_encontrado', 404);

  const zonesEnabled = restaurant.subscription_plan !== 'light' && !!restaurant.delivery_zones_enabled;
  if (!zonesEnabled) return fail('sin_zonas', 409);
  const center = { lat: toNumber(restaurant.delivery_lat), lng: toNumber(restaurant.delivery_lng) };
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return fail('local_sin_ubicacion', 409);
  const zones = normalizeZones(legacyZones(restaurant));
  if (!zones.ok) return fail('zonas_mal_configuradas', 409);
  const maxRadiusKm = zones.zones[zones.zones.length - 1].maxKm;

  // Interruptor del dueño + lanzamiento + plan/suscripción (mismo gate que el pago) y MP conectado
  if (!(await isMpCheckoutEnabled(restaurant))) return fail('no_disponible', 403);
  const { data: cred, error: credError } = await db
    .from('restaurant_mp_credentials')
    .select('status')
    .eq('restaurant_id', restaurant.id)
    .maybeSingle();
  if (credError) {
    console.error('[checkout/mp/quote] error leyendo credenciales:', credError.message);
    return fail('error_datos', 500);
  }
  if (!cred || cred.status !== 'connected') return fail('mp_no_conectado', 409);

  // --- Límite por restaurante (falla cerrado), antes de gastar una llamada a Google ---
  const restaurantLimited = await limitByRestaurant(restaurant.id, RATE_LIMITS.quotePerRestaurant, 'closed', 'quote');
  if (restaurantLimited) return restaurantLimited;

  // --- Geocodificación (con caché por instancia) ---
  const normalized = normalizeQuoteAddress(address);
  const cacheKey = geocodeCacheKey({ restaurantId: restaurant.id, address: normalized, center, maxRadiusKm });
  let geo = geocodeCache.get(cacheKey);
  if (!geo) {
    geo = await geocodeAddress({ address, city: restaurant.city ?? null, center, maxRadiusKm });
    if (isCacheableGeocode(geo)) geocodeCache.set(cacheKey, geo);
  }
  if (!geo.ok) {
    if (geo.reason === 'google_error' || geo.reason === 'timeout' || geo.reason === 'sin_clave') {
      console.error(`[checkout/mp/quote] geocodificación no disponible: ${geo.reason}${geo.detail ? ` (${geo.detail})` : ''}`);
      return fail('geocodificacion_no_disponible', 503);
    }
    return fail(geo.reason, 422);
  }

  // --- Zona: el mismo camino que el pago (precio de lista: sin envío gratis por monto) ---
  const km = haversineKm(geo.lat, geo.lng, center.lat, center.lng);
  const shipping = shippingCost(restaurant, 'delivery', false, km);
  if (!shipping.ok) {
    if (shipping.reason === 'fuera_de_cobertura') return fail('fuera_de_cobertura', 422);
    if (shipping.reason === 'falta_ubicacion') return fail('error_datos', 500); // no debería: la distancia es válida
    return fail(shipping.reason, 409);
  }
  const zone = shipping.zone!;

  // --- Firma ---
  const { token, payload } = signQuote({
    restaurantId: restaurant.id,
    address,
    lat: geo.lat,
    lng: geo.lng,
    distanceM: zone.distanceM,
    zonePosition: zone.position,
    cost: shipping.cost,
  }, secret);

  return NextResponse.json({
    quote: token,
    cost: shipping.cost,
    zone: { position: zone.position, max_km: zone.maxKm, distance_m: zone.distanceM },
    expires_at: new Date(payload.exp).toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
