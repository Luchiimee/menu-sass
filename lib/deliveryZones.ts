// Motor de zonas de envío por distancia (radios en línea recta desde el local), sin imports
// con alias (@/) para probarlo con scripts/check-delivery-zones.mjs. Lo van a usar el panel
// del dueño, el checkout (vista previa) y el servidor (autoridad), con el mismo código.
//
// Reglas:
//   - hasta MAX_ZONES zonas, radio > 0 y <= MAX_ZONE_KM, costo >= 0, sin radios repetidos;
//   - los valores llegan como número o como texto (las columnas numeric de Supabase llegan
//     como string): null, '' o texto no numérico son INVÁLIDOS, nunca 0. Antes
//     `Number(x) || 0` convertía un costo null en envío gratis;
//   - una zona aplica si la distancia es <= su radio, comparando en metros redondeados
//     (1,5 km = 1500 m entra en la zona de 1,5 km); más allá de la última, fuera de cobertura.

import type { SupabaseClient } from '@supabase/supabase-js';

export const MAX_ZONES = 6;
export const MAX_ZONE_KM = 30;
// Valores que usa hoy el checkout cuando delivery_zone1_km / delivery_zone2_km son null o 0
// (app/[slug]/page.tsx: Number(x) || 3 y Number(x) || 7)
export const LEGACY_ZONE1_KM = 3;
export const LEGACY_ZONE2_KM = 7;

export type DeliveryZone = { position: number; maxKm: number; cost: number };

export type ZoneConfigError =
  | 'sin_zonas'
  | 'demasiadas_zonas'
  | 'radio_invalido'          // null, texto, no finito, <= 0
  | 'radio_fuera_de_rango'    // > MAX_ZONE_KM
  | 'costo_invalido'          // null, '', texto, no finito, negativo
  | 'radio_repetido';

export type NormalizedZones = { ok: true; zones: DeliveryZone[] } | { ok: false; error: ZoneConfigError };

export type ZoneResolution =
  | { covered: true; zone: DeliveryZone; distanceM: number }
  | { covered: false; reason: 'fuera_de_cobertura'; distanceM: number }
  | { covered: false; reason: 'configuracion_invalida' | 'distancia_invalida' };

// Número desde number o string numérico. null, undefined, '', booleanos u objetos → NaN
// (Number(null) sería 0 y Number('') también: por eso no se usa Number() directo).
export function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return NaN;
}

const toMeters = (km: number) => Math.round(km * 1000);

// Distancia en línea recta, la misma fórmula que components/CartFooter.tsx
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Acepta filas de la base ({ max_km, cost }) o zonas ya normalizadas ({ maxKm, cost }).
// Devuelve las zonas ordenadas por radio, con position 1..n según ese orden.
export function normalizeZones(raw: unknown): NormalizedZones {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: 'sin_zonas' };
  if (raw.length > MAX_ZONES) return { ok: false, error: 'demasiadas_zonas' };

  const parsed: { maxKm: number; cost: number }[] = [];
  for (const row of raw) {
    const maxKm = toNumber(row?.max_km ?? row?.maxKm);
    const cost = toNumber(row?.cost);
    if (!Number.isFinite(maxKm) || maxKm <= 0) return { ok: false, error: 'radio_invalido' };
    if (maxKm > MAX_ZONE_KM) return { ok: false, error: 'radio_fuera_de_rango' };
    if (!Number.isFinite(cost) || cost < 0) return { ok: false, error: 'costo_invalido' };
    parsed.push({ maxKm, cost });
  }

  parsed.sort((a, b) => a.maxKm - b.maxKm);
  for (let i = 1; i < parsed.length; i++) {
    if (toMeters(parsed[i].maxKm) === toMeters(parsed[i - 1].maxKm)) return { ok: false, error: 'radio_repetido' };
  }
  return { ok: true, zones: parsed.map((z, i) => ({ position: i + 1, maxKm: z.maxKm, cost: z.cost })) };
}

// Zona para una distancia. Vuelve a validar la configuración: con zonas inválidas no hay
// precio (configuracion_invalida), nunca 0.
export function resolveZone(zones: unknown, distanceKm: number): ZoneResolution {
  const normalized = normalizeZones(zones);
  if (!normalized.ok) return { covered: false, reason: 'configuracion_invalida' };
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm < 0) {
    return { covered: false, reason: 'distancia_invalida' };
  }
  const distanceM = toMeters(distanceKm);
  for (const zone of normalized.zones) {
    if (distanceM <= toMeters(zone.maxKm)) return { covered: true, zone, distanceM };
  }
  return { covered: false, reason: 'fuera_de_cobertura', distanceM };
}

