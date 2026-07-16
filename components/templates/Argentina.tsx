"use client";

import React, { useState } from 'react';
import { Search, Plus, Minus, Store, X, Utensils, Clock, ImagePlus } from 'lucide-react';
import { getProductDisplayPrice } from '@/lib/productPricing';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { useCart } from '@/context/CartContext';

export default function Argentina({ restaurant, products, categories, fetchedExtras, onAddToCart, isOpen, isMockup = false, setShowInfo, mesaLabel = null }: any) {
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { cart, updateQuantity, updateExtraQuantity, addToCart } = useCart();

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

  const heroTitle = restaurant.description || restaurant.name || 'Nuestra Especialidad';
  const heroBadge = restaurant.show_promo !== false ? (restaurant.promo_message || '') : '';

  // Producto destacado: flag es_destacado en products (exclusivo por restaurante, se marca desde Productos).
  const heroDessert = products?.find((p: any) => p.es_destacado === true);
  const bannerImage = heroDessert?.image_url || '';

  const btnPad = isMockup ? '6px 8px' : '11px 20px';
  const btnFont = isMockup ? '8px' : '12px';
  const btnGap = isMockup ? '2px' : '6px';
  const featuredPad = isMockup ? '10px 12px 12px' : '16px 18px 18px';
  const heroDisplayPrice = heroDessert ? getProductDisplayPrice(heroDessert) : null;
  const showFeaturedCard = !!(heroDessert && heroDessert.name && heroDisplayPrice && heroDisplayPrice.amount > 0);
  const featuredCartItem = heroDessert ? cart.find((item: any) => String(item.id) === String(heroDessert.id)) : null;

  const heroHeight = isMockup ? '175px' : '340px';
  const heroPadTop = isMockup ? '16px' : '36px';
  const heroTitleFont = isMockup ? '16px' : '32px';
  const heroBadgeFont = isMockup ? '8px' : '11px';
  const heroBadgePad = isMockup ? '4px 9px' : '6px 14px';
  const heroHintFont = isMockup ? '7px' : '10px';
  const heroHintPad = isMockup ? '4px 8px' : '7px 12px';
  const featuredMargin = isMockup ? '-32px 14px 0' : '-56px 20px 0';
  const cardTitleFont = isMockup ? '11.5px' : '16px';
  const cardDescFont = isMockup ? '9px' : '12.5px';
  const cardPriceFont = isMockup ? '11.5px' : '17px';
  const catsGap = isMockup ? '5px' : '8px';
  const catsPadX = isMockup ? '14px' : '20px';
  const catBtnPad = isMockup ? '5px 10px' : '7px 16px';
  const catBtnFont = isMockup ? '8px' : '10px';

  const getCartItem = (productId: any) => cart.find((item: any) => String(item.id) === String(productId));

  const handleMainStep = (p: any, delta: number) => {
    if (!isOpenNow && !isMockup) return setShowClosedModal(true);
    const item = getCartItem(p.id);
    if (!item) { if (delta > 0) addToCart({ ...p, price: getProductDisplayPrice(p).amount }); }
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

  const featuredExtras = heroDessert ? getExtrasForProduct(heroDessert.id) : [];

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Hanken+Grotesk:wght@400;600;700&display=swap');

    .arg-container, .arg-container * { box-sizing: border-box; }
    .arg-container { background: ${bg}; color: ${textColor}; font-family: 'Hanken Grotesk', sans-serif; min-height: ${isMockup ? 'auto' : '100vh'}; width: 100%; max-width: 100%; display: flex; flex-direction: column; padding-bottom: 120px; }

    .arg-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 16px 20px 10px; background: ${bg}; border-bottom: 2px solid ${accentLine}; }
    .arg-logo { width: 40px; height: 40px; border-radius: 50%; border: 1.5px solid ${accent}; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #fff; justify-self: start; flex-shrink: 0; }
    .arg-brand-name { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 15px; color: ${accent}; letter-spacing: 0.4px; text-align: center; text-transform: uppercase; line-height: 1.2; }
    .arg-stars { text-align: center; font-size: 20px; color: ${dorado}; letter-spacing: 3px; margin-top: 3px; line-height: 1; }
    .arg-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; justify-self: end; }
    .arg-status { font-size: 8px; font-weight: 800; padding: 3px 8px; border-radius: 999px; text-transform: uppercase; color: #fff; }
    .arg-info-btn { background: transparent; border: none; color: ${accent}; padding: 2px; cursor: pointer; display: flex; }

    .arg-hero { position: relative; height: ${heroHeight}; min-height: ${heroHeight}; flex-shrink: 0; width: 100%; background-size: cover; background-position: center; background-color: ${accent}; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: ${heroPadTop}; overflow: hidden; }
    .arg-hero-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 32%, rgba(0,0,0,0.7) 100%); }
    .arg-hero-title { position: relative; z-index: 1; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: ${heroTitleFont}; color: #fff; line-height: 0.95; text-transform: uppercase; text-align: center; padding: 0 ${isMockup ? '14px' : '24px'}; }
    .arg-hero-rule { position: relative; z-index: 1; width: ${isMockup ? '22px' : '36px'}; height: 2px; background: ${dorado}; margin: ${isMockup ? '8px' : '14px'} auto; }
    .arg-hero-badge { position: relative; z-index: 1; display: inline-block; background: ${dorado}; color: ${doradoText}; font-size: ${heroBadgeFont}; font-weight: 700; letter-spacing: 1px; padding: ${heroBadgePad}; border-radius: 999px; text-transform: uppercase; }
    .arg-hero-hint { position: relative; z-index: 1; display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.92); color: ${accent}; font-size: ${heroHintFont}; font-weight: 700; padding: ${heroHintPad}; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.02em; white-space: nowrap; max-width: calc(100% - 24px); overflow: hidden; text-overflow: ellipsis; margin-top: auto; margin-bottom: ${isMockup ? '10px' : '16px'}; }

    .arg-featured { background: ${cardBg}; border-radius: 20px; margin: ${featuredMargin}; max-width: 100%; position: relative; z-index: 2; box-shadow: 0 8px 24px rgba(0,0,0,0.12); padding: ${featuredPad}; border-top: 3px solid #ffffff; }
    .arg-card-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: ${cardTitleFont}; color: ${prodName}; text-transform: uppercase; margin-bottom: 4px; }
    .arg-card-desc { font-size: ${cardDescFont}; color: ${prodDesc}; line-height: 1.4; margin-bottom: ${isMockup ? '6px' : '12px'}; ${isMockup ? 'display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;' : ''} }
    .arg-card-price { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: ${cardPriceFont}; color: ${priceColor}; white-space: nowrap; }
    .arg-add-btn { display: inline-flex; align-items: center; justify-content: center; gap: ${btnGap}; background: ${btnBg}; color: ${btnText}; border: none; font-family: 'Hanken Grotesk', sans-serif; font-weight: 700; font-size: ${btnFont}; letter-spacing: 0.4px; text-transform: uppercase; padding: ${btnPad}; border-radius: 999px; cursor: pointer; flex-shrink: 0; }
    .arg-featured-footer { display: flex; align-items: center; justify-content: space-between; gap: ${isMockup ? '6px' : '14px'}; }

    .arg-search-container { padding: 18px 20px 10px; }
    .arg-search-wrapper { position: relative; }
    .arg-search-input { width: 100%; padding: 10px 10px 10px 34px; border-radius: 999px; background: ${searchBg}; color: ${textColor}; border: none; font-size: 12px; font-weight: 600; outline: none; }
    .arg-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: ${searchIcon}; }

    .arg-cats-wrap { position: relative; }
    .arg-cats { display: flex; gap: ${catsGap}; overflow-x: auto; padding: 6px ${catsPadX} 16px; }
    .arg-cat-btn { padding: ${catBtnPad}; border-radius: 999px; font-size: ${catBtnFont}; font-weight: 800; text-transform: uppercase; border: none; white-space: nowrap; flex-shrink: 0; }
    .arg-cats-fade { position: absolute; top: 0; right: 0; bottom: 16px; width: 28px; background: linear-gradient(to right, transparent, ${bg}); pointer-events: none; }

    .arg-products { padding: 0 20px; display: flex; flex-direction: column; gap: 14px; max-width: 100%; }
    .arg-cat-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: ${accent}; margin: 10px 0 -2px; }
    .arg-card-row { display: flex; background: ${cardBg}; border-radius: 18px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06); border: 1px solid rgba(0,0,0,0.04); cursor: pointer; max-width: 100%; }
    .arg-card-photo { width: 30%; flex-shrink: 0; position: relative; min-height: ${isMockup ? '64px' : '96px'}; background: ${cardBg}; }
    .arg-card-photo-inner { position: absolute; inset: ${isMockup ? '5px' : '8px'}; border-radius: 10px; overflow: hidden; border: ${isMockup ? '2px' : '3px'} solid #ffffff; box-shadow: 0 2px 6px rgba(14,42,69,0.25); background: ${cardBg}; }
    .arg-card-photo-inner img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .arg-ph-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .arg-card-body { flex: 1; min-width: 0; padding: ${isMockup ? '8px 10px' : '14px 16px'}; display: flex; flex-direction: column; }
    .arg-card-footer { display: flex; align-items: center; justify-content: space-between; gap: ${isMockup ? '6px' : '10px'}; margin-top: auto; }

    .arg-stepper { display: flex; align-items: center; gap: ${isMockup ? '4px' : '8px'}; background: #ffffff; padding: 2px; border-radius: 999px; border: 1px solid rgba(0,0,0,0.06); flex-shrink: 0; }
    .arg-stepper button { width: ${isMockup ? '18px' : '24px'}; height: ${isMockup ? '18px' : '24px'}; border-radius: 50%; border: none; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: ${priceColor}; font-weight: 900; padding: 0; }
    .arg-stepper span { font-size: ${isMockup ? '9px' : '12px'}; font-weight: 800; min-width: 12px; text-align: center; color: ${prodName}; }
    .arg-extras { background: rgba(255,255,255,0.5); padding: ${isMockup ? '8px 10px' : '12px 16px'}; border-top: 1px solid rgba(14,42,69,0.08); }
    .arg-extras-title { font-size: ${isMockup ? '7px' : '9px'}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: ${prodDesc}; margin-bottom: 6px; }
    .arg-extra-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; font-size: ${isMockup ? '8px' : '11px'}; color: ${prodName}; }
    .arg-extra-add { width: ${isMockup ? '18px' : '22px'}; height: ${isMockup ? '18px' : '22px'}; border-radius: 50%; border: 1px solid ${priceColor}; background: transparent; color: ${priceColor}; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; flex-shrink: 0; }
  `;

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

      <div className="arg-hero" style={bannerImage ? { backgroundImage: `url('${getOptimizedImageUrl(bannerImage, 800, 75)}')` } : {}}>
        {bannerImage && <div className="arg-hero-overlay" />}
        <div className="arg-hero-title">{heroTitle}</div>
        {heroBadge && (
          <>
            <div className="arg-hero-rule" />
            <div className="arg-hero-badge">{heroBadge}</div>
          </>
        )}
        {!bannerImage && isMockup && (
          <div className="arg-hero-hint">
            <ImagePlus size={12} />
            Subí la foto desde Personalizar
          </div>
        )}
      </div>

      {showFeaturedCard && (
        <div className="arg-featured">
          <div className="arg-card-title">{heroDessert.name}</div>
          {heroDessert.description && <div className="arg-card-desc">{heroDessert.description}</div>}
          <div className="arg-featured-footer">
            <div className="arg-card-price">
              {heroDisplayPrice?.isFrom ? `Desde ${formatPrice(heroDisplayPrice.amount)}` : formatPrice(heroDisplayPrice?.amount || 0)}
            </div>
            {featuredCartItem ? (
              <div className="arg-stepper">
                <button onClick={() => handleMainStep(heroDessert, -1)}><Minus size={isMockup ? 10 : 14} strokeWidth={3} /></button>
                <span>{featuredCartItem.quantity}</span>
                <button onClick={() => handleMainStep(heroDessert, 1)}><Plus size={isMockup ? 10 : 14} strokeWidth={3} /></button>
              </div>
            ) : (
              <button className="arg-add-btn" onClick={() => handleMainStep(heroDessert, 1)}>
                <Plus size={isMockup ? 11 : 14} strokeWidth={3} /> {!isMockup && 'Agregar'}
              </button>
            )}
          </div>
          {featuredCartItem && featuredExtras.length > 0 && (
            <div className="arg-extras" style={{ margin: `${isMockup ? '8px' : '12px'} -${isMockup ? '12px' : '18px'} -${isMockup ? '12px' : '18px'}`, borderRadius: '0 0 20px 20px' }}>
              <div className="arg-extras-title">¿Sumás algo más?</div>
              {featuredExtras.map((ex: any) => {
                const extraQty = (featuredCartItem.extrasList?.find((e: any) => e.id === ex.id))?.quantity || 0;
                return (
                  <div key={ex.id} className="arg-extra-row">
                    <span>{ex.name} <span style={{ opacity: 0.6 }}>(+{formatPrice(ex.price)})</span></span>
                    {extraQty > 0 ? (
                      <div className="arg-stepper">
                        <button onClick={() => handleExtraStep(heroDessert.id, ex, -1)}><Minus size={isMockup ? 9 : 12} strokeWidth={3} /></button>
                        <span>{extraQty}</span>
                        <button onClick={() => handleExtraStep(heroDessert.id, ex, 1)}><Plus size={isMockup ? 9 : 12} strokeWidth={3} /></button>
                      </div>
                    ) : (
                      <button className="arg-extra-add" onClick={() => handleExtraStep(heroDessert.id, ex, 1)}><Plus size={isMockup ? 9 : 12} strokeWidth={3} /></button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="arg-search-container">
        <div className="arg-search-wrapper">
          <Search size={14} className="arg-search-icon" />
          <input type="text" placeholder="Buscar en el menú..." className="arg-search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="arg-cats-wrap">
        <div className="arg-cats no-scrollbar">
          <button onClick={() => setSelectedCategory("todos")} className="arg-cat-btn" style={{ backgroundColor: selectedCategory === "todos" ? catActiveBg : catBg, color: selectedCategory === "todos" ? catActiveText : catText }}>Todos</button>
          {displayCategories.map((cat: any) => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="arg-cat-btn" style={{ backgroundColor: selectedCategory === cat.id ? catActiveBg : catBg, color: selectedCategory === cat.id ? catActiveText : catText }}>{cat.name}</button>
          ))}
        </div>
        {displayCategories.length > 1 && <div className="arg-cats-fade" />}
      </div>

      <div className="arg-products">
        {(selectedCategory === "todos" ? [{ id: '__all__', name: null }] : displayCategories.filter((c: any) => c.id === selectedCategory)).map((cat: any) => {
          const catProducts = products?.filter((p: any) =>
            p.name &&
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
                const cartItem = getCartItem(p.id);
                const extras = getExtrasForProduct(p.id);
                return (
                  <div key={p.id}>
                    <div className="arg-card-row">
                      <div className="arg-card-photo" onClick={() => p.image_url && setLightboxImage(p.image_url)} style={{ cursor: p.image_url ? 'pointer' : 'default' }}>
                        <div className="arg-card-photo-inner">
                          {imgUrl ? <img src={imgUrl} alt={p.name} loading="lazy" /> : <div className="arg-ph-fallback"><Utensils size={22} strokeWidth={1.5} color="#0E2A45" style={{ opacity: 0.55 }} /></div>}
                        </div>
                      </div>
                      <div className="arg-card-body">
                        <div className="arg-card-title">{p.name}</div>
                        {p.description && <div className="arg-card-desc">{p.description}</div>}
                        <div className="arg-card-footer">
                          <div className="arg-card-price">{isFrom ? `Desde ${formatPrice(amount)}` : formatPrice(amount)}</div>
                          {cartItem ? (
                            <div className="arg-stepper">
                              <button onClick={() => handleMainStep(p, -1)}><Minus size={isMockup ? 10 : 14} strokeWidth={3} /></button>
                              <span>{cartItem.quantity}</span>
                              <button onClick={() => handleMainStep(p, 1)}><Plus size={isMockup ? 10 : 14} strokeWidth={3} /></button>
                            </div>
                          ) : (
                            <button className="arg-add-btn" onClick={() => handleMainStep(p, 1)}>
                              <Plus size={isMockup ? 11 : 14} strokeWidth={3} /> {!isMockup && 'Agregar'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {cartItem && extras.length > 0 && (
                      <div className="arg-extras" style={{ borderRadius: '0 0 18px 18px', marginTop: '-1px' }}>
                        <div className="arg-extras-title">¿Sumás algo más?</div>
                        {extras.map((ex: any) => {
                          const extraQty = (cartItem.extrasList?.find((e: any) => e.id === ex.id))?.quantity || 0;
                          return (
                            <div key={ex.id} className="arg-extra-row">
                              <span>{ex.name} <span style={{ opacity: 0.6 }}>(+{formatPrice(ex.price)})</span></span>
                              {extraQty > 0 ? (
                                <div className="arg-stepper">
                                  <button onClick={() => handleExtraStep(p.id, ex, -1)}><Minus size={isMockup ? 9 : 12} strokeWidth={3} /></button>
                                  <span>{extraQty}</span>
                                  <button onClick={() => handleExtraStep(p.id, ex, 1)}><Plus size={isMockup ? 9 : 12} strokeWidth={3} /></button>
                                </div>
                              ) : (
                                <button className="arg-extra-add" onClick={() => handleExtraStep(p.id, ex, 1)}><Plus size={isMockup ? 9 : 12} strokeWidth={3} /></button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setLightboxImage(null)}>
          <button onClick={() => setLightboxImage(null)} className="absolute top-6 right-6 z-10 bg-white/10 text-white p-2 rounded-full">
            <X size={20} />
          </button>
          <img src={getOptimizedImageUrl(lightboxImage, 800, 80)} alt="" className="max-w-full max-h-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

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
