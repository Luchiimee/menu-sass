// Geocodificación de una dirección en el SERVIDOR (etapa 2 del pago con Mercado Pago con envío
// por zonas). Mismo pedido a Google que hace el navegador (components/CartFooter.tsx
// geocodeAddress): dirección + ciudad del local, components de Argentina / Buenos Aires y bounds
// del radio de la zona más lejana. La respuesta se interpreta con parseForwardGeocode
// (lib/geoResult.ts): solo ROOFTOP o RANGE_INTERPOLATED con street_number.
//
// Diferencias deliberadas con el navegador:
//   - timeout de 4 s (AbortController) y sin reintentos;
//   - si el punto que devuelve Google cae fuera de los bounds (Google los usa solo como
//     preferencia), es 'fuera_de_bounds': el navegador lo dejaba pasar.
//
// Clave: GOOGLE_MAPS_SERVER_API_KEY (o apiKey por parámetro, para los tests). Nunca se incluye
// la clave ni la URL en el resultado, en errores ni en logs. Sin imports con alias (@/): se prueba
// con scripts/check-server-geocode.mjs con un fetch falso.

import { parseForwardGeocode } from './geoResult.ts';

export const SERVER_GEOCODE_TIMEOUT_MS = 4000;
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export type GeocodeFailureReason =
  | 'sin_clave'
  | 'sin_altura'
  | 'parcial'
  | 'sin_resultados'
  | 'fuera_de_bounds'
  | 'google_error'
  | 'timeout';

export type ServerGeocodeResult =
  | { ok: true; lat: number; lng: number; formatted: string; precision: string }
  // detail: solo un código corto de Google o HTTP (ej. REQUEST_DENIED, http_500), nunca la URL
  | { ok: false; reason: GeocodeFailureReason; detail?: string };

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status?: number; json(): Promise<unknown> }>;

export type GeocodeInput = {
  address: string;
  city?: string | null;                     // restaurants.city, como deliveryCity en el navegador
  center?: { lat: number; lng: number } | null; // ubicación del local (delivery_lat/lng)
  maxRadiusKm?: number | null;              // radio de la zona más lejana
  fetchImpl?: FetchLike;
  apiKey?: string;
  timeoutMs?: number;
};

type Box = { south: number; west: number; north: number; east: number };

// Mismo cálculo que el navegador (1° de latitud ≈ 111 km)
export function boundsFor(center: { lat: number; lng: number }, radiusKm: number): Box {
  const latPad = radiusKm / 111;
  const lngPad = radiusKm / (111 * Math.cos((center.lat * Math.PI) / 180));
  return { south: center.lat - latPad, west: center.lng - lngPad, north: center.lat + latPad, east: center.lng + lngPad };
}

const inBox = (b: Box, lat: number, lng: number) => lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;

export async function geocodeAddress(input: GeocodeInput): Promise<ServerGeocodeResult> {
  const apiKey = (input.apiKey ?? process.env.GOOGLE_MAPS_SERVER_API_KEY ?? '').trim();
  if (!apiKey) return { ok: false, reason: 'sin_clave' };

  const address = typeof input.address === 'string' ? input.address.trim() : '';
  if (!address) return { ok: false, reason: 'sin_resultados' };

  const city = typeof input.city === 'string' ? input.city.trim() : '';
  const params = new URLSearchParams({
    address: city ? `${address}, ${city}, Argentina` : address,
    key: apiKey,
    language: 'es',
    components: 'country:AR|administrative_area:Buenos Aires',
  });

  const { center, maxRadiusKm } = input;
  const box = center && Number.isFinite(center.lat) && Number.isFinite(center.lng)
    && typeof maxRadiusKm === 'number' && Number.isFinite(maxRadiusKm) && maxRadiusKm > 0
    ? boundsFor(center, maxRadiusKm)
    : null;
  if (box) params.set('bounds', `${box.south},${box.west}|${box.north},${box.east}`);

  const fetchImpl: FetchLike = input.fetchImpl ?? ((url, init) => fetch(url, init));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? SERVER_GEOCODE_TIMEOUT_MS);

  let data: unknown;
  try {
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await fetchImpl(`${GEOCODE_URL}?${params.toString()}`, { signal: controller.signal });
    } catch {
      // Ni el mensaje ni el objeto de la excepción: pueden traer la URL con la clave
      return controller.signal.aborted ? { ok: false, reason: 'timeout' } : { ok: false, reason: 'google_error', detail: 'red' };
    }
    if (!res || res.ok !== true) return { ok: false, reason: 'google_error', detail: `http_${Number(res?.status) || 0}` };
    try {
      data = await res.json();
    } catch {
      return controller.signal.aborted ? { ok: false, reason: 'timeout' } : { ok: false, reason: 'google_error', detail: 'respuesta_invalida' };
    }
  } finally {
    clearTimeout(timer);
  }

  const parsed = parseForwardGeocode(data);
  switch (parsed.kind) {
    case 'ok': {
      const { lat, lng, locationType, formatted } = parsed.value;
      if (box && !inBox(box, lat, lng)) return { ok: false, reason: 'fuera_de_bounds' };
      return { ok: true, lat, lng, formatted: formatted ?? '', precision: locationType };
    }
    case 'sin_altura':
      return { ok: false, reason: 'sin_altura' };
    case 'parcial':
      return { ok: false, reason: 'parcial' };
    case 'sin_resultado':
      return { ok: false, reason: 'sin_resultados' };
    default:
      // motivo de parseForwardGeocode: el status de Google (REQUEST_DENIED, OVER_QUERY_LIMIT…) o respuesta_invalida
      return { ok: false, reason: 'google_error', detail: String(parsed.motivo).slice(0, 40) };
  }
}
