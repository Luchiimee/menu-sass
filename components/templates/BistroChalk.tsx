// components/templates/BistroChalk.tsx
import React from 'react';
import { getProductDisplayPrice } from '@/lib/productPricing';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

export default function BistroChalk({ restaurant, products }: any) {
  const titleFont = restaurant.title_font || 'Patrick Hand';
  const descFont = restaurant.desc_font || 'Patrick Hand';
  const promoFont = restaurant.promo_font || 'Patrick Hand';
  
  const showPromo = restaurant?.show_promo !== false;
  const promoMessage = restaurant?.promo_message || '🍷 2x1 en Vermut hasta las 20hs';
  const isOpen = restaurant.is_open !== false;

  const bg = restaurant.bg_color || '#1a1a1a';
  const theme = restaurant.theme_color || '#e6c87e';
  const textColor = restaurant.text_color || '#eeeeee';
  const descColor = restaurant.description_color || '#aaaaaa';
  const cardName = restaurant.card_name_color || '#ffffff';
  const cardDesc = restaurant.card_desc_color || '#999999';
  const priceColor = restaurant.card_price_color || '#e6c87e';
  
  const promoBg = restaurant.promo_bg_color || '#333333';
  const promoText = restaurant.promo_text_color || '#e6c87e';

  // --- NUEVAS VARIABLES: Los colores del botón ---
  const btnBg = restaurant.card_btn_bg || '#e6c87e';
  const btnText = restaurant.card_btn_text || '#222222';

  const STYLES = `
    .bistro-container { background: ${bg}; color: ${textColor}; padding: 12px; font-family: '${descFont}', cursive; height: 100%; display: flex; flex-direction: column; }
    .bistro-border { border: 2px dashed rgba(255,255,255,0.15); height: 100%; padding: 10px; border-radius: 12px; display: flex; flex-direction: column; position: relative; }
    .bistro-header { text-align: center; margin-bottom: 15px; flex-shrink: 0; position: relative; }
    
    .bistro-status {
      position: absolute; top: -5px; right: -5px; font-size: 8px; font-weight: 900; text-transform: uppercase; padding: 3px 8px; border-radius: 4px;
      border: 1.5px dotted ${isOpen ? theme : '#e74c3c'}; color: ${isOpen ? theme : '#e74c3c'}; background: ${bg}; transform: rotate(5deg); font-family: '${titleFont}', cursive; z-index: 10;
    }

    .bistro-logo { width: 40px; height: 40px; margin: 0 auto 8px; border: 2px solid ${theme}; border-radius: 50%; display: grid; place-items: center; color: ${theme}; background-size: cover; }
    .bistro-title { font-family: '${titleFont}', cursive; font-size: 20px; margin-bottom: 2px; }
    .bistro-sub { font-family: '${descFont}', cursive; font-size: 11px; color: ${descColor}; }
    
    .bistro-msg { 
      font-family: '${promoFont}', cursive;
      border: 2px dotted ${theme}90; 
      padding: 10px; margin: 15px 0; 
      text-align: center; font-size: 12px; 
      flex-shrink: 0; border-radius: 8px;
    }
    
    .bistro-list { flex: 1; overflow-y: auto; padding-right: 5px; }
    .bistro-item { margin-bottom: 15px; text-align: left; }
    .bistro-row { display: flex; justify-content: space-between; align-items: baseline; }
    .bistro-name { font-family: '${titleFont}', cursive; font-size: 14px; color: ${cardName}; }
    .bistro-dots { flex: 1; border-bottom: 1px dotted rgba(255,255,255,0.2); margin: 0 6px; }
    .bistro-price { font-family: '${titleFont}', cursive; font-size: 14px; color: ${priceColor}; }
    
    .bistro-plus-btn {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-family: Arial, sans-serif;
      font-size: 16px;
      font-weight: bold;
      margin-left: 8px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .bistro-plus-btn:hover { opacity: 0.8; }

    .bistro-desc { font-family: '${descFont}', cursive; font-size: 10px; color: ${cardDesc}; margin-top: 3px; opacity: 0.7; }
  `;

  return (
    <div className="bistro-container">
      <style>{STYLES}</style>
      <div className="bistro-border">
        <div className="bistro-header">
          <div className="bistro-status">{isOpen ? 'Abierto' : 'Cerrado'}</div>
          <div className="bistro-logo" style={{ backgroundImage: `url('${getOptimizedImageUrl(restaurant.logo_url, 150, 75, 150, 'cover') || ''}')` }}>{!restaurant.logo_url && 'EB'}</div>
          
          <div className="bistro-title" style={{ color: textColor }}>{restaurant.name || 'El Bodegón'}</div>
          
          <div className="bistro-sub">{restaurant.description}</div>
        </div>
        
        {showPromo && (
          <div className="bistro-msg" style={{ backgroundColor: promoBg, color: promoText }}>
            {promoMessage}
          </div>
        )}
        
        <div className="bistro-list no-scrollbar">
          {products.map((p: any, i: number) => (
            <div key={i} className="bistro-item">
              <div className="bistro-row">
                <div className="bistro-name">{p.name}</div>
                <div className="bistro-dots"></div>
                <div className="bistro-price">{(() => { const { amount, isFrom } = getProductDisplayPrice(p); return isFrom ? `Desde $${amount}` : `$${amount}`; })()}</div>
                
                {/* --- BOTÓN MÁS RECONECTADO --- */}
                <div 
                  className="bistro-plus-btn"
                  style={{ backgroundColor: btnBg, color: btnText }}
                >
                  +
                </div>
              </div>
              <div className="bistro-desc">{p.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}