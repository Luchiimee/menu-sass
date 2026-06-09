import React, { useState } from 'react';
import { Store, Plus, Minus, Layers, X, Check, Search, Utensils, Clock } from 'lucide-react';
import { useCart } from "@/context/CartContext";

export default function SpotlightHero({ restaurant, products, categories, fetchedExtras, onAddToCart, isOpen, isMockup = false, setShowInfo, mesaLabel = null }: any) {
  const { cart, updateQuantity, updateExtraQuantity, addToCart } = useCart();
  const [showHeroModal, setShowHeroModal] = useState(false);
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [addedItems, setAddedItems] = useState<string[]>([]);

  const displayCategories = categories?.filter((c: any) => c.name.toLowerCase() !== 'general') || [];

  const accent = restaurant.theme_color || '#FFD700';
  const bg = restaurant.bg_color || '#ffffff';
  const text = restaurant.text_color || '#000000';
  const cardBg = restaurant.card_color || '#ffffff';
  const btnBg = restaurant.card_btn_bg || '#000000';
  const btnText = restaurant.card_btn_text || '#ffffff';
  const hBadgeBg = restaurant.hero_badge_bg || accent;
  const hBadgeColor = restaurant.hero_badge_color || '#000000';
  const catBg = restaurant.cat_bg_color || '#f3f4f6';
  const catText = restaurant.cat_text_color || '#9ca3af';
  const catActiveBg = restaurant.cat_active_bg_color || '#000000';
  const catActiveText = restaurant.cat_active_text_color || '#ffffff';
  const localDescColor = restaurant.description_color || '#4b5563';
  const prodDescColor = restaurant.card_desc_color || '#4b5563';
  const searchBg = restaurant.search_bg_color || '#f3f4f6';
  const searchIcon = restaurant.search_icon_color || '#9ca3af';

  const showBanner = restaurant.show_banner !== false;
  const hasProducts = products && products.length > 0;
  const heroProduct = hasProducts ? products[0] : null;
  const heroTitle = restaurant.hero_title || (heroProduct ? heroProduct.name : 'Plato del día');
  const heroPrice = restaurant.hero_price || (heroProduct ? heroProduct.price : 0);
  const heroBadge = restaurant.hero_badge_text || 'DESTACADO';
  const bannerImage = restaurant.banner_url || (heroProduct ? heroProduct.image_url : '');
  const bannerVideo = restaurant.hero_video_url || (heroProduct ? heroProduct.video_url : '');

  const heroDessert = products?.find((p: any) => String(p.id) === String(restaurant.hero_dessert_id));
  const secPrincipal = products?.find((p: any) => String(p.id) === String(restaurant.secondary_menu_entrance_id));
  const secDessert = products?.find((p: any) => String(p.id) === String(restaurant.secondary_menu_dessert_id));

  const formatPrice = (price: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);
  const getCartItem = (productId: any) => cart.find(item => String(item.id) === String(productId));

  const handleQuickAdd = (product: any, menuType: 'A' | 'B') => {
    if (!product) return;
    if (!isOpen && !isMockup) return setShowClosedModal(true);
    const menuPrefix = menuType === 'A' ? 'Menú del Día' : (restaurant.secondary_menu_name || 'Menú Ejecutivo');
    const finalName = menuType === 'A' ? heroTitle : product.name;
    const finalPrice = menuType === 'A' ? Number(heroPrice) : (Number(restaurant.secondary_menu_price) || 0);
    addToCart({ ...product, id: `${menuType}-${product.id}`, name: `${menuPrefix}: ${finalName}`, price: finalPrice });
  };

  const handleMainStep = (p: any, delta: number) => {
    if (!isOpen && !isMockup) return setShowClosedModal(true);
    const item = getCartItem(p.id);
    if (!item) { if (delta > 0) addToCart(p); }
    else { updateQuantity(item.uniqueId, item.quantity + delta); }
  };

  const getExtrasForProduct = (productId: string) => {
    return fetchedExtras?.filter((extra: any) => extra.product_extras?.some((rel: any) => String(rel.product_id) === String(productId))) || [];
  };

  const handleExtraStep = (productId: string, extra: any, delta: number) => {
    const item = getCartItem(productId);
    if (!item) return;
    const currentExtraQty = (item.extrasList?.find((ex: any) => ex.id === extra.id))?.quantity || 0;
    if (currentExtraQty === 0 && delta > 0) {
      addToCart({ id: productId, extraId: extra.id, name: extra.name, price: Number(extra.price) });
    } else {
      updateExtraQuantity(item.uniqueId, extra.id, currentExtraQty + delta);
    }
  };

  const isAddedA = cart.some((item: any) => String(item.id) === `A-${heroProduct?.id}`);
  const isAddedB = cart.some((item: any) => String(item.id) === `B-${secPrincipal?.id}`);

  const styles = `
    .spot-container { background: ${bg}; font-family: 'Inter', sans-serif; text-align: left; width: 100%; }
    .spot-header { padding: ${isMockup ? '10px 12px' : '18px 20px'}; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; background: ${bg}; border-bottom: 1px solid rgba(0,0,0,0.05); }
    .spot-logo { width: ${isMockup ? '42px' : '58px'}; height: ${isMockup ? '42px' : '58px'}; border-radius: ${isMockup ? '12px' : '16px'}; border: 1px solid rgba(0,0,0,0.08); flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); background-color: #f3f4f6; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .spot-brand { font-size: ${isMockup ? '15px' : '20px'}; font-weight: 900; color: ${text}; line-height: 1.1; text-transform: uppercase; letter-spacing: -0.02em; }
    .spot-desc-local { font-size: ${isMockup ? '10px' : '13px'}; color: ${localDescColor}; font-weight: 600; margin-top: 2px; line-height: 1.2; }
    .spot-info-btn { color: ${text}; background: #f3f4f6; border-radius: ${isMockup ? '8px' : '10px'}; padding: ${isMockup ? '4px' : '6px'}; border: none; }
    .spot-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: ${isMockup ? '6px' : '10px'}; flex-shrink: 0; }
    .spot-status { color: white; font-size: ${isMockup ? '7px' : '9px'}; font-weight: 900; padding: ${isMockup ? '3px 8px' : '5px 12px'}; border-radius: 8px; text-transform: uppercase; }
    .spot-banner { height: 180px; background-size: cover; background-position: center; position: relative; display: flex; flex-direction: column; justify-content: flex-end; padding: 15px; overflow: hidden; background-color: #333; }
    .spot-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.8) 100%); z-index: 1; }
    .spot-hero-btn { position: absolute; bottom: 15px; right: 15px; width: 32px; height: 32px; background: white; color: black; border-radius: 50%; display: grid; place-items: center; font-size: 20px; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 10; border: none; }
    .spot-msg { padding: 14px 20px; background: ${restaurant.promo_bg_color || '#fff8e1'}; color: ${restaurant.promo_text_color || text}; font-size: 13px; font-weight: 800; border-bottom: 1px solid rgba(0,0,0,0.05); text-align: center; }
    .spot-list { width: 100%; }
    .spot-item-container { background: ${cardBg}; border-bottom: 1px solid rgba(0,0,0,0.04); }
    .spot-item { display: flex; align-items: center; gap: 12px; padding: 12px 15px; }
    .spot-thumb { width: 50px; height: 50px; border-radius: 8px; background-color: #f0f0f0; flex-shrink: 0; position: relative; overflow: hidden; background-size: cover; background-position: center; }
    .spot-btn { width: 28px; height: 28px; background: ${btnBg}; color: ${btnText}; border-radius: 50%; display: grid; place-items: center; font-size: 18px; border: none; font-weight: 900; }
    .spot-search-container { padding: 15px 15px 10px; background: ${bg}; }
    .spot-search-wrapper { position: relative; display: flex; align-items: center; }
    .spot-search-input { width: 100%; padding: 10px 10px 10px 35px; border-radius: 12px; background: ${searchBg}; color: ${text}; border: none; font-size: 12px; font-weight: 600; outline: none; }
    .spot-search-icon { position: absolute; left: 12px; color: ${searchIcon}; }
    .spot-cats { display: flex; gap: 8px; overflow-x: auto; padding: 5px 15px 15px; background: ${bg}; width: 100%; }
    .spot-cat-btn { padding: 8px 16px; border-radius: 20px; font-size: ${isMockup ? '9px' : '11px'}; font-weight: 900; text-transform: uppercase; border: none; white-space: nowrap; transition: all 0.2s; }
  `;

  return (
    <div className="spot-container relative">
      <style>{styles}</style>

      <div className="spot-header">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="spot-logo">
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} className="w-full h-full object-cover" alt="logo" />
            ) : (
              <Store size={isMockup ? 20 : 28} className="text-gray-400" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="spot-brand">{restaurant.name || 'Tu Marca'}</div>
            <div className="spot-desc-local">{restaurant.description || 'Descripción del local'}</div>
          </div>
        </div>
        <div className="spot-header-right">
          <div className="spot-status" style={{ backgroundColor: mesaLabel ? '#d97706' : isOpen ? '#22c55e' : '#ef4444' }}>
            {mesaLabel ? `📍 ${mesaLabel}` : isOpen ? 'ABIERTO' : 'CERRADO'}
          </div>
          <button onClick={() => setShowInfo(true)} className="spot-info-btn shadow-sm active:scale-90 transition-transform">
            <Store size={isMockup ? 18 : 26} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {showBanner && (
        <div className="spot-banner" style={{ backgroundImage: bannerVideo ? 'none' : `url('${bannerImage}')` }}>
          {bannerVideo && <video autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}><source src={bannerVideo} /></video>}
          <div className="spot-overlay"></div>
          <div className="spot-info relative z-10">
            <div style={{ background: hBadgeBg, color: hBadgeColor }} className="px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block mb-1">{heroBadge}</div>
            <div className="text-white text-xl font-black italic uppercase leading-none">{heroTitle}</div>
            <div style={{ color: accent }} className="font-black text-sm mt-1">{formatPrice(heroPrice)}</div>
          </div>
          <button className="spot-hero-btn" onClick={() => {
            if (!isOpen && !isMockup) return setShowClosedModal(true);
            setShowHeroModal(true);
          }}>+</button>
        </div>
      )}

      {restaurant.show_promo !== false && restaurant.promo_message && (
        <div className="spot-msg italic">{restaurant.promo_message}</div>
      )}

      <div className="spot-search-container">
        <div className="spot-search-wrapper">
          <Search size={16} className="spot-search-icon" />
          <input type="text" placeholder="¿Qué buscás hoy?" className="spot-search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="spot-cats no-scrollbar">
        <button onClick={() => setSelectedCategory("todos")} className="spot-cat-btn shadow-sm" style={{ backgroundColor: selectedCategory === "todos" ? catActiveBg : catBg, color: selectedCategory === "todos" ? catActiveText : catText }}>Todos</button>
        {displayCategories.map((cat: any) => (
          <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="spot-cat-btn shadow-sm" style={{ backgroundColor: selectedCategory === cat.id ? catActiveBg : catBg, color: selectedCategory === cat.id ? catActiveText : catText }}>{cat.name}</button>
        ))}
      </div>

      <div className="spot-list no-scrollbar">
        {products?.filter((p: any) => {
          const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchCat = selectedCategory === "todos" || String(p.category_id) === String(selectedCategory);
          return matchSearch && matchCat;
        }).map((p: any, i: number) => {
          const cartItem = getCartItem(p.id);
          const extras = getExtrasForProduct(p.id);
          return (
            <div key={i} className="spot-item-container">
              <div className="spot-item">
                <div className="spot-thumb flex items-center justify-center" style={{ backgroundImage: (p.image_url && !p.video_url) ? `url('${p.image_url}')` : 'none', backgroundColor: '#f3f4f6' }}>
                  {p.video_url && <video autoPlay loop muted playsInline preload="metadata"><source src={p.video_url} /></video>}
                  {!p.image_url && !p.video_url && (<Utensils size={20} strokeWidth={1.5} className="text-gray-300" />)}
                </div>
                <div className="flex-1 text-left">
                  <div style={{ color: restaurant.card_name_color }} className="font-bold text-[13px]">{p.name}</div>
                  <div style={{ color: prodDescColor }} className="text-[11px] mt-1 leading-relaxed font-medium">{p.description}</div>
                  <div style={{ color: restaurant.card_price_color }} className="font-black text-[12px] mt-1">{formatPrice(p.price)}</div>
                </div>
                {cartItem ? (
                  <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button onClick={() => handleMainStep(p, -1)} className="w-7 h-7 flex items-center justify-center text-red-500 font-bold active:scale-75 transition-transform">-</button>
                    <span className="text-xs font-black text-gray-900 w-4 text-center">{cartItem.quantity}</span>
                    <button onClick={() => handleMainStep(p, 1)} className="w-7 h-7 flex items-center justify-center text-gray-900 font-bold active:scale-75 transition-transform">+</button>
                  </div>
                ) : (
                  <button className="spot-btn" onClick={() => handleMainStep(p, 1)}>+</button>
                )}
              </div>
              {cartItem && extras.length > 0 && (
                <div className="px-4 pb-4 space-y-2 bg-gray-50/50 border-t border-gray-100/50 animate-in slide-in-from-top-1">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest py-2 flex items-center gap-1"><Layers size={10} /> Personalizá tu {p.name}</p>
                  {extras.map((ex: any) => {
                    const extraQty = (cartItem.extrasList?.find((e: any) => e.id === ex.id))?.quantity || 0;
                    return (
                      <div key={ex.id} className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-600 font-medium">{ex.name} <span className="text-gray-400 font-bold">(+{formatPrice(ex.price)})</span></span>
                        {extraQty > 0 ? (
                          <div className="flex items-center gap-2 bg-white px-1 py-0.5 rounded-lg border border-gray-200 shadow-sm">
                            <button onClick={() => handleExtraStep(p.id, ex, -1)} className="w-5 h-5 flex items-center justify-center text-red-500 font-bold">-</button>
                            <span className="text-[10px] font-black w-3 text-center">{extraQty}</span>
                            <button onClick={() => handleExtraStep(p.id, ex, 1)} className="w-5 h-5 flex items-center justify-center text-gray-900 font-bold">+</button>
                          </div>
                        ) : (
                          <button onClick={() => handleExtraStep(p.id, ex, 1)} className="w-6 h-6 border rounded-lg flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-colors">
                            <Plus size={12} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL HERO */}
      {showHeroModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowHeroModal(false)}></div>
          <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl relative z-[10000] animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh]">
            <div className="h-44 bg-cover bg-center relative shrink-0 flex items-center justify-center bg-gray-100" style={{ backgroundImage: (bannerImage && !bannerVideo) ? `url('${bannerImage}')` : 'none' }}>
              {bannerVideo && <video autoPlay loop muted playsInline className="w-full h-full object-cover"><source src={bannerVideo} /></video>}
              {!bannerImage && !bannerVideo && (<Utensils size={40} strokeWidth={1} className="text-gray-300" />)}
              <button onClick={() => setShowHeroModal(false)} className="absolute top-5 right-5 bg-black/50 text-white p-2 rounded-full z-10"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto no-scrollbar flex-1 space-y-8 bg-white">
              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-4 bg-yellow-400 rounded-full"></div>
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400">Opción A: Menú del día</h4>
                </div>
                <div className="p-5 bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-sm relative">
                  <div className="flex justify-between items-start">
                    <div className="text-left flex-1 pr-4">
                      <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">{heroTitle}</h3>
                      <p className="text-[11px] text-gray-500 mt-2 leading-snug">{restaurant.hero_description}</p>
                      <div className="mt-4 space-y-1.5 border-t border-gray-200/50 pt-3">
                        {heroDessert && <p className="text-[10px] font-bold text-gray-600 flex items-center gap-1.5">🍮 Postre incluido: {heroDessert.name}</p>}
                        {restaurant.hero_drink_options && (<p className="text-[10px] font-bold text-gray-600 flex items-center gap-1.5">🥤 Bebida: {restaurant.hero_drink_options} ({restaurant.hero_drink_size})</p>)}
                      </div>
                      <div className="text-lg font-black text-gray-900 mt-4">{formatPrice(heroPrice)}</div>
                    </div>
                    <button onClick={() => handleQuickAdd(heroProduct, 'A')} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isAddedA ? 'bg-emerald-500 text-white' : 'bg-black text-white active:scale-90'}`}>
                      {isAddedA ? <Check size={24} strokeWidth={4} /> : <Plus size={24} strokeWidth={3} />}
                    </button>
                  </div>
                </div>
              </section>
              {restaurant.secondary_menu_name && (
                <section className="space-y-3 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400">Opción B: {restaurant.secondary_menu_name}</h4>
                  </div>
                  <div className="p-5 bg-indigo-50/30 border-2 border-dashed border-indigo-100 rounded-[2.5rem] relative">
                    <div className="flex justify-between items-start">
                      <div className="text-left flex-1 pr-4">
                        <h3 className="text-lg font-black uppercase text-indigo-900 leading-none">{restaurant.secondary_menu_name}</h3>
                        <p className="text-[10px] text-indigo-400 font-bold mt-1 leading-tight">{restaurant.secondary_menu_description}</p>
                        <div className="mt-4 space-y-1.5 border-t border-indigo-200/30 pt-3">
                          {secPrincipal && <p className="text-[10px] font-bold text-indigo-900/60 italic">🥗 Principal: {secPrincipal.name}</p>}
                          {secDessert && <p className="text-[10px] font-bold text-indigo-900/60 italic">🍮 Postre incluido: {secDessert.name}</p>}
                          {restaurant.secondary_menu_drink_options && (<p className="text-[10px] font-bold text-indigo-900/60 italic">🥤 Bebida: {restaurant.secondary_menu_drink_options} ({restaurant.secondary_menu_drink_size})</p>)}
                        </div>
                        <div className="text-lg font-black text-indigo-900 mt-4">{formatPrice(restaurant.secondary_menu_price)}</div>
                      </div>
                      <button onClick={() => handleQuickAdd(secPrincipal, 'B')} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isAddedB ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white active:scale-90'}`}>
                        {isAddedB ? <Check size={24} strokeWidth={4} /> : <Plus size={24} strokeWidth={3} />}
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 text-center shrink-0">
              <button onClick={() => setShowHeroModal(false)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all">Ver pedido en Carrito</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOCAL CERRADO */}
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