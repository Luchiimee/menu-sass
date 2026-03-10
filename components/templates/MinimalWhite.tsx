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
  
  // Usamos BTN_BG para el círculo y BTN_TEXT para el palito
  const btnBg = restaurant.card_btn_bg || '#111111'; 
  const btnText = restaurant.card_btn_text || '#ffffff';

  const styles = `
    .minimal-container { background: ${bg}; padding: 30px 20px; text-align: center; font-family: 'Lato', sans-serif; color: ${text}; height: 100%; display: flex; flex-direction: column; }
    .minimal-header { margin-bottom: 25px; position: relative; flex-shrink: 0; }
    .minimal-logo { width: 40px; height: 40px; background: ${text}; color: ${bg}; border-radius: 50%; margin: 0 auto 10px; display: grid; place-items: center; background-size: cover; border: 1px solid rgba(0,0,0,0.05); }
    .minimal-title { font-weight: 900; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: ${text}; }
    .minimal-desc { font-size: 9px; color: ${descColor}; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
    
    /* --- ESTRUCTURA DE LAYOUT ROBUSTA --- */
    .minimal-item { 
        padding: 15px 0; 
        border-bottom: 1px solid rgba(0,0,0,0.05); 
        background: ${cardBg}; 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
    }
    .minimal-text-group { 
        flex: 1; 
        text-align: left; 
        padding-right: 15px; 
    }
    .minimal-action-group { 
        display: flex; 
        align-items: center; 
        gap: 10px; 
    }

    .minimal-prod { font-weight: 700; font-size: 13px; color: ${prodName}; }
    .minimal-prod-desc { font-size: 9px; color: ${prodDesc}; margin-top: 2px; opacity: 0.8; }
    .minimal-price { font-weight: 900; font-size: 12px; color: ${priceColor}; }
    
    /* --- BOTÓN + (Sincronizado) --- */
    .minimal-btn { 
        width: 22px; 
        height: 22px; 
        background-color: ${btnBg} !important; 
        color: ${btnText} !important; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 16px; 
        font-weight: bold; 
        border: none; 
        box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
    }
  `;

  return (
    <div className="minimal-container">
      <style>{styles}</style>
      <div className="minimal-header">
        <div className="minimal-logo" style={restaurant.logo_url ? { backgroundImage: `url('${restaurant.logo_url}')`, color: 'transparent' } : {}}>
            {!restaurant.logo_url && <Coffee size={18}/>}
        </div>
        <h1 className="minimal-title">{restaurant.name}</h1>
        <p className="minimal-desc">{restaurant.description}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {products.map((p: any, i: number) => (
          <div key={i} className="minimal-item">
            {/* NUEVO GRUPO DE TEXTO */}
            <div className="minimal-text-group">
              <div className="minimal-prod">{p.name}</div>
              <div className="minimal-prod-desc">{p.description}</div>
            </div>
            
            {/* NUEVO GRUPO DE ACCIÓN (Derecha) */}
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