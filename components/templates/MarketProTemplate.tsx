"use client";

import CartFooter from "../CartFooter";
import { useState } from "react";
import { Search, Plus, X, Minus, RotateCcw, Bike, ExternalLink, Clock, MapPin, Store, Instagram, Facebook, Music2, Phone,Check } from "lucide-react";
import { getProductDisplayPrice } from "@/lib/productPricing";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { getContrastColor } from "@/lib/colorUtils";
import { useCart } from "@/context/CartContext";

export default function MarketProTemplate({ restaurant, products, categories, fetchedExtras, onAddToCart, isOpen, isMockup = false, setShowInfo, mesaLabel = null }: any) {
  const { cart } = useCart();
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);

  


const isOpenNow = isOpen;
  const displayCategories = categories?.filter((c: any) => c.name.toLowerCase() !== 'general') || [];
const catInactiveBorder = getContrastColor(restaurant.cat_bg_color || '#f3f4f6') === '#000000' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)';
  const titleFont = restaurant.title_font || 'Inter';
  const descFont = restaurant.desc_font || 'Inter';
  const promoFont = restaurant.promo_font || 'Inter';

  // --- COMPONENTE DE TARJETA ---
  const ProductCard = ({ product, cart }: { product: any; cart: any[] }) => {
    const showBg = restaurant.card_show_bg !== false;
    const { amount: displayPrice, isFrom } = getProductDisplayPrice(product);
    const totalQty = cart.filter((item: any) => item.id === product.id).reduce((sum: number, item: any) => sum + item.quantity, 0);

    const handleProductClick = () => {
      if (!isOpenNow && !isMockup) {
        setShowClosedModal(true);
      } else {
        setSelectedProduct(product);
      }
    };

    return (
      <div className="flex flex-col gap-1.5 w-full h-full">
        <div 
          onClick={handleProductClick} 
          className={`flex flex-col items-center text-center group cursor-pointer transition-all rounded-2xl overflow-hidden h-fit ${showBg ? 'p-2 border shadow-sm' : 'p-0 border-none shadow-none'}`}
          style={{ 
            backgroundColor: showBg ? (restaurant.card_color || '#ffffff') : 'transparent',
            borderColor: showBg ? `${restaurant.description_color}20` : 'transparent',
          }}
        >
      <div className="aspect-[3/4] w-full rounded-xl overflow-hidden mb-1 bg-gray-100 flex items-center justify-center relative">
  {totalQty > 0 && (
    <span className="absolute top-1 right-1 z-20 bg-alert text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-white">
      {totalQty}
    </span>
  )}
  {product.video_url ? (
    <video 
      src={product.video_url} 
      autoPlay 
      loop 
      muted 
      playsInline 
      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
    />
  ) : (
    <img
      src={getOptimizedImageUrl(product.image_url, 300, 70) || '/placeholder.png'}
      alt={product.name}
      loading="lazy"
      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
    />
  )}
</div>
          <div className="flex flex-col items-center px-0.5 pb-0.5 w-full">
            <h3 className="text-[9px] font-black uppercase italic tracking-tighter leading-tight line-clamp-2 min-h-[22px] flex items-center justify-center" style={{ color: restaurant.card_name_color || '#000000' }}>
              {product.short_name || product.name}
            </h3>
            <span className="text-[10px] font-black mt-0.5" style={{ color: restaurant.card_price_color || '#059669' }}>
              {isFrom ? `Desde $${displayPrice}` : `$${displayPrice}`}
            </span>
          </div>
        </div>
        <button onClick={handleProductClick} className="w-full py-1.5 text-[8px] font-black uppercase tracking-[0.1em] rounded-xl shadow-md active:scale-95 transition-all mt-auto" style={{ backgroundColor: restaurant.card_btn_bg || '#000000', color: restaurant.card_btn_text || '#ffffff' }}>
          Elegir
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 transition-all duration-300" style={{ backgroundColor: restaurant.bg_color || '#ffffff' }}>
      
      <header className="pt-8 pb-4 px-5 text-center relative">
        {!isMockup && (
          <button onClick={() => setShowInfo(true)} className="absolute top-6 right-6 p-2.5 rounded-full border shadow-sm transition-all active:scale-90" style={{ backgroundColor: restaurant.bg_color, borderColor: `${restaurant.description_color}20`, color: restaurant.text_color }}>
            <Store size={18} strokeWidth={2.5} />
          </button>
        )}
        {/* En mockup: Store top-left + badge Abierto top-right (esquinas, no centrado) */}
        {isMockup && (
          <>
            <div className="absolute top-3 left-3 z-10 w-7 h-7 bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm pointer-events-none">
              <Store size={13} className="text-gray-700" />
            </div>
            <div className={`absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[8px] font-black uppercase shadow-sm ${isOpenNow ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {isOpenNow ? '● Abierto' : '● Cerrado'}
            </div>
          </>
        )}

        {!isMockup && (
          <div className="flex justify-center mb-3">
            <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${mesaLabel ? 'bg-amber-100 text-amber-700' : isOpenNow ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {mesaLabel ? `📍 ${mesaLabel}` : isOpenNow ? '● Abierto ahora' : '○ Cerrado momentáneamente'}
            </span>
          </div>
        )}

        {restaurant.logo_url && (
          <div className="w-16 h-16 mx-auto mb-2 relative rounded-full overflow-hidden border-2 shadow-sm" style={{ borderColor: restaurant.theme_color }}>
            <img src={getOptimizedImageUrl(restaurant.logo_url, 150, 75, 150, 'cover')} alt={restaurant.name} className="object-cover w-full h-full" />
          </div>
        )}
        <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none" style={{ color: restaurant.text_color || '#000000', fontFamily: titleFont }}>{restaurant.name}</h1>
        <p className="mt-1 max-w-[220px] mx-auto leading-tight" style={{ color: restaurant.description_color || '#999999', fontFamily: descFont, fontSize: restaurant.desc_size || '10px' }}>{restaurant.description}</p>
      </header>

      {/* BUSCADOR (CON BLOQUEO) */}
      <div className="px-5 mb-4">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: restaurant.search_icon_color || '#9ca3af' }} />
          <input
            type="text"
            placeholder="Buscar producto..."
            className="w-full border-none rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none transition-all placeholder:text-current placeholder:opacity-50"
            style={{ backgroundColor: restaurant.search_bg_color || '#f3f4f6', color: restaurant.search_icon_color || '#000000' }}
            value={searchTerm}
            onChange={(e) => {
                if (!isOpenNow && !isMockup) return setShowClosedModal(true);
                setSearchTerm(e.target.value);
            }}
          />
        </div>
      </div>

      {/* MENSAJE PROMO */}
      {restaurant.show_promo && restaurant.promo_message && (
        <div className="px-5 mb-2">
          <div className="px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-center" style={{ backgroundColor: restaurant.promo_bg_color || '#000000', color: restaurant.promo_text_color || '#ffffff', fontFamily: promoFont }}>{restaurant.promo_message}</div>
        </div>
      )}

      {/* BANNER DE PORTADA (RESTURADO) */}
      {restaurant.show_banner && restaurant.banner_url && (
        <div className="px-5 mb-6">
          <div className="relative w-full aspect-[16/8] rounded-2xl overflow-hidden shadow-sm">
            <img src={getOptimizedImageUrl(restaurant.banner_url, 800, 75)} alt="Portada" className="object-cover w-full h-full" />
          </div>
        </div>
      )}

      {/* CATEGORÍAS (CON BLOQUEO) */}
      <div className="flex gap-2 overflow-x-auto px-5 mb-6 no-scrollbar">
        <button
          onClick={() => {
            if (!isOpenNow && !isMockup) return setShowClosedModal(true);
            setSelectedCategory("todos");
          }}
          className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm border"
          style={{
            backgroundColor: selectedCategory === "todos" ? (restaurant.cat_active_bg_color || '#000000') : (restaurant.cat_bg_color || '#f3f4f6'),
            color: selectedCategory === "todos" ? (restaurant.cat_active_text_color || '#ffffff') : (restaurant.cat_text_color || '#999999'),
            borderColor: selectedCategory === "todos" ? (restaurant.cat_active_bg_color || '#000000') : catInactiveBorder
          }}
        >
          Todos
        </button>
        {displayCategories.map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => {
              if (!isOpenNow && !isMockup) return setShowClosedModal(true);
              setSelectedCategory(cat.id);
            }}
            className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm border"
            style={{
                backgroundColor: selectedCategory === cat.id ? (restaurant.cat_active_bg_color || '#000000') : (restaurant.cat_bg_color || '#f3f4f6'),
                color: selectedCategory === cat.id ? (restaurant.cat_active_text_color || '#ffffff') : (restaurant.cat_text_color || '#999999'),
                borderColor: selectedCategory === cat.id ? (restaurant.cat_active_bg_color || '#000000') : catInactiveBorder
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 🌟 SECCIÓN RECOMENDADOS: Solo aparece en "Todos" y sin búsqueda activa */}
      {selectedCategory === "todos" && !searchTerm && (
        <section className="px-5 mb-10 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="border-t border-b py-2.5 mb-6 flex justify-between items-center" style={{ borderColor: `${restaurant.cat_title_color}20` }}>
            <h2 className="text-[10px] font-black uppercase italic tracking-tighter" style={{ color: restaurant.cat_title_color || '#000000' }}>Recomendados para vos</h2>
          </div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-4 items-start">
            {/* Aquí podrías poner un .slice(0, 6) si quisieras mostrar solo los primeros 6 como destacados */}
            {products?.slice(0, 6).map((product: any) => ( 
              <ProductCard key={`featured-${product.id}`} product={product} cart={cart} />
            ))}
          </div>
        </section>
      )}

     {/* --- LISTADO DE SECCIONES POR CATEGORÍA --- */}
      {displayCategories
        // 🚀 FILTRO CLAVE: Solo procesamos la categoría seleccionada (o todas si es "todos")
        .filter((cat: any) => selectedCategory === "todos" || cat.id === selectedCategory)
        .map((cat: any) => {
          const catProducts = products?.filter((p: any) => 
            p.category_id === cat.id && 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
          ) || [];
          
          if (catProducts.length === 0) return null;
          
          return (
            <section key={cat.id} className="px-5 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-t border-b py-2.5 mb-6 flex items-center" style={{ borderColor: `${restaurant.cat_title_color}20` }}>
                <h2 className="text-[10px] font-black uppercase italic tracking-tighter" style={{ color: restaurant.cat_title_color || '#000000' }}>
                  {cat.name}
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-x-2 gap-y-4 items-start">
                {catProducts.map((product: any) => (
                  <ProductCard key={`cat-${cat.id}-prod-${product.id}`} product={product} cart={cart} />
                ))}
              </div>
            </section>
          );
      })}

      {/* MODAL DE PRODUCTO */}
      {selectedProduct && (() => {
        const { amount: selectedDisplayPrice, isFrom: selectedIsFrom } = getProductDisplayPrice(selectedProduct);
        return (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm rounded-[2.5rem] bg-white overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <button onClick={() => { setSelectedProduct(null); setQuantity(1); setNotes(""); }} className="absolute top-4 right-8 z-[210] bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-gray-100">
              <X size={18} className="text-gray-900" />
            </button>
            <div className="overflow-y-auto no-scrollbar flex-1">
              <div className="relative aspect-[16/15] w-full bg-gray-50">
  {selectedProduct.video_url ? (
    <video 
      src={selectedProduct.video_url} 
      autoPlay 
      loop 
      muted 
      playsInline 
      className="w-full h-full object-cover"
    />
  ) : (
    <img
      src={getOptimizedImageUrl(selectedProduct.image_url, 600, 75) || '/placeholder.png'}
      alt={selectedProduct.name}
      className="w-full h-full object-cover"
    />
  )}
</div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-black uppercase italic tracking-tighter leading-none text-gray-900" style={{ fontFamily: titleFont }}>{selectedProduct.name}</h2>
                  <span className="text-xl font-black text-gray-900">{selectedIsFrom ? `Desde $${selectedDisplayPrice}` : `$${selectedDisplayPrice}`}</span>
                </div>
                <p className="text-[11px] leading-relaxed italic mb-6 text-gray-500" style={{ fontFamily: descFont }}>{selectedProduct.description || "Sin descripción disponible."}</p>
                
                {/* 1. SELECTOR DE UNIDADES (LIMPIO) */}
                <div className="flex items-center justify-between p-4 rounded-2xl mb-8 border border-gray-100 bg-gray-50/80">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Unidades</p>
                  <div className="flex items-center gap-5 bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-100">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-red-500 active:scale-75 transition-transform"><Minus size={16} strokeWidth={3}/></button>
                    <span className="font-black text-sm w-4 text-center text-gray-900">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="text-gray-900 active:scale-75 transition-transform"><Plus size={16} strokeWidth={3}/></button>
                  </div>
                </div>

                {/* 2. SECCIÓN DE ADICIONALES (FUERA DEL SELECTOR) */}
               {/* 2. SECCIÓN DE ADICIONALES DINÁMICA */}
                {(() => {
                  // Filtramos primero para ver si este producto específico tiene extras
                  const extrasDelProducto = (fetchedExtras || []).filter((ex: any) =>
                    ex.product_extras?.some((re: any) => String(re.product_id) === String(selectedProduct.id))
                  );

                  // Si no hay extras para este producto, no renderizamos nada (ni el título)
                  if (extrasDelProducto.length === 0) return null;

                  return (
                    <div className="mt-8 space-y-3 pb-4 animate-in fade-in duration-300">
                      <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-1 text-left">
                        ¿Querés sumar algo más?
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {extrasDelProducto.map((ex: any) => {
                          const isSelected = selectedExtras.some((s) => s.id === ex.id);
                          return (
                            <button
                              key={ex.id}
                              type="button"
                              onClick={() => setSelectedExtras(prev => 
                                isSelected ? prev.filter(s => s.id !== ex.id) : [...prev, ex]
                              )}
                              className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                                isSelected ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-gray-100 bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-200"
                                }`}>
                                  {isSelected && <Check size={10} className="text-white" strokeWidth={4} />}
                                </div>
                                <span className={`text-[10px] font-black uppercase ${isSelected ? "text-emerald-900" : "text-gray-400"}`}>
                                  {ex.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-gray-400">
                                +${ex.price}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 3. BOTÓN CONFIRMAR CON SUMA TOTAL */}
            <div className="p-6 pt-2 border-t border-gray-50 bg-white">
              <button 
                onClick={() => { 
                  if (!isOpenNow && !isMockup) return setShowClosedModal(true);
                  
                  // Agregamos el producto
                  onAddToCart({ ...selectedProduct, price: selectedDisplayPrice }, quantity);

                  // Agregamos los extras
                  selectedExtras.forEach(extra => {
                    onAddToCart({
                      id: selectedProduct.id, 
                      extraId: extra.id,
                      name: extra.name,
                      price: Number(extra.price)
                    }, quantity);
                  });

                  // Reseteo de estados
                  setSelectedProduct(null); 
                  setSelectedExtras([]);
                  setQuantity(1);
                }} 
                className="w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all" 
                style={{ backgroundColor: restaurant.theme_color || '#000000', color: '#ffffff' }}
              >
                Confirmar — ${ (selectedDisplayPrice * quantity) + (selectedExtras.reduce((acc, e) => acc + Number(e.price), 0) * quantity) }
              </button>
            </div>
          </div>
        </div>
        );
      })()}

    

      {/* MODAL LOCAL CERRADO */}
      {showClosedModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowClosedModal(false)} />
          <div className="bg-white w-full max-w-xs p-8 rounded-[2.5rem] shadow-2xl text-center relative animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4"><Clock size={32} strokeWidth={2.5} /></div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">Local Cerrado</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-widest leading-relaxed">
              ¡Hola! Actualmente estamos fuera de nuestro horario de atención. <br/> Podés ver nuestra información, pero no realizar pedidos.
            </p>
            <button onClick={() => setShowClosedModal(false)} className="mt-6 w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg active:scale-95 transition-all">Entendido</button>
          </div>
        </div>
      )}

    </div>
  );
}