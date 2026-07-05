'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { MapPin, Search, Save, Loader2, LocateFixed } from 'lucide-react';
import { toast } from 'sonner';

// Carga dinámica obligatoria: Leaflet usa APIs del browser que no existen en SSR
const MapView = dynamic(() => import('./DeliveryMapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] bg-gray-50 rounded-[1.5rem] flex items-center justify-center border border-gray-100">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  ),
});

// Buenos Aires como coordenada inicial si el restaurante no tiene ubicación guardada
const DEFAULT_LAT = -34.6037;
const DEFAULT_LNG = -58.3816;

interface Props {
  restaurantId: string;
}

export default function DeliveryZonesConfig({ restaurantId }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [zonesEnabled, setZonesEnabled] = useState(false);
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [addressInput, setAddressInput] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [zone1Km, setZone1Km] = useState(3);
  const [zone1Cost, setZone1Cost] = useState('');
  const [zone2Km, setZone2Km] = useState(7);
  const [zone2Cost, setZone2Cost] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  // Cargar valores actuales de la DB
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('restaurants')
        .select(
          'delivery_lat, delivery_lng, delivery_zone1_km, delivery_zone1_cost, delivery_zone2_km, delivery_zone2_cost, delivery_zones_enabled, delivery_address, city',
        )
        .eq('id', restaurantId)
        .single();

      if (data) {
        setZonesEnabled(!!data.delivery_zones_enabled);
        if (data.city) setCity(data.city);
        if (data.delivery_lat != null) setLat(data.delivery_lat);
        if (data.delivery_lng != null) setLng(data.delivery_lng);
        if (data.delivery_zone1_km != null) setZone1Km(data.delivery_zone1_km);
        if (data.delivery_zone1_cost != null) setZone1Cost(String(data.delivery_zone1_cost));
        if (data.delivery_zone2_km != null) setZone2Km(data.delivery_zone2_km);
        if (data.delivery_zone2_cost != null) setZone2Cost(String(data.delivery_zone2_cost));
        const saved = data.delivery_address || '';
        const parts = saved.trim().split(' ');
        const lastPart = parts[parts.length - 1];
        if (saved && /^\d+$/.test(lastPart)) {
          setAddressInput(parts.slice(0, -1).join(' '));
          setAddressNumber(lastPart);
        } else {
          setAddressInput(saved);
          setAddressNumber('');
        }
      }
      setLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=es`,
      );
      const data = await res.json();
      if (!data.results?.[0]) return;
      const comps = data.results[0].address_components;
      const get = (type: string) => comps.find((c: { types: string[]; long_name: string }) => c.types.includes(type))?.long_name || '';
      const route = get('route');
      const cityName = get('locality') || get('sublocality') || get('administrative_area_level_2');
      if (cityName) setCity(cityName);
      if (route) setAddressInput(cityName ? `${route}, ${cityName}` : route);
    } catch {
      // reverseGeocode falló — addressInput/city quedan sin cambios
    }
  }, []);

  // Geocodificación con Nominatim (OpenStreetMap, gratuito, sin API key)
  const handleGeocode = async () => {
    if (!addressInput.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressInput)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'es' } },
      );
      const data = await res.json();
      if (data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setLat(newLat);
        setLng(newLng);
        reverseGeocode(newLat, newLng);
      } else {
        toast.error('No se encontró la dirección. Probá con una más detallada.');
      }
    } catch {
      toast.error('Error al buscar la dirección');
    } finally {
      setGeocoding(false);
    }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        await reverseGeocode(latitude, longitude);
        setLocating(false);
      },
      () => {
        toast.error('No se pudo obtener tu ubicación');
        setLocating(false);
      },
    );
  };

  // Guardar las 6 columnas de zonas en DB
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('restaurants')
      .update({
        delivery_zones_enabled: zonesEnabled,
        delivery_lat: lat,
        delivery_lng: lng,
        delivery_zone1_km: zone1Km,
        delivery_zone1_cost: zone1Cost !== '' ? Number(zone1Cost) : null,
        delivery_zone2_km: zone2Km,
        delivery_zone2_cost: zone2Cost !== '' ? Number(zone2Cost) : null,
        delivery_address: `${addressInput} ${addressNumber}`.trim(),
        city: city || null,
      })
      .eq('id', restaurantId);

    if (error) {
      toast.error('Error al guardar las zonas');
    } else {
      toast.success('Zonas de delivery guardadas');
    }
    setSaving(false);
  };

  // useCallback para que el ref del Marker no se regenere en cada render
  const handlePositionChange = useCallback((newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    reverseGeocode(newLat, newLng);
    setAddressNumber('');
  }, [reverseGeocode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle activar/desactivar zonas */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
        <div>
          <p className="font-black text-sm text-gray-900">Zonas de delivery con precio variable</p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
            {zonesEnabled
              ? 'Activo — precio según distancia al local'
              : 'Desactivado — usa el precio plano configurado'}
          </p>
        </div>
        <button
          onClick={() => setZonesEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
            zonesEnabled ? 'bg-fresco' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              zonesEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Sección expandida cuando las zonas están activas */}
      {zonesEnabled && (
        <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Buscador de dirección */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
              Dirección del local
            </label>
            {/* Calle + botones */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGeocode(); }}
                  placeholder="Av. Corrientes, Buenos Aires..."
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-fresco transition-colors"
                />
              </div>
              <button
                onClick={handleGeocode}
                disabled={geocoding || !addressInput.trim()}
                className="px-4 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all disabled:opacity-40 flex items-center gap-2 shrink-0"
              >
                {geocoding ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Buscar
              </button>
              <button
                onClick={handleLocate}
                disabled={locating || geocoding}
                className="px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-40 flex items-center gap-2 shrink-0"
              >
                {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                Mi ubicación
              </button>
            </div>
            {/* Número */}
            <input
              type="text"
              value={addressNumber}
              onChange={(e) => setAddressNumber(e.target.value)}
              placeholder="Número (ej: 1234)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-fresco transition-colors"
            />
            <p className="text-[10px] text-gray-400 ml-1 font-medium">
              También podés arrastrar el pin en el mapa para ajustar la posición exacta
            </p>
          </div>

          {/* Mapa */}
          <div className="rounded-[1.5rem] overflow-hidden border border-gray-100 shadow-sm">
            <MapView
              lat={lat}
              lng={lng}
              zone1Km={zone1Km}
              zone2Km={zone2Km}
              onPositionChange={handlePositionChange}
            />
          </div>

          {/* Configuración de zonas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Zona 1 */}
            <div className="bg-[#F0FAF6] border border-[#E8F7F1] rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-fresco" />
                <p className="text-xs font-black text-[#17A06D] uppercase tracking-widest">Zona 1</p>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Radio</span>
                  <span className="text-sm font-black text-[#17A06D]">{zone1Km.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={15}
                  step={0.5}
                  value={zone1Km}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setZone1Km(v);
                    if (zone2Km <= v) setZone2Km(v + 0.5);
                  }}
                  className="w-full accent-fresco"
                />
                <div className="flex justify-between text-[9px] text-gray-300 font-bold mt-0.5">
                  <span>0.5 km</span>
                  <span>15 km</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">
                  Precio de envío
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    value={zone1Cost}
                    onChange={(e) => setZone1Cost(e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-4 py-3 bg-white border border-[#E8F7F1] rounded-xl text-sm font-black outline-none focus:border-fresco transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Zona 2 */}
            <div className="bg-brasa/10 border border-brasa/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brasa" />
                <p className="text-xs font-black text-brasa uppercase tracking-widest">Zona 2</p>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Radio</span>
                  <span className="text-sm font-black text-brasa">{zone2Km.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min={zone1Km + 0.5}
                  max={30}
                  step={0.5}
                  value={zone2Km}
                  onChange={(e) => setZone2Km(Number(e.target.value))}
                  className="w-full accent-brasa"
                />
                <div className="flex justify-between text-[9px] text-gray-300 font-bold mt-0.5">
                  <span>{(zone1Km + 0.5).toFixed(1)} km</span>
                  <span>30 km</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">
                  Precio de envío
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    value={zone2Cost}
                    onChange={(e) => setZone2Cost(e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-4 py-3 bg-white border border-brasa/10 rounded-xl text-sm font-black outline-none focus:border-brasa transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar zonas
          </button>
        </div>
      )}

      {/* Si las zonas están desactivadas, igual permitir guardar el estado del toggle */}
      {!zonesEnabled && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Guardar configuración
        </button>
      )}
    </div>
  );
}
