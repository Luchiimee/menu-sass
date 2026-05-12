"use client";

import React, { useState, useEffect } from 'react';
import { X, Store, Zap, Search, Plus, Layers, Minus , Utensils} from 'lucide-react';
import AddToCartBtn from "@/components/AddToCartBtn";
import { useCart } from "@/context/CartContext";

export default function VisualGrid({ restaurant, products, categories, fetchedExtras, isOpen, setShowInfo, onAddToCart, isMockup }: any) {
  const [activeId, setActiveId] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const { cart, updateQuantity, updateExtraQuantity, addToCart } = useCart();

  if (!restaurant) return null;

  // --- VARIABLES DE COLOR ---
  const ACENTO = restaurant.theme_color || '#ea580c';
  const L_NAME = restaurant.text_color || '#ffffff';
  const L_DESC = restaurant.description_color || '#bbbbbb';
  const CARD_BG = restaurant.card_color || '#2a2a2a';
  const P_NAME = restaurant.card_name_color || '#ffffff';
  const P_PRICE = restaurant.card_price_color || ACENTO;
  const PROMO_BG = restaurant.promo_bg_color || '#1E1E1E';
  const PROMO_TXT = restaurant.promo_text_color || '#ffffff';

  useEffect(() => {
    if (activeId) {
      const timer = setTimeout(() => {
        const panel = document.getElementById(`scroll-panel-${activeId}`);
        if (panel) panel.scrollTo({ top: 120, behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeId]);

  const getExtrasForProduct = (productId: string) => {
    return fetchedExtras?.filter((ex: any) => 
      ex.product_extras?.some((re: any) => String(re.product_id) === String(productId))
    ) || [];
  };
const getContrastColor = (hexcolor: string) => {
    if (!hexcolor) return '#ffffff';
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
  };

  const searchBg = restaurant.search_bg_color || '#111111';
  const searchTextColor = getContrastColor(searchBg)
  return (
    <div style={{ background: restaurant.bg_color || '#1a1a1a', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: isMockup ? '8px' : '12px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 🚀 HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMockup ? '10px 4px' : '20px 4px 30px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMockup ? 10 : 15, textAlign: 'left' }}>
          <div style={{ 
            width: isMockup ? '55px' : '75px', height: isMockup ? '55px' : '75px', borderRadius: '14px', 
            backgroundImage: `url('${restaurant.logo_url || ""}')`, 
            backgroundSize: 'cover', backgroundPosition: 'center',
            border: `1px solid rgba(255,255,255,0.1)`, backgroundColor: '#222', flexShrink: 0 
          }}></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: isMockup ? '18px' : '26px', fontWeight: '900', margin: 0, color: L_NAME, textTransform: 'uppercase', lineHeight: 1, letterSpacing: '-1px', fontStyle: 'italic' }}>
              {restaurant.name}
            </h1>
            <span style={{ fontSize: isMockup ? '9px' : '11px', color: L_DESC, opacity: 0.6, marginTop: '4px', fontWeight: '600' }}>
              {restaurant.description}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
           <div style={{ fontSize: '9px', fontWeight: '900', background: isOpen ? ACENTO : '#333', color: 'white', padding: '6px 12px', borderRadius: '8px', textTransform: 'uppercase' }}>
              {isOpen ? "Abierto" : "Cerrado"}
           </div>
           <button onClick={() => setShowInfo(true)} style={{ background: '#1a1a1a', color: ACENTO, border: `1px solid ${ACENTO}40`, width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
             <Store size={22} />
           </button>
        </div>
      </div>

      {/* PROMO */}
      {restaurant.show_promo && restaurant.promo_message && (
        <div style={{ background: PROMO_BG, color: PROMO_TXT, fontSize: isMockup ? '9px' : '11px', marginBottom: '20px', borderLeft: `4px solid ${ACENTO}`, padding: '12px 16px', fontWeight: '700', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {restaurant.promo_message}
        </div>
      )}

     {/* BUSCADOR DINÁMICO */}
      <div style={{ padding: '0 4px', marginBottom: '15px' }}>
        <div style={{ 
          background: searchBg, 
          borderRadius: '15px', 
          padding: isMockup ? '10px' : '14px 15px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          border: '1px solid rgba(255,255,255,0.05)' 
        }}>
          <Search size={16} color={restaurant.search_icon_color || ACENTO} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              outline: 'none', 
              color: searchTextColor, // 🚀 AHORA CAMBIA SEGÚN EL FONDO
              fontSize: '13px', 
              width: '100%' 
            }} 
          />
        </div>
      </div>

  {/* CATEGORÍAS */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 4px 20px' }} className="no-scrollbar">
        <button 
          onClick={() => setSelectedCategory("todos")} 
          style={{ 
            background: selectedCategory === "todos" ? ACENTO : 'transparent', 
            color: 'white', 
            border: `1px solid ${selectedCategory === "todos" ? ACENTO : 'rgba(255,255,255,0.2)'}`, // 🚀 BORDE SÓLIDO
            padding: '10px 20px', 
            borderRadius: '15px', 
            fontSize: '10px', 
            fontWeight: '900', 
            textTransform: 'uppercase', 
            whiteSpace: 'nowrap',
            transition: 'all 0.2s'
          }}
        >
          Todos
        </button>
        {categories?.filter((c: any) => c.name.toLowerCase() !== 'general').map((cat: any) => (
          <button 
            key={cat.id} 
            onClick={() => setSelectedCategory(cat.id)} 
            style={{ 
              background: selectedCategory === cat.id ? ACENTO : 'transparent', 
              color: selectedCategory === cat.id ? 'white' : '#777', 
              border: `1px solid ${selectedCategory === cat.id ? ACENTO : 'rgba(255,255,255,0.2)'}`, // 🚀 BORDE SÓLIDO
              padding: '10px 20px', 
              borderRadius: '15px', 
              fontSize: '10px', 
              fontWeight: '800', 
              textTransform: 'uppercase', 
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMockup ? '8px' : '10px', flex: 1, overflowY: 'auto' }} className="no-scrollbar">
        {products
          .filter((p: any) => (selectedCategory === "todos" || String(p.category_id) === String(selectedCategory)) && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((p: any) => {
            const isActive = activeId === p.id;
            const extras = getExtrasForProduct(p.id);

            return (
              <div key={p.id} onClick={() => setActiveId(isActive ? null : p.id)} style={{ aspectRatio: '1 / 1.25', borderRadius: '20px', position: 'relative', overflow: 'hidden', backgroundColor: CARD_BG, border: isActive ? `2px solid ${ACENTO}` : 'none' }}>
               <div style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  filter: isActive ? 'brightness(0.2) blur(12px)' : 'none', 
                  transition: 'all 0.5s ease',
                  display: 'flex',         // 👈 Agregamos esto
                  alignItems: 'center',    // 👈 Agregamos esto
                  justifyContent: 'center', // 👈 Agregamos esto
                  backgroundColor: '#222'  // Fondo oscuro base
                }}>
                  {p.video_url ? (
                    <video src={p.video_url} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : p.image_url ? (
                    <div style={{ width: '100%', height: '100%', backgroundImage: `url('${p.image_url}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  ) : (
                    /* 🚀 PLAN B: Si no hay foto ni video, mostramos los cubiertos */
                    <Utensils size={48} strokeWidth={1} style={{ color: 'rgba(255,255,255,0.1)' }} />
                  )}
                </div>

                {isActive ? (
                  <div 
                    id={`scroll-panel-${p.id}`} 
                    className="no-scrollbar" 
                    onClick={(e) => e.stopPropagation()} 
                    style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto', animation: 'fadeIn 0.3s' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '5px' }} onClick={(e) => { e.stopPropagation(); setActiveId(null); }}>
                        <X size={18} style={{ color: 'white', opacity: 0.5, cursor: 'pointer' }}/>
                    </div>

                    {/* ALINEACIÓN IZQUIERDA */}
                    <div style={{ fontWeight: '900', fontSize: '18px', color: 'white', marginBottom: '4px', textTransform: 'uppercase', fontStyle: 'italic', textAlign: 'left' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '15px', textAlign: 'left', lineHeight: 1.4 }}>{p.description}</div>
                    <div style={{ color: P_PRICE, fontSize: '20px', fontWeight: '900', marginBottom: '15px', textAlign: 'left' }}>${p.price}</div>
                    
                    <div style={{ width: '100%', marginBottom: '15px' }} onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const itemInCart = cart.find(item => item.id === p.id && !item.parentId);
                        if (itemInCart) {
                          return (
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'flex-start', // IZQUIERDA
                                gap: '18px', 
                                background: 'white', 
                                padding: '8px 12px', 
                                borderRadius: '15px', 
                                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                                width: 'fit-content',
                                margin: '0 0 15px 0'
                            }}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); updateQuantity(itemInCart.uniqueId, itemInCart.quantity - 1); }} 
                                style={{ color: 'black', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              >
                                <Minus size={16}/>
                              </button>
                              <span style={{ color: ACENTO, fontWeight: '900', fontSize: '16px' }}>{itemInCart.quantity}</span>
                              <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    updateQuantity(itemInCart.uniqueId, itemInCart.quantity + 1); 
                                    onAddToCart(p); 
                                }} 
                                style={{ color: 'black', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              >
                                <Plus size={16}/>
                              </button>
                            </div>
                          );
                        }
return (
                          <div 
                            style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginBottom: '15px' }} 
                            onPointerDown={(e) => { e.stopPropagation(); onAddToCart(p); }}
                          >
                             {/* 🚀 EL CONTENEDOR AHORA MANDA LOS COLORES */}
                             <div style={{
                                backgroundColor: restaurant.card_btn_bg || ACENTO, // 🎨 Fondo del botón
                                color: restaurant.card_btn_text || '#ffffff',      // 🎨 Color del signo +
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                             }}>
                                <AddToCartBtn product={p} variant="icon" 
                                style={{
            backgroundColor: restaurant.card_btn_bg || '#ffffff', 
            color: restaurant.card_btn_text || '#000000'      
        }} />
                             </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* EXTRAS */}
                    {extras.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: '900', marginBottom: '12px', textAlign: 'left' }}>Adicionales</p>
                        {extras.map((ex: any) => {
                          const parentItem = cart.find(item => item.id === p.id && !item.parentId);
                          const extraInCart = parentItem?.extrasList?.find((e: any) => e.id === ex.id);
                          const eQty = extraInCart ? extraInCart.quantity : 0;

                          return (
                            <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '15px', marginBottom: '8px' }}>
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: 'white' }}>{ex.name}</div>
                                <div style={{ fontSize: '11px', color: ACENTO }}>+${ex.price}</div>
                              </div>

                              {eQty > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '4px 8px', borderRadius: '10px' }}>
                                  <button onClick={(e) => { e.stopPropagation(); updateExtraQuantity(parentItem.uniqueId, ex.id, eQty - 1); }} style={{ color: 'black', border: 'none', background: 'none' }}><Minus size={14}/></button>
                                  <span style={{ color: 'black', fontWeight: '900', fontSize: '14px' }}>{eQty}</span>
                                  <button onClick={(e) => { e.stopPropagation(); updateExtraQuantity(parentItem.uniqueId, ex.id, eQty + 1); onAddToCart(p); }} style={{ color: 'black', border: 'none', background: 'none' }}><Plus size={14}/></button>
                                </div>
                              ) : (
                                <button onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (!parentItem) { onAddToCart(p); }
                                  addToCart({ id: p.id, extraId: ex.id, name: ex.name, price: Number(ex.price) });
                                  onAddToCart(p);
                                }} style={{ width: '30px', height: '30px', background: 'white', color: 'black', border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Plus size={16} strokeWidth={3} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 60%)', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ fontWeight: '800', fontSize: '12px', color: P_NAME, textTransform: 'uppercase' }}>{p.name}</div>
                    <div style={{ color: P_PRICE, fontSize: '12px', fontWeight: '900', marginTop: '2px' }}>${p.price}</div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}