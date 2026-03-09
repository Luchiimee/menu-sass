'use client';
import { useState, useMemo } from 'react';
import { ShoppingBag, Store, Star, Zap, Info, X, Minus, Plus, Check } from 'lucide-react';

export default function AlternaPro({ restaurant = {}, products = [], setSelectedProduct, onAddToCart, isMockup = false }: any) {
  const [selectedCategory, setSelectedCategory] = useState("todos");

  // --- CONFIGURACIÓN DE COLORES ---
  const THEME = restaurant?.theme_color || '#ea580c'; 
  const BG = restaurant?.bg_color || '#fafaf9';      
  const NAME_COLOR = restaurant?.text_color || '#111827';   
  const DESC_COLOR = restaurant?.description_color || '#94a3b8'; 
  const PROD_NAME_COLOR = restaurant?.card_name_color || '#111827';
  const PRICE_BG = restaurant?.card_price_color || THEME;
  const PRICE_TEXT = restaurant?.card_btn_text || '#ffffff'; 
  const PROMO_BG = restaurant?.promo_bg_color || (THEME + '15');
  const PROMO_TEXT = restaurant?.promo_text_color || THEME;
  const PROD_NAME_BG = restaurant?.card_name_bg || '#ffffff';
  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);
  const [variationCounts, setVariationCounts] = useState<{ [key: string]: number }>({});

  // Filtramos los adicionales que pertenecen a este producto específico
  const productExtras = useMemo(() => {
    if (!restaurant?.fetched_extras || !products) return [];
    // Buscamos el producto que está abierto en el modal (lo detectamos por el estado del padre)
    // Nota: Si usas setSelectedProduct del padre, asegúrate de que el padre te pase el producto activo.
    return []; 
  }, [restaurant?.fetched_extras]);

  const handleUpdateCount = (label: string, delta: number) => {
    setVariationCounts(prev => ({ ...prev, [label]: Math.max(0, (prev[label] || 0) + delta) }));
  };

  // Esta función es la que "limpia" todo al cerrar
  const closeModal = () => {
    setSelectedProduct(null);
    setVariationCounts({});
    setSelectedExtras([]);
  };
  
  // 1. CATEGORÍAS PARA BOTONES (Filtramos "General" para que la barra quede limpia)
  const rawCats = restaurant?.categories || [];
  const categoryButtons = useMemo(() => {
    return rawCats.filter((c: any) => c.name.toLowerCase() !== 'general');
  }, [rawCats]);

  // 2. CATEGORÍAS PARA LISTADO (Aquí incluimos TODO para que no desaparezcan productos)
  const catsToRender = useMemo(() => {
    if (selectedCategory !== "todos") {
      return rawCats.filter((c: any) => String(c.id) === String(selectedCategory));
    }
    return rawCats; 
  }, [rawCats, selectedCategory]);

  // MEDIDAS TALLE M
  const sizeLogo = isMockup ? 'w-12 h-12' : 'w-16 h-16';
  const sizeProductImg = isMockup ? 'w-20 h-20' : 'w-28 h-28';
  const sizeTitle = isMockup ? 'text-base' : 'text-xl';
