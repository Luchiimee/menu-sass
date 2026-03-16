'use client';
import { useState, useMemo } from 'react';
import { ShoppingBag, Store, Star, Zap, Info, X, Minus, Plus, Check } from 'lucide-react';

export default function AlternaPro({ restaurant = {}, products = [], setSelectedProduct, onAddToCart, isMockup = false }: any) {
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);
  const [variationCounts, setVariationCounts] = useState<{ [key: string]: number }>({});

  // --- CONFIGURACIÓN DE COLORES ---
  const THEME = restaurant?.theme_color || '#ea580c'; 
  const BG = restaurant?.bg_color || '#fafaf9';      
  const NAME_COLOR = restaurant?.text_color || '#111827';   
  const DESC_COLOR = restaurant?.description_color || '#94a3b8'; 
  const PROD_NAME_COLOR = restaurant?.card_name_color || '#111827';
  const PRICE_BG = restaurant?.card_price_color || THEME;
  const PRICE_TEXT = '#ffffff'; 
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

  // --- LÓGICA DE PRODUCTOS (AQUÍ APARECEN TODOS) ---
  
  const generalProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (!p.category_id) return true;
      const cat = rawCats.find((c: any) => String(c.id) === String(p.category_id));
      return !cat || cat.name.toLowerCase().trim() === 'general';
    });
  }, [products, rawCats]);

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
  
  // --- CONTADOR GLOBAL PARA ZIG-ZAG ---
  let globalItemIdx = 0;


 const renderProductCard = (p: any) => {
    const isEven = globalItemIdx % 2 === 0;
    globalItemIdx++;

    // --- LÓGICA DE PRECIO CORREGIDA (Sin useMemo para evitar el error) ---
    let displayPrice = p.price;
    if (p.variations && p.variations.length > 0) {
      const featured = p.variations.find((v: any) => v.is_featured);
      if (featured) {
        displayPrice = featured.price;
      } else {
        const prices = p.variations.map((v: any) => Number(v.price));
        displayPrice = Math.min(...prices);
      }
    }

    return (
      <button key={p.id} onClick={() => setSelectedProduct(p)} className={`w-full flex items-center gap-4 active:scale-95 transition-transform ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className="shrink-0 relative">
          <div className={`${sizeProductImg} rounded-full border-4 border-white shadow-xl overflow-hidden bg-white`} style={{ boxShadow: `0 0 0 1px ${THEME}` }}>
            {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" alt={p.name} /> : <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-200"><ShoppingBag size={24}/></div>}
          </div>
        </div>
        <div className={`flex-1 min-w-0 flex flex-col ${isEven ? 'items-start text-left' : 'items-end text-right'} space-y-1`}>
          <span className="inline-block px-3 py-2 rounded-xl border border-gray-100 shadow-sm text-[9px] font-black uppercase" style={{ color: PROD_NAME_COLOR, backgroundColor: PROD_NAME_BG }}>{p.name}</span>
          <div className="inline-block px-4 py-1.5 rounded-full font-black text-[10px] shadow-md border border-white/20" style={{ backgroundColor: PRICE_BG, color: PRICE_TEXT }}>
            ${displayPrice}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col min-h-screen pb-32 select-none animate-in fade-in duration-500" style={{ backgroundColor: BG }}>
      {/* HEADER */}
      <header className="pt-8 px-6 pb-4 relative">
        <div className="absolute top-8 right-6 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-black text-emerald-600 uppercase">Abierto</span>
        </div>
        <div className="text-center px-4">
          {restaurant?.logo_url && (
            <div className={`w-16 h-16 mx-auto rounded-full border-2 border-white shadow-md overflow-hidden mb-3 bg-white flex items-center justify-center`}>
              <img src={restaurant.logo_url} className="w-full h-full object-cover" alt="Logo" />
            </div>
          )}
          <h1 className="text-xl font-black uppercase tracking-tighter leading-none" style={{ color: NAME_COLOR }}>{restaurant?.name || 'Tu Negocio'}</h1>
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

     {/* CATEGORÍAS (BLOQUE ÚNICO) */}
    {/* CATEGORÍAS (DISEÑO BLINDADO - ESTILO CÁPSULA) */}
      <div 
        className="relative z-[100] w-full flex items-center gap-2 px-4 overflow-x-auto no-scrollbar shadow-sm border-b border-black/[0.03]" 
        style={{ backgroundColor: BG, minHeight: '60px' }}
      >
        <button 
          onClick={() => setSelectedCategory("todos")} 
          className={`px-5 py-2 rounded-full text-[9px] font-black uppercase transition-all shrink-0 shadow-sm border ${
            selectedCategory === "todos" 
              ? 'scale-105' 
              : 'bg-white opacity-70 border-gray-100 hover:opacity-100'
          }`}
          style={{ 
            backgroundColor: selectedCategory === "todos" ? (restaurant?.cat_active_bg_color || THEME) : 'white', 
            color: selectedCategory === "todos" ? (restaurant?.cat_active_text_color || 'white') : '#64748b',
            borderColor: selectedCategory === "todos" ? (restaurant?.cat_active_bg_color || THEME) : '#e5e7eb' 
          }}
        >
          Todos
        </button>

        {categoryButtons.map((cat: any) => (
          <button 
            key={cat.id} 
            onClick={() => setSelectedCategory(String(cat.id))} 
            className={`px-5 py-2 rounded-full text-[9px] font-black uppercase transition-all shrink-0 shadow-sm border ${
              selectedCategory === String(cat.id) 
                ? 'scale-105' 
                : 'bg-white opacity-70 border-gray-100 hover:opacity-100'
            }`}
            style={{ 
              backgroundColor: selectedCategory === String(cat.id) ? (restaurant?.cat_active_bg_color || THEME) : 'white', 
              color: selectedCategory === String(cat.id) ? (restaurant?.cat_active_text_color || 'white') : '#64748b',
              borderColor: selectedCategory === String(cat.id) ? (restaurant?.cat_active_bg_color || THEME) : '#e5e7eb' 
            }}
          >
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
          const catProds = products.filter((p: any) => String(p.category_id) === String(cat.id));
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
          <div className="relative w-full max-w-sm rounded-[2.5rem] bg-white overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <button onClick={closeModal} className="absolute top-4 right-8 z-[210] bg-white/90 p-1.5 rounded-full shadow-lg border border-gray-100"><X size={18} /></button>
            <div className="overflow-y-auto no-scrollbar flex-1 p-6 text-left">
              <img src={restaurant.selectedProduct.image_url} className="w-full aspect-video object-cover rounded-2xl mb-4" />
              <h2 className="text-xl font-black uppercase text-gray-900 italic tracking-tighter leading-none">{restaurant.selectedProduct.name}</h2>
              <p className="text-[11px] text-gray-500 mt-2 font-medium leading-relaxed">{restaurant.selectedProduct.description}</p>
              
              <div className="mt-8 space-y-3">
                <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest ml-1">Elegí cantidad:</p>
                {(restaurant.selectedProduct.variations?.length > 0 ? restaurant.selectedProduct.variations : [{ label: 'principal', price: restaurant.selectedProduct.price }]).map((v: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-3xl bg-gray-50 border border-gray-100">
                    <div className="flex flex-col">
                      {v.label !== 'principal' && <span className="text-[11px] font-black uppercase italic text-gray-900">{v.label}</span>}
                      <span className="text-[10px] font-bold text-gray-400 mt-1">${v.price}</span>
                    </div>
                    <div className="flex items-center gap-4 bg-white px-2 py-1.5 rounded-2xl shadow-sm border border-gray-100">
                      <button onClick={() => handleUpdateCount(v.label, -1)} className="text-red-500 active:scale-75"><Minus size={16} /></button>
                      <span className="font-black text-sm w-4 text-center">{variationCounts[v.label] || 0}</span>
                      <button onClick={() => handleUpdateCount(v.label, 1)} className="text-indigo-600 active:scale-75"><Plus size={16} /></button>
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
                      const hasMainQty = Object.values(variationCounts).some(q => q > 0);
                      return (
                        <button key={ex.id} onClick={() => {
                          if (!hasMainQty) { alert("⚠️ Primero seleccioná la cantidad del producto principal."); return; }
                          setSelectedExtras(prev => isSelected ? prev.filter(s => s.id !== ex.id) : [...prev, ex]);
                        }}
                        className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-white'} ${!hasMainQty ? 'opacity-40 cursor-not-allowed' : ''}`}>
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
              <button 
                onClick={() => {
                  Object.entries(variationCounts).forEach(([label, qty]) => {
                    if (qty > 0) {
                      const basePrice = (restaurant.selectedProduct.variations?.find((v:any) => v.label === label)?.price) || restaurant.selectedProduct.price;
                      const parentId = label === 'principal' ? restaurant.selectedProduct.id : `${restaurant.selectedProduct.id}-${label}`;
                      const parentName = label === 'principal' ? restaurant.selectedProduct.name : `${restaurant.selectedProduct.name} (${label})`;
                      
                      // --- LÓGICA QUE ARREGLA EL CARRITO (AQUÍ ESTÁ EL SECRETO) ---
                      for (let i = 0; i < qty; i++) {
                        // 1. Mandamos el producto principal
                        onAddToCart({ ...restaurant.selectedProduct, id: parentId, name: parentName, price: Number(basePrice) }, 1);
                        
                        // 2. Mandamos los extras uno por uno vinculados al padre
                        selectedExtras.forEach(extra => {
                          onAddToCart({ 
                            id: parentId, 
                            extraId: extra.id, 
                            name: extra.name, 
                            price: Number(extra.price) 
                          }, 1);
                        });
                      }
                    }
                  });
                  closeModal();
                }}
                className="w-full py-4 rounded-2xl font-black text-[12px] text-white shadow-xl active:scale-95" 
                style={{ backgroundColor: THEME }}
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