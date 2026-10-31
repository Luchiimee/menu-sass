// Resultado tipado de la geocodificación de Google (checkout, envío por zonas), sin
// imports con alias (@/) para probarlo con scripts/check-geo-result.mjs con respuestas
// falsas. Antes cualquier falla (clave denegada, facturación, red, sin resultados) se
// reducía a '' o null y el checkout lo trataba como "dirección no encontrada": forzaba
// la zona más cara sin avisar. Acá cada caso es distinto y nunca se loguea la URL (lleva
// la clave) ni el cuerpo de Google.

export type GeoResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'sin_resultado' }               // Google respondió bien pero no hay dirección para esto
  | { kind: 'sin_altura' }                  // solo calle, localidad o punto aproximado: falta la altura
  | { kind: 'parcial' }                     // partial_match: Google no encontró exactamente lo escrito
  | { kind: 'error'; motivo: string };      // no se pudo consultar: clave, facturación, cuota, red, timeout

export type GeoFailure = Exclude<GeoResult<never>, { kind: 'ok' }>;

export type ReverseAddress = {
  address: string;        // "Calle 2 1234, Mercedes": siempre con calle y número
  locationType: string;   // ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE ('' si no vino)
};

export type ForwardLocation = { lat: number; lng: number; locationType: string };

// Puntos que sirven para medir la distancia a una dirección. GEOMETRIC_CENTER (centro de
// una calle o un barrio) y APPROXIMATE (la localidad) pueden quedar a kilómetros de la
// casa: con eso "calle 2" sin altura caía en la zona 1.
export const PRECISE_LOCATION_TYPES = ['ROOFTOP', 'RANGE_INTERPOLATED'];

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
      value: { address: city ? `${street}, ${city}` : street, locationType: locationOf(result) },
    };
  }

  // Hay calle pero ningún resultado trae el número: no se escribe una dirección a medias
  if (results.some((r) => componentOf(r, 'route'))) return { kind: 'sin_altura' };
  return { kind: 'sin_resultado' };
}

// Geocodificación directa. Solo sirve un resultado con número (street_number en
// address_components) y punto preciso (ROOFTOP o RANGE_INTERPOLATED): se toma el primero
// que cumpla. Si ninguno cumple (calle sin altura, localidad, centro aproximado) →
// sin_altura, sin coordenadas. Si el que cumple trae partial_match, Google no encontró
// exactamente lo escrito (pudo cambiar la calle o el número) → parcial, sin coordenadas.
export function parseForwardGeocode(data: any): GeoResult<ForwardLocation> {
  const bad = checkStatus(data);
  if (bad) return bad;
  const results: any[] = data.results;

  const coordsOf = (r: any) => {
    const loc = r?.geometry?.location;
    const lat = Number(loc?.lat);
    const lng = Number(loc?.lng);
    return loc && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  };
  // Un primer resultado sin coordenadas es una respuesta rota, no una dirección imprecisa
  if (!coordsOf(results[0])) return { kind: 'error', motivo: 'respuesta_invalida' };

  for (const result of results) {
    const coords = coordsOf(result);
    const locationType = str(result?.geometry?.location_type);
    if (!coords || !PRECISE_LOCATION_TYPES.includes(locationType) || !componentOf(result, 'street_number')) continue;
    if (result?.partial_match === true) return { kind: 'parcial' };
    return { kind: 'ok', value: { ...coords, locationType } };
  }
  return { kind: 'sin_altura' };
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
  sinAltura: 'Encontramos tu calle pero no el número.',
  sinAlturaManual: 'Necesitamos la calle y la altura para calcular el envío.',
  parcial: 'No encontramos exactamente esa dirección. Revisá la calle y la altura.',
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

// Aviso del checkout cuando no se puede asignar zona. `opciones` elige qué salidas se le
// ofrecen al cliente: 'altura' (completar la altura, usar el GPS, elegir retiro) cuando la
// dirección está incompleta o dudosa; 'general' (escribirla a mano, retiro, contactar al
// local) cuando no se pudo consultar o no hay resultado.
export type AvisoOpciones = 'altura' | 'general';
export type UbicacionAviso = { mensaje: string; opciones: AvisoOpciones };

// Falla de la dirección escrita a mano ("Calcular costo")
export function avisoDireccionManual(result: GeoFailure): UbicacionAviso {
  if (result.kind === 'sin_altura') return { mensaje: GEO_MESSAGES.sinAlturaManual, opciones: 'altura' };
  if (result.kind === 'parcial') return { mensaje: GEO_MESSAGES.parcial, opciones: 'altura' };
  if (result.kind === 'sin_resultado') return { mensaje: GEO_MESSAGES.sinResultado, opciones: 'general' };
  return { mensaje: GEO_MESSAGES.error, opciones: 'general' };
}

// Falla de la geocodificación inversa del GPS
export function avisoGps(result: GeoFailure): UbicacionAviso {
  if (result.kind === 'sin_altura') return { mensaje: GEO_MESSAGES.sinAltura, opciones: 'altura' };
  return { mensaje: GEO_MESSAGES.gpsSinDireccion, opciones: 'general' };
}

// GeolocationPositionError.code: 1 permiso denegado, 2 posición no disponible, 3 timeout
export function geoPositionErrorMessage(code: unknown): string {
  if (code === 1) return GEO_MESSAGES.gpsDenegado;
  if (code === 3) return GEO_MESSAGES.gpsTimeout;
  return GEO_MESSAGES.gpsNoDisponible;
}
