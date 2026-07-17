'use client';
import { useState, useMemo } from 'react';
import { Utensils, ShoppingBag, Store, Star, Zap, Info, X, Minus, Plus, Check, Clock, Search } from 'lucide-react';
import { getProductDisplayPrice } from '@/lib/productPricing';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { getContrastColor } from '@/lib/colorUtils';
import { useCart } from '@/context/CartContext';

export default function AlternaPro({
  restaurant = {},
  products = [],
  setSelectedProduct,
  onAddToCart,
  isOpen,
  isMockup = false,
  setShowInfo,
  mesaLabel = null,
}: any) {
  const { cart } = useCart();
  const getTotalQtyForProduct = (productId: any) => cart.filter((item: any) => item.id === productId).reduce((sum: number, item: any) => sum + item.quantity, 0);
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);
  const [variationCounts, setVariationCounts] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState("");

  // --- CONFIGURACIÓN DE COLORES (Movido arriba para evitar errores de referencia) ---
  const THEME = restaurant?.theme_color || '#ea580c'; 
    const searchBg = restaurant?.search_bg_color || '#ffffff';
  const searchIcon = restaurant?.search_icon_color || THEME;
  const BG = restaurant?.bg_color || '#fafaf9';      
  const NAME_COLOR = restaurant?.text_color || '#111827';   
  const DESC_COLOR = restaurant?.description_color || '#94a3b8'; 
  const PROD_NAME_COLOR = restaurant?.card_name_color || '#111827';
  const PRICE_BG = restaurant?.card_price_color || THEME;
  const PRICE_TEXT = '#ffffff';
  const catInactiveBorder = getContrastColor(restaurant?.cat_bg_color || '#ffffff') === '#000000' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)';
  const PROMO_BG = restaurant?.promo_bg_color || (THEME + '15');
  const PROMO_TEXT = restaurant?.promo_text_color || THEME;
  const PROD_NAME_BG = restaurant?.card_name_bg || '#ffffff';



  const handleUpdateCount = (label: string, delta: number) => {
    setVariationCounts(prev => ({ ...prev, [label]: Math.max(0, (prev[label] || 0) + delta) }));
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setVariationCounts({});
    setSelectedExtras([]);
  };

  const rawCats = restaurant?.categories || [];

  const generalProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!p.category_id) return matchesSearch;
      const cat = rawCats.find((c: any) => String(c.id) === String(p.category_id));
      return (!cat || cat.name.toLowerCase().trim() === 'general') && matchesSearch;
    });
  }, [products, rawCats, searchTerm]);

  const categoryButtons = useMemo(() => {
    return rawCats.filter((c: any) => c.name.toLowerCase().trim() !== 'general');
  }, [rawCats]);

  const currentProductExtras = useMemo(() => {
    const activeProd = restaurant?.selectedProduct;
    if (!activeProd || !restaurant?.fetched_extras) return [];
    return restaurant.fetched_extras.filter((ex: any) => 
      ex.product_extras?.some((re: any) => String(re.product_id) === String(activeProd.id))
    );
  }, [restaurant?.selectedProduct, restaurant?.fetched_extras]);

  const sizeProductImg = isMockup ? 'w-20 h-20' : 'w-28 h-28';
  let globalItemIdx = 0;

  const renderProductCard = (p: any) => {
    const isEven = globalItemIdx % 2 === 0;
    globalItemIdx++;

    const { amount: displayPrice, isFrom } = getProductDisplayPrice(p);

    return (
     <button key={p.id} onClick={() => { if (!isOpen && !isMockup) return setShowClosedModal(true); setSelectedProduct(p); }} className={`w-full flex items-center gap-4 active:scale-95 transition-transform ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className="shrink-0 relative">
          <div className={`${sizeProductImg} rounded-full border-4 border-white shadow-xl overflow-hidden bg-white flex items-center justify-center`} style={{ boxShadow: `0 0 0 1px ${THEME}` }}>
            {p.video_url ? (
              <video src={p.video_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            ) : p.image_url ? (
              <img src={getOptimizedImageUrl(p.image_url, 300, 70)} loading="lazy" className="w-full h-full object-cover" alt={p.name} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <Utensils size={isMockup ? 24 : 32} strokeWidth={1.5} style={{ color: `${THEME}40` }} />
              </div>
            )}
          </div>
          {getTotalQtyForProduct(p.id) > 0 && (
            <span className="absolute top-1 right-1 z-20 bg-alert text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-white">
              {getTotalQtyForProduct(p.id)}
            </span>
          )}
        </div>
        <div className={`flex-1 min-w-0 flex flex-col ${isEven ? 'items-start text-left' : 'items-end text-right'} space-y-1`}>
          <span className="inline-block px-3 py-2 rounded-xl border border-gray-100 shadow-sm text-[9px] font-black uppercase" style={{ color: PROD_NAME_COLOR, backgroundColor: PROD_NAME_BG }}>{p.name}</span>
          <div className="inline-block px-4 py-1.5 rounded-full font-black text-[10px] shadow-md border border-white/20" style={{ backgroundColor: PRICE_BG, color: PRICE_TEXT }}>
            {isFrom ? `Desde $${displayPrice}` : `$${displayPrice}`}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col min-h-screen pb-32 select-none animate-in fade-in duration-500" style={{ backgroundColor: BG }}>
      {/* HEADER */}
      <header className="pt-8 px-6 pb-4 relative">
      <div className="absolute top-6 right-6 flex flex-col items-end gap-3 z-20">
  {mesaLabel ? (
    <div className="px-2.5 py-1 rounded-full border flex items-center gap-1.5" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
      <span className="text-[8px] font-black uppercase text-amber-700">📍 {mesaLabel}</span>
    </div>
  ) : (
    <div className="px-2.5 py-1 rounded-full border flex items-center gap-1.5"
         style={{ backgroundColor: isOpen ? '#f0fdf4' : '#fef2f2', borderColor: isOpen ? '#bbf7d0' : '#fecaca' }}>
      <div className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
      <span className={`text-[8px] font-black uppercase ${isOpen ? 'text-emerald-600' : 'text-red-600'}`}>{isOpen ? 'Abierto' : 'Cerrado'}</span>
    </div>
  )}
  {/* Botón de Info — oculto en mockup: el selector agrega su propio overlay */}
  {!isMockup && (
    <button onClick={() => setShowInfo(true)} className="p-2.5 rounded-full border shadow-sm active:scale-90 transition-transform bg-white/80 backdrop-blur-sm"
            style={{ borderColor: 'rgba(0,0,0,0.05)', color: NAME_COLOR }}>
      <Store size={22} />
    </button>
  )}
</div>

<div className="text-center px-4">
  {restaurant?.logo_url && (
    <div className="w-16 h-16 mx-auto rounded-full border-2 border-white shadow-md overflow-hidden mb-3 bg-white flex items-center justify-center">
      <img src={getOptimizedImageUrl(restaurant.logo_url, 150, 75, 150, 'cover')} className="w-full h-full object-cover" alt="Logo" />
    </div>
  )}
  <h1 className="text-xl font-black uppercase tracking-tighter leading-none" style={{ color: NAME_COLOR }}>{restaurant?.name || 'Tu Negocio'}</h1>
  <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: DESC_COLOR }}>{restaurant?.description || 'Menú Digital'}</p>
</div>

{/* 🎁 MENSAJE DE PROMO (Recuperado) */}
{restaurant?.show_promo && restaurant?.promo_message && (
  <div className="mt-4 px-2">
    <div className="border border-dashed rounded-xl p-3 text-center" style={{ backgroundColor: PROMO_BG, borderColor: THEME }}>
      <span className="text-[9px] font-black uppercase tracking-widest block" style={{ color: PROMO_TEXT }}>{restaurant.promo_message}</span>
    </div>
  </div>
)}

        

      
      </header>

      {/* 🔍 BUSCADOR NUEVO */}
      <div className="px-4 mb-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 z-10" size={16} style={{ color: searchIcon }} />
          <input
            type="text"
            placeholder="¿Qué buscás hoy?"
            className="w-full border rounded-2xl py-3 pl-10 pr-4 text-xs font-bold outline-none shadow-sm transition-all border-none"
            style={{ backgroundColor: searchBg, color: NAME_COLOR }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* CATEGORÍAS */}
      <div className="relative z-[50] w-full flex items-center gap-2 px-4 overflow-x-auto no-scrollbar shadow-sm border-b border-black/[0.03]" 
           style={{ backgroundColor: BG, minHeight: '60px' }}>
        <button onClick={() => setSelectedCategory("todos")} className="px-5 py-2 rounded-full text-[9px] font-black uppercase shrink-0 shadow-sm border"
                style={{ backgroundColor: selectedCategory === "todos" ? (restaurant?.cat_active_bg_color || THEME) : (restaurant?.cat_bg_color || '#ffffff'),
                         color: selectedCategory === "todos" ? (restaurant?.cat_active_text_color || '#ffffff') : (restaurant?.cat_text_color || '#000000'),
                         borderColor: selectedCategory === "todos" ? (restaurant?.cat_active_bg_color || THEME) : catInactiveBorder }}>
          Todos
        </button>
        {categoryButtons.map((cat: any) => (
          <button key={cat.id} onClick={() => setSelectedCategory(String(cat.id))} className="px-5 py-2 rounded-full text-[9px] font-black uppercase shrink-0 shadow-sm border"
                  style={{ backgroundColor: selectedCategory === String(cat.id) ? (restaurant?.cat_active_bg_color || THEME) : (restaurant?.cat_bg_color || '#ffffff'),
                           color: selectedCategory === String(cat.id) ? (restaurant?.cat_active_text_color || '#ffffff') : (restaurant?.cat_text_color || '#000000'),
                           borderColor: selectedCategory === String(cat.id) ? (restaurant?.cat_active_bg_color || THEME) : catInactiveBorder }}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* LISTADO DINÁMICO */}
      <div className={`${isMockup ? 'p-4 pt-10' : 'p-6 pt-0'} space-y-12 relative z-10`}>
        {selectedCategory === "todos" && generalProducts.length > 0 && (
          <div className="space-y-6 mt-4">
            <div className="flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-gray-200" />
              <h2 className="text-[10px] font-black uppercase italic tracking-tighter text-gray-400">Nuestros Productos</h2>
              <div className="h-[1px] flex-1 bg-gray-200" />
            </div>
            <div className="space-y-8">{generalProducts.map((p: any) => renderProductCard(p))}</div>
          </div>
        )}

        {rawCats.map((cat: any) => {
          if (cat.name.toLowerCase().trim() === 'general') return null;
          if (selectedCategory !== "todos" && String(selectedCategory) !== String(cat.id)) return null;
          const catProds = products.filter((p: any) => String(p.category_id) === String(cat.id) && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
          if (catProds.length === 0) return null;
          return (
            <div key={cat.id} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-gray-200" />
                <h2 className="text-[10px] font-black uppercase italic tracking-tighter text-gray-400">{cat.name}</h2>
                <div className="h-[1px] flex-1 bg-gray-200" />
              </div>
              <div className="space-y-8">{catProds.map((p: any) => renderProductCard(p))}</div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {restaurant.selectedProduct && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-[2.5rem] bg-white overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <button onClick={closeModal} className="absolute top-4 right-8 z-[210] bg-white/90 p-1.5 rounded-full shadow-lg border border-gray-100"><X size={18} /></button>
            <div className="overflow-y-auto no-scrollbar flex-1 p-6 text-left">
              <div className="w-full aspect-[4/3] overflow-hidden rounded-b-2xl mb-4 bg-zinc-50 flex items-center justify-center">
                {restaurant.selectedProduct.video_url ? (
                  <video src={restaurant.selectedProduct.video_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                ) : restaurant.selectedProduct.image_url ? (
                  <img src={getOptimizedImageUrl(restaurant.selectedProduct.image_url, 600, 75)} className="w-full h-full object-cover" alt={restaurant.selectedProduct.name} />
                ) : (
                  <div className="flex flex-col items-center opacity-20">
                    <Utensils size={64} strokeWidth={1} style={{ color: THEME }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] mt-2" style={{ color: THEME }}>Menú Digital</span>
                  </div>
                )}
              </div>
              <h2 className="text-xl font-black uppercase text-gray-900 italic tracking-tighter leading-none">{restaurant.selectedProduct.name}</h2>
              <p className="text-[11px] text-gray-500 mt-2 font-medium leading-relaxed">{restaurant.selectedProduct.description}</p>
              
              <div className="mt-8 space-y-3">
                <p className="text-[10px] font-black uppercase text-fresco tracking-widest ml-1">{restaurant.selectedProduct.name}</p>
                {(restaurant.selectedProduct.variations?.length > 0 ? restaurant.selectedProduct.variations : [{ label: 'principal', price: restaurant.selectedProduct.price }]).map((v: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-3xl bg-gray-50 border border-gray-100">
                    <div className="flex flex-col">
                      {v.label !== 'principal' && <span className="text-[11px] font-black uppercase italic text-gray-900">{v.label}</span>}
                      <span className="text-[10px] font-bold text-gray-400 mt-1">${v.price}</span>
                    </div>
                    <div className="flex items-center gap-4 bg-white px-2 py-1.5 rounded-2xl shadow-sm border border-gray-100">
                      <button onClick={() => handleUpdateCount(v.label, -1)} className="text-red-500 active:scale-75"><Minus size={16} /></button>
                      <span className="font-black text-sm w-4 text-center">{variationCounts[v.label] || 0}</span>
                      <button onClick={() => handleUpdateCount(v.label, 1)} className="text-fresco active:scale-75"><Plus size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {currentProductExtras.length > 0 && (
                <div className="mt-8 space-y-3 pb-4">
                  <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-1">¿Querés sumar algo más?</p>
                  <div className="grid grid-cols-1 gap-2">
                    {currentProductExtras.map((ex: any) => {
                      const isSelected = selectedExtras.some(s => s.id === ex.id);
                      return (
                        <button key={ex.id} onClick={() => setSelectedExtras(prev => isSelected ? prev.filter(s => s.id !== ex.id) : [...prev, ex])}
                                className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200'}`}>{isSelected && <Check size={10} className="text-white" strokeWidth={4} />}</div>
                            <span className="text-[10px] font-black uppercase">{ex.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">+$ {ex.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 pt-2 bg-white border-t border-gray-50">
              <button onClick={() => {
                if (!isOpen && !isMockup) return setShowClosedModal(true);
                Object.entries(variationCounts).forEach(([label, qty]) => {
                  if (qty > 0) {
                    const basePrice = (restaurant.selectedProduct.variations?.find((v:any) => v.label === label)?.price) || restaurant.selectedProduct.price;
                    const parentId = label === 'principal' ? restaurant.selectedProduct.id : `${restaurant.selectedProduct.id}-${label}`;
                    const parentName = label === 'principal' ? restaurant.selectedProduct.name : `${restaurant.selectedProduct.name} (${label})`;
                    onAddToCart({ ...restaurant.selectedProduct, id: parentId, name: parentName, price: Number(basePrice) }, qty);
                    selectedExtras.forEach(extra => onAddToCart({ id: parentId, extraId: extra.id, name: extra.name, price: Number(extra.price) }, qty));
                  }
                });
                closeModal();
              }} className="w-full py-4 rounded-2xl font-black text-[12px] text-white shadow-xl active:scale-95 transition-all" style={{ backgroundColor: '#000000' }}>
                CONFIRMAR Y SUMAR
              </button>
            </div>
          </div>
        </div>
      )}
      {showClosedModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowClosedModal(false)} />
          <div className="bg-white w-full max-w-xs p-8 rounded-[2.5rem] shadow-2xl text-center relative animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Clock size={32} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">Local Cerrado</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-widest leading-relaxed">¡Hola! Estamos fuera de horario, pero podés ver el menú.</p>
            <button onClick={() => setShowClosedModal(false)} className="mt-6 w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-lg active:scale-95 transition-all">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}