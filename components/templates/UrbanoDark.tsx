import React, { useState } from 'react';
import { Search, Plus, X, Minus, ExternalLink, Clock, MapPin, Store, Instagram, Facebook, Music2, Phone, Check } from "lucide-react";

export default function UrbanoDark({ restaurant, products, categories, fetchedExtras, onAddToCart, isOpen, isMockup = false }: any) {
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);
const [variationsQuantities, setVariationsQuantities] = useState<{ [key: number]: number }>({});
  const isOpenNow = isOpen;
  const displayCategories = categories?.filter((c: any) => c.name.toLowerCase() !== 'general') || [];
  const formatPrice = (price: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);
  // --- VARIABLES PURAS (Sincronizadas con el Editor) ---
  const bg = restaurant.bg_color || '#121212';
  const localNameColor = restaurant.text_color || '#ffffff';
  const localDescColor = restaurant.description_color || '#888888';
  const accent = restaurant.theme_color || '#ea580c';
  const catBg = restaurant.cat_bg_color || '#000000';
  const searchBg = restaurant.search_bg_color || 'rgba(255,255,255,0.05)';
  const searchIconColor = restaurant.search_icon_color || localNameColor;
  const catText = restaurant.cat_text_color || '#ffffff';
  const catActiveBg = restaurant.cat_active_bg_color || '#ffffff';
  const catActiveText = restaurant.cat_active_text_color || '#000000';
  const cardBg = restaurant.card_color || '#1E1E1E';
  const prodName = restaurant.card_name_color || '#ffffff';
  const prodDesc = restaurant.card_desc_color || '#888888';
  const priceColor = restaurant.card_price_color || '#ea580c';
  
  const btnBg = restaurant.card_btn_bg || '#ffffff'; 
  const btnText = restaurant.card_btn_text || bg; // Si no hay color, usa el fondo de la web

  const promoBg = restaurant.promo_bg_color || '#1E1E1E';
  const promoText = restaurant.promo_text_color || '#ffffff'; 
  const showPromo = restaurant.show_promo !== false;
  const promoMessage = restaurant.promo_message || 'PROMO: Envío gratis > $15.000';
// 1. Primero definí los tamaños (SZ)
const sz = isMockup ? {
    logo: '36px', title: '13px', localDesc: '9px', status: '8px', 
    promo: '9px', img: '65px', prodTit: '12px', prodDesc: '8px', 
    price: '12px', btn: '24px', cat: '10px'
  } : {
    logo: '56px', title: '18px', localDesc: '13px', status: '11px', 
    promo: '13px', // 🚀 Agrandamos el texto de la Promo
    img: '85px', prodTit: '16px', prodDesc: '12px', 
    price: '16px', btn: '32px', 
    cat: '13px' // 🚀 Agrandamos el texto de las categorías
  };


 const styles = `
   .urbano-container { 
  background: ${bg}; 
  color: ${localNameColor}; 
  padding: 30px 15px 12px; /* 🚀 30px arriba para que no pegue al borde */
  font-family: 'Inter', sans-serif; 
  min-height: 100vh; 
  display: flex; 
  flex-direction: column; 
  padding-bottom: 120px; 
}
    .urbano-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; flex-shrink: 0; }
    .urbano-brand { display: flex; gap: 10px; align-items: center; }
    
    .urbano-logo { width: ${sz.logo}; height: ${sz.logo}; background: #333; border-radius: 50%; border: 2px solid ${localNameColor}; background-size: cover; background-position: center; flex-shrink: 0; }
    .urbano-names h4 { font-size: ${sz.title}; font-weight: 800; margin: 0; line-height: 1.1; color: ${localNameColor}; text-align: left; text-transform: uppercase; }
    .urbano-names span { font-size: ${sz.localDesc}; color: ${localDescColor}; display: block; text-align: left; opacity: 0.8; }
    .urbano-status { background: #22c55e; color: #000; font-size: ${sz.status}; font-weight: 900; padding: 4px 8px; border-radius: 12px; height: fit-content; }
    
    .urbano-msg { background: ${promoBg}; padding: ${isMockup ? '12px' : '18px'}; border-radius: 8px; font-size: ${sz.promo}; color: ${promoText}; margin-bottom: 15px; border-left: 4px solid ${accent}; flex-shrink: 0; font-weight: 6 00; text-align: left; }
    
    .urbano-item { background: ${cardBg}; padding: 12px; border-radius: 18px; display: flex; gap: 12px; margin-bottom: 12px; position: relative; border: 1px solid rgba(255,255,255,0.05); cursor: pointer; }
    .urbano-img { width: ${sz.img}; height: ${sz.img}; background-size: cover; border-radius: 12px; background-position: center; flex-shrink: 0; background-color: #333; position: relative; overflow: hidden; }
    
    .urbano-info { flex: 1; padding-right: 25px; display: flex; flex-direction: column; justify-content: center; text-align: left; }
    .urbano-tit { font-weight: 800; font-size: ${sz.prodTit}; margin-bottom: 3px; color: ${prodName}; }
    .urbano-desc { 
  font-size: ${sz.prodDesc}; 
  color: ${prodDesc}; 
  line-height: 1.3; 
  opacity: 0.7; 
  /* 🚀 Quitamos el límite de líneas para que se vea todo */
  display: block; 
}
    .urbano-price { color: ${priceColor}; font-weight: 900; font-size: ${sz.price}; margin-top: 5px; }
    
    .urbano-add-btn { position: absolute; bottom: 12px; right: 12px; width: ${sz.btn}; height: ${sz.btn}; background: ${btnBg}; color: ${btnText}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; border: none; font-size: calc(${sz.btn} * 0.7); pointer-events: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
    
    .cat-tit-urbano { font-size: ${sz.cat}; font-weight: 900; text-transform: uppercase; tracking-widest; margin-bottom: 12px; opacity: 0.5; text-align: left; color: ${localNameColor}; }
  `;

  return (
    <div className="urbano-container">
      <style>{styles}</style>
      <div className="urbano-top">
        <div className="urbano-brand">
          <div className="urbano-logo" style={restaurant.logo_url ? { backgroundImage: `url("${restaurant.logo_url}")` } : {}}></div>
          <div className="urbano-names">
            <h4>{restaurant.name || 'Tu Negocio'}</h4>
            <span>{restaurant.description || 'Descripción del local'}</span>
          </div>
        </div>
       {/* --- LADO DERECHO DEL HEADER --- */}
        <div className="flex flex-col items-end gap-3">
          {/* 1. EL ESTADO VA ARRIBA */}
          <div 
            className="urbano-status" 
            style={{ 
              backgroundColor: isOpenNow ? '#22c55e' : '#ef4444', 
              color: isOpenNow ? '#000' : '#fff' 
            }}
          >
            {isOpenNow ? 'ABIERTO' : 'CERRADO'}
          </div>

          {/* 2. EL ICONO DE INFO VA ABAJO Y MÁS GRANDE */}
          <button 
            onClick={() => setShowInfo(true)} 
            className="p-2.5 rounded-full border shadow-sm active:scale-90 transition-transform" 
            style={{ 
              borderColor: 'rgba(255,255,255,0.1)', 
              backgroundColor: 'rgba(255,255,255,0.05)', 
              color: localNameColor 
            }}
          >
            <Store size={22} /> {/* 🚀 Agrandado de 18 a 22 */}
          </button>
        </div>
      </div>
      
      {showPromo && <div className="urbano-msg">{promoMessage}</div>}
      {/* --- BUSCADOR Y CATEGORÍAS --- */}
      <div className="mb-4">
        <div className="relative group mb-3">
          {/* 🔍 LA LUPITA USA EL NUEVO COLOR */}
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10" 
            size={14} 
            style={{ color: searchIconColor }} 
          />
          
          {/* ⌨️ EL INPUT USA EL NUEVO COLOR DE FONDO */}
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full border rounded-xl py-2 pl-9 pr-3 text-xs font-medium outline-none transition-all"
            style={{ 
              backgroundColor: searchBg, // 🚀 SEPARADO DEL FONDO DE CARD
              borderColor: 'rgba(255,255,255,0.05)', 
              color: localNameColor 
            }}
            value={searchTerm}
            onChange={(e) => {
                if (!isOpenNow && !isMockup) return setShowClosedModal(true);
                setSearchTerm(e.target.value);
            }}
          />
        </div>

       <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={() => {
              if (!isOpenNow && !isMockup) return setShowClosedModal(true);
              setSelectedCategory("todos");
            }}
            className={`${isMockup ? 'px-3 py-1.5' : 'px-6 py-3'} rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border`}
          style={{ 
              // Si está seleccionado usa catActiveBg, si no usa catBg
              backgroundColor: selectedCategory === "todos" ? catActiveBg : catBg, 
              // Si está seleccionado usa catActiveText, si no usa catText
              color: selectedCategory === "todos" ? catActiveText : catText,
              // El borde sigue al color de fondo activo cuando está marcado
              borderColor: selectedCategory === "todos" ? catActiveBg : 'rgba(255,255,255,0.1)' 
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
              className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border"
              style={{ 
                  backgroundColor: selectedCategory === cat.id ? catActiveBg : catBg, 
                  color: selectedCategory === cat.id ? catActiveText : catText,
                  borderColor: selectedCategory === cat.id ? catActiveBg : 'rgba(255,255,255,0.1)' 
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      {/* 4. LISTADO DE PRODUCTOS (INTELIGENTE) */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {selectedCategory === "todos" ? (
          /* --- VISTA CUANDO ESTÁ EN "TODOS" (Lista Plana) --- */
          <div className="space-y-3">
          {(isMockup ? products?.slice(0, 5) : products)
  ?.filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  .map((p: any, i: number) => (
                <div 
                  key={i} 
                  className="urbano-item"
                  onClick={() => {
                    if (!isOpenNow && !isMockup) return setShowClosedModal(true);
                    setSelectedProduct(p);
                    setQuantity(1);
                    setSelectedExtras([]);
                    setVariationsQuantities({});
                  }}
                >
                  <div 
                    className="urbano-img" 
                    style={{
                      backgroundImage: p.image_url && !p.video_url ? `url("${p.image_url}")` : 'none',
                      backgroundColor: '#333',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {p.video_url && (
                     <video 
  autoPlay={!isMockup} 
  loop={!isMockup} 
  muted 
  playsInline 
  preload="metadata"
  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, borderRadius: '10px' }}
>
  <source src={p.video_url} />
</video>
                    )}
                  </div>
                  <div className="urbano-info">
                    <div className="urbano-tit">{p.name}</div>
                    <div className="urbano-desc">{p.description}</div>
                    <div className="urbano-price">{formatPrice(p.price)}</div>
                  </div>
                  <button className="urbano-add-btn" style={{ pointerEvents: 'none' }}>+</button>
                </div>
              ))}
          </div>
        ) : (
          /* --- VISTA POR CATEGORÍA SELECCIONADA --- */
          displayCategories
            .filter((cat: any) => cat.id === selectedCategory)
            .map((cat: any) => {
              const catProducts = products?.filter((p: any) => 
                String(p.category_id) === String(cat.id) && 
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
              ) || [];

              return (
                <div key={cat.id} className="mb-6">
                  <h2 className="cat-tit-urbano">{cat.name}</h2>
                  {catProducts.map((p: any, i: number) => (
                    <div 
                      key={i} 
                      className="urbano-item"
                      onClick={() => {
                        setSelectedProduct(p);
                        setQuantity(1);
                        setSelectedExtras([]);
                        setVariationsQuantities({});
                      }}
                    >
                      <div className="urbano-img" style={{ backgroundImage: p.image_url && !p.video_url ? `url("${p.image_url}")` : 'none', backgroundColor: '#333', position: 'relative', overflow: 'hidden' }}>
                        {p.video_url && (
                        <video 
  autoPlay={!isMockup} 
  loop={!isMockup} 
  muted 
  playsInline 
  preload="metadata"
  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, borderRadius: '10px' }}
>
  <source src={p.video_url} />
</video>
                        )}
                      </div>
                      <div className="urbano-info">
                        <div className="urbano-tit">{p.name}</div>
                        <div className="urbano-desc">{p.description}</div>
                        <div className="urbano-price">{formatPrice(p.price)}</div>
                      </div>
                      <button className="urbano-add-btn" style={{ pointerEvents: 'none' }}>+</button>
                    </div>
                  ))}
                </div>
              );
            })
        )}
      </div>
      {showInfo && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative border border-white/10 animate-in zoom-in-95 duration-200" style={{ backgroundColor: cardBg }}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2" style={{ color: localNameColor }}>
                <Store size={18} />
                <h3 className="text-base font-black uppercase italic tracking-tighter">Info del Local</h3>
              </div>
              <button onClick={() => setShowInfo(false)} className="p-1.5 rounded-full transition-colors opacity-70 hover:opacity-100" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: localNameColor }}>
                <X size={16}/>
              </button>
            </div>

            <div className="space-y-4">
              {/* Ubicación */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: accent }}><MapPin size={18}/></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-0.5 opacity-60" 
                  style={{ color: localNameColor, opacity: 0.6 }}>Dirección</p>
                  {restaurant.google_maps_link ? (
                    <a href={restaurant.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold underline" style={{ color: localNameColor }}>
                      {restaurant.address || 'Ver en mapa'} <ExternalLink size={10} className="inline ml-1"/>
                    </a>
                  ) : <p className="text-xs font-bold" style={{ color: localNameColor }}>{restaurant.address || 'No especificada'}</p>}
                </div>
              </div>

              {/* Horarios */}
              {restaurant.opening_hours && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: accent }}><Clock size={18}/></div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-0.5 opacity-60"style={{ color: localNameColor, opacity: 0.6 }}>Horarios</p>
                    <p className="text-xs font-bold whitespace-pre-line leading-tight" style={{ color: localNameColor }}>{restaurant.opening_hours}</p>
                  </div>
                </div>
              )}

              {/* WhatsApp */}
              {restaurant.phone && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl flex-shrink-0 bg-green-500/10 text-green-500"><Phone size={18}/></div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-0.5 opacity-60" style={{ color: localDescColor }}>WhatsApp</p>
                    <a href={`https://wa.me/${restaurant.phone}`} target="_blank" className="text-xs font-bold text-green-500 underline">Enviar mensaje</a>
                  </div>
                </div>
              )}

              {/* Redes Sociales */}
              {(restaurant.instagram || restaurant.facebook || restaurant.tiktok) && (
                <div className="pt-4 border-t border-white/5 mt-2">
                  <div className="flex justify-center gap-4 items-center">
                    {restaurant.instagram && <a href={restaurant.instagram.startsWith('http') ? restaurant.instagram : `https://instagram.com/${restaurant.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="hover:scale-110 active:scale-95 transition-transform" style={{ color: accent }}><Instagram size={20}/></a>}
                    {restaurant.facebook && <a href={restaurant.facebook.startsWith('http') ? restaurant.facebook : `https://facebook.com/${restaurant.facebook}`} target="_blank" rel="noopener noreferrer" className="hover:scale-110 active:scale-95 transition-transform" style={{ color: accent }}><Facebook size={20}/></a>}
                    {restaurant.tiktok && <a href={restaurant.tiktok.startsWith('http') ? restaurant.tiktok : `https://tiktok.com/@${restaurant.tiktok.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="hover:scale-110 active:scale-95 transition-transform" style={{ color: accent }}><Music2 size={20}/></a>}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setShowInfo(false)} className="w-full mt-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md active:scale-[0.98] transition-transform" style={{ backgroundColor: btnBg, color: btnText }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
{/* --- MODAL DE PRODUCTO (DETALLE Y COMPRA) --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] bg-white overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
            <button onClick={() => { setSelectedProduct(null); setQuantity(1); setVariationsQuantities({}); setSelectedExtras([]); }} className="absolute top-4 right-6 z-[210] bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-gray-100">
              <X size={18} className="text-gray-900" />
            </button>
            <div className="overflow-y-auto no-scrollbar flex-1">
              <div className="relative aspect-[16/15] w-full bg-gray-100 overflow-hidden" 
                style={{ backgroundImage: selectedProduct.image_url && !selectedProduct.video_url ? `url("${selectedProduct.image_url}")` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                {selectedProduct.video_url && (
                 <video 
  autoPlay 
  loop 
  muted 
  playsInline 
  className="absolute inset-0 w-full h-full object-cover"
>
  <source src={selectedProduct.video_url} />
</video>
                )}
              </div>
              <div className="p-6 text-black">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-black uppercase italic tracking-tighter leading-none text-gray-900 pr-4">{selectedProduct.name}</h2>
                  {(!selectedProduct.variations || selectedProduct.variations.length === 0) && (
                    <span className="text-xl font-black text-gray-900 shrink-0">{formatPrice(selectedProduct.price)}</span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed italic mb-6 text-gray-500">{selectedProduct.description || "Sin descripción disponible."}</p>
                
                {/* LÓGICA DE VARIACIONES (Kilos/Unidad) */}
                {selectedProduct.variations && selectedProduct.variations.length > 0 ? (
                  <div className="space-y-3 mb-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Elegí las cantidades</p>
                    {selectedProduct.variations.map((v: any, idx: number) => {
                      const qty = variationsQuantities[idx] || 0;
                      return (
                        <div key={idx} className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${qty > 0 ? "border-indigo-500 bg-indigo-50/50" : "border-gray-100 bg-gray-50"}`}>
                          <div className="flex flex-col text-left">
                            <span className={`font-black text-sm uppercase ${qty > 0 ? "text-indigo-900" : "text-gray-500"}`}>{v.label}</span>
                            <span className={`font-bold text-xs ${qty > 0 ? "text-indigo-600" : "text-gray-400"}`}>{formatPrice(v.price)}</span>
                          </div>
                          <div className="flex items-center gap-4 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                            <button onClick={() => setVariationsQuantities({ ...variationsQuantities, [idx]: Math.max(0, qty - 1) })} className="w-8 h-8 rounded-full text-gray-300">-</button>
                            <span className="font-black text-sm">{qty}</span>
                            <button onClick={() => setVariationsQuantities({ ...variationsQuantities, [idx]: qty + 1 })} className="w-8 h-8 rounded-full bg-indigo-600 text-white">+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 rounded-2xl mb-8 border border-gray-100 bg-gray-50/80">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Unidades</p>
                    <div className="flex items-center gap-5 bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-100">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-red-500"><Minus size={16} /></button>
                      <span className="font-black text-sm">{quantity}</span>
                      <button onClick={() => setQuantity(quantity + 1)} className="text-gray-900"><Plus size={16}/></button>
                    </div>
                  </div>
                )}

                {/* ADICIONALES (EXTRAS) */}
                {(() => {
                  const extrasDelProducto = (fetchedExtras || []).filter((ex: any) =>
                    ex.product_extras?.some((re: any) => String(re.product_id) === String(selectedProduct.id))
                  );
                  if (extrasDelProducto.length === 0) return null;
                  return (
                    <div className="mt-8 space-y-3 pb-4">
                      <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-1 text-left">¿Querés sumar algo más?</p>
                      <div className="grid grid-cols-1 gap-2">
                        {extrasDelProducto.map((ex: any) => {
                          const isSelected = selectedExtras.some((s) => s.id === ex.id);
                          return (
                            <button key={ex.id} onClick={() => setSelectedExtras(prev => isSelected ? prev.filter(s => s.id !== ex.id) : [...prev, ex])}
                              className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${isSelected ? "border-emerald-500 bg-emerald-50" : "border-gray-100 bg-white"}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border-2 ${isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-200"}`}></div>
                                <span className="text-[10px] font-black uppercase">{ex.name}</span>
                              </div>
                              <span className="text-[10px] font-bold text-gray-400">+{formatPrice(ex.price)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* BOTÓN CONFIRMAR FINAL */}
            <div className="p-6 pt-2 border-t border-gray-50 bg-white">
              <button 
                onClick={() => { 
                  if (!isOpenNow && !isMockup) return setShowClosedModal(true);
                  if (selectedProduct.variations?.length > 0) {
                    Object.entries(variationsQuantities).forEach(([idx, qty]) => {
                      if (qty > 0) {
                        const variation = selectedProduct.variations[Number(idx)];
                        onAddToCart({ ...selectedProduct, id: `${selectedProduct.id}-${idx}`, name: `${selectedProduct.name} (${variation.label})`, price: Number(variation.price) }, qty);
                        selectedExtras.forEach(ex => onAddToCart({ id: `${selectedProduct.id}-${idx}`, extraId: ex.id, name: ex.name, price: Number(ex.price) }, qty));
                      }
                    });
                  } else {
                    onAddToCart(selectedProduct, quantity); 
                    selectedExtras.forEach(ex => onAddToCart({ id: selectedProduct.id, extraId: ex.id, name: ex.name, price: Number(ex.price) }, quantity));
                  }
                  setSelectedProduct(null); 
                }} 
                className="w-full py-4 rounded-2xl font-black uppercase text-[11px] bg-black text-white shadow-xl active:scale-95 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 