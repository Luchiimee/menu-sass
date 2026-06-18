"use client";

import React, { useState } from 'react'; 
import { Clock, Search, Layers, Plus, Minus, Check,MapPin,X,Store,Zap } from 'lucide-react';
import { useCart } from "@/context/CartContext";
import { getProductDisplayPrice } from "@/lib/productPricing";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { getContrastColor } from "@/lib/colorUtils";

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

const ClassicDelivery: React.FC<Props> = ({
  restaurant, products, categories, fetchedExtras, isOpen, onAddToCart, isMockup = false,
  setShowInfo, mesaLabel = null
}) => {
  const { cart, updateQuantity, updateExtraQuantity, removeFromCart, addToCart } = useCart();
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
; 
  // --- VARIABLES DE DISEÑO ---
const headerBg = restaurant.theme_color || '#1a1a2e';
  const headerDesc = restaurant.description_color || '#94a3b8';
  const headerText = restaurant.text_color || '#ffffff';

  const webBg = restaurant.bg_color || '#f8f9fa';
  const prodName = restaurant.card_name_color || '#111827';
  const prodDesc = restaurant.card_desc_color || '#6b7280';
  const prodPrice = restaurant.card_price_color || '#1a1a2e';
  const cardBg = restaurant.card_color || '#ffffff';
  const btnBg = restaurant.card_btn_bg || '#1a1a2e';
  const btnText = restaurant.card_btn_text || '#ffffff';
  const promoBg = restaurant.promo_bg_color || '#fff8e7';
  const promoText = restaurant.promo_text_color || '#92620a';
  const catBg = restaurant.cat_bg_color || '#ffffff';
  const catText = restaurant.cat_text_color || '#1a1a2e';
  const catActiveBg = restaurant.cat_active_bg_color || '#1a1a2e';
  const catActiveText = restaurant.cat_active_text_color || '#ffffff';
  const catInactiveBorder = getContrastColor(catBg) === '#000000' ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)';

  const formatPrice = (price: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);
  const displayCategories = categories?.filter((c: any) => c.name.toLowerCase() !== 'general') || [];

  // 🚀 LÓGICA DE CARRITO PARA CLASSIC
  // Buscamos el item principal en el carrito para obtener su uniqueId
  const getCartItem = (productId: string) => {
    return cart.find(item => item.id === productId);
  };

  const getExtraQty = (cartItem: any, extraId: string) => {
    if (!cartItem || !cartItem.extrasList) return 0;
    const extra = cartItem.extrasList.find((ex: any) => ex.id === extraId);
    return extra ? extra.quantity : 0;
  };

  const getExtrasForProduct = (productId: string) => {
    return fetchedExtras?.filter((extra: any) =>
      extra.product_extras?.some((rel: any) => String(rel.product_id) === String(productId))
    ) || [];
  };