const isReady = useMemo(() => {
    if (!restaurant?.best_sellers_activated_at) return false;
    const activatedAt = new Date(restaurant.best_sellers_activated_at);
    const now = new Date();
    const diffTime = now.getTime() - activatedAt.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 30; // Solo es true si pasaron 30 días o más
  }, [restaurant?.best_sellers_activated_at]);

  return (
    <div className="flex flex-col min-h-screen pb-32 select-none animate-in fade-in duration-500" style={{ backgroundColor: BG }}>
      {/* HEADER */}
      <header className="pt-8 px-6 pb-4 relative" style={{ backgroundColor: BG }}>
        <div className="absolute top-8 right-6 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-black text-emerald-600 uppercase">Abierto</span>
        </div>
        
        <div className="text-center px-4">
          {restaurant?.logo_url && (
            <div className={`${sizeLogo} mx-auto rounded-full border-2 border-white shadow-md overflow-hidden mb-3 bg-white flex items-center justify-center`}>
              <img src={restaurant.logo_url} className="w-full h-full object-cover" alt="Logo" />
            </div>
          )}
          <h1 className={`${sizeTitle} font-black uppercase tracking-tighter leading-none`} style={{ color: NAME_COLOR }}>{restaurant?.name || 'Tu Negocio'}</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: DESC_COLOR }}>{restaurant?.description}</p>
        </div>

        {restaurant?.show_promo && restaurant?.promo_message && (
          <div className="mt-4 px-2">
            <div className="border border-dashed rounded-xl p-3 text-center" style={{ backgroundColor: PROMO_BG, borderColor: THEME }}>
              <span className="text-[9px] font-black uppercase tracking-widest block" style={{ color: PROMO_TEXT }}>{restaurant.promo_message}</span>
            </div>
          </div>
        )}
      </header>

      {/* BARRA DE CATEGORÍAS */}
      <div className="sticky top-0 z-30 py-3 px-4 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-black/5" style={{ backgroundColor: BG + 'F2', backdropFilter: 'blur(8px)' }}>
        <button
          onClick={() => setSelectedCategory("todos")}
          className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all shadow-sm shrink-0 ${selectedCategory === "todos" ? 'scale-105' : 'opacity-70'}`}
          style={{ 
            backgroundColor: selectedCategory === "todos" ? (restaurant?.cat_bg_color || THEME) : 'white', 
            color: selectedCategory === "todos" ? (restaurant?.cat_text_color || 'white') : '#9ca3af',
            borderColor: selectedCategory === "todos" ? (restaurant?.cat_bg_color || THEME) : '#e5e7eb'
          }}
        >
          Todos
        </button>
      {restaurant?.show_best_sellers && isReady && (
          <button 
            onClick={() => setSelectedCategory("best-sellers")}
            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all shadow-sm shrink-0 flex items-center gap-1 ${selectedCategory === "best-sellers" ? 'scale-105' : 'opacity-70'}`}
            style={{ 
              backgroundColor: selectedCategory === "best-sellers" ? '#fbbf24' : 'white', 
              color: selectedCategory === "best-sellers" ? 'white' : '#9ca3af',
              borderColor: selectedCategory === "best-sellers" ? '#fbbf24' : '#e5e7eb'
            }}
          >
            <Star size={10} fill={selectedCategory === "best-sellers" ? "white" : "none"}/>
            Más Vendidos
          </button>
        )}
        {categoryButtons.map((cat: any) => {
          const isActive = String(selectedCategory) === String(cat.id);
          return (
            <button 
              key={cat.id} 
              onClick={() => setSelectedCategory(String(cat.id))}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all shadow-sm shrink-0 ${isActive ? 'scale-105' : 'opacity-70'}`}
              style={{ 
                  backgroundColor: isActive ? (restaurant?.cat_bg_color || THEME) : 'white', 
                  color: isActive ? (restaurant?.cat_text_color || 'white') : '#9ca3af',
                  borderColor: isActive ? (restaurant?.cat_bg_color || THEME) : '#e5e7eb'
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

    {/* LISTADO DINÁMICO */}
      <div className={`${isMockup ? 'p-4' : 'p-6'} space-y-12`}>
        {(() => {
          let globalIdx = 0;

          // --- CASO 1: VISTA EXCLUSIVA DE "MÁS VENDIDOS" ---
          if (selectedCategory === "best-sellers") {
            return (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-3">
                  <div className="h-[1px] flex-1 bg-amber-200" />
                  <h2 className="text-[10px] font-black uppercase italic tracking-tighter text-amber-600">
                    Top de Ventas
                  </h2>
                  <div className="h-[1px] flex-1 bg-amber-200" />
                </div>
                <div className="space-y-8">
                  {products.slice(0, 5).map((p: any) => {
                    const isEven = globalIdx % 2 === 0;
                    globalIdx++;
                    return (
                      <button key={`direct-best-${p.id}`} onClick={() => setSelectedProduct(p)} className={`w-full flex items-center gap-4 active:scale-95 transition-transform ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className="shrink-0 relative">
                          <div className="absolute -top-2 -right-1 z-10 bg-amber-400 text-white p-1 rounded-full shadow-lg border-2 border-white"><Zap size={10} fill="white" /></div>
                          <div className={`${sizeProductImg} rounded-full border-4 border-white shadow-xl overflow-hidden bg-white`} style={{ boxShadow: `0 0 0 1px ${THEME}` }}>
                            {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-200"><ShoppingBag size={24}/></div>}
                          </div>
                        </div>
                        <div className={`flex-1 min-w-0 flex flex-col ${isEven ? 'items-start text-left' : 'items-end text-right'} space-y-1`}>
     <span 
  className="inline-block px-3 py-2 rounded-xl border border-gray-100 shadow-sm text-[9px] font-black uppercase"
  style={{ 
    color: PROD_NAME_COLOR,
    backgroundColor: PROD_NAME_BG 
  }}
>
  {p.name}
</span>
                          <div className="inline-block px-4 py-1.5 rounded-full font-black text-[10px] shadow-md border border-white/20" style={{ backgroundColor: PRICE_BG, color: PRICE_TEXT }}>${p.price}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          // --- CASO 2: VISTA "TODOS" O CATEGORÍA ESPECÍFICA ---
          return (
            <>
              {/* SECCIÓN MÁS PEDIDOS: Solo aparece al inicio de la pestaña "Todos" */}
              {restaurant?.show_best_sellers && isReady && selectedCategory === "todos" && products.length > 3 && (
                <div className="space-y-6 mb-16 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-3">
                    <div className="h-[1px] flex-1 bg-amber-200" />
                    <div className="flex items-center gap-2 bg-amber-50 px-4 py-1.5 rounded-full border border-amber-100 shadow-sm">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      <h2 className="text-[10px] font-black uppercase italic tracking-tighter text-amber-700">Los Más Pedidos</h2>
                    </div>
                    <div className="h-[1px] flex-1 bg-amber-200" />
                  </div>
                  <div className="space-y-8">
                    {products.slice(0, 3).map((p: any) => {
                      const isEven = globalIdx % 2 === 0;
                      globalIdx++;
                      return (
                        <button key={`best-mini-${p.id}`} onClick={() => setSelectedProduct(p)} className={`w-full flex items-center gap-4 active:scale-95 transition-transform ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                          <div className="shrink-0 relative">
                            <div className="absolute -top-2 -right-1 z-10 bg-amber-400 text-white p-1 rounded-full shadow-lg border-2 border-white"><Zap size={10} fill="white" /></div>
                            <div className={`${sizeProductImg} rounded-full border-4 border-white shadow-xl overflow-hidden bg-white`} style={{ boxShadow: `0 0 0 1px ${THEME}` }}>
                              {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-200"><ShoppingBag size={24}/></div>}
                            </div>
                          </div>
                          <div className={`flex-1 min-w-0 flex flex-col ${isEven ? 'items-start text-left' : 'items-end text-right'} space-y-1`}>
                          <span 
  className="inline-block px-3 py-2 rounded-xl border border-gray-100 shadow-sm text-[9px] font-black uppercase"
  style={{ 
    color: PROD_NAME_COLOR, 
    backgroundColor: PROD_NAME_BG // <--- Y ESTO FALTA ACÁ TAMBIÉN
  }}
>
  {p.name}
</span>
                            <div className="inline-block px-4 py-1.5 rounded-full font-black text-[10px] shadow-md border border-white/20" style={{ backgroundColor: PRICE_BG, color: PRICE_TEXT }}>${p.price}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LISTADO POR CATEGORÍAS (NORMAL) */}
              {catsToRender.map((cat: any) => {
                const catProducts = products?.filter((p: any) => String(p.category_id) === String(cat.id)) || [];
                if (catProducts.length === 0) return null;
                return (
                  <div key={cat.id} className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-[1px] flex-1 bg-gray-200" />
                      <h2 className="text-[10px] font-black uppercase italic tracking-tighter text-gray-400">
                        {cat.name.toLowerCase() === 'general' ? 'Nuestros Productos' : cat.name}
                      </h2>
                      <div className="h-[1px] flex-1 bg-gray-200" />
                    </div>
                    <div className="space-y-8">
                      {catProducts.map((p: any) => {
                        const isEven = globalIdx % 2 === 0;
                        globalIdx++;
                        return (
                          <button key={p.id} onClick={() => setSelectedProduct(p)} className={`w-full flex items-center gap-4 active:scale-95 transition-transform ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                            <div className="shrink-0 relative">
                              <div className={`${sizeProductImg} rounded-full border-4 border-white shadow-lg overflow-hidden bg-white`} style={{ boxShadow: `0 0 0 1px ${THEME}` }}>
                                {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-200"><ShoppingBag size={24}/></div>}
                              </div>
                            </div>
                            <div className={`flex-1 min-w-0 flex flex-col ${isEven ? 'items-start text-left' : 'items-end text-right'} space-y-1`}>
                              <span 
  className="inline-block px-3 py-2 rounded-xl border border-gray-100 shadow-sm text-[9px] font-black uppercase"
  style={{ 
    color: PROD_NAME_COLOR, 
    backgroundColor: PROD_NAME_BG 
  }}
>
  {p.name} 
</span>
                              <div className="inline-block px-4 py-1.5 rounded-full font-black text-[10px] shadow-md border border-white/20" style={{ backgroundColor: PRICE_BG, color: PRICE_TEXT }}>${p.price}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>
      {restaurant.selectedProduct && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm rounded-[2.5rem] bg-white overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <button onClick={closeModal} className="absolute top-4 right-8 z-[210] bg-white/90 p-1.5 rounded-full shadow-lg border border-gray-100"><X size={18} /></button>
            
            <div className="overflow-y-auto no-scrollbar flex-1 p-6 text-left">
              <img src={restaurant.selectedProduct.image_url} className="w-full aspect-video object-cover rounded-2xl mb-4" />
              <h2 className="text-xl font-black uppercase text-gray-900 italic tracking-tighter">{restaurant.selectedProduct.name}</h2>
              
              {/* SECCIÓN KG */}
              <div className="mt-8 space-y-3">
                <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest ml-1">Elegí cantidades:</p>
                {(restaurant.selectedProduct.variations?.length > 0 ? restaurant.selectedProduct.variations : [{ label: 'Unidad', price: restaurant.selectedProduct.price }]).map((v: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-3xl bg-gray-50 border border-gray-100">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black uppercase italic text-gray-900">{v.label}</span>
                      <span className="text-[10px] font-bold text-gray-400 mt-1">${v.price}</span>
                    </div>
                    <div className="flex items-center gap-4 bg-white px-2 py-1.5 rounded-2xl shadow-sm border border-gray-100">
                      <button onClick={() => handleUpdateCount(v.label, -1)} className="text-red-500 active:scale-75 transition-transform"><Minus size={16} /></button>
                      <span className="font-black text-sm w-4 text-center">{variationCounts[v.label] || 0}</span>
                      <button onClick={() => handleUpdateCount(v.label, 1)} className="text-indigo-600 active:scale-75 transition-transform"><Plus size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* SECCIÓN ADICIONALES (EXTRA) */}
              <div className="mt-8 space-y-3 pb-4">
                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-1">¿Querés sumar algo más?</p>
                <div className="grid grid-cols-1 gap-2">
                  {/* Aquí mapeamos los extras reales del restaurante */}
                  {restaurant.fetched_extras?.filter((ex: any) => ex.product_extras?.some((re: any) => String(re.product_id) === String(restaurant.selectedProduct.id))).map((ex: any) => {
                    const isSelected = selectedExtras.some(s => s.id === ex.id);
                    return (
                      <button 
                        key={ex.id}
                        onClick={() => setSelectedExtras(prev => isSelected ? prev.filter(s => s.id !== ex.id) : [...prev, ex])}
                        className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-white'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200'}`}>
                            {isSelected && <Check size={10} className="text-white" strokeWidth={4} />}
                          </div>
                          <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-emerald-900' : 'text-gray-400'}`}>{ex.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">+$ {ex.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 pt-2 bg-white border-t border-gray-50">
              <button 
                onClick={() => { /* Aquí va la lógica de onAddToCart */ closeModal(); }}
                className="w-full py-4 rounded-2xl font-black text-[12px] text-white shadow-xl active:scale-95" 
                style={{ backgroundColor: '#3f1a0b' }}
              >
                CONFIRMAR Y SUMAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}