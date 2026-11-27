'use client';
import { useMemo, useState } from 'react';
import { Clock, Layers, Minus, Plus, Search, Store } from 'lucide-react';
import CartFooter from "../CartFooter";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { getProductDisplayPrice } from "@/lib/productPricing";
import { getContrastColor } from "@/lib/colorUtils";

interface Props {
  restaurant: any;
  products: any[];
  categories?: any[];
  fetchedExtras?: any[];
  isOpen?: boolean;
  onAddToCart: (product: any, qty?: number, extras?: any[]) => void;
  isMockup?: boolean;
  setShowInfo?: (val: boolean) => void;
  mesaLabel?: string | null;
}

const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

export default function HeladeriaSoft({
  restaurant, products, categories = [], fetchedExtras = [], isOpen = true, onAddToCart,
  isMockup = false, setShowInfo, mesaLabel = null,
}: Props) {
  const [selections, setSelections] = useState<{ [key: string]: number }>({});
  const [qtys, setQtys] = useState<{ [key: string]: number }>({});
  const [pickedExtras, setPickedExtras] = useState<{ [key: string]: string[] }>({});
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');

  const THEME = restaurant?.theme_color || '#6366f1';
  const BG = restaurant?.bg_color || '#f8fafc';
  const text = restaurant?.text_color || '#111827';
  const descColor = restaurant?.description_color || '#9ca3af';
  const cardBg = restaurant?.card_color || '#ffffff';
  const prodName = restaurant?.card_name_color || '#111827';
  const prodDesc = restaurant?.card_desc_color || '#9ca3af';
  const priceColor = restaurant?.card_price_color || THEME;
  const btnBg = restaurant?.card_btn_bg || THEME;
  const btnText = restaurant?.card_btn_text || '#ffffff';
  const promoBg = restaurant?.promo_bg_color || '#e0f7fa';
  const promoText = restaurant?.promo_text_color || THEME;
  const catBg = restaurant?.cat_bg_color || '#ffffff';
  const catText = restaurant?.cat_text_color || '#9ca3af';
  const catActiveBg = restaurant?.cat_active_bg_color || THEME;
  const catActiveText = restaurant?.cat_active_text_color || '#ffffff';
  const catInactiveBorder = getContrastColor(catBg) === '#000000' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.25)';
  const searchBg = restaurant?.search_bg_color || '#ffffff';
  const searchIcon = restaurant?.search_icon_color || '#9ca3af';

  const displayCategories = useMemo(
    () => (categories || []).filter((c: any) => c?.name && c.name.toLowerCase() !== 'general'),
    [categories],
  );

  const visible = useMemo(
    () =>
      (products || [])
        .filter((p: any) => p && p.id)
        .filter((p: any) => selectedCategory === 'todos' || String(p.category_id) === String(selectedCategory))
        .filter((p: any) => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())),
    [products, selectedCategory, searchTerm],
  );

  const extrasFor = (p: any) =>
    (fetchedExtras || []).filter((ex: any) => ex.product_extras?.some((rel: any) => String(rel.product_id) === String(p.id)));

  const setQty = (id: string, q: number) => setQtys((s) => ({ ...s, [id]: Math.max(1, q) }));
  const toggleExtra = (pid: string, eid: string) =>
    setPickedExtras((s) => {
      const cur = s[pid] || [];
      return { ...s, [pid]: cur.includes(eid) ? cur.filter((x) => x !== eid) : [...cur, eid] };
    });

  return (
    <div className="flex flex-col h-full font-sans relative min-h-screen" style={{ backgroundColor: BG }}>
      {/* HEADER */}
      <header className="px-5 pt-10 pb-5 bg-white border-b flex flex-col sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div
            className="px-4 py-1.5 rounded-full font-black uppercase italic tracking-widest text-[9px] shadow-sm flex items-center gap-1.5 transition-colors duration-500"
            style={{ backgroundColor: mesaLabel ? '#d97706' : isOpen ? '#10b981' : '#ef4444', color: 'white' }}
          >
            <div className={`w-1.5 h-1.5 rounded-full bg-white ${isOpen && !mesaLabel ? 'animate-pulse' : ''}`} />
            {mesaLabel ? `📍 ${mesaLabel}` : isOpen ? 'Abierto' : 'Cerrado'}
          </div>
          {setShowInfo && (
            <button
              onClick={() => setShowInfo(true)}
              className="w-11 h-11 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center active:scale-95 transition-all"
              style={{ color: THEME }}
              aria-label="Información del local"
            >
              <Store size={22} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-4xl shadow-md overflow-hidden bg-gray-50 flex-shrink-0 border-2 border-white" style={{ backgroundColor: THEME }}>
            {restaurant?.logo_url ? <img src={getOptimizedImageUrl(restaurant.logo_url, 150, 75, 150, 'cover')} className="w-full h-full object-cover" alt="Logo" /> : '✨'}
          </div>
          <div className="text-left leading-tight flex-1">
            <span className="text-[18px] font-black uppercase tracking-tighter block leading-none" style={{ color: text }}>{restaurant?.name || 'Mi Tienda'}</span>
            {restaurant?.description && <span className="text-[10px] font-bold uppercase tracking-widest block mt-2 leading-relaxed opacity-80" style={{ color: descColor }}>{restaurant.description}</span>}
          </div>
        </div>
      </header>

      <div className="p-5 space-y-5 pb-32">
        {/* PROMO */}
        {restaurant?.show_promo && restaurant?.promo_message && (
          <div
            className="p-4 rounded-[1.5rem] text-[10px] font-black text-center border-2 border-dashed animate-in fade-in zoom-in duration-500 shadow-sm"
            style={{ backgroundColor: promoBg, color: promoText, borderColor: THEME + '40' }}
          >
            {restaurant.promo_message}
          </div>
        )}

        {/* BUSCADOR + CATEGORÍAS */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={15} color={searchIcon} />
            <input
              type="text"
              placeholder="Buscar sabor o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: searchBg }}
              className="w-full rounded-2xl py-3 pl-10 pr-4 text-xs font-bold outline-none border border-gray-100 shadow-sm"
            />
          </div>
          {displayCategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              {[{ id: 'todos', name: 'Todos' }, ...displayCategories].map((cat: any) => {
                const active = selectedCategory === String(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(String(cat.id))}
                    className="px-4 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap border transition-all active:scale-95"
                    style={{
                      backgroundColor: active ? catActiveBg : catBg,
                      color: active ? catActiveText : catText,
                      borderColor: active ? catActiveBg : catInactiveBorder,
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* PRODUCTOS */}
        {visible.length > 0 ? (
          visible.map((p: any) => {
            const isPeso = p.sale_type === 'peso';
            const variations = isPeso ? (p.variations || []) : [];
            const selectedIdx = selections[p.id] ?? Math.max(0, variations.findIndex((v: any) => v.is_featured));
            const basePrice = variations.length > 0 ? Number(variations[selectedIdx]?.price) || 0 : getProductDisplayPrice(p).amount;
            const extras = extrasFor(p);
            const picked = pickedExtras[p.id] || [];
            const pickedList = extras.filter((e: any) => picked.includes(e.id));
            const extrasTotal = pickedList.reduce((s: number, e: any) => s + Number(e.price || 0), 0);
            const qty = qtys[p.id] || 1;
            const lineTotal = (basePrice + extrasTotal) * qty;

            return (
              <div key={p.id} className="p-6 rounded-[2.5rem] shadow-xl border animate-in fade-in zoom-in-95" style={{ backgroundColor: cardBg, borderColor: THEME + '15', boxShadow: `0 18px 40px -20px ${THEME}33` }}>
                <div className="flex justify-between items-start mb-4 text-left">
                  <div className="flex-1 pr-2">
                    <h4 className="text-[15px] font-black uppercase leading-tight" style={{ color: prodName }}>{p.name}</h4>
                    {p.description && (
                      <p className="text-[9px] font-bold mt-1 uppercase tracking-tight italic" style={{ color: prodDesc }}>{p.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black block leading-none" style={{ color: priceColor }}>{money(basePrice)}</span>
                    {isPeso && variations.length > 0 && <span className="text-[7px] font-bold uppercase tracking-tighter opacity-60" style={{ color: prodDesc }}>según opción</span>}
                  </div>
                </div>

                {variations.length > 0 && (
                  <>
                    <p className="text-[7px] font-black uppercase mb-2 text-left tracking-widest opacity-60" style={{ color: prodDesc }}>Elegí la cantidad:</p>
                    <div className="grid grid-cols-3 gap-1.5 mb-4">
                      {variations.map((v: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setSelections({ ...selections, [p.id]: idx })}
                          className={`py-2.5 rounded-xl text-[9px] font-black border-2 transition-all ${selectedIdx === idx ? 'scale-105 shadow-sm' : 'border-gray-100 text-gray-400'}`}
                          style={selectedIdx === idx ? { borderColor: THEME, backgroundColor: THEME + '10', color: THEME } : {}}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {extras.length > 0 && (
                  <div className="mb-4 p-3 rounded-2xl border border-gray-100 bg-gray-50/60">
                    <p className="text-[8px] font-black uppercase mb-2 tracking-widest text-gray-400 flex items-center gap-1 text-left"><Layers size={10} /> Adicionales</p>
                    <div className="flex flex-wrap gap-1.5">
                      {extras.map((ex: any) => {
                        const on = picked.includes(ex.id);
                        return (
                          <button
                            key={ex.id}
                            onClick={() => toggleExtra(p.id, ex.id)}
                            className="px-3 py-1.5 rounded-full text-[9px] font-black border-2 transition-all active:scale-95"
                            style={on ? { borderColor: THEME, backgroundColor: THEME + '12', color: THEME } : { borderColor: '#e5e7eb', color: '#6b7280', backgroundColor: '#fff' }}
                          >
                            {ex.name} +{money(Number(ex.price || 0))}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 p-1 rounded-2xl bg-gray-100">
                    <button onClick={() => setQty(p.id, qty - 1)} className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-gray-500 active:scale-90 transition-all" aria-label="Menos"><Minus size={14} strokeWidth={3} /></button>
                    <span className="min-w-[24px] text-center text-sm font-black text-gray-900">{qty}</span>
                    <button onClick={() => setQty(p.id, qty + 1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all" style={{ backgroundColor: btnBg, color: btnText }} aria-label="Más"><Plus size={14} strokeWidth={3} /></button>
                  </div>
                  <button
                    onClick={() => {
                      if (!isOpen && !isMockup) { setShowClosedModal(true); return; }
                      const item = variations.length > 0
                        ? { ...p, id: `${p.id}-${selectedIdx}`, name: `${p.name} (${variations[selectedIdx].label})`, price: Number(variations[selectedIdx].price) }
                        : { ...p, price: basePrice };
                      onAddToCart(item, qty, pickedList.map((e: any) => ({ id: e.id, name: e.name, price: Number(e.price), quantity: 1 })));
                      setQtys((s) => ({ ...s, [p.id]: 1 }));
                      setPickedExtras((s) => ({ ...s, [p.id]: [] }));
                    }}
                    className="flex-1 py-3.5 rounded-[1.25rem] text-[10px] font-black uppercase shadow-xl active:scale-95 transition-all"
                    style={{ backgroundColor: btnBg, color: btnText }}
                  >
                    Agregar · {money(lineTotal)}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 text-gray-400 text-xs font-bold uppercase tracking-widest italic">No hay productos en esta sección...</div>
        )}
      </div>

      {!isMockup && <CartFooter restaurant={restaurant} />}

      {showClosedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowClosedModal(false)} />
          <div className="bg-white w-full max-w-xs p-8 rounded-[2.5rem] shadow-2xl text-center relative animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Clock size={32} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">Local Cerrado</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-widest leading-relaxed">
              ¡Hola! Actualmente estamos fuera de nuestro horario de atención.<br />Podés ver el menú, pero no realizar pedidos.
            </p>
            <button onClick={() => setShowClosedModal(false)} className="mt-6 w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg active:scale-95 transition-all">
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