const handleMainStep = (p: any, delta: number) => {
    if (!isOpen && !isMockup) return setShowClosedModal(true);
    const item = getCartItem(p.id);
    
    if (!item) {
      if (delta > 0) onAddToCart({ ...p, price: getProductDisplayPrice(p).amount });
    } else {
      // 🚀 Cambiamos item.id por item.uniqueId para que el Contexto lo encuentre
      updateQuantity(item.uniqueId, item.quantity + delta);
    }
  };

  const handleExtraStep = (productId: string, extra: any, delta: number) => {
    const item = getCartItem(productId);
    if (!item) return; // No debería pasar porque el extra solo se ve si el item está en el cart

    const currentExtraQty = getExtraQty(item, extra.id);
    const newQty = currentExtraQty + delta;

    if (currentExtraQty === 0 && delta > 0) {
      // Usamos tu addToCart que maneja la lógica de "buscar el padre"
      addToCart({ id: productId, extraId: extra.id, name: extra.name, price: Number(extra.price) });
    } else {
      updateExtraQuantity(item.uniqueId, extra.id, newQty);
    }
  };

  const styles = `
    .classic-container { background: ${webBg}; font-family: 'Inter', sans-serif; min-height: 100vh; display: flex; flex-direction: column; padding-bottom: 120px; }
    .classic-header { background: ${headerBg}; padding: 35px 15px; text-align: center; position: relative; }
    .classic-logo { 
      width: 70px; /* Subió de 50 a 70 */
      height: 70px; /* Subió de 50 a 70 */
      background: white; 
      border-radius: 50%; 
      margin: 0 auto 12px; 
      background-size: cover; 
      background-position: center; 
      border: 3px solid white; /* Un toque más grueso el borde */
      display: grid; 
      place-items: center; 
      font-weight: 900; 
      color: ${headerBg}; 
      font-size: 16px; /* Subimos la fuente de las iniciales */
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); /* Sombra más profunda */
    }
.classic-msg { 
      background: ${promoBg}; 
      color: ${promoText}; 
      font-size: 11px; 
      padding: 12px 20px; 
      text-align: center; 
      font-weight: 700; 
      width: 100%; 
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      /* 🚀 ESTO ELIMINA EL ESPACIO BLANCO */
      margin: 0 !important; 
      border-radius: 0 !important;
    }
    
    /* CENTRADO DE SIGNOS 🎯 */
    .classic-stepper { display: flex; align-items: center; gap: 8px; background: #f1f3f5; padding: 4px; border-radius: 10px; border: 1px solid #e9ecef; }
   .classic-step-btn { 
  width: 28px; height: 28px; border-radius: 7px; border: none; 
  display: grid; place-items: center; /* 🎯 Esto centra el signo */
  cursor: pointer; padding: 0 !important; line-height: 0 !important;
}
    .classic-qty-text { font-size: 13px; font-weight: 900; min-width: 18px; text-align: center; color: #000; display: flex; align-items: center; justify-content: center; }
/* 🚀 Agregamos background y color vinculados al editor */
    .classic-btn-add { 
      width: 32px; 
      height: 32px; 
      background: ${btnBg} !important; /* <--- Fondo del botón */
      color: ${btnText} !important;     /* <--- Color del símbolo + */
      border: 1px solid rgba(0,0,0,0.1) !important; 
      border-radius: 10px; 
      display: grid; 
      place-items: center; 
      font-size: 20px; 
      font-weight: 900; 
      cursor: pointer; 
      padding: 0 !important;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05); /* Un toque de sombra para que se vea */
    }

    .classic-extra-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-top: 1px dashed rgba(0,0,0,0.06); }
    .classic-cat-btn { padding: 8px 18px; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; border: 1px solid rgba(0,0,0,0.1); white-space: nowrap; }
  `;

  return (
    <div className="classic-container">
      <style>{styles}</style>
      
     <div className="classic-header" style={{ position: 'relative', padding: '50px 15px 35px' }}>
        {/* 🚀 ESTADO A LA IZQUIERDA (Más grande) */}
        <div 
          className="classic-status" 
          style={{ 
            backgroundColor: isOpen ? 'white' : '#fef2f2', 
            color: isOpen ? headerBg : '#ef4444', 
            position: 'absolute', 
            top: '15px', 
            left: '15px', 
            fontSize: '10px', // Subió de 8 a 10
            padding: '6px 12px', // Más relleno
            borderRadius: '8px', 
            fontWeight: '900',
            textTransform: 'uppercase',
            border: isOpen ? 'none' : '1px solid #fecaca',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
        >
          {mesaLabel ? `📍 ${mesaLabel}` : isOpen ? "ABIERTO" : "CERRADO"}
        </div>

        {/* 🚀 BOTÓN INFO A LA DERECHA (Más grande) */}
        <button 
          onClick={() => setShowInfo(true)} 
          className="classic-info-btn"
          style={{
            position: 'absolute',
            top: '12px', 
            right: '15px', 
            width: '40px', // Círculo más grande
            height: '40px',
            
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.25)', // Un toque más de opacidad
            color: headerText,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)', // Efecto vidrio pro
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
        >
          <Store size={22} /> {/* Icono de 18 a 22 */}
        </button>

        {/* LOGO, TÍTULO Y DESCRIPCIÓN */}
        <div className="classic-logo" style={restaurant.logo_url ? {backgroundImage: `url(${getOptimizedImageUrl(restaurant.logo_url, 150, 75, 150, 'cover')})`, color:'transparent'} : {}}>
          {!restaurant.logo_url && 'LT'}
        </div>

       <h1 className="classic-title" style={{color:headerText, fontSize:'20px', fontWeight:900, margin: 0}}>
          {restaurant.name || 'Tu Negocio'}
        </h1>
        
      <p style={{color: headerDesc, fontSize:'12px', opacity:0.85, marginTop:'6px', maxWidth: '280px', margin: '6px auto 0'}}>
          {restaurant.description}
        </p>
    </div>
     {restaurant.show_promo && restaurant.promo_message && (
        <div className="classic-msg italic">
        {restaurant.promo_message}
        </div>
      )}
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input type="text" placeholder="Buscar..." className="w-full bg-gray-100/50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-medium outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
       <div className="flex gap-2 overflow-x-auto no-scrollbar">
    <button 
        onClick={() => setSelectedCategory("todos")} 
        className="classic-cat-btn" 
        style={{
            backgroundColor: selectedCategory === "todos" ? catActiveBg : catBg,
            color: selectedCategory === "todos" ? catActiveText : catText,
            borderColor: selectedCategory === "todos" ? catActiveBg : catInactiveBorder
        }}
    >Todos</button>
    
    {displayCategories.map((cat: any) => (
        <button 
            key={cat.id} 
            onClick={() => setSelectedCategory(cat.id)} 
            className="classic-cat-btn" 
            style={{
                backgroundColor: selectedCategory === cat.id ? catActiveBg : catBg,
                color: selectedCategory === cat.id ? catActiveText : catText,
                borderColor: selectedCategory === cat.id ? catActiveBg : catInactiveBorder
            }}
        >{cat.name}</button>
    ))}
</div>
      </div>

      <div className="flex-1">
        {(selectedCategory === "todos" ? [{id: 'todos', name: 'Menú'}] : displayCategories.filter(c => c.id === selectedCategory)).map((cat: any) => {
          const catProducts = products?.filter(p => (selectedCategory === "todos" || String(p.category_id) === String(cat.id)) && p.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];
          if (catProducts.length === 0) return null;

          return (
            <div key={cat.id}>
              {catProducts.map((p) => {
                const cartItem = getCartItem(p.id);
                const extras = getExtrasForProduct(p.id);

                return (
                  <div key={p.id} style={{background: cardBg, borderBottom: '1px solid rgba(0,0,0,0.05)', padding:'16px 20px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div className="flex-1 pr-4 text-left">
                        <div style={{fontWeight:800, fontSize:'14px', color:prodName}}>{p.name}</div>
                        <div style={{fontSize:'11px', color:prodDesc, lineHeight:1.3, opacity:0.7}}>{p.description}</div>
                        <div style={{fontWeight:900, fontSize:'14px', color:prodPrice, marginTop:'5px'}}>{(() => { const { amount, isFrom } = getProductDisplayPrice(p); return isFrom ? `Desde ${formatPrice(amount)}` : formatPrice(amount); })()}</div>
                      </div>
                      
                      {cartItem ? (
                        <div className="classic-stepper">
                           <button onClick={() => handleMainStep(p, -1)} className="classic-step-btn bg-white shadow-sm text-red-500"><Minus size={14} strokeWidth={3}/></button>
                           <span className="classic-qty-text">{cartItem.quantity}</span>
                           <button onClick={() => handleMainStep(p, 1)} className="classic-step-btn" style={{ backgroundColor: headerBg, color: headerText }}><Plus size={14} strokeWidth={3}/></button>
                        </div>
                      ) : (
                        <button className="classic-btn-add" onClick={() => handleMainStep(p, 1)}>+</button>
                      )}
                    </div>

                    {/* ADICIONALES CON STEPS 🚀 */}
                    {cartItem && extras.length > 0 && (
                      <div className="mt-5 animate-in slide-in-from-top-2 duration-300 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                        <p style={{fontSize:'9px', fontWeight:'900', textTransform:'uppercase', color:'#999', marginBottom:'12px', letterSpacing:'0.1em'}} className="flex items-center gap-1">
                          <Layers size={10}/> Personalizá tu pedido
                        </p>
                        {extras.map((ex: any) => {
                          const extraQty = getExtraQty(cartItem, ex.id);
                          return (
                            <div key={ex.id} className="classic-extra-row">
                              <div className="text-left flex-1">
                                <span style={{fontSize:'11px', fontWeight:'700', color:prodName}}>{ex.name}</span>
                                <span style={{fontSize:'11px', fontWeight:'800', color:prodPrice}} className="ml-2">+{formatPrice(ex.price)}</span>
                              </div>
                              
                              {extraQty > 0 ? (
                                <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                                  <button onClick={() => handleExtraStep(p.id, ex, -1)} className="w-7 h-7 flex items-center justify-center text-red-400"><Minus size={12} strokeWidth={3}/></button>
                                  <span style={{fontSize:'12px', fontWeight:'900', color:'#000', minWidth:'12px', textAlign:'center'}}>{extraQty}</span>
                                  <button onClick={() => handleExtraStep(p.id, ex, 1)} className="w-7 h-7 flex items-center justify-center text-green-500"><Plus size={12} strokeWidth={3}/></button>
                                </div>
                              ) : (
                                <button onClick={() => handleExtraStep(p.id, ex, 1)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-green-600 transition-all shadow-sm">
                                  <Plus size={16} strokeWidth={3}/>
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
          );
        })}
      </div>
      
    </div>
  );
};

export default ClassicDelivery;