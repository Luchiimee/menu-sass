'use client';

import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Pin personalizado — evita el problema de imágenes de Leaflet con webpack/Next.js
const PIN_ICON = L.divIcon({
  html: `<div style="width:22px;height:22px;background:#4f46e5;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Recentraliza el mapa cuando lat/lng cambian desde fuera (ej. tras geocodificar)
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

interface Props {
  lat: number;
  lng: number;
  zonesKm: number[];      // radios de las zonas, de menor a mayor
  zoneColors: string[];   // un color por zona (mismo orden)
  onPositionChange: (lat: number, lng: number) => void;
}

export default function DeliveryMapInner({ lat, lng, zonesKm, zoneColors, onPositionChange }: Props) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const pos = marker.getLatLng();
          onPositionChange(pos.lat, pos.lng);
        }
      },
    }),
    [onPositionChange],
  );

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={12}
      style={{ height: '340px', width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <MapRecenter lat={lat} lng={lng} />

      {/* Un círculo por zona; de la segunda en adelante, punteados */}
      {zonesKm.map((km, i) =>
        km > 0 ? (
          <Circle
            key={i}
            center={[lat, lng]}
            radius={km * 1000}
            pathOptions={{
              color: zoneColors[i] ?? '#4f46e5',
              fillColor: zoneColors[i] ?? '#4f46e5',
              fillOpacity: i === 0 ? 0.08 : 0.05,
              weight: 2,
              ...(i > 0 ? { dashArray: '6 4' } : {}),
            }}
          />
        ) : null,
      )}

      {/* Pin draggable del local */}
      <Marker
        ref={markerRef}
        position={[lat, lng]}
        draggable
        icon={PIN_ICON}
        eventHandlers={eventHandlers}
      />
    </MapContainer>
  );
}
