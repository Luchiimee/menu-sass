// Puntos de un círculo sobre la Tierra, para dibujar el borde punteado de una zona con
// google.maps.Polyline (google.maps.Circle no admite trazo punteado). Sin imports con alias
// (@/) para probarlo con scripts/check-map-circle.mjs.

const EARTH_RADIUS_KM = 6371; // el mismo radio que haversineKm (lib/deliveryZones.ts)

// Punto a `distanceKm` del centro en el rumbo `bearingDeg` (0 = norte, sentido horario)
export function destinationPoint(lat: number, lng: number, distanceKm: number, bearingDeg: number) {
  const δ = distanceKm / EARTH_RADIUS_KM;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: (φ2 * 180) / Math.PI, lng: (((λ2 * 180) / Math.PI + 540) % 360) - 180 };
}

// Contorno cerrado (el último punto repite el primero). Radio inválido → lista vacía.
export function circlePath(lat: number, lng: number, radiusKm: number, segments = 96) {
  if (![lat, lng, radiusKm].every(Number.isFinite) || radiusKm <= 0) return [];
  const n = Math.max(8, Math.floor(segments));
  const points = [];
  for (let i = 0; i <= n; i++) points.push(destinationPoint(lat, lng, radiusKm, (360 * i) / n));
  return points;
}
