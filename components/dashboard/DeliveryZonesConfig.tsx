'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { MapPin, Search, Save, Loader2, LocateFixed, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  readZonesForEditing, legacyZones, normalizeZones, toNumber, isMissingTableError,
  MAX_ZONES, MAX_ZONE_KM, ZONE_ERROR_MESSAGES, type DeliveryZone,
} from '@/lib/deliveryZones';

// Carga dinámica obligatoria: Leaflet usa APIs del browser que no existen en SSR
const MapView = dynamic(() => import('./DeliveryMapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] bg-gray-50 rounded-[1.5rem] flex items-center justify-center border border-gray-100">
      <Loader2 size={24} className="animate-spin text-gray-300" />
    </div>
  ),
});

// Centro del mapa mientras el local no fue ubicado. Es SOLO para mostrar: nunca se guarda
// como ubicación del local (antes se guardaba y las zonas quedaban medidas desde CABA).
const MAP_FALLBACK_CENTER = { lat: -34.6037, lng: -58.3816 };

const ZONE_COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#0ea5e9'];
// Sin la tabla delivery_zones (SQL 14 sin correr) solo existen las columnas de 2 zonas
const MAX_ZONES_WITHOUT_TABLE = 2;

// Lo que edita el dueño: texto, para poder escribir libremente; se valida al guardar
type ZoneDraft = { km: string; cost: string };

const numText = (value: unknown) => {
  const n = toNumber(value);
  return Number.isFinite(n) ? String(n) : '';
};
const draftsFromZones = (zones: DeliveryZone[]): ZoneDraft[] =>
  zones.map((z) => ({ km: String(z.maxKm), cost: String(z.cost) }));

interface Props {
  restaurantId: string;
}

