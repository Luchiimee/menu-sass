// Resultado tipado de la geocodificación de Google (checkout, envío por zonas), sin
// imports con alias (@/) para probarlo con scripts/check-geo-result.mjs con respuestas
// falsas. Antes cualquier falla (clave denegada, facturación, red, sin resultados) se
// reducía a '' o null y el checkout lo trataba como "dirección no encontrada": forzaba
// la zona más cara sin avisar. Acá cada caso es distinto y nunca se loguea la URL (lleva
// la clave) ni el cuerpo de Google.

export type GeoResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'sin_resultado' }               // Google respondió bien pero no hay dirección para esto
  | { kind: 'error'; reason: string };      // no se pudo consultar: clave, facturación, cuota, red, timeout

export type ReverseAddress = {
  address: string;      // "Calle 2 1234, Mercedes": nunca vacío ni con coma inicial
  hasNumber: boolean;   // false si Google no trajo la altura
};

export const GEO_TIMEOUT_MS = 10000;
// getCurrentPosition sin timeout puede quedar colgado para siempre
export const GEOLOCATION_OPTIONS = { timeout: 12000 };

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// Estado de la respuesta de Google. null = hay que mirar results.
function checkStatus(data: any): GeoResult<never> | null {
  if (!data || typeof data !== 'object' || typeof data.status !== 'string') {
    return { kind: 'error', reason: 'respuesta_invalida' };
  }
  if (data.status === 'ZERO_RESULTS') return { kind: 'sin_resultado' };
  if (data.status !== 'OK') return { kind: 'error', reason: data.status.slice(0, 40) }; // REQUEST_DENIED, OVER_QUERY_LIMIT...
  if (!Array.isArray(data.results) || data.results.length === 0) return { kind: 'sin_resultado' };
  return null;
}

// Geocodificación inversa: primer resultado que tenga calle (route). Sin calle no hay
// dirección que escribir: "sin_resultado" (antes quedaba ", Mercedes").
export function parseReverseGeocode(data: any): GeoResult<ReverseAddress> {
  const bad = checkStatus(data);
  if (bad) return bad;
  for (const result of data.results) {
    const comps: any[] = Array.isArray(result?.address_components) ? result.address_components : [];
    const get = (type: string) =>
      str(comps.find((c) => Array.isArray(c?.types) && c.types.includes(type))?.long_name);
    const route = get('route');
    if (!route) continue;
    const number = get('street_number');
    const city = get('locality') || get('sublocality') || get('administrative_area_level_2');
    const street = number ? `${route} ${number}` : route;
    return { kind: 'ok', value: { address: city ? `${street}, ${city}` : street, hasNumber: !!number } };
  }
  return { kind: 'sin_resultado' };
}

// Geocodificación directa: primer resultado con coordenadas finitas.
export function parseForwardGeocode(data: any): GeoResult<{ lat: number; lng: number }> {
  const bad = checkStatus(data);
  if (bad) return bad;
  const loc = data.results[0]?.geometry?.location;
  const lat = Number(loc?.lat);
  const lng = Number(loc?.lng);
  if (!loc || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { kind: 'error', reason: 'respuesta_invalida' };
  }
  return { kind: 'ok', value: { lat, lng } };
}

// fetch + parseo sin lanzar. El motivo del error nunca incluye la URL ni el mensaje de la
// excepción (pueden traer la clave).
export async function fetchGeo<T>(
  fetchImpl: (url: string, init?: any) => Promise<any>,
  url: string,
  parse: (data: any) => GeoResult<T>,
  timeoutMs: number = GEO_TIMEOUT_MS
): Promise<GeoResult<T>> {
  let res: any;
  try {
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? (AbortSignal as any).timeout(timeoutMs)
      : undefined;
    res = await fetchImpl(url, signal ? { signal } : undefined);
  } catch (err: any) {
    const name = String(err?.name ?? '');
    return { kind: 'error', reason: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'red' };
  }
  if (!res || res.ok !== true) return { kind: 'error', reason: `http_${Number(res?.status) || 0}` };
  let data: any;
  try {
    data = await res.json();
  } catch {
    return { kind: 'error', reason: 'respuesta_invalida' };
  }
  return parse(data);
}

// ---------------------------------------------------------------------------
// Mensajes para el cliente
// ---------------------------------------------------------------------------

export const GEO_MESSAGES = {
  sinResultado: 'No encontramos esa dirección.',
  error: 'No pudimos ubicar tu dirección en este momento.',
  sinAltura: 'Encontramos tu calle pero no el número. Completá la altura y tocá "Calcular costo".',
  localSinUbicacion: 'Este local todavía no configuró su ubicación de entrega, por eso no podemos calcular el envío.',
  gpsNoSoportado: 'Tu navegador no permite obtener la ubicación.',
  gpsDenegado: 'No pudimos acceder a tu ubicación: el permiso está bloqueado.',
  gpsNoDisponible: 'No pudimos obtener tu ubicación en este momento.',
  gpsTimeout: 'Tardamos demasiado en obtener tu ubicación.',
  gpsSinDireccion: 'Encontramos tu ubicación pero no pudimos obtener la dirección.',
} as const;

export function geoFailureMessage(result: { kind: 'sin_resultado' } | { kind: 'error'; reason: string }): string {
  return result.kind === 'sin_resultado' ? GEO_MESSAGES.sinResultado : GEO_MESSAGES.error;
}

// GeolocationPositionError.code: 1 permiso denegado, 2 posición no disponible, 3 timeout
export function geoPositionErrorMessage(code: unknown): string {
  if (code === 1) return GEO_MESSAGES.gpsDenegado;
  if (code === 3) return GEO_MESSAGES.gpsTimeout;
  return GEO_MESSAGES.gpsNoDisponible;
}
