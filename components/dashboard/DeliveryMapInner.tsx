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
  zone1Km: number;
  zone2Km: number;
  onPositionChange: (lat: number, lng: number) => void;
}

export default function DeliveryMapInner({ lat, lng, zone1Km, zone2Km, onPositionChange }: Props) {
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapRecenter lat={lat} lng={lng} />

      {/* Zona 1 — azul */}
      {zone1Km > 0 && (
        <Circle
          center={[lat, lng]}
          radius={zone1Km * 1000}
          pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.08, weight: 2 }}
        />
      )}

      {/* Zona 2 — ámbar, punteado */}
      {zone2Km > zone1Km && (
        <Circle
          center={[lat, lng]}
          radius={zone2Km * 1000}
          pathOptions={{
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.05,
            weight: 2,
            dashArray: '6 4',
          }}
        />
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
