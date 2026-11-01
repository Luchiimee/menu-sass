'use client';

// Mapa del panel de zonas (DeliveryZonesConfig) con Google Maps JavaScript API: pin del local
// arrastrable y un círculo por zona. Lo carga DeliveryZonesConfig con dynamic(..., { ssr: false }).
//
// Si el mapa no carga (falta la clave, Google la rechaza, se pasa la cuota, sin red) se muestra
// un aviso en su lugar: el resto del panel (búsqueda, "Mi ubicación", radios, precios y guardar)
// no depende del mapa.

import { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { circlePath } from '@/lib/mapCircle';

// Clave del navegador, restringida a Maps JavaScript API y a los dominios de Snappy
const BROWSER_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

declare global {
  interface Window {
    // Google la llama cuando rechaza la clave (inválida, dominio no permitido, facturación);
    // el script igual carga y el mapa quedaría gris
    gm_authFailure?: () => void;
  }
}

type MapsLibs = {
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  core: google.maps.CoreLibrary;
};

// --- Carga única por página -------------------------------------------------
let libsPromise: Promise<MapsLibs> | null = null;
let authFailed = false;
const authFailureListeners = new Set<() => void>();

function loadMaps(): Promise<MapsLibs> {
  if (!BROWSER_KEY) return Promise.reject(new Error('sin_clave'));
  if (!libsPromise) {
    window.gm_authFailure = () => {
      authFailed = true;
      console.error('[DeliveryMap] Google rechazó la clave del mapa (gm_authFailure)');
      authFailureListeners.forEach((listener) => listener());
    };
    setOptions({ key: BROWSER_KEY, v: 'weekly', language: 'es', region: 'AR' });
    libsPromise = Promise.all([importLibrary('maps'), importLibrary('marker'), importLibrary('core')])
      .then(([maps, marker, core]) => ({ maps, marker, core }));
  }
  return libsPromise;
}

// Pin del local, arrastrable. Única función que crea el pin.
// TODO: migrar a AdvancedMarkerElement (requiere Map ID) antes de que Google retire google.maps.Marker.
function createLocalPin(
  libs: MapsLibs,
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  onDragEnd: (position: google.maps.LatLngLiteral) => void,
): google.maps.Marker {
  const pin = new libs.marker.Marker({
    map,
    position,
    draggable: true,
    title: 'Ubicación del local',
    icon: {
      path: libs.core.SymbolPath.CIRCLE,
      scale: 9,
      fillColor: '#4f46e5',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    },
  });
  pin.addListener('dragend', () => {
    const p = pin.getPosition();
    if (p) onDragEnd({ lat: p.lat(), lng: p.lng() });
  });
  return pin;
}

interface Props {
  lat: number;
  lng: number;
  zonesKm: number[];      // radios de las zonas, de menor a mayor
  zoneColors: string[];   // un color por zona (mismo orden)
  onPositionChange: (lat: number, lng: number) => void;
}

type Status = 'cargando' | 'listo' | 'error';

export default function DeliveryMapInner({ lat, lng, zonesKm, zoneColors, onPositionChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const libsRef = useRef<MapsLibs | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pinRef = useRef<google.maps.Marker | null>(null);
  const shapesRef = useRef<(google.maps.Circle | google.maps.Polyline)[]>([]);
  const onPositionChangeRef = useRef(onPositionChange);
  const initialCenterRef = useRef({ lat, lng });
  const [status, setStatus] = useState<Status>(BROWSER_KEY && !authFailed ? 'cargando' : 'error');

  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  // Crear el mapa y el pin una vez
  useEffect(() => {
    if (!BROWSER_KEY) {
      console.error('[DeliveryMap] falta NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY');
      return;
    }
    if (authFailed) return;

    let cancelled = false;
    const onAuthFailure = () => { if (!cancelled) setStatus('error'); };
    authFailureListeners.add(onAuthFailure);

    loadMaps()
      .then((libs) => {
        if (cancelled || !containerRef.current) return;
        const center = initialCenterRef.current;
        const map = new libs.maps.Map(containerRef.current, {
          center,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        libsRef.current = libs;
        mapRef.current = map;
        pinRef.current = createLocalPin(libs, map, center, (p) => onPositionChangeRef.current(p.lat, p.lng));
        setStatus(authFailed ? 'error' : 'listo');
      })
      .catch((err) => {
        // Solo el tipo de error: el mensaje podría incluir la URL del script (con la clave)
        console.error('[DeliveryMap] no se pudo cargar Google Maps:', String(err?.name ?? 'error'));
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      authFailureListeners.delete(onAuthFailure);
      shapesRef.current.forEach((shape) => shape.setMap(null));
      shapesRef.current = [];
      if (pinRef.current) {
        google.maps.event.clearInstanceListeners(pinRef.current);
        pinRef.current.setMap(null);
      }
      pinRef.current = null;
      mapRef.current = null;
    };
  }, []);

  // Pin y centro siguen a lat/lng (buscar dirección, "Mi ubicación", arrastrar)
  useEffect(() => {
    if (status !== 'listo' || !mapRef.current || !pinRef.current) return;
    pinRef.current.setPosition({ lat, lng });
    mapRef.current.panTo({ lat, lng });
  }, [lat, lng, status]);

  // Un círculo por zona: el primero con relleno suave; los siguientes, relleno más tenue y
  // borde punteado (google.maps.Circle no admite trazo punteado: el borde es una Polyline con guiones)
  useEffect(() => {
    const libs = libsRef.current;
    const map = mapRef.current;
    if (status !== 'listo' || !libs || !map) return;

    shapesRef.current.forEach((shape) => shape.setMap(null));
    shapesRef.current = [];

    zonesKm.forEach((km, i) => {
      if (!(km > 0)) return;
      const color = zoneColors[i] ?? '#4f46e5';
      const dashed = i > 0;
      shapesRef.current.push(new libs.maps.Circle({
        map,
        center: { lat, lng },
        radius: km * 1000,
        fillColor: color,
        fillOpacity: dashed ? 0.05 : 0.08,
        strokeColor: color,
        strokeOpacity: dashed ? 0 : 1,
        strokeWeight: 2,
        clickable: false,
      }));
      if (dashed) {
        shapesRef.current.push(new libs.maps.Polyline({
          map,
          path: circlePath(lat, lng, km),
          strokeOpacity: 0,
          clickable: false,
          icons: [{
            icon: { path: 'M 0,-1 0,1', strokeColor: color, strokeOpacity: 1, strokeWeight: 2, scale: 3 },
            offset: '0',
            repeat: '12px',
          }],
        }));
      }
    });
  }, [zonesKm, zoneColors, lat, lng, status]);

  return (
    <div className="relative w-full" style={{ height: '340px' }}>
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ visibility: status === 'error' ? 'hidden' : 'visible' }}
      />
      {status === 'cargando' && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-gray-300" />
        </div>
      )}
      {status === 'error' && (
        <div role="alert" className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <AlertTriangle size={22} className="text-alert" />
          <p className="text-sm font-black text-gray-700">No pudimos cargar el mapa</p>
          <p className="text-[11px] text-gray-500 font-medium max-w-sm">
            Podés ubicar el local con la búsqueda de dirección o &quot;Mi ubicación&quot;, configurar los radios y
            precios, y guardar las zonas igual.
          </p>
        </div>
      )}
    </div>
  );
}
