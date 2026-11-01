// Puntos de un círculo sobre la Tierra, para dibujar el borde punteado de una zona con
// google.maps.Polyline (google.maps.Circle no admite trazo punteado). Sin imports con alias
// (@/) para probarlo con scripts/check-map-circle.mjs.

const EARTH_RADIUS_KM = 6371; // el mismo radio que haversineKm (lib/deliveryZones.ts)

// Punto a `distanceKm` del centro en el rumbo `bearingDeg` (0 = norte, sentido horario)
export function destinationPoint(lat: number, lng: number, distanceKm: number, bearingDeg: number) {
  const angDist = distanceKm / EARTH_RADIUS_KM;
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angDist) + Math.cos(lat1) * Math.sin(angDist) * Math.cos(bearing));
  const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(angDist) * Math.cos(lat1), Math.cos(angDist) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lng: (((lng2 * 180) / Math.PI + 540) % 360) - 180 };
}

// Contorno cerrado (el último punto repite el primero). Radio inválido → lista vacía.
export function circlePath(lat: number, lng: number, radiusKm: number, segments = 96) {
  if (![lat, lng, radiusKm].every(Number.isFinite) || radiusKm <= 0) return [];
  const n = Math.max(8, Math.floor(segments));
  const points = [];
  for (let i = 0; i <= n; i++) points.push(destinationPoint(lat, lng, radiusKm, (360 * i) / n));
  return points;
}
