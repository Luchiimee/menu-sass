import React from 'react';

export default function UrbanoDark({ restaurant, products }: any) {
  // --- IDENTIDAD ---
  const bg = restaurant.bg_color || '#121212';
  const localNameColor = restaurant.text_color || '#ffffff';
  const localDescColor = restaurant.description_color || '#888888';
  const accent = restaurant.theme_color || '#ea580c';

  // --- PRODUCTOS ---
  const cardBg = restaurant.card_color || '#1E1E1E';
  const prodName = restaurant.card_name_color || localNameColor;
  const prodDesc = restaurant.card_desc_color || localDescColor;
  const priceColor = restaurant.card_price_color || accent;
  const btnBg = restaurant.card_btn_bg || '#ffffff'; 

  // --- PROMO ---
  const promoBg = restaurant.promo_bg_color || '#1E1E1E';
  const promoText = restaurant.promo_text_color || '#ffffff'; 
  const showPromo = restaurant.show_promo !== false;
  // ELIMINADO EL EMOJI AQUÍ:
  const promoMessage = restaurant.promo_message || 'PROMO: Envío gratis > $15.000';

  const styles = `
    .urbano-container { background: ${bg}; color: ${localNameColor}; padding: 12px; font-family: 'Inter', sans-serif; height: 100%; display: flex; flex-direction: column; }
    .urbano-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; flex-shrink: 0; }
    .urbano-brand { display: flex; gap: 8px; align-items: center; }
    .urbano-logo { width: 36px; height: 36px; background: #333; border-radius: 50%; border: 2px solid ${localNameColor}; background-size: cover; background-position: center; flex-shrink: 0; }
    .urbano-names h4 { font-size: 13px; font-weight: 800; margin: 0; line-height: 1.1; color: ${localNameColor}; }
    .urbano-names span { font-size: 9px; color: ${localDescColor}; }
    .urbano-status { background: #22c55e; color: #000; font-size: 8px; font-weight: 800; padding: 3px 6px; border-radius: 12px; }
    
    .urbano-msg { background: ${promoBg}; padding: 8px; border-radius: 8px; font-size: 9px; color: ${promoText}; margin-bottom: 15px; border-left: 3px solid ${accent}; flex-shrink: 0; font-weight: 700; }
    
    .urbano-list { flex: 1; overflow-y: auto; padding-right: 2px; }
    .urbano-item { background: ${cardBg}; padding: 8px; border-radius: 12px; display: flex; gap: 8px; margin-bottom: 10px; position: relative; }
    .urbano-img { width: 60px; height: 60px; background-size: cover; border-radius: 8px; background-position: center; flex-shrink: 0; background-color: #333; }
    .urbano-info { flex: 1; padding-right: 20px; display: flex; flex-direction: column; justify-content: center; }
    .urbano-tit { font-weight: 700; font-size: 11px; margin-bottom: 2px; color: ${prodName}; }
    .urbano-desc { font-size: 8px; color: ${prodDesc}; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .urbano-price { color: ${priceColor}; font-weight: 800; font-size: 11px; margin-top: 4px; }
    
    .urbano-add-btn { position: absolute; bottom: 8px; right: 8px; width: 22px; height: 22px; background: ${btnBg}; color: ${bg}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; border: none; font-size: 16px; cursor: pointer; transition: transform 0.1s; }
    .urbano-add-btn:active { transform: scale(0.9); }
  `;

  return (
    <div className="urbano-container">
      <style>{styles}</style>
      <div className="urbano-top">
        <div className="urbano-brand">
          <div className="urbano-logo" style={restaurant.logo_url ? { backgroundImage: `url("${restaurant.logo_url}")` } : {}}></div>
          <div className="urbano-names">
            <h4>{restaurant.name || 'Tu Negocio'}</h4>
            <span>{restaurant.description || 'Descripción'}</span>
          </div>
        </div>
        <div className="urbano-status">ABIERTO</div>
      </div>
      
      {showPromo && <div className="urbano-msg">{promoMessage}</div>}
      
      <div className="urbano-list flex-1 overflow-y-auto">
        {products.map((p: any, i: number) => (
          <div key={i} className="urbano-item">
            <div className="urbano-img" style={p.image_url ? { backgroundImage: `url("${p.image_url}")` } : { backgroundColor: '#333' }}></div>
            <div className="urbano-info">
              <div className="urbano-tit">{p.name}</div>
              <div className="urbano-desc">{p.description}</div>
              <div className="urbano-price">${p.price}</div>
            </div>
            <button className="urbano-add-btn">+</button>
          </div>
        ))}
      </div>
    </div>
  );
}