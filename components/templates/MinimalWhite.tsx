import React from 'react';
import { Coffee } from 'lucide-react';

export default function MinimalWhite({ restaurant, products }: any) {
  // --- VARIABLES SINCRONIZADAS ---
  const bg = restaurant.bg_color || '#ffffff';
  const text = restaurant.text_color || '#111111';
  const descColor = restaurant.description_color || '#777777';
  
  const cardBg = restaurant.card_color || '#ffffff';
  const prodName = restaurant.card_name_color || '#111111';
  const prodDesc = restaurant.card_desc_color || '#999999';
  const priceColor = restaurant.card_price_color || '#000000';
  
  const btnBg = restaurant.card_btn_bg || '#111111'; 
  const btnText = restaurant.card_btn_text || '#ffffff';

  // --- VARIABLES DE PROMO ---
  const showPromo = restaurant.show_promo !== false;
  const promoMessage = restaurant.promo_message || 'ENVÍOS GRATIS';
  const promoBg = restaurant.promo_bg_color || '#fafafa';
  const promoText = restaurant.promo_text_color || text;

  const styles = `
    .minimal-container { background: ${bg}; padding: 20px 15px; text-align: center; font-family: 'Lato', sans-serif; color: ${text}; height: 100%; display: flex; flex-direction: column; }
    .minimal-header { margin-bottom: 12px; position: relative; flex-shrink: 0; }
    .minimal-logo { width: 36px; height: 36px; background: ${text}; color: ${bg}; border-radius: 50%; margin: 0 auto 8px; display: grid; place-items: center; background-size: cover; border: 1px solid rgba(0,0,0,0.05); }
    .minimal-title { font-weight: 900; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; color: ${text}; }
    .minimal-desc { font-size: 8px; color: ${descColor}; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; }
    
    /* --- BANNER DE PROMO (MÁS FINO) --- */
    .minimal-msg { 
        border: 1px solid rgba(0,0,0,0.05); 
        background: ${promoBg}; 
        padding: 8px; 
        font-size: 9px; 
        margin: 15px 0; 
        text-transform: uppercase; 
        letter-spacing: 1.5px; 
        font-weight: 800; 
        color: ${promoText}; 
        flex-shrink: 0; 
    }

    .minimal-item { padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.05); background: ${cardBg}; display: flex; justify-content: space-between; align-items: center; }
    .minimal-text-group { flex: 1; text-align: left; padding-right: 10px; }

    /* --- TAMAÑOS PROPORCIONALES AL EDITOR --- */
    .minimal-prod { font-weight: 700; font-size: 13px; color: ${prodName}; line-height: 1.2; }
    .minimal-prod-desc { font-size: 9px; color: ${prodDesc}; margin-top: 2px; opacity: 0.7; line-height: 1.3; }
    
    .minimal-action-group { display: flex; align-items: center; gap: 8px; }
    .minimal-price { font-weight: 900; font-size: 11px; color: ${priceColor}; }
    
    /* --- BOTÓN + PROPORCIONAL --- */
    .minimal-btn { 
        width: 24px; 
        height: 24px; 
        background-color: ${btnBg} !important; 
        color: ${btnText} !important; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 16px; 
        font-weight: bold; 
        border: none; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
    }
  `;

  return (
    <div className="minimal-container">
      <style>{styles}</style>
      
      <div className="minimal-header">
        <div className="minimal-logo" style={restaurant.logo_url ? { backgroundImage: `url('${restaurant.logo_url}')`, color: 'transparent' } : {}}>
            {!restaurant.logo_url && <Coffee size={16}/>}
        </div>
        <div className="minimal-title">{restaurant.name || 'TU NEGOCIO'}</div>
        <div className="minimal-desc">{restaurant.description || 'Descripción del local'}</div>
      </div>

      {showPromo && promoMessage && (
        <div className="minimal-msg">{promoMessage}</div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {products.map((p: any, i: number) => (
          <div key={i} className="minimal-item">
            <div className="minimal-text-group">
              <div className="minimal-prod">{p.name}</div>
              <div className="minimal-prod-desc">{p.description}</div>
            </div>
            
            <div className="minimal-action-group">
              <div className="minimal-price">${p.price}</div>
              <button className="minimal-btn">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}