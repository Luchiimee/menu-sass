// Caché en memoria del proceso para la geocodificación de la cotización de envío
// (POST /api/checkout/mp/quote), así el mismo cliente que vuelve a cotizar la misma dirección no
// gasta otra llamada a Google. Sin imports con alias (@/): se prueba con scripts/check-geocode-cache.mjs.
//
// AHORRO PARCIAL: en Vercel cada instancia de la función tiene su propia memoria y se descarta
// al enfriarse, así que dos requests seguidas pueden caer en instancias distintas y geocodificar
// dos veces. No reemplaza al límite de uso.
//
// Solo se guardan resultados definitivos (ok, sin_altura, parcial, sin_resultados,
// fuera_de_bounds): nunca un error de Google, un timeout ni la falta de clave, que pueden
// resolverse solos en el próximo intento.

export const GEOCODE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const GEOCODE_CACHE_MAX_ENTRIES = 1000;

// La clave incluye el centro y el radio: los bounds dependen de eso, y si el dueño mueve el local
// o cambia las zonas el resultado viejo no se reutiliza.
export function geocodeCacheKey(input: {
  restaurantId: string;
  address: string;            // ya normalizada
  center: { lat: number; lng: number };
  maxRadiusKm: number;
}): string {
  const r6 = (n: number) => n.toFixed(6);
  return [input.restaurantId.toLowerCase(), r6(input.center.lat), r6(input.center.lng), input.maxRadiusKm.toFixed(3), input.address].join('|');
}

export type TtlCache<V> = {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  size(): number;
};

export function createTtlCache<V>(opts: { ttlMs: number; maxEntries: number; now?: () => number }): TtlCache<V> {
  const now = opts.now ?? (() => Date.now());
  const map = new Map<string, { value: V; expiresAt: number }>();
  return {
    get(key) {
      const entry = map.get(key);
      if (!entry) return undefined;
      if (now() >= entry.expiresAt) {
        map.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      map.delete(key); // al reinsertar queda al final (más nueva)
      map.set(key, { value, expiresAt: now() + opts.ttlMs });
      // Tope de memoria: se descartan las más viejas (orden de inserción del Map)
      while (map.size > opts.maxEntries) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        map.delete(oldest);
      }
    },
    size: () => map.size,
  };
}

const CACHEABLE = new Set(['sin_altura', 'parcial', 'sin_resultados', 'fuera_de_bounds']);

export function isCacheableGeocode(result: { ok: boolean; reason?: string }): boolean {
  return result.ok === true || (typeof result.reason === 'string' && CACHEABLE.has(result.reason));
}