// ---------------------------------------------------------------------------
// Columnas viejas (restaurants.delivery_zone1_* / delivery_zone2_*)
// ---------------------------------------------------------------------------

export type LegacyZoneColumns = {
  delivery_zone1_km?: unknown;
  delivery_zone1_cost?: unknown;
  delivery_zone2_km?: unknown;
  delivery_zone2_cost?: unknown;
};

// Number(x) || d, como hace hoy app/[slug]/page.tsx (null, 0 o no numérico → d)
function orDefault(value: unknown, fallback: number): number {
  const n = toNumber(value);
  return Number.isFinite(n) && n !== 0 ? n : fallback;
}

// Las mismas zonas que aplica hoy el checkout con las columnas viejas:
//   - radios null o 0 → 3 y 7 km;
//   - si la zona 2 no supera a la 1, nunca se alcanza (CartFooter prueba la 1 primero y
//     después cae fuera de cobertura): queda solo la zona 1.
// Diferencia deliberada: un COSTO null se devuelve tal cual y normalizeZones lo rechaza
// (configuración inválida) en vez de cobrar 0.
export function legacyZones(row: LegacyZoneColumns | null | undefined): { max_km: number; cost: unknown }[] {
  const km1 = orDefault(row?.delivery_zone1_km, LEGACY_ZONE1_KM);
  const km2 = orDefault(row?.delivery_zone2_km, LEGACY_ZONE2_KM);
  const zones = [{ max_km: km1, cost: row?.delivery_zone1_cost ?? null }];
  if (km2 > km1) zones.push({ max_km: km2, cost: row?.delivery_zone2_cost ?? null });
  return zones;
}

// ---------------------------------------------------------------------------
// Lectura con respaldo: tabla delivery_zones (docs/sql/14) y, si no hay filas para el
// local o la tabla todavía no existe, las columnas viejas. Así los locales actuales siguen
// igual antes y después de correr el SQL.
// ---------------------------------------------------------------------------

export type StoredZonesSource =
  | { source: 'tabla'; zones: NormalizedZones }
  | { source: 'columnas'; zones: NormalizedZones; tableMissing: boolean }
  | { source: 'error'; motivo: 'error_datos' };

// 'desactivado': el local cobra tarifa fija (delivery_cost), no hay zonas que aplicar
export type ZonesSource = StoredZonesSource | { source: 'desactivado' };

export type ZonesRestaurant = { id: string; delivery_zones_enabled?: unknown } & LegacyZoneColumns;

// "La tabla no existe": 42P01 de Postgres o PGRST205 de PostgREST (no está en el schema cache)
export function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;
  return /does not exist|could not find the table/i.test(String(error.message ?? ''));
}

// Zonas para COBRAR. Con el interruptor apagado o null devuelve 'desactivado' sin zonas
// (ni consulta la tabla): las columnas de los locales con tarifa fija tienen los valores por
// defecto (3 y 7 km a $0) y no deben usarse como zonas reales. Solo `true` activa las zonas.
export async function readDeliveryZones(db: SupabaseClient, restaurant: ZonesRestaurant): Promise<ZonesSource> {
  if (restaurant.delivery_zones_enabled !== true) return { source: 'desactivado' };
  return readZonesForEditing(db, restaurant);
}

// Zonas guardadas SIN mirar el interruptor: solo para que el panel del dueño muestre los
// valores editables aunque las zonas estén apagadas. Para cobrar, usar readDeliveryZones.
export async function readZonesForEditing(
  db: SupabaseClient,
  restaurant: { id: string } & LegacyZoneColumns
): Promise<StoredZonesSource> {
  const { data, error } = await db
    .from('delivery_zones')
    .select('position, max_km, cost')
    .eq('restaurant_id', restaurant.id)
    .order('position', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return { source: 'columnas', zones: normalizeZones(legacyZones(restaurant)), tableMissing: true };
    }
    console.error('[deliveryZones] error leyendo delivery_zones:', error.message);
    return { source: 'error', motivo: 'error_datos' };
  }
  if (!data || data.length === 0) {
    return { source: 'columnas', zones: normalizeZones(legacyZones(restaurant)), tableMissing: false };
  }
  return { source: 'tabla', zones: normalizeZones(data) };
}

export const ZONE_ERROR_MESSAGES: Record<ZoneConfigError, string> = {
  sin_zonas: 'Configurá al menos una zona.',
  demasiadas_zonas: `Podés tener hasta ${MAX_ZONES} zonas.`,
  radio_invalido: 'Cada zona necesita un radio mayor a 0 km.',
  radio_fuera_de_rango: `El radio máximo es ${MAX_ZONE_KM} km.`,
  costo_invalido: 'Cada zona necesita un precio de envío (0 o más).',
  radio_repetido: 'Dos zonas no pueden tener el mismo radio.',
};