export default function DeliveryZonesConfig({ restaurantId }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [zonesEnabled, setZonesEnabled] = useState(false);
  // null = el local nunca fue ubicado
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [zones, setZones] = useState<ZoneDraft[]>([{ km: '3', cost: '' }, { km: '7', cost: '' }]);
  const [tableMissing, setTableMissing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [savedConfigInvalid, setSavedConfigInvalid] = useState(false);
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  const located = lat != null && lng != null;
  const maxZonesAllowed = tableMissing ? MAX_ZONES_WITHOUT_TABLE : MAX_ZONES;

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
        // Las columnas numeric llegan como texto
        const dbLat = toNumber(data.delivery_lat);
        const dbLng = toNumber(data.delivery_lng);
        if (Number.isFinite(dbLat) && Number.isFinite(dbLng)) {
          setLat(dbLat);
          setLng(dbLng);
        }

        // Zonas: tabla delivery_zones o, si no hay filas / no existe, columnas viejas. Se leen
        // aunque el interruptor esté apagado, para mostrar los valores editables (no para cobrar).
        const source = await readZonesForEditing(supabase, { id: restaurantId, ...data });
        if (source.source === 'error') {
          setLoadFailed(true);
        } else {
          setTableMissing(source.source === 'columnas' && source.tableMissing);
          if (source.zones.ok) {
            setZones(draftsFromZones(source.zones.zones));
          } else {
            // Configuración guardada inválida (p. ej. costo vacío): se muestran los valores
            // de las columnas viejas para que el dueño la corrija
            setZones(legacyZones(data).map((z) => ({ km: numText(z.max_km), cost: numText(z.cost) })));
            setSavedConfigInvalid(!!data.delivery_zones_enabled);
          }
        }

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

  // --- Edición de zonas ---
  const updateZone = (index: number, field: keyof ZoneDraft, value: string) => {
    setZones((prev) => prev.map((z, i) => (i === index ? { ...z, [field]: value } : z)));
  };
  const addZone = () => {
    setZones((prev) => {
      if (prev.length >= maxZonesAllowed) return prev;
      const lastKm = toNumber(prev[prev.length - 1]?.km);
      const nextKm = Number.isFinite(lastKm) ? Math.min(MAX_ZONE_KM, lastKm + 1) : 1;
      return [...prev, { km: String(nextKm), cost: '' }];
    });
  };
  const removeZone = (index: number) => {
    setZones((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const zonesCheck = normalizeZones(zones.map((z) => ({ max_km: z.km, cost: z.cost })));
  const mapZonesKm = zones.map((z) => toNumber(z.km)).filter((km) => Number.isFinite(km) && km > 0).sort((a, b) => a - b);

  // Guardar: restaurants (flag, ubicación, dirección, ciudad y espejo de las zonas 1 y 2 en
  // las columnas viejas, que lee el checkout) y la tabla delivery_zones si existe
  const handleSave = async () => {
    if (zonesEnabled && !located) {
      toast.error('Ubicá tu local (buscá la dirección, usá "Mi ubicación" o arrastrá el pin) antes de activar las zonas.');
      return;
    }
    let normalized: DeliveryZone[] | null = null;
    if (zonesEnabled) {
      // Sin saber qué hay guardado, escribir la tabla podría pisar zonas del dueño
      if (loadFailed) {
        toast.error('No pudimos leer tus zonas guardadas. Recargá la página antes de guardar.');
        return;
      }
      if (!zonesCheck.ok) {
        toast.error(ZONE_ERROR_MESSAGES[zonesCheck.error]);
        return;
      }
      if (zonesCheck.zones.length > maxZonesAllowed) {
        toast.error(`Por ahora podés guardar hasta ${maxZonesAllowed} zonas.`);
        return;
      }
      normalized = zonesCheck.zones;
    }

    setSaving(true);
    try {
      if (normalized && !tableMissing) {
        const now = new Date().toISOString();
        const { error: upsertError } = await supabase
          .from('delivery_zones')
          .upsert(
            normalized.map((z) => ({ restaurant_id: restaurantId, position: z.position, max_km: z.maxKm, cost: z.cost, updated_at: now })),
            { onConflict: 'restaurant_id,position' },
          );
        if (upsertError) throw upsertError;
        // Zonas que sobran (el dueño borró alguna)
        const { error: deleteError } = await supabase
          .from('delivery_zones')
          .delete()
          .eq('restaurant_id', restaurantId)
          .gt('position', normalized.length);
        if (deleteError) throw deleteError;
      }

      const update: Record<string, unknown> = {
        delivery_zones_enabled: zonesEnabled,
        delivery_address: `${addressInput} ${addressNumber}`.trim(),
        city: city || null,
      };
      // Sin ubicación real no se escriben coordenadas (nada de CABA por defecto)
      if (located) {
        update.delivery_lat = lat;
        update.delivery_lng = lng;
      }
      if (normalized) {
        // Espejo para el checkout actual (CartFooter lee solo estas columnas). Con una sola
        // zona, la 2 se iguala a la 1: el checkout nunca la alcanza y fuera de ella no llega.
        const z1 = normalized[0];
        const z2 = normalized[1] ?? normalized[0];
        update.delivery_zone1_km = z1.maxKm;
        update.delivery_zone1_cost = z1.cost;
        update.delivery_zone2_km = z2.maxKm;
        update.delivery_zone2_cost = z2.cost;
      }

      const { error } = await supabase.from('restaurants').update(update).eq('id', restaurantId);
      if (error) throw error;

      if (normalized) {
        setZones(draftsFromZones(normalized)); // quedan ordenadas por radio
        setSavedConfigInvalid(false);
      }
      toast.success(zonesEnabled ? 'Zonas de delivery guardadas' : 'Configuración guardada');
    } catch (err) {
      if (isMissingTableError(err as { code?: string; message?: string })) {
        setTableMissing(true);
        toast.error('La tabla de zonas todavía no está activada: por ahora podés guardar hasta 2 zonas.');
      } else {
        toast.error('Error al guardar las zonas');
      }
    } finally {
      setSaving(false);
    }
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

      {loadFailed && (
        <div className="flex items-start gap-2 p-4 bg-alert/10 border border-alert/20 rounded-2xl">
          <AlertTriangle size={16} className="text-alert shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-alert">No pudimos leer tus zonas guardadas. Recargá la página antes de guardar cambios.</p>
        </div>
      )}

      {/* Sección expandida cuando las zonas están activas */}
      {zonesEnabled && (
        <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          {!located && (
            <div className="flex items-start gap-2 p-4 bg-alert/10 border border-alert/20 rounded-2xl">
              <AlertTriangle size={16} className="text-alert shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-alert">
                Todavía no ubicaste tu local. Buscá la dirección, tocá &quot;Mi ubicación&quot; o arrastrá el pin:
                sin la ubicación real no se pueden activar las zonas.
              </p>
            </div>
          )}

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
              lat={lat ?? MAP_FALLBACK_CENTER.lat}
              lng={lng ?? MAP_FALLBACK_CENTER.lng}
              zonesKm={located ? mapZonesKm : []}
              zoneColors={ZONE_COLORS}
              onPositionChange={handlePositionChange}
            />
          </div>

          {/* Configuración de zonas */}
          <div className="space-y-3">
            {savedConfigInvalid && (
              <p className="text-[11px] font-bold text-alert">
                Tu configuración guardada tiene un error (por ejemplo, una zona sin precio). Revisala y guardá de nuevo.
              </p>
            )}
            {zones.map((zone, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-wrap items-end gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[84px]">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ZONE_COLORS[i] }} />
                  <p className="text-xs font-black text-gray-700 uppercase tracking-widest">Zona {i + 1}</p>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Hasta (km)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0.1}
                    max={MAX_ZONE_KM}
                    step={0.1}
                    value={zone.km}
                    onChange={(e) => updateZone(i, 'km', e.target.value)}
                    className="w-full px-3 py-3 bg-white border border-gray-200 rounded-xl text-sm font-black outline-none focus:border-fresco transition-colors"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Precio de envío</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={zone.cost}
                      onChange={(e) => updateZone(i, 'cost', e.target.value)}
                      placeholder="Obligatorio"
                      className="w-full pl-7 pr-3 py-3 bg-white border border-gray-200 rounded-xl text-sm font-black outline-none focus:border-fresco transition-colors"
                    />
                  </div>
                </div>
                {zones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeZone(i)}
                    aria-label={`Quitar zona ${i + 1}`}
                    className="p-3 text-gray-400 hover:text-alert transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            {zones.length < maxZonesAllowed && (
              <button
                type="button"
                onClick={addZone}
                className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-fresco hover:text-fresco transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                Agregar zona
              </button>
            )}

            {!zonesCheck.ok && (
              <p className="text-[11px] font-bold text-alert">{ZONE_ERROR_MESSAGES[zonesCheck.error]}</p>
            )}
            <p className="text-[10px] text-gray-400 font-medium">
              Cada zona cubre hasta su radio en línea recta desde el local. Al guardar se ordenan de menor a mayor.
            </p>
            {tableMissing && (
              <p className="text-[10px] text-gray-500 font-medium">
                Por ahora podés configurar hasta {MAX_ZONES_WITHOUT_TABLE} zonas.
              </p>
            )}
            {zones.length > 2 && (
              <p className="text-[11px] font-bold text-brasa">
                Por ahora el checkout aplica solo las zonas 1 y 2: más allá de la zona 2 tus clientes ven
                &quot;no llegamos a tu zona&quot;. Las zonas 3 a {MAX_ZONES} se van a aplicar con la próxima actualización.
              </p>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || loadFailed}
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
