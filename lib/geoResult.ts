// Resultado tipado de la geocodificación de Google (checkout, envío por zonas), sin
// imports con alias (@/) para probarlo con scripts/check-geo-result.mjs con respuestas
// falsas. Antes cualquier falla (clave denegada, facturación, red, sin resultados) se
// reducía a '' o null y el checkout lo trataba como "dirección no encontrada": forzaba
// la zona más cara sin avisar. Acá cada caso es distinto y nunca se loguea la URL (lleva
// la clave) ni el cuerpo de Google.

export type GeoResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'sin_resultado' }               // Google respondió bien pero no hay dirección para esto
  | { kind: 'error'; motivo: string };      // no se pudo consultar: clave, facturación, cuota, red, timeout

export type ReverseAddress = {
  // "Calle 2 1234, Mercedes". null si Google no trajo la altura: no se escribe una
  // dirección a medias, se pide el número.
  address: string | null;
  hasNumber: boolean;
  locationType: string;   // ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE ('' si no vino)
};

export type ForwardLocation = { lat: number; lng: number; locationType: string };

export const GEO_TIMEOUT_MS = 10000;
// getCurrentPosition sin timeout puede quedar colgado para siempre
export const GEOLOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 12000 };

// Con zonas de 1 a 3 km, un error de cientos de metros cambia la zona. Una posición por Wi-Fi o
// IP (típica en compu) puede tener kilómetros de error y no sirve para cobrar.
export const GPS_MAX_ACCURACY_M = 300;
export function isGpsAccurate(accuracy: unknown): boolean {
  return typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= GPS_MAX_ACCURACY_M;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// Estado de la respuesta de Google. null = hay que mirar results.
function checkStatus(data: any): GeoResult<never> | null {
  if (!data || typeof data !== 'object' || typeof data.status !== 'string') {
    return { kind: 'error', motivo: 'respuesta_invalida' };
  }
  if (data.status === 'ZERO_RESULTS') return { kind: 'sin_resultado' };
  if (data.status !== 'OK') return { kind: 'error', motivo: data.status.slice(0, 40) }; // REQUEST_DENIED, OVER_QUERY_LIMIT...
  if (!Array.isArray(data.results) || data.results.length === 0) return { kind: 'sin_resultado' };
  return null;
}

function componentOf(result: any, type: string): string {
  const comps: any[] = Array.isArray(result?.address_components) ? result.address_components : [];
  return str(comps.find((c) => Array.isArray(c?.types) && c.types.includes(type))?.long_name);
}

// Geocodificación inversa. Se arma desde address_components (route + street_number), no desde
// formatted_address. Se elige el primer resultado que tenga calle Y número; si no hay,
// el primero con calle sin número (address null: se pide la altura); si solo hay localidad
// u otra cosa → sin_resultado. Nunca devuelve una calle vacía ni con coma inicial.
export function parseReverseGeocode(data: any): GeoResult<ReverseAddress> {
  const bad = checkStatus(data);
  if (bad) return bad;
  const results: any[] = data.results;

  const locationOf = (r: any) => str(r?.geometry?.location_type);
  const localityOf = (r: any) =>
    componentOf(r, 'locality') || componentOf(r, 'sublocality') || componentOf(r, 'administrative_area_level_2');

  for (const result of results) {
    const route = componentOf(result, 'route');
    const number = componentOf(result, 'street_number');
    if (!route || !number) continue;
    const street = `${route} ${number}`;
    const city = localityOf(result);
    return {
      kind: 'ok',
      value: { address: city ? `${street}, ${city}` : street, hasNumber: true, locationType: locationOf(result) },
    };
  }

  for (const result of results) {
    if (componentOf(result, 'route')) {
      return { kind: 'ok', value: { address: null, hasNumber: false, locationType: locationOf(result) } };
    }
  }
  return { kind: 'sin_resultado' };
}

// Geocodificación directa: primer resultado con coordenadas finitas.
export function parseForwardGeocode(data: any): GeoResult<ForwardLocation> {
  const bad = checkStatus(data);
  if (bad) return bad;
  const loc = data.results[0]?.geometry?.location;
  const lat = Number(loc?.lat);
  const lng = Number(loc?.lng);
  if (!loc || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { kind: 'error', motivo: 'respuesta_invalida' };
  }
  return { kind: 'ok', value: { lat, lng, locationType: str(data.results[0]?.geometry?.location_type) } };
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
    return { kind: 'error', motivo: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'red' };
  }
  if (!res || res.ok !== true) return { kind: 'error', motivo: `http_${Number(res?.status) || 0}` };
  let data: any;
  try {
    data = await res.json();
  } catch {
    return { kind: 'error', motivo: 'respuesta_invalida' };
  }
  return parse(data);
}

// ---------------------------------------------------------------------------
// Mensajes para el cliente
// ---------------------------------------------------------------------------

export const GEO_MESSAGES = {
  sinResultado: 'No encontramos esa dirección.',
  error: 'No pudimos ubicar tu dirección en este momento.',
  sinAltura: 'Encontramos tu calle pero no el número. Escribí la calle y la altura y tocá "Calcular costo".',
  localSinUbicacion: 'Este local todavía no configuró su ubicación de entrega, por eso no podemos calcular el envío.',
  gpsNoSoportado: 'Tu navegador no permite obtener la ubicación.',
  gpsDenegado: 'No pudimos acceder a tu ubicación: el permiso está bloqueado.',
  gpsNoDisponible: 'No pudimos obtener tu ubicación en este momento.',
  gpsTimeout: 'Tardamos demasiado en obtener tu ubicación.',
  gpsSinDireccion: 'Encontramos tu ubicación pero no pudimos obtener la dirección.',
} as const;

export function gpsPocoPrecisaMessage(accuracy: unknown): string {
  const m = typeof accuracy === 'number' && Number.isFinite(accuracy) ? ` (±${Math.round(accuracy)} m)` : '';
  return `Tu ubicación es muy poco precisa${m} para calcular el envío.`;
}

export function geoFailureMessage(result: { kind: 'sin_resultado' } | { kind: 'error'; motivo: string }): string {
  return result.kind === 'sin_resultado' ? GEO_MESSAGES.sinResultado : GEO_MESSAGES.error;
}

// GeolocationPositionError.code: 1 permiso denegado, 2 posición no disponible, 3 timeout
export function geoPositionErrorMessage(code: unknown): string {
  if (code === 1) return GEO_MESSAGES.gpsDenegado;
  if (code === 3) return GEO_MESSAGES.gpsTimeout;
  return GEO_MESSAGES.gpsNoDisponible;
}
