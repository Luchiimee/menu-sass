"use client";

import { useState } from "react";
import { Search, Plus, X, Minus } from "lucide-react";

export default function MarketProTemplate({ restaurant, products, categories, fetchedExtras, onAddToCart }: any) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [extraCounts, setExtraCounts] = useState<{ [key: string]: number }>({});
  const [notes, setNotes] = useState("");

  const displayCategories = categories?.filter((c: any) => c.name.toLowerCase() !== 'general') || [];

  // Buscamos los extras del producto seleccionado
  const selectedProductExtras = fetchedExtras?.filter((ex: any) =>
    ex.product_extras?.some((rel: any) => String(rel.product_id) === String(selectedProduct?.id))
  ) || [];

  // Función para manejar las cantidades de los extras
  const updateExtraCount = (id: string, delta: number) => {
    setExtraCounts(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const filteredProducts = products?.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "todos" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const featuredProducts = filteredProducts.slice(0, 6);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-24">

      {/* --- HEADER --- */}
      <header className="pt-6 pb-4 px-5 text-center">
        {restaurant.logo_url && (
          <div className="w-14 h-14 mx-auto mb-2 relative rounded-full overflow-hidden border border-gray-100 shadow-sm">
            <img src={restaurant.logo_url} alt={restaurant.name} className="object-cover w-full h-full" />
          </div>
        )}
        <h1 className="text-lg font-black tracking-tighter uppercase italic leading-none">{restaurant.name}</h1>
        <p className="text-gray-400 text-[10px] font-medium mt-1 max-w-[200px] mx-auto leading-tight">
          {restaurant.description}
        </p>
      </header>

      {/* --- BUSCADOR --- */}
      <div className="px-5 mb-4">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Buscar producto..."
            className="w-full bg-gray-100 border-none rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- PROMO --- */}
      {restaurant.show_promo && restaurant.promo_message && (
        <div className="px-5 mb-2">
          <div className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-amber-100 text-center">
            ⚡ {restaurant.promo_message}
          </div>
        </div>
      )}

      {/* --- BANNER --- */}
      {restaurant.show_banner && restaurant.banner_url && (
        <div className="px-5 mb-6">
          <div className="relative w-full aspect-[16/8] rounded-2xl overflow-hidden shadow-sm">
            <img src={restaurant.banner_url} alt="Portada" className="object-cover w-full h-full" />
          </div>
        </div>
      )}

      {/* --- CATEGORÍAS (Pills) --- */}
      <div className="flex gap-2 overflow-x-auto px-5 mb-6 no-scrollbar">
        <button
          onClick={() => setSelectedCategory("todos")}
          className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedCategory === "todos" ? 'bg-black text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}
        >
          Todos
        </button>
        {displayCategories.map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-black text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* --- SECCIÓN RECOMENDADOS --- */}
      <section className="px-5 mb-10">
        <div className="border-t border-b border-gray-200 py-2.5 mb-8 flex justify-between items-center">
          <h2 className="text-[10px] font-black uppercase italic tracking-tighter text-gray-900">Recomendados para vos</h2>
          <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Ver todos</span>
        </div>
        <div className="grid grid-cols-3 gap-x-3 gap-y-10">
          {featuredProducts.map((product: any) => (
            <div key={product.id} onClick={() => setSelectedProduct(product)} className="flex flex-col items-center text-center group cursor-pointer">
              <div className="aspect-square w-full bg-gray-50 rounded-[1.6rem] overflow-hidden relative border border-gray-100 mb-3 shadow-sm">
                <img src={product.image_url || '/placeholder.png'} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
              </div>
              <div className="flex flex-col gap-0.5 mb-3 px-1">
                <h3 className="text-[9px] font-black text-gray-900 uppercase italic tracking-tighter leading-tight">{product.short_name || product.name}</h3>
                <span className="text-[10px] font-black text-emerald-600">${product.price}</span>
              </div>
              <button className="w-full py-2 bg-black text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-xl shadow-md">Elegir</button>
            </div>
          ))}
        </div>
      </section>

      {/* --- SECCIONES POR CATEGORÍA --- */}
      {displayCategories.map((cat: any) => {
        const catProducts = products?.filter((p: any) => p.category_id === cat.id) || [];
        if (catProducts.length === 0) return null;
        return (
          <section key={cat.id} className="px-5 mb-10">
            <div className="border-t border-b border-gray-200 py-2.5 mb-8 flex items-center">
              <h2 className="text-[10px] font-black uppercase italic tracking-tighter text-gray-900">{cat.name}</h2>
            </div>
            <div className="grid grid-cols-3 gap-x-3 gap-y-10">
              {catProducts.map((product: any) => (
                <div key={product.id} onClick={() => setSelectedProduct(product)} className="flex flex-col items-center text-center group cursor-pointer">
                  <div className="aspect-square w-full bg-gray-50 rounded-[1.6rem] overflow-hidden relative border border-gray-100 mb-3 shadow-sm">
                    <img src={product.image_url || '/placeholder.png'} alt={product.name} className="object-cover w-full h-full" />
                  </div>
                  <div className="flex flex-col gap-0.5 mb-3 px-1">
                    <h3 className="text-[9px] font-black text-gray-900 uppercase italic tracking-tighter leading-tight">{product.name}</h3>
                    <span className="text-[10px] font-black text-emerald-600">${product.price}</span>
                  </div>
                  <button className="w-full py-2 bg-black text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-xl">Elegir</button>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* --- MODAL DE PRODUCTO (DISEÑO PRO UNIFICADO) --- */}
     {/* --- MODAL DE PRODUCTO (SCROLL UNIFICADO + IMG PANORÁMICA) --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* --- CONTENEDOR CON SCROLL (Envuelve imagen y datos) --- */}
            <div className="overflow-y-auto no-scrollbar flex-1">
              
              {/* 1. IMAGEN (Ahora scrollea y es más chica) */}
              <div className="relative aspect-[16/10] w-full bg-gray-100">
                <button 
                  onClick={() => { setSelectedProduct(null); setQuantity(1); setExtraCounts({}); setNotes(""); }} 
                  className="absolute top-4 right-4 z-50 bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-lg"
                >
                  <X size={18} />
                </button>
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
              </div>

              {/* 2. DATOS DEL PRODUCTO */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-black uppercase italic tracking-tighter leading-none">{selectedProduct.name}</h2>
                  <span className="text-xl font-black text-black">${selectedProduct.price}</span>
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed mb-6 italic">{selectedProduct.description || "Sin descripción disponible."}</p>

                {/* Selector Cantidad Unidades */}
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl mb-8 border border-gray-100">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-800">Unidades</p>
                  <div className="flex items-center gap-5 bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-200">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-red-500 active:scale-75 transition-transform"><Minus size={16} strokeWidth={3}/></button>
                    <span className="font-black text-sm w-4 text-center">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="text-black active:scale-75 transition-transform"><Plus size={16} strokeWidth={3}/></button>
                  </div>
                </div>

                {/* Adicionales */}
                {selectedProductExtras.length > 0 && (
                  <div className="space-y-3 mb-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-dashed pb-2">Personalizá tu pedido</p>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedProductExtras.map((extra: any) => {
                        const count = extraCounts[extra.id] || 0;
                        return (
                          <div key={extra.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="text-left flex-1">
                              <p className="text-[11px] font-bold text-gray-800 uppercase italic">{extra.name}</p>
                              <p className="text-[10px] font-black text-emerald-600">+${extra.price}</p>
                            </div>
                            <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg border border-gray-100">
                              <button onClick={() => updateExtraCount(extra.id, -1)} className={`w-7 h-7 flex items-center justify-center ${count > 0 ? 'text-red-500' : 'text-gray-300'}`}><Minus size={14} /></button>
                              <span className="text-[11px] font-black w-3 text-center">{count}</span>
                              <button onClick={() => updateExtraCount(extra.id, 1)} className="w-7 h-7 flex items-center justify-center text-black"><Plus size={14} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notas */}
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">¿Alguna indicación?</p>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Sin cebolla..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs italic outline-none h-24 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. BOTÓN FINAL (Este se queda FIJO abajo) */}
            <div className="p-6 pt-2 border-t bg-white flex-shrink-0">
              <button 
                onClick={() => { 
                  onAddToCart({ ...selectedProduct, notes }, quantity); 
                  Object.entries(extraCounts).forEach(([extraId, count]) => {
                    if (count > 0) {
                      const extraData = selectedProductExtras.find((e: any) => e.id === extraId);
                      for(let i = 0; i < count; i++) {
                        onAddToCart({ id: selectedProduct.id, extraId: extraData.id, name: extraData.name, price: Number(extraData.price) }, 1);
                      }
                    }
                  });
                  setSelectedProduct(null); setQuantity(1); setExtraCounts({}); setNotes("");
                }}
                className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all"
              >
                Confirmar — ${ (selectedProduct.price * quantity) + Object.entries(extraCounts).reduce((acc, [id, count]) => acc + (selectedProductExtras.find((e: any) => e.id === id)?.price || 0) * count, 0) }
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}