"use client";

import { useState } from "react";
import { Search, Plus, X, Minus, RotateCcw, Bike, ExternalLink, Clock, MapPin, Store, Instagram, Facebook, Music2 } from "lucide-react";

export default function MarketProTemplate({ restaurant, products, categories, fetchedExtras, onAddToCart }: any) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [extraCounts, setExtraCounts] = useState<{ [key: string]: number }>({});
  const [notes, setNotes] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  // --- LÓGICA DE APERTURA AUTOMÁTICA ---
  const checkIfOpen = () => {
    const hours = restaurant.business_hours;
    if (!hours) return false;

    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = days[now.getDay()];
    const config = hours[todayKey];

    // Si no hay configuración o está marcado como cerrado para hoy
    if (!config || !config.isOpen) return false;

    // Convertimos la hora actual a minutos totales (ej: 14:30 = 870)
    const currentMin = now.getHours() * 60 + now.getMinutes();

    const toMin = (timeStr: string) => {
      if (!timeStr) return null;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    // Validación Rango 1
    const start1 = toMin(config.open);
    const end1 = toMin(config.close);
    if (start1 !== null && end1 !== null && currentMin >= start1 && currentMin <= end1) return true;

    // Validación Rango 2 (Doble Turno)
    if (config.isSplit) {
      const start2 = toMin(config.open2);
      const end2 = toMin(config.close2);
      if (start2 !== null && end2 !== null && currentMin >= start2 && currentMin <= end2) return true;
    }

    return false;
  };

  const isOpenNow = checkIfOpen();
  // -------------------------------------

  const displayCategories = categories?.filter((c: any) => c.name.toLowerCase() !== 'general') || [];

  const selectedProductExtras = fetchedExtras?.filter((ex: any) =>
    ex.product_extras?.some((rel: any) => String(rel.product_id) === String(selectedProduct?.id))
  ) || [];

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

  const titleFont = restaurant.title_font || 'Inter';
  const descFont = restaurant.desc_font || 'Inter';
  const promoFont = restaurant.promo_font || 'Inter';


  
  // --- COMPONENTE TARJETA PRO (BORDES REDONDEADOS + SIN ESTIRAR) ---
  const ProductCard = ({ product }: { product: any }) => {
    return (
      <div className="flex flex-col gap-2 w-full h-full"> {/* Contenedor que maneja el espacio */}
        
        {/* LA TARJETA (Imagen + Info) */}
        <div 
          onClick={() => setSelectedProduct(product)} 
          className="flex flex-col items-center text-center group cursor-pointer transition-all rounded-2xl overflow-hidden p-2 border shadow-sm h-fit"
          style={{ 
            backgroundColor: restaurant.card_show_bg ? (restaurant.card_color || '#ffffff') : 'transparent',
            borderColor: restaurant.card_show_bg ? 'transparent' : `${restaurant.description_color}20`
          }}
        >
          {/* CONTENEDOR DE IMAGEN: Aquí aplicamos el redondeado fuerte */}
          <div className="aspect-square w-full rounded-xl overflow-hidden mb-2 bg-transparent flex items-center justify-center">
            <img 
              src={product.image_url || '/placeholder.png'} 
              alt={product.name} 
           
              className="max-h-full max-w-full object-contain rounded-xl group-hover:scale-105 transition-transform" 
            />
          </div>
          
          {/* INFO DEL PRODUCTO */}
          <div className="flex flex-col items-center gap-0.5 px-0.5 pb-1 w-full">
            <h3 
              className="text-[8px] font-black uppercase italic tracking-tighter leading-tight line-clamp-2 min-h-[22px] flex items-center justify-center" 
              style={{ color: restaurant.card_name_color || '#000000' }}
            >
              {product.short_name || product.name}
            </h3>
            <span 
              className="text-[9px] font-black" 
              style={{ color: restaurant.card_price_color || '#059669' }}
            >
              ${product.price}
            </span>
          </div>
        </div>

        {/* BOTÓN POR FUERA (Siempre al pie de la card) */}
        <button 
          onClick={() => setSelectedProduct(product)}
          className="w-full py-1.5 text-[7px] font-black uppercase tracking-[0.1em] rounded-xl shadow-md active:scale-95 transition-all mt-auto"
          style={{ 
            backgroundColor: restaurant.card_btn_bg || '#000000', 
            color: restaurant.card_btn_text || '#ffffff' 
          }}
        >
          Elegir
        </button>
      </div>
    );
  };
  return (
    <div className="min-h-screen pb-24 transition-all duration-300" style={{ backgroundColor: restaurant.bg_color || '#ffffff' }}>

      {/* --- HEADER --- */}
     {/* --- HEADER CON ESTADO E INFO --- */}
      <header className="pt-8 pb-4 px-5 text-center relative">
        {/* Botón de Info (Esquina superior derecha) */}
       <button 
  onClick={() => setShowInfo(true)}
  className="absolute top-6 right-6 p-2.5 rounded-full border shadow-sm transition-all active:scale-90"
  style={{ backgroundColor: restaurant.bg_color, borderColor: `${restaurant.description_color}20`, color: restaurant.text_color }}
>
  <Store size={18} strokeWidth={2.5} /> {/* Ícono de Comercio/Tienda */}
</button>

        {/* Badge de Abierto/Cerrado */}
     <div className="flex justify-center mb-3">
  <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${isOpenNow ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
    {isOpenNow ? '● Abierto ahora' : '○ Cerrado momentáneamente'}
  </span>
</div>

        {restaurant.logo_url && (
          <div className="w-16 h-16 mx-auto mb-2 relative rounded-full overflow-hidden border-2 shadow-sm" style={{ borderColor: restaurant.theme_color }}>
            <img src={restaurant.logo_url} alt={restaurant.name} className="object-cover w-full h-full" />
          </div>
        )}
        <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none" style={{ color: restaurant.text_color || '#000000', fontFamily: titleFont }}>{restaurant.name}</h1>
        <p className="mt-1 max-w-[220px] mx-auto leading-tight" style={{ color: restaurant.description_color || '#999999', fontFamily: descFont, fontSize: restaurant.desc_size || '10px' }}>{restaurant.description}</p>
      </header>

      {/* --- BUSCADOR --- */}
      <div className="px-5 mb-4">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: restaurant.search_icon_color || '#9ca3af' }} />
          <input
            type="text"
            placeholder="Buscar producto..."
            className="w-full border-none rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none transition-all placeholder:text-current placeholder:opacity-50"
            style={{ backgroundColor: restaurant.search_bg_color || '#f3f4f6', color: restaurant.search_icon_color || '#000000' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- MENSAJE PROMO --- */}
      {restaurant.show_promo && restaurant.promo_message && (
        <div className="px-5 mb-2">
          <div className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-center" style={{ backgroundColor: restaurant.promo_bg_color || '#000000', color: restaurant.promo_text_color || '#ffffff', fontFamily: promoFont }}>{restaurant.promo_message}</div>
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

      {/* --- CATEGORÍAS --- */}
      <div className="flex gap-2 overflow-x-auto px-5 mb-6 no-scrollbar">
        <button
          onClick={() => setSelectedCategory("todos")}
          className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm"
          style={{ 
            backgroundColor: selectedCategory === "todos" ? (restaurant.theme_color || '#000000') : (restaurant.cat_bg_color || '#f3f4f6'),
            color: selectedCategory === "todos" ? '#ffffff' : (restaurant.cat_text_color || '#999999')
          }}
        >
          Todos
        </button>
        {displayCategories.map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm"
            style={{ 
                backgroundColor: selectedCategory === cat.id ? (restaurant.theme_color || '#000000') : (restaurant.cat_bg_color || '#f3f4f6'),
                color: selectedCategory === cat.id ? '#ffffff' : (restaurant.cat_text_color || '#999999')
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* --- RECOMENDADOS (KEY CORREGIDA) --- */}
      <section className="px-5 mb-10">
        <div className="border-t border-b py-2.5 mb-6 flex justify-between items-center" style={{ borderColor: `${restaurant.cat_title_color}20` }}>
          <h2 className="text-[10px] font-black uppercase italic tracking-tighter" style={{ color: restaurant.cat_title_color || '#000000' }}>Recomendados para vos</h2>
        </div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 items-start">
          {featuredProducts.map((product: any) => (
            <ProductCard key={`featured-${product.id}`} product={product} />
          ))}
        </div>
      </section>

      {/* --- SECCIONES POR CATEGORÍA (KEY CORREGIDA) --- */}
      {displayCategories.map((cat: any) => {
        const catProducts = products?.filter((p: any) => p.category_id === cat.id) || [];
        if (catProducts.length === 0) return null;
        return (
          <section key={cat.id} className="px-5 mb-10">
            <div className="border-t border-b py-2.5 mb-6 flex items-center" style={{ borderColor: `${restaurant.cat_title_color}20` }}>
              <h2 className="text-[10px] font-black uppercase italic tracking-tighter" style={{ color: restaurant.cat_title_color || '#000000' }}>{cat.name}</h2>
            </div>
           <div className="grid grid-cols-3 gap-x-2 gap-y-4 items-start">
              {catProducts.map((product: any) => (
                <ProductCard key={`cat-${cat.id}-prod-${product.id}`} product={product} />
              ))}
            </div>
          </section>
        );
      })}

     {/* --- MODAL DE PRODUCTO (CENTRADO Y CON COLORES FIJOS) --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          
          {/* Contenedor del Modal: Centrado y con altura máxima controlada */}
          <div className="relative w-full max-w-sm rounded-[2.5rem] bg-white overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            
            {/* BOTÓN CERRAR FIJO */}
            <button 
              onClick={() => { setSelectedProduct(null); setQuantity(1); setExtraCounts({}); setNotes(""); }} 
              className="absolute top-4 right-8 z-[210] bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-lg active:scale-90 transition-transform border border-gray-100"
            >
              <X size={18} className="text-gray-900" />
            </button>

            <div className="overflow-y-auto no-scrollbar flex-1">
              <div className="relative aspect-[16/10] w-full bg-gray-50">
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-black uppercase italic tracking-tighter leading-none text-gray-900" style={{ fontFamily: titleFont }}>
                    {selectedProduct.name}
                  </h2>
                  <span className="text-xl font-black text-gray-900">${selectedProduct.price}</span>
                </div>
                
                <p className="text-[11px] leading-relaxed italic mb-6 text-gray-500" style={{ fontFamily: descFont }}>
                  {selectedProduct.description || "Sin descripción disponible."}
                </p>

                {/* Unidades - AHORA CON COLOR FIJO GRIS CLARO */}
                <div className="flex items-center justify-between p-4 rounded-2xl mb-8 border border-gray-100 bg-gray-50/80">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Unidades</p>
                  <div className="flex items-center gap-5 bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-100">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-red-500 active:scale-75 transition-transform"><Minus size={16} strokeWidth={3}/></button>
                    <span className="font-black text-sm w-4 text-center text-gray-900">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="text-gray-900 active:scale-75 transition-transform"><Plus size={16} strokeWidth={3}/></button>
                  </div>
                </div>

                {/* Adicionales - AHORA CON COLORES FIJOS */}
                {selectedProductExtras.length > 0 && (
                  <div className="space-y-3 mb-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] border-b border-dashed border-gray-200 pb-2 text-gray-400">Personalizá tu pedido</p>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedProductExtras.map((extra: any) => {
                        const count = extraCounts[extra.id] || 0;
                        return (
                          <div key={extra.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="text-left flex-1">
                              <p className="text-[11px] font-bold uppercase italic text-gray-900">{extra.name}</p>
                              <p className="text-[10px] font-black" style={{ color: restaurant.theme_color }}>+${extra.price}</p>
                            </div>
                            <div className="flex items-center gap-3 p-1 rounded-lg border border-gray-100 bg-gray-50">
                              <button onClick={() => updateExtraCount(extra.id, -1)} className={`w-7 h-7 flex items-center justify-center ${count > 0 ? 'text-red-500' : 'text-gray-300'}`}><Minus size={14} /></button>
                              <span className="text-[11px] font-black w-3 text-center text-gray-900">{count}</span>
                              <button onClick={() => updateExtraCount(extra.id, 1)} className="w-7 h-7 flex items-center justify-center text-gray-900"><Plus size={14} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notas - AHORA CON COLOR FIJO */}
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-gray-400">¿Alguna indicación?</p>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Sin cebolla..."
                    className="w-full border border-gray-100 rounded-2xl p-4 text-xs italic outline-none h-24 resize-none bg-gray-50/80 text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Botón Final (Este sí usa el color del tema) */}
            <div className="p-6 pt-2 border-t border-gray-50 flex-shrink-0 bg-white">
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
                className="w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all"
                style={{ backgroundColor: restaurant.theme_color || '#000000', color: '#ffffff' }}
              >
                Confirmar — ${ (selectedProduct.price * quantity) + Object.entries(extraCounts).reduce((acc, [id, count]) => acc + (selectedProductExtras.find((e: any) => e.id === id)?.price || 0) * count, 0) }
              </button>
            </div>
          </div>
        </div>
      )}
     {/* --- MODAL DE INFORMACIÓN DEL LOCAL (CENTRADO Y LIMPIO) --- */}
      {showInfo && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 animate-in zoom-in-95 duration-300 shadow-2xl relative">
            
            {/* Encabezado con Icono de Comercio */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2 text-gray-900">
                <Store size={20} strokeWidth={2.5} />
                <h3 className="text-lg font-black uppercase italic tracking-tighter">Información</h3>
              </div>
              <button 
                onClick={() => setShowInfo(false)} 
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={18}/>
              </button>
            </div>

            <div className="space-y-8">
              {/* 1. UBICACIÓN (Dirección + Link a Maps) */}
              <div className="flex gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl h-fit">
                  <MapPin size={22}/>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ubicación</p>
                  {restaurant.google_maps_link ? (
                    <a 
                      href={restaurant.google_maps_link.startsWith('http') ? restaurant.google_maps_link : `https://${restaurant.google_maps_link}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-blue-600 underline decoration-blue-200 underline-offset-4 flex items-center gap-1 active:opacity-70 transition-all"
                    >
                      {restaurant.address || 'Ver en Google Maps'}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <p className="text-sm font-bold text-gray-800">
                      {restaurant.address || 'Consultar dirección por WhatsApp'}
                    </p>
                  )}
                </div>
              </div>

              {/* 2. HORARIOS DE ATENCIÓN */}
              <div className="flex gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl h-fit">
                  <Clock size={22}/>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Horarios de Atención</p>
                  <p className="text-sm font-bold text-gray-800 whitespace-pre-line leading-snug">
                    {restaurant.opening_hours || 'No especificados'}
                  </p>
                </div>
              </div>

              {/* 3. REDES SOCIALES (Solo una sección, bien diseñada) */}
              {(restaurant.instagram || restaurant.facebook || restaurant.tiktok) && (
                <div className="flex gap-4 pt-6 border-t border-gray-100">
                  <div className="p-3 bg-gray-50 text-gray-400 rounded-2xl h-fit">
                    <ExternalLink size={20}/>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Nuestras Redes</p>
                    <div className="flex gap-3">
                      {restaurant.instagram && (
                        <a 
                          href={restaurant.instagram.startsWith('http') ? restaurant.instagram : `https://${restaurant.instagram}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2.5 bg-pink-50 rounded-xl hover:scale-110 transition-transform"
                        >
                          <Instagram size={20} className="text-pink-600"/>
                        </a>
                      )}
                      {restaurant.facebook && (
                        <a 
                          href={restaurant.facebook.startsWith('http') ? restaurant.facebook : `https://${restaurant.facebook}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2.5 bg-blue-50 rounded-xl hover:scale-110 transition-transform"
                        >
                          <Facebook size={20} className="text-blue-600"/>
                        </a>
                      )}
                      {restaurant.tiktok && (
                        <a 
                          href={restaurant.tiktok.startsWith('http') ? restaurant.tiktok : `https://${restaurant.tiktok}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2.5 bg-zinc-100 rounded-xl hover:scale-110 transition-transform"
                        >
                          <Music2 size={20} className="text-black"/>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botón de cierre */}
            <button 
              onClick={() => setShowInfo(false)}
              className="w-full mt-10 py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
            >
              Entendido
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }