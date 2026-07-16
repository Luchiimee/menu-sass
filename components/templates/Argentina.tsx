"use client";

import React, { useState } from 'react';
import { Search, Plus, Minus, Store, X, Utensils, Clock } from 'lucide-react';
import { getProductDisplayPrice } from '@/lib/productPricing';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

export default function Argentina({ restaurant, products, categories, fetchedExtras, onAddToCart, isOpen, isMockup = false, setShowInfo, mesaLabel = null }: any) {
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);
  const [variationsQuantities, setVariationsQuantities] = useState<{ [key: number]: number }>({});

  const isOpenNow = isOpen;
  const displayCategories = categories?.filter((c: any) => c.name.toLowerCase() !== 'general') || [];
  const formatPrice = (price: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

  // --- PALETA (celeste / blanco / dorado) — todo derivado de columnas ya existentes ---
  const bg = restaurant.bg_color || '#ffffff';
  const textColor = restaurant.text_color || '#15160E';
  const accent = restaurant.theme_color || '#3E7CB1'; // celeste oscuro: marca, precio, línea del hero
  const accentLine = `${accent}40`; // celeste claro decorativo, derivado del mismo accent (no es un campo aparte)
  const dorado = restaurant.hero_badge_bg || '#F2B705';
  const doradoText = restaurant.hero_badge_color || '#4a3600';
  const cardBg = restaurant.card_color || '#6CACE4';
  const prodName = restaurant.card_name_color || '#0E2A45';
  const prodDesc = restaurant.card_desc_color || '#1B3A57';
  const priceColor = restaurant.card_price_color || '#0E2A45';
  const btnBg = restaurant.card_btn_bg || dorado;
  const btnText = restaurant.card_btn_text || doradoText;
  const catBg = restaurant.cat_bg_color || '#f3f4f6';
  const catText = restaurant.cat_text_color || '#9ca3af';
  const catActiveBg = restaurant.cat_active_bg_color || accent;
  const catActiveText = restaurant.cat_active_text_color || '#ffffff';
  const searchBg = restaurant.search_bg_color || '#f3f4f6';
  const searchIcon = restaurant.search_icon_color || accent;

  const showBanner = restaurant.show_banner !== false;
  const bannerImage = restaurant.banner_url || '';
  const heroTitle = restaurant.description || restaurant.name || 'Nuestra Especialidad';
  const heroBadge = restaurant.show_promo !== false ? (restaurant.promo_message || '') : '';

  // Producto destacado: flag es_destacado en products (exclusivo por restaurante, se marca desde Productos).
  const heroDessert = products?.find((p: any) => p.es_destacado === true);

  const btnPad = isMockup ? '7px 10px' : '11px 20px';
  const btnFont = isMockup ? '9px' : '12px';
  const btnGap = isMockup ? '3px' : '6px';
  const featuredPad = isMockup ? '12px 14px 14px' : '16px 18px 18px';
  const heroDisplayPrice = heroDessert ? getProductDisplayPrice(heroDessert) : null;

  const openProduct = (p: any) => {
    if (!isOpenNow && !isMockup) return setShowClosedModal(true);
    setSelectedProduct(p);
    setQuantity(1);
    setSelectedExtras([]);
    setVariationsQuantities({});
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Hanken+Grotesk:wght@400;600;700&display=swap');

    .arg-container { background: ${bg}; color: ${textColor}; font-family: 'Hanken Grotesk', sans-serif; min-height: 100vh; display: flex; flex-direction: column; padding-bottom: 120px; }

    .arg-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 16px 20px 10px; background: ${bg}; border-bottom: 2px solid ${accentLine}; }
    .arg-logo { width: 40px; height: 40px; border-radius: 50%; border: 1.5px solid ${accent}; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff; justify-self: start; flex-shrink: 0; }
    .arg-brand-name { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 15px; color: ${accent}; letter-spacing: 0.4px; text-align: center; text-transform: uppercase; line-height: 1.2; }
    .arg-stars { text-align: center; font-size: 10px; color: ${dorado}; letter-spacing: 3px; margin-top: 3px; }
    .arg-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; justify-self: end; }
    .arg-status { font-size: 8px; font-weight: 800; padding: 3px 8px; border-radius: 999px; text-transform: uppercase; color: #fff; }
    .arg-info-btn { background: transparent; border: none; color: ${accent}; padding: 2px; cursor: pointer; display: flex; }

    .arg-hero { position: relative; height: 340px; background-size: cover; background-position: center; background-color: ${accent}; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 36px; overflow: hidden; }
    .arg-hero-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 32%, rgba(0,0,0,0.7) 100%); }
    .arg-hero-title { position: relative; z-index: 1; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 32px; color: #fff; line-height: 0.95; text-transform: uppercase; text-align: center; padding: 0 24px; }
    .arg-hero-rule { position: relative; z-index: 1; width: 36px; height: 2px; background: ${dorado}; margin: 14px auto; }
    .arg-hero-badge { position: relative; z-index: 1; display: inline-block; background: ${dorado}; color: ${doradoText}; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 6px 14px; border-radius: 999px; text-transform: uppercase; }

    .arg-featured { background: ${cardBg}; border-radius: 20px; margin: -56px 20px 0; position: relative; z-index: 2; box-shadow: 0 8px 24px rgba(0,0,0,0.12); padding: ${featuredPad}; border-top: 3px solid #ffffff; }
    .arg-card-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 16px; color: ${prodName}; text-transform: uppercase; margin-bottom: 4px; }
    .arg-card-desc { font-size: 12.5px; color: ${prodDesc}; line-height: 1.4; margin-bottom: 12px; }
    .arg-card-price { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 17px; color: ${priceColor}; }
    .arg-add-btn { display: inline-flex; align-items: center; justify-content: center; gap: ${btnGap}; background: ${btnBg}; color: ${btnText}; border: none; font-family: 'Hanken Grotesk', sans-serif; font-weight: 700; font-size: ${btnFont}; letter-spacing: 0.4px; text-transform: uppercase; padding: ${btnPad}; border-radius: 999px; cursor: pointer; flex-shrink: 0; }
    .arg-featured-footer { display: flex; align-items: center; justify-content: space-between; gap: 14px; }

    .arg-search-container { padding: 18px 20px 10px; }
    .arg-search-wrapper { position: relative; }
    .arg-search-input { width: 100%; padding: 10px 10px 10px 34px; border-radius: 999px; background: ${searchBg}; color: ${textColor}; border: none; font-size: 12px; font-weight: 600; outline: none; }
    .arg-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: ${searchIcon}; }

    .arg-cats { display: flex; gap: 8px; overflow-x: auto; padding: 6px 20px 16px; }
    .arg-cat-btn { padding: 7px 16px; border-radius: 999px; font-size: 10px; font-weight: 800; text-transform: uppercase; border: none; white-space: nowrap; }

    .arg-products { padding: 0 20px; display: flex; flex-direction: column; gap: 14px; }
    .arg-cat-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: ${accent}; margin: 10px 0 -2px; }
    .arg-card-row { display: flex; background: ${cardBg}; border-radius: 18px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06); border: 1px solid rgba(0,0,0,0.04); cursor: pointer; }
    .arg-card-photo { width: 30%; flex-shrink: 0; padding: 8px; background: ${cardBg}; display: flex; align-items: center; justify-content: center; }
    .arg-card-photo img, .arg-ph-fallback { width: 100%; height: 100%; border-radius: 10px; border: 3px solid #ffffff; box-shadow: 0 2px 6px rgba(14,42,69,0.25); }
    .arg-card-photo img { object-fit: cover; }
    .arg-ph-fallback { display: flex; align-items: center; justify-content: center; background: ${cardBg}; }
    .arg-card-body { flex: 1; padding: 14px 16px; display: flex; flex-direction: column; }
    .arg-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; }
  `;

  const renderProductModal = () => {
    if (!selectedProduct) return null;
    const { amount: selPrice } = getProductDisplayPrice(selectedProduct);
    const extrasDelProducto = (fetchedExtras || []).filter((ex: any) =>
      ex.product_extras?.some((re: any) => String(re.product_id) === String(selectedProduct.id))
    );

    return (
      <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] bg-white overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
          <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-6 z-[210] bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-gray-100">
            <X size={18} className="text-gray-900" />
          </button>
          <div className="overflow-y-auto no-scrollbar flex-1">
            <div className="relative aspect-[16/15] w-full bg-zinc-50 overflow-hidden flex items-center justify-center">
              {selectedProduct.video_url ? (
                <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover"><source src={selectedProduct.video_url} /></video>
              ) : selectedProduct.image_url ? (
                <img src={getOptimizedImageUrl(selectedProduct.image_url, 600, 75)} className="w-full h-full object-cover" alt={selectedProduct.name} />
              ) : (
                <div className="flex flex-col items-center gap-3 opacity-20">
                  <Utensils size={80} strokeWidth={1} className="text-gray-400" />
                </div>
              )}
            </div>
            <div className="p-6 text-black">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-black uppercase italic tracking-tighter leading-none text-gray-900 pr-4">{selectedProduct.name}</h2>
                {!(selectedProduct.sale_type === 'peso' && selectedProduct.variations?.length > 0) && (
                  <span className="text-xl font-black text-gray-900 shrink-0">{formatPrice(selPrice)}</span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed italic mb-6 text-gray-500">{selectedProduct.description || "Sin descripción disponible."}</p>

              {selectedProduct.sale_type === 'peso' && selectedProduct.variations?.length > 0 ? (
                <div className="space-y-3 mb-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Elegí las cantidades</p>
                  {selectedProduct.variations.map((v: any, idx: number) => {
                    const qty = variationsQuantities[idx] || 0;
                    return (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${qty > 0 ? "border-fresco bg-[#F0FAF6]/50" : "border-gray-100 bg-gray-50"}`}>
                        <div className="flex flex-col text-left">
                          <span className={`font-black text-sm uppercase ${qty > 0 ? "text-indigo-900" : "text-gray-500"}`}>{v.label}</span>
                          <span className={`font-bold text-xs ${qty > 0 ? "text-fresco" : "text-gray-400"}`}>{formatPrice(Number(v.price))}</span>
                        </div>
                        <div className="flex items-center gap-4 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                          <button onClick={() => setVariationsQuantities({ ...variationsQuantities, [idx]: Math.max(0, qty - 1) })} className="w-8 h-8 rounded-full text-gray-300">-</button>
                          <span className="font-black text-sm">{qty}</span>
                          <button onClick={() => setVariationsQuantities({ ...variationsQuantities, [idx]: qty + 1 })} className="w-8 h-8 rounded-full bg-fresco text-white">+</button>
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
                    <button onClick={() => setQuantity(quantity + 1)} className="text-gray-900"><Plus size={16} /></button>
                  </div>
                </div>
              )}

              {extrasDelProducto.length > 0 && (
                <div className="mt-8 space-y-3 pb-4">
                  <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-1 text-left">¿Querés sumar algo más?</p>
                  <div className="grid grid-cols-1 gap-2">
                    {extrasDelProducto.map((ex: any) => {
                      const isSelected = selectedExtras.some((s) => s.id === ex.id);
                      return (
                        <button key={ex.id} onClick={() => setSelectedExtras(prev => isSelected ? prev.filter(s => s.id !== ex.id) : [...prev, ex])} className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${isSelected ? "border-emerald-500 bg-emerald-50" : "border-gray-100 bg-white"}`}>
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
              )}
            </div>
          </div>
          <div className="p-6 pt-2 border-t border-gray-50 bg-white">
            <button onClick={() => {
              if (!isOpenNow && !isMockup) return setShowClosedModal(true);
              if (selectedProduct.sale_type === 'peso' && selectedProduct.variations?.length > 0) {
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
            }} className="w-full py-4 rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all" style={{ backgroundColor: accent, color: '#ffffff' }}>
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="arg-container">
      <style>{styles}</style>

      <header className="arg-header">
        <div className="arg-logo">
          {restaurant.logo_url ? (
            <img src={getOptimizedImageUrl(restaurant.logo_url, 150, 75, 150, 'cover')} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : (
            <Store size={18} color={accent} />
          )}
        </div>
        <div>
          <div className="arg-brand-name">{restaurant.name || 'Tu Negocio'}</div>
          <div className="arg-stars">★ ★ ★</div>
        </div>
        <div className="arg-header-right">
          <div className="arg-status" style={{ backgroundColor: mesaLabel ? '#d97706' : isOpenNow ? '#22c55e' : '#ef4444' }}>
            {mesaLabel ? `📍 ${mesaLabel}` : isOpenNow ? 'Abierto' : 'Cerrado'}
          </div>
          <button onClick={() => setShowInfo(true)} className="arg-info-btn">
            <Store size={22} />
          </button>
        </div>
      </header>

      {showBanner && (
        <div className="arg-hero" style={bannerImage ? { backgroundImage: `url('${getOptimizedImageUrl(bannerImage, 800, 75)}')` } : {}}>
          <div className="arg-hero-overlay" />
          <div className="arg-hero-title">{heroTitle}</div>
          {heroBadge && (
            <>
              <div className="arg-hero-rule" />
              <div className="arg-hero-badge">{heroBadge}</div>
            </>
          )}
        </div>
      )}

      {heroDessert && (
        <div className="arg-featured">
          <div className="arg-card-title">{heroDessert.name}</div>
          {heroDessert.description && <div className="arg-card-desc">{heroDessert.description}</div>}
          <div className="arg-featured-footer">
            <div className="arg-card-price">
              {heroDisplayPrice?.isFrom ? `Desde ${formatPrice(heroDisplayPrice.amount)}` : formatPrice(heroDisplayPrice?.amount || 0)}
            </div>
            <button className="arg-add-btn" onClick={() => openProduct(heroDessert)}>
              <Plus size={isMockup ? 11 : 14} strokeWidth={3} /> {!isMockup && 'Agregar'}
            </button>
          </div>
        </div>
      )}

      <div className="arg-search-container">
        <div className="arg-search-wrapper">
          <Search size={14} className="arg-search-icon" />
          <input type="text" placeholder="Buscar en el menú..." className="arg-search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="arg-cats no-scrollbar">
        <button onClick={() => setSelectedCategory("todos")} className="arg-cat-btn" style={{ backgroundColor: selectedCategory === "todos" ? catActiveBg : catBg, color: selectedCategory === "todos" ? catActiveText : catText }}>Todos</button>
        {displayCategories.map((cat: any) => (
          <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="arg-cat-btn" style={{ backgroundColor: selectedCategory === cat.id ? catActiveBg : catBg, color: selectedCategory === cat.id ? catActiveText : catText }}>{cat.name}</button>
        ))}
      </div>

      <div className="arg-products">
        {(selectedCategory === "todos" ? [{ id: '__all__', name: null }] : displayCategories.filter((c: any) => c.id === selectedCategory)).map((cat: any) => {
          const catProducts = products?.filter((p: any) =>
            (cat.id === '__all__' || String(p.category_id) === String(cat.id)) &&
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
          ) || [];
          if (catProducts.length === 0) return null;
          return (
            <React.Fragment key={cat.id}>
              {cat.name && <div className="arg-cat-title">{cat.name}</div>}
              {catProducts.map((p: any) => {
                const { amount, isFrom } = getProductDisplayPrice(p);
                const imgUrl = getOptimizedImageUrl(p.image_url, 300, 70);
                return (
                  <div key={p.id} className="arg-card-row" onClick={() => openProduct(p)}>
                    <div className="arg-card-photo">
                      {imgUrl ? <img src={imgUrl} alt={p.name} loading="lazy" /> : <div className="arg-ph-fallback"><Utensils size={22} strokeWidth={1.5} color="#0E2A45" style={{ opacity: 0.55 }} /></div>}
                    </div>
                    <div className="arg-card-body">
                      <div className="arg-card-title">{p.name}</div>
                      {p.description && <div className="arg-card-desc">{p.description}</div>}
                      <div className="arg-card-footer">
                        <div className="arg-card-price">{isFrom ? `Desde ${formatPrice(amount)}` : formatPrice(amount)}</div>
                        <button className="arg-add-btn" onClick={(e) => { e.stopPropagation(); openProduct(p); }}>
                          <Plus size={isMockup ? 11 : 14} strokeWidth={3} /> {!isMockup && 'Agregar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {renderProductModal()}

      {showClosedModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowClosedModal(false)} />
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
