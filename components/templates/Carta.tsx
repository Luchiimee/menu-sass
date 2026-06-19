"use client";

import React, { useState, useRef } from 'react';
import { Search, Plus, Minus, Store, X, UtensilsCrossed, Check } from 'lucide-react';
import { useCart } from "@/context/CartContext";
import { getProductDisplayPrice } from "@/lib/productPricing";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { pickReadableColor } from "@/lib/colorUtils";

// Productos/categorías de ejemplo (estilo brasserie) usados cuando el restaurante todavía no cargó su carta
const PLACEHOLDER_PRODUCTS = [
  { id: 'ph1', name: 'Boeuf Bourguignon', description: 'Estofado de res al vino tinto', price: 22000, category_id: 'ph-cat-1', image_url: 'https://images.unsplash.com/photo-1606728035253-49e8a23146de?w=600&q=80' },
  { id: 'ph2', name: 'Tarte Tatin', description: 'Tarta de manzana caramelizada', price: 8200, category_id: 'ph-cat-2', image_url: 'https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=600&q=80' },
  { id: 'ph3', name: 'Coq au Vin', description: 'Pollo braseado al vino tinto', price: 19500, category_id: 'ph-cat-1', image_url: 'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=600&q=80' },
];
const PLACEHOLDER_CATEGORIES = [
  { id: 'ph-cat-1', name: 'Principales', image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80' },
  { id: 'ph-cat-2', name: 'Postres' },
];

interface Props {
  restaurant: any;
  products: any[];
  categories: any[];
  fetchedExtras: any[];
  isOpen: boolean;
  onAddToCart: any;
  isMockup?: boolean;
  setShowInfo: (val: boolean) => void;
  mesaLabel?: string | null;
}

const Carta: React.FC<Props> = ({
  restaurant, products, categories, fetchedExtras, isOpen, onAddToCart, isMockup = false,
  setShowInfo, mesaLabel = null
}) => {
  const { cart, updateQuantity, addToCart } = useCart();
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [showHeroModal, setShowHeroModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const productsRef = useRef<HTMLDivElement>(null);

  // --- VARIABLES DE DISEÑO (paleta brasserie / crema + dorado) ---
  const headerBg = restaurant.theme_color || '#F7F3EE';
  const headerDesc = restaurant.description_color || '#8a8278';
  const accent = restaurant.theme_color || '#B5863A';

  const webBg = restaurant.bg_color || '#F7F3EE';
  // Si el text_color guardado no contrasta lo suficiente con el fondo del header, usamos negro/blanco según corresponda
  const headerText = pickReadableColor(restaurant.text_color, webBg, '#1C1A18', '#ffffff');
  const prodName = restaurant.card_name_color || '#1C1A18';
  const prodDesc = restaurant.card_desc_color || '#9a948c';
  const prodPrice = restaurant.card_price_color || '#B5863A';
  const cardBg = restaurant.card_color || '#ffffff';
  const btnBg = restaurant.card_btn_bg || '#B5863A';
  const btnText = restaurant.card_btn_text || '#ffffff';
  const catBg = restaurant.cat_bg_color || '#F7F3EE';
  const catText = restaurant.cat_text_color || '#9a948c';
  const catActiveBg = restaurant.cat_active_bg_color || '#1C1A18';
  const catActiveText = restaurant.cat_active_text_color || '#F7F3EE';
  const searchBg = restaurant.search_bg_color || '#ffffff';
  const searchIcon = restaurant.search_icon_color || '#B5863A';

  const formatPrice = (price: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

  // Placeholder solo en el selector (isMockup), nunca en la página pública real
  const isPlaceholderMode = isMockup && (!products || products.length === 0);
  const displayProducts = isPlaceholderMode ? PLACEHOLDER_PRODUCTS : products;
  const displayCategories = (categories && categories.length > 0 ? categories : (isPlaceholderMode ? PLACEHOLDER_CATEGORIES : []))
    .filter((c: any) => c.name.toLowerCase() !== 'general');

  // --- PRODUCTO EN BANNER (HERO) ---
  const heroProductFallback = isPlaceholderMode ? PLACEHOLDER_PRODUCTS[0] : (products && products[0]);
  const heroTitle = restaurant.hero_title || (heroProductFallback ? heroProductFallback.name : 'Plato del Día');
  const heroPrice = restaurant.hero_price || (heroProductFallback ? getProductDisplayPrice(heroProductFallback).amount : 0);
  const heroBadge = restaurant.hero_badge_text || (isPlaceholderMode ? 'Especialidad de la Casa' : null);
  const bannerImageUrl = restaurant.banner_url || (heroProductFallback ? heroProductFallback.image_url : null);
  const heroDessert = products?.find((p: any) => String(p.id) === String(restaurant.hero_dessert_id));
  const secPrincipal = products?.find((p: any) => String(p.id) === String(restaurant.secondary_menu_entrance_id));
  const secDessert = products?.find((p: any) => String(p.id) === String(restaurant.secondary_menu_dessert_id));
  const isAddedA = cart.some((item: any) => String(item.id) === `A-${heroProductFallback?.id}`);
  const isAddedB = cart.some((item: any) => String(item.id) === `B-${secPrincipal?.id}`);

  const getCartItem = (productId: string) => cart.find(item => item.id === productId);

  const handleMainStep = (p: any, delta: number) => {
    if (!isOpen && !isMockup) return setShowClosedModal(true);
    const item = getCartItem(p.id);

    if (!item) {
      if (delta > 0) onAddToCart({ ...p, price: getProductDisplayPrice(p).amount });
    } else {
      updateQuantity(item.uniqueId, item.quantity + delta);
    }
  };

  const handleQuickAdd = (product: any, menuType: 'A' | 'B') => {
    if (!product) return;
    if (!isOpen && !isMockup) return setShowClosedModal(true);
    const menuPrefix = menuType === 'A' ? 'Plato del Día' : (restaurant.secondary_menu_name || 'Menú Ejecutivo');
    const finalName = menuType === 'A' ? heroTitle : product.name;
    const finalPrice = menuType === 'A' ? Number(heroPrice) : (Number(restaurant.secondary_menu_price) || 0);
    addToCart({ ...product, id: `${menuType}-${product.id}`, name: `${menuPrefix}: ${finalName}`, price: finalPrice });
  };

  const styles = `
    .carta-container { background: ${webBg}; font-family: 'Georgia', 'Times New Roman', serif; min-height: 100vh; display: flex; flex-direction: column; padding-bottom: 120px; color: ${headerText}; }
    .carta-header { padding: 40px 20px 24px; text-align: center; position: relative; background: ${webBg}; }
    .carta-logo {
      width: 64px; height: 64px; background: #fff; border-radius: 50%; margin: 0 auto 14px;
      border: 2px solid ${accent}; overflow: hidden;
      display: grid; place-items: center; font-weight: 700; color: ${accent}; font-size: 16px;
    }
    .carta-logo-img { width: 100%; height: 100%; object-fit: contain; }
    .carta-title { font-family: 'Georgia', serif; font-size: 24px; font-weight: 700; letter-spacing: 0.04em; margin: 0; color: ${headerText}; }
    .carta-divider { color: ${accent}; font-size: 13px; letter-spacing: 0.5em; margin: 10px 0; opacity: 0.85; }
    .carta-search { width: 100%; background: ${searchBg}; border: 1px solid rgba(28,26,24,0.08); border-radius: 999px; padding: 11px 16px 11px 38px; font-size: 12px; outline: none; color: ${headerText}; }
    .carta-cat-btn { padding: 8px 18px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; border: 1px solid ${accent}55; white-space: nowrap; font-family: 'Georgia', serif; }
    .carta-cat-title { font-family: 'Georgia', serif; font-size: 16px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; text-align: center; color: ${headerText}; }
    .carta-banner { position: relative; width: 100%; height: 160px; border-radius: 14px; overflow: hidden; background-size: cover; background-position: center; background-color: ${cardBg}; }
    .carta-banner-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.45) 60%, transparent 100%); display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start; padding: 16px; gap: 6px; }
    .carta-banner-badge {
      position: absolute; top: 12px; left: 12px; z-index: 2;
      background: ${accent}; color: #fff; font-family: 'Georgia', serif;
      font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em;
      padding: 5px 12px; border-radius: 999px;
    }
    .carta-banner-title { font-family: 'Georgia', serif; font-size: 19px; font-weight: 700; color: #fff; }
    .carta-banner-price { font-size: 14px; font-weight: 700; color: #fff; }
    .carta-hero-btn {
      position: absolute; bottom: 16px; right: 16px; z-index: 2;
      width: 36px; height: 36px; border-radius: 50%; background: #fff; color: ${accent};
      display: grid; place-items: center; border: none; cursor: pointer;
      box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    }
    .carta-modal-overlay {
      position: fixed; inset: 0; background: rgba(28,26,24,0.6); z-index: 9999;
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .carta-modal {
      background: ${webBg}; border-radius: 20px; max-width: 360px; width: 100%;
      max-height: 88vh; overflow-y: auto; font-family: 'Georgia', serif; color: ${headerText};
      position: relative;
    }
    .carta-modal-img { height: 160px; background-size: cover; background-position: center; border-radius: 20px 20px 0 0; position: relative; background-color: ${cardBg}; }
    .carta-modal-close {
      position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; border-radius: 50%;
      background: rgba(0,0,0,0.4); color: #fff; display: grid; place-items: center; border: none; cursor: pointer;
    }
    .carta-modal-body { padding: 20px; }
    .carta-modal-section { padding: 16px; border-radius: 14px; background: ${cardBg}; border: 1px solid rgba(28,26,24,0.06); margin-bottom: 14px; }
    .carta-modal-section:last-child { margin-bottom: 0; }
    .carta-modal-label { font-family: 'Georgia', serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: ${accent}; font-weight: 700; margin-bottom: 8px; }
    .carta-modal-title { font-family: 'Georgia', serif; font-size: 17px; font-weight: 700; color: ${prodName}; }
    .carta-modal-desc { font-size: 11px; color: ${prodDesc}; margin-top: 6px; line-height: 1.4; }
    .carta-modal-extra { font-size: 10px; color: ${prodDesc}; line-height: 1.6; }
    .carta-modal-price { margin-top: 10px; font-weight: 700; font-size: 15px; color: ${prodPrice}; }
    .carta-modal-add {
      width: 40px; height: 40px; border-radius: 50%; background: ${btnBg}; color: ${btnText};
      display: grid; place-items: center; border: none; cursor: pointer; flex-shrink: 0;
    }
    .carta-cat-banner { position: relative; width: 100%; height: 110px; border-radius: 14px; overflow: hidden; background-size: cover; background-position: center; background-color: ${cardBg}; }
    .carta-cat-banner-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 12px; }
    .carta-cat-banner-title { font-family: 'Georgia', serif; font-size: 16px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #fff; text-align: center; }
    .carta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .carta-card { background: ${cardBg}; border-radius: 14px; overflow: hidden; border: 1px solid rgba(28,26,24,0.06); display: flex; flex-direction: column; }
    .carta-card-img { width: 100%; height: 110px; object-fit: cover; background-color: ${webBg}; }
    .carta-img-fallback { display: flex; align-items: center; justify-content: center; background-color: ${catBg}; color: ${accent}; }
    .carta-card-body { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .carta-card-name { font-family: 'Georgia', serif; font-size: 13px; font-weight: 700; color: ${prodName}; line-height: 1.25; }
    .carta-card-desc { font-size: 10px; color: ${prodDesc}; line-height: 1.3; }
    .carta-stepper { display: flex; align-items: center; gap: 8px; background: ${webBg}; padding: 4px; border-radius: 10px; border: 1px solid rgba(28,26,24,0.08); }
    .carta-step-btn { width: 26px; height: 26px; border-radius: 7px; border: none; display: grid; place-items: center; cursor: pointer; padding: 0; line-height: 0; }
    .carta-qty-text { font-size: 12px; font-weight: 700; min-width: 16px; text-align: center; color: ${headerText}; }
    .carta-card-add {
      background: ${btnBg}; color: ${btnText}; border: none; border-radius: 50%;
      width: 32px; height: 32px; display: grid; place-items: center; cursor: pointer; flex-shrink: 0;
    }
  `;

  return (
    <div className="carta-container">
      <style>{styles}</style>

      <div className="carta-header">
        {/* PILL DE ESTADO / MESA */}
        <div
          style={{
            position: 'absolute', top: '16px', left: '16px',
            display: 'flex', alignItems: 'center', gap: '6px',
            backgroundColor: mesaLabel ? '#ecfdf5' : (isOpen ? '#ecfdf5' : '#fef2f2'),
            color: mesaLabel ? '#059669' : (isOpen ? '#059669' : '#ef4444'),
            border: `1px solid ${mesaLabel || isOpen ? '#a7f3d0' : '#fecaca'}`,
            fontSize: '10px', padding: '6px 12px', borderRadius: '999px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em'
          }}
        >
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: mesaLabel || isOpen ? '#10b981' : '#ef4444' }} />
          {mesaLabel ? `📍 ${mesaLabel}` : (isOpen ? "Abierto" : "Cerrado")}
        </div>

        {/* BOTÓN INFO */}
        <button
          onClick={() => setShowInfo(true)}
          style={{
            position: 'absolute', top: '14px', right: '16px',
            width: '36px', height: '36px', borderRadius: '50%',
            backgroundColor: 'rgba(28,26,24,0.06)', color: headerText,
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}
        >
          <Store size={18} />
        </button>

        {/* LOGO, TÍTULO Y DESCRIPCIÓN */}
        <div className="carta-logo">
          {restaurant.logo_url ? (
            <img src={getOptimizedImageUrl(restaurant.logo_url, 150, 75, 150, 'cover')} alt={restaurant.name || 'Logo'} className="carta-logo-img" />
          ) : 'LT'}
        </div>

        <h1 className="carta-title">{restaurant.name || 'Tu Negocio'}</h1>
        {restaurant.description && (
          <p style={{ color: headerDesc, fontSize: '12px', marginTop: '6px', maxWidth: '280px', margin: '6px auto 0' }}>
            {restaurant.description}
          </p>
        )}
        <div className="carta-divider">✦ ✦ ✦</div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory("todos")}
            className="carta-cat-btn"
            style={{
              backgroundColor: selectedCategory === "todos" ? catActiveBg : catBg,
              color: selectedCategory === "todos" ? catActiveText : catText
            }}
          >Todos</button>

          {displayCategories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="carta-cat-btn"
              style={{
                backgroundColor: selectedCategory === cat.id ? catActiveBg : catBg,
                color: selectedCategory === cat.id ? catActiveText : catText
              }}
            >{cat.name}</button>
          ))}
        </div>

        {/* BANNER DESTACADO / PRODUCTO EN BANNER (HERO) */}
        {restaurant.show_banner !== false && bannerImageUrl && (
          <div
            className="carta-banner"
            style={{ backgroundImage: `url('${getOptimizedImageUrl(bannerImageUrl, 800, 75)}')`, cursor: 'pointer' }}
            onClick={() => {
              if (!isOpen && !isMockup) return setShowClosedModal(true);
              setShowHeroModal(true);
            }}
          >
            {heroBadge && <div className="carta-banner-badge">{heroBadge}</div>}
            <div className="carta-banner-overlay">
              {heroTitle && <div className="carta-banner-title">{heroTitle}</div>}
              {!!heroPrice && <div className="carta-banner-price">{formatPrice(heroPrice)}</div>}
            </div>
            <button className="carta-hero-btn">
              <Plus size={18} strokeWidth={3} />
            </button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{ color: searchIcon }} />
          <input
            type="text"
            placeholder="Buscar en la carta..."
            className="carta-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div ref={productsRef} className="flex-1 px-4 space-y-8">
        {(selectedCategory === "todos"
          ? [{ id: '__all__', name: null, image_url: null }]
          : displayCategories.filter((c: any) => c.id === selectedCategory)
        ).map((cat: any) => {
          const catProducts = displayProducts.filter((p: any) =>
            (cat.id === '__all__' || String(p.category_id) === String(cat.id)) &&
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
          );

          if (catProducts.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-4">
              {cat.name && (cat.image_url ? (
                <div className="carta-cat-banner" style={{ backgroundImage: `url('${getOptimizedImageUrl(cat.image_url, 800, 75)}')` }}>
                  <div className="carta-cat-banner-overlay">
                    <div className="carta-cat-banner-title">{cat.name}</div>
                  </div>
                </div>
              ) : (
                <div className="carta-cat-title">✦ {cat.name} ✦</div>
              ))}

              {/* GRILLA UNIFORME */}
              <div className="carta-grid">
                {catProducts.map((p: any) => {
                  const cartItem = getCartItem(p.id);
                  const { amount, isFrom } = getProductDisplayPrice(p);
                  const imgUrl = getOptimizedImageUrl(p.image_url, 300, 70);

                  return (
                    <div key={p.id} className="carta-card">
                      {imgUrl ? (
                        <img src={imgUrl} alt={p.name} loading="lazy" className="carta-card-img" />
                      ) : (
                        <div className="carta-card-img carta-img-fallback">
                          <UtensilsCrossed size={28} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                        </div>
                      )}
                      <div className="carta-card-body">
                        <div className="carta-card-name">{p.name}</div>
                        {p.description && <div className="carta-card-desc">{p.description}</div>}
                        <div style={{ flex: 1 }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                          <div style={{ fontWeight: 700, fontSize: '12px', color: prodPrice }}>{isFrom ? `Desde ${formatPrice(amount)}` : formatPrice(amount)}</div>
                          {cartItem ? (
                            <div className="carta-stepper">
                              <button onClick={() => handleMainStep(p, -1)} className="carta-step-btn" style={{ backgroundColor: '#fff', color: '#ef4444' }}><Minus size={12} strokeWidth={3} /></button>
                              <span className="carta-qty-text">{cartItem.quantity}</span>
                              <button onClick={() => handleMainStep(p, 1)} className="carta-step-btn" style={{ backgroundColor: btnBg, color: btnText }}><Plus size={12} strokeWidth={3} /></button>
                            </div>
                          ) : (
                            <button className="carta-card-add" onClick={() => handleMainStep(p, 1)}><Plus size={14} strokeWidth={3} /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL PRODUCTO EN BANNER (HERO) */}
      {showHeroModal && (
        <div className="carta-modal-overlay" onClick={() => setShowHeroModal(false)}>
          <div className="carta-modal" onClick={(e) => e.stopPropagation()}>
            <div className="carta-modal-img" style={{ backgroundImage: bannerImageUrl ? `url('${getOptimizedImageUrl(bannerImageUrl, 700, 75)}')` : 'none' }}>
              <button className="carta-modal-close" onClick={() => setShowHeroModal(false)}><X size={16} /></button>
            </div>
            <div className="carta-modal-body">
              <div className="carta-modal-section">
                <div className="carta-modal-label">✦ Plato del Día ✦</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div>
                    <div className="carta-modal-title">{heroTitle}</div>
                    {restaurant.hero_description && <p className="carta-modal-desc">{restaurant.hero_description}</p>}
                    <div className="carta-modal-extra" style={{ marginTop: '8px' }}>
                      {heroDessert && <div>🍮 Postre incluido: {heroDessert.name}</div>}
                      {restaurant.hero_drink_options && <div>🥤 Bebida: {restaurant.hero_drink_options} ({restaurant.hero_drink_size})</div>}
                    </div>
                    <div className="carta-modal-price">{formatPrice(heroPrice)}</div>
                  </div>
                  <button className="carta-modal-add" onClick={() => handleQuickAdd(heroProductFallback, 'A')}>
                    {isAddedA ? <Check size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                  </button>
                </div>
              </div>

              {restaurant.secondary_menu_name && (
                <div className="carta-modal-section">
                  <div className="carta-modal-label">✦ {restaurant.secondary_menu_name} ✦</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                      {restaurant.secondary_menu_description && <p className="carta-modal-desc">{restaurant.secondary_menu_description}</p>}
                      <div className="carta-modal-extra" style={{ marginTop: '8px' }}>
                        {secPrincipal && <div>🥗 Principal: {secPrincipal.name}</div>}
                        {secDessert && <div>🍮 Postre incluido: {secDessert.name}</div>}
                        {restaurant.secondary_menu_drink_options && <div>🥤 Bebida: {restaurant.secondary_menu_drink_options} ({restaurant.secondary_menu_drink_size})</div>}
                      </div>
                      <div className="carta-modal-price">{formatPrice(restaurant.secondary_menu_price)}</div>
                    </div>
                    <button className="carta-modal-add" onClick={() => handleQuickAdd(secPrincipal, 'B')}>
                      {isAddedB ? <Check size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOCAL CERRADO */}
      {showClosedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={() => setShowClosedModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowClosedModal(false)} className="absolute top-3 right-3 text-gray-400"><X size={18} /></button>
            <h3 className="font-bold text-lg mb-2" style={{ fontFamily: 'Georgia, serif' }}>Local Cerrado</h3>
            <p className="text-sm text-gray-500">En este momento no estamos recibiendo pedidos. ¡Volvé a visitarnos pronto!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Carta;
