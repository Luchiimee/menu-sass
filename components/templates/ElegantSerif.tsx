// components/templates/ElegantSerif.tsx
import React from 'react';
import { Utensils } from 'lucide-react';
import { getProductDisplayPrice } from '@/lib/productPricing';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

export default function ElegantSerif({ restaurant, products }: any) {
  // --- VARIABLES DINÁMICAS ---
  const bg = restaurant.bg_color || '#f9f5f0';
  const theme = restaurant.theme_color || '#D4AF37';
  const textColor = restaurant.text_color || '#333333';
  const descColor = restaurant.description_color || '#777777';
  const promoBg = restaurant.promo_bg_color || '#f0e8dc';
  const promoText = restaurant.promo_text_color || '#5c4b30';
  
  const cardName = restaurant.card_name_color || '#111111';
  const cardDesc = restaurant.card_desc_color || '#888888';
  const priceColor = restaurant.card_price_color || '#D4AF37';
  
  const btnBg = restaurant.card_btn_bg || theme; 
  const btnText = restaurant.card_btn_text || '#ffffff';

  const titleFont = restaurant.title_font || 'Playfair Display';
  const descFont = restaurant.desc_font || 'Inter';
  const promoFont = restaurant.promo_font || 'Playfair Display';

  const showPromo = restaurant?.show_promo !== false;
  const promoMessage = restaurant?.promo_message || '"Sugerencia del Chef: Maridaje de quesos."';

  // Lógica de estado (isOpen viene del padre slugpage)
  const isOpen = restaurant.is_open !== false; 

  const STYLES = `
    .elegant-container { 
      background: ${bg}; 
      padding: 15px; 
      font-family: '${descFont}', sans-serif; 
      color: ${textColor}; 
      text-align: center; 
      height: 100%; 
      display: flex; 
      flex-direction: column; 
      position: relative;
    }
    .elegant-header { margin-bottom: 15px; flex-shrink: 0; position: relative; }
    
    /* --- SELLO DE ESTADO ELEGANT --- */
    .elegant-status {
      position: absolute;
      top: 0;
      right: 0;
      font-size: 7px;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid ${isOpen ? theme : '#cc0000'};
      color: ${isOpen ? theme : '#cc0000'};
      background: transparent;
    }

    .elegant-logo { 
      width: 32px; height: 32px; margin: 0 auto 5px; 
      border: 1px solid ${theme}; border-radius: 50%; 
      display: grid; place-items: center; color: ${theme}; 
      background-size: cover; 
    }
    .elegant-title { 
      font-family: '${titleFont}', serif; 
      font-size: 14px; font-weight: 700; letter-spacing: 1px; 
      text-transform: uppercase; color: ${textColor}; 
    }
    .elegant-sub { 
      font-size: 8px; font-style: italic; color: ${descColor}; 
      font-family: '${descFont}', sans-serif; 
    }
    
    .elegant-msg { 
      background: ${promoBg}; border: 1px solid ${theme}40; padding: 8px; 
      font-size: 9px; color: ${promoText}; margin: 10px 0; 
      font-style: italic; flex-shrink: 0;
      font-family: '${promoFont}', serif;
    }
    
    .elegant-list { text-align: left; flex: 1; overflow-y: auto; padding-right: 5px; }
    .elegant-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
    
    .elegant-prod { font-family: '${titleFont}', serif; font-weight: 700; font-size: 11px; color: ${cardName}; }
    .elegant-desc { font-family: '${descFont}', sans-serif; font-size: 8px; font-style: italic; color: ${cardDesc}; margin-top: 2px; }
    .elegant-price { font-family: '${titleFont}', serif; color: ${priceColor}; font-weight: 700; font-size: 10px; }
    
    .elegant-btn { width: 24px; height: 24px; background: ${btnBg}; color: ${btnText}; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 14px; }
  `;

  return (
    <div className="elegant-container">
      <style>{STYLES}</style>
      <div className="elegant-header">
        {/* Badge de Estado */}
        <div className="elegant-status">
          {isOpen ? 'Abierto' : 'Cerrado'}
        </div>

        <div className="elegant-logo" style={{ backgroundImage: `url('${getOptimizedImageUrl(restaurant.logo_url, 150, 75, 150, 'cover') || ''}')` }}>
          {!restaurant.logo_url && <Utensils size={14} color={theme} />}
        </div>
        <div className="elegant-title">{restaurant.name || 'LA BOURGOGNE'}</div>
        <div className="elegant-sub">{restaurant.description}</div>
      </div>

      {showPromo && <div className="elegant-msg">{promoMessage}</div>}

      <div className="elegant-list">
        {products.map((p: any, i: number) => (
          <div key={i} className="elegant-item">
            <div>
              <div className="elegant-prod">{p.name}</div>
              <div className="elegant-desc">{p.description}</div>
            </div>
            <div style={{textAlign:'right', display: 'flex', alignItems: 'center', gap: '10px'}}>
               <div className="elegant-price">{(() => { const { amount, isFrom } = getProductDisplayPrice(p); return isFrom ? `Desde $${amount}` : `$${amount}`; })()}</div>
               <button className="elegant-btn">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}