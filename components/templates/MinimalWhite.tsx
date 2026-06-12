"use client";

import React, { useState } from 'react';
import { Coffee, Search, Layers, Plus, Minus, Store, Clock } from 'lucide-react';
import { useCart } from "@/context/CartContext";
import { getProductDisplayPrice } from '@/lib/productPricing';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

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

const MinimalWhite: React.FC<Props> = ({
  restaurant, products, categories, fetchedExtras, isOpen, onAddToCart, isMockup = false, setShowInfo, mesaLabel = null,
}) => {
  const { cart, updateQuantity, updateExtraQuantity, addToCart } = useCart();
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");

  const bg = restaurant.bg_color || '#ffffff';
  const text = restaurant.text_color || '#111111';
  const descColor = restaurant.description_color || '#777777';
  const cardBg = restaurant.card_color || '#ffffff';
  const prodName = restaurant.card_name_color || '#111111';
  const prodDesc = restaurant.card_desc_color || '#555555';
  const priceColor = restaurant.card_price_color || '#000000';
  const btnBg = restaurant.card_btn_bg || '#111111';
  const btnText = restaurant.card_btn_text || '#ffffff';
  const promoBg = restaurant.promo_bg_color || '#fafafa';
  const promoText = restaurant.promo_text_color || text;
  const catBg = restaurant.cat_bg_color || '#f3f4f6';
  const catText = restaurant.cat_text_color || '#999999';
  const catActiveBg = restaurant.cat_active_bg_color || text;
  const catActiveText = restaurant.cat_active_text_color || bg;
  const searchBg = restaurant.search_bg_color || '#f3f4f6';
  const searchIcon = restaurant.search_icon_color || '#9ca3af';

  const formatPrice = (price: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);
  const displayCategories = categories?.filter((c: any) => c.name.toLowerCase() !== 'general') || [];

  const getCartItem = (productId: string) => cart.find(item => item.id === productId);
  const getExtraQty = (cartItem: any, extraId: string) => {
    if (!cartItem || !cartItem.extrasList) return 0;
    const extra = cartItem.extrasList.find((ex: any) => ex.id === extraId);
    return extra ? extra.quantity : 0;
  };

  const handleMainStep = (p: any, delta: number) => {
    if (!isOpen && !isMockup) return setShowClosedModal(true);
    const item = getCartItem(p.id);
    if (!item) { if (delta > 0) onAddToCart({ ...p, price: getProductDisplayPrice(p).amount }); }
    else { updateQuantity(item.uniqueId, item.quantity + delta); }
  };

  const handleExtraStep = (productId: string, extra: any, delta: number) => {
    const item = getCartItem(productId);
    if (!item) return;
    const currentExtraQty = getExtraQty(item, extra.id);
    if (currentExtraQty === 0 && delta > 0) {
      addToCart({ id: productId, extraId: extra.id, name: extra.name, price: Number(extra.price) });
    } else {
      updateExtraQuantity(item.uniqueId, extra.id, currentExtraQty + delta);
    }
  };

  const styles = `
    .minimal-container { background: ${bg}; font-family: 'Lato', sans-serif; min-height: 100vh; display: flex; flex-direction: column; padding-bottom: 120px; }
    .minimal-header { padding: 50px 20px 30px; text-align: center; position: relative; }
    .minimal-logo { width: 85px; height: 85px; background: ${text}; color: ${bg}; border-radius: 50%; margin: 0 auto 18px; display: grid; place-items: center; background-size: cover; border: 4px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .minimal-status { position: absolute; top: 20px; left: 20px; font-size: 11px; font-weight: 900; text-transform: uppercase; padding: 6px 14px; border-radius: 8px; letter-spacing: 1px; border: 1px solid ${isOpen ? '#eee' : '#fee2e2'}; background: ${isOpen ? '#fff' : '#fef2f2'}; color: ${isOpen ? '#111' : '#ef4444'}; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .minimal-info-btn { position: absolute; top: 15px; right: 20px; width: 46px; height: 46px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid #eee; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
    .minimal-prod-desc { font-size: 12px; color: ${prodDesc}; margin-top: 4px; opacity: 0.9; line-height: 1.4; }
    .minimal-msg { background: ${promoBg}; color: ${promoText}; font-size: 9px; padding: 6px 15px; text-align: center; font-weight: 800; border-radius: 20px; margin: 15px auto 0; width: fit-content; text-transform: uppercase; letter-spacing: 0.1em; border: 1px solid rgba(0,0,0,0.03); }
    .minimal-stepper { display: flex; align-items: center; gap: 8px; background: #f4f4f4; padding: 3px; border-radius: 8px; }
    .minimal-step-btn { width: 24px; height: 24px; border-radius: 5px; border: none; display: grid; place-items: center; cursor: pointer; padding: 0 !important; }
    .minimal-btn-add { width: 28px; height: 28px; background: ${btnBg} !important; color: ${btnText} !important; border-radius: 50%; display: grid; place-items: center; font-size: 18px; border: none; cursor: pointer; }
    .minimal-cat-btn { padding: 8px 16px; border-radius: 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; border: 1px solid #eee; white-space: nowrap; transition: all 0.2s; }
    .minimal-extra-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-top: 1px solid #f0f0f0; }
  `;

  return (
    <div className="minimal-container">
      <style>{styles}</style>

      <div className="minimal-header">
        <div className="minimal-status">{mesaLabel ? `📍 ${mesaLabel}` : isOpen ? "Abierto" : "Cerrado"}</div>
        <button onClick={() => setShowInfo(true)} className="minimal-info-btn" style={{ color: restaurant.theme_color || '#111111' }}>
          <Store size={24} />
        </button>
        <div className="minimal-logo" style={restaurant.logo_url ? { backgroundImage: `url('${getOptimizedImageUrl(restaurant.logo_url, 150, 75, 150, 'cover')}')`, color: 'transparent' } : {}}>
          {!restaurant.logo_url && <Coffee size={32} />}
        </div>
        <h1 style={{ color: text, fontWeight: 900, fontSize: '26px', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
          {restaurant.name || 'Tu Negocio'}
        </h1>
        <p style={{ color: descColor, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px', opacity: 0.8, maxWidth: '280px', margin: '8px auto 0' }}>
          {restaurant.description}
        </p>
        {restaurant.show_promo && restaurant.promo_message && (
          <div className="minimal-msg italic">{restaurant.promo_message}</div>
        )}
      </div>

      <div className="px-5 space-y-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} color={searchIcon} />
          <input type="text" placeholder="Buscar..." style={{ background: searchBg }} className="w-full border-none rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setSelectedCategory("todos")} className="minimal-cat-btn" style={{ backgroundColor: selectedCategory === "todos" ? catActiveBg : catBg, color: selectedCategory === "todos" ? catActiveText : catText }}>Todos</button>
          {displayCategories.map((cat: any) => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="minimal-cat-btn" style={{ backgroundColor: selectedCategory === cat.id ? catActiveBg : catBg, color: selectedCategory === cat.id ? catActiveText : catText }}>{cat.name}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5">
        {(selectedCategory === "todos" ? [{ id: 'todos', name: 'Menú' }] : displayCategories.filter(c => c.id === selectedCategory)).map((cat: any) => {
          const catProducts = products?.filter(p => (selectedCategory === "todos" || String(p.category_id) === String(cat.id)) && p.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];
          if (catProducts.length === 0) return null;
          return (
            <div key={cat.id} className="mb-6">
              {catProducts.map((p) => {
                const cartItem = getCartItem(p.id);
                const extras = fetchedExtras?.filter((extra: any) => extra.product_extras?.some((rel: any) => String(rel.product_id) === String(p.id))) || [];
                return (
                  <div key={p.id} style={{ background: cardBg, borderBottom: '1px solid #f0f0f0', padding: '15px 0' }}>
                    <div className="flex justify-between items-center">
                      <div className="flex-1 pr-4 text-left">
                        <div style={{ fontWeight: 800, fontSize: '14px', color: prodName }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: prodDesc, marginTop: '4px', opacity: 0.9, lineHeight: 1.4, fontWeight: 500 }}>{p.description}</div>
                        <div style={{ fontWeight: 900, fontSize: '12px', color: priceColor, marginTop: '6px' }}>{(() => { const { amount, isFrom } = getProductDisplayPrice(p); return isFrom ? `Desde ${formatPrice(amount)}` : formatPrice(amount); })()}</div>
                      </div>
                      {cartItem ? (
                        <div className="minimal-stepper">
                          <button onClick={() => handleMainStep(p, -1)} className="minimal-step-btn bg-white text-red-400"><Minus size={12} strokeWidth={3} /></button>
                          <span style={{ fontSize: '11px', fontWeight: 900, minWidth: '15px', textAlign: 'center' }}>{cartItem.quantity}</span>
                          <button onClick={() => handleMainStep(p, 1)} className="minimal-step-btn" style={{ backgroundColor: btnBg, color: btnText }}><Plus size={12} strokeWidth={3} /></button>
                        </div>
                      ) : (
                        <button className="minimal-btn-add" onClick={() => handleMainStep(p, 1)}>+</button>
                      )}
                    </div>
                    {cartItem && extras.length > 0 && (
                      <div className="mt-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100 animate-in slide-in-from-top-1">
                        <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#aaa', marginBottom: '10px', letterSpacing: '1px' }} className="flex items-center gap-1"><Layers size={10} /> Adicionales</p>
                        {extras.map((ex: any) => {
                          const extraQty = getExtraQty(cartItem, ex.id);
                          return (
                            <div key={ex.id} className="minimal-extra-row">
                              <div className="text-left flex-1"><span style={{ fontSize: '11px', fontWeight: 700, color: prodName }}>{ex.name}</span><span style={{ fontSize: '10px', fontWeight: 800, color: priceColor }} className="ml-2">+{formatPrice(ex.price)}</span></div>
                              {extraQty > 0 ? (
                                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-100">
                                  <button onClick={() => handleExtraStep(p.id, ex, -1)} className="w-6 h-6 flex items-center justify-center text-red-400"><Minus size={10} strokeWidth={3} /></button>
                                  <span style={{ fontSize: '11px', fontWeight: 900 }}>{extraQty}</span>
                                  <button onClick={() => handleExtraStep(p.id, ex, 1)} className="w-6 h-6 flex items-center justify-center text-green-500"><Plus size={10} strokeWidth={3} /></button>
                                </div>
                              ) : (
                                <button onClick={() => handleExtraStep(p.id, ex, 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-green-500 transition-all"><Plus size={14} strokeWidth={3} /></button>
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
          );
        })}
      </div>

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
};

export default MinimalWhite;