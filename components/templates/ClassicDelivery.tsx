import React from 'react';

interface Props { restaurant: any; products: any[]; loading?: boolean; }

const ClassicDelivery: React.FC<Props> = ({ restaurant, products }) => {
  // --- VARIABLES PURAS (Sin lógica extra, solo obediencia al Editor) ---
  const headerBg = restaurant.theme_color || '#d32f2f';
  const headerText = restaurant.text_color || '#ffffff';
  const headerDesc = restaurant.description_color || '#ffffff';
  const webBg = restaurant.bg_color || '#ffffff';

  const prodName = restaurant.card_name_color || '#000000';
  const prodDesc = restaurant.card_desc_color || '#666666';
  const prodPrice = restaurant.card_price_color || '#d32f2f';
  const cardBg = restaurant.card_color || '#ffffff';

  const btnBg = restaurant.card_btn_bg || '#ffffff';
  const btnText = restaurant.card_btn_text || '#000000';

  const promoBg = restaurant.promo_bg_color || '#ffebee';
  const promoText = restaurant.promo_text_color || '#d32f2f';
  const showPromo = restaurant.show_promo !== false;

  const styles = `
    .classic-container { background: ${webBg}; font-family: Arial, sans-serif; height: 100%; display: flex; flex-direction: column; }
    .classic-header { background: ${headerBg}; padding: 20px 15px; text-align: center; position: relative; flex-shrink: 0; }
    .classic-logo { width: 35px; height: 35px; background: white; border-radius: 50%; margin: 0 auto 8px; background-size: cover; background-position: center; border: 2px solid white; display: grid; place-items: center; font-weight: 900; color: ${headerBg}; font-size: 12px; }
    .classic-title { font-size: 14px; font-weight: 800; color: ${headerText}; margin: 0; }
    .classic-desc-local { font-size: 10px; color: ${headerDesc}; opacity: 0.9; margin-top: 4px; }
    .classic-status { position: absolute; top: 12px; right: 12px; background: white; color: ${headerBg}; font-size: 7px; padding: 3px 6px; border-radius: 4px; font-weight: 900; }
    
    .classic-msg { background: ${promoBg}; color: ${promoText}; font-size: 10px; padding: 8px; text-align: center; font-weight: 700; border-bottom: 1px solid rgba(0,0,0,0.03); }
    
    .classic-item { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 12px 15px; align-items: center; background: ${cardBg}; }
    .classic-prod-name { font-weight: 800; font-size: 12px; color: ${prodName}; margin-bottom: 2px; text-align: left; }
    .classic-prod-desc { font-size: 9px; color: ${prodDesc}; line-height: 1.2; text-align: left; opacity: 0.8; }
    .classic-price { font-weight: 900; font-size: 12px; color: ${prodPrice}; margin-right: 10px; }
    
    .classic-btn { width: 24px; height: 24px; background: ${btnBg}; color: ${btnText}; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  `;

  return (
    <div className="classic-container">
      <style>{styles}</style>
      <div className="classic-header">
        <div className="classic-status">ABIERTO</div>
        <div className="classic-logo" style={restaurant.logo_url ? {backgroundImage: `url(${restaurant.logo_url})`, color:'transparent'} : {}}>{!restaurant.logo_url && 'LT'}</div>
        <h1 className="classic-title">{restaurant.name || 'Tu Negocio'}</h1>
        <p className="classic-desc-local">{restaurant.description}</p>
      </div>
      
      {showPromo && <div className="classic-msg">{restaurant.promo_message || '🛵 Envío GRATIS en tu primera compra'}</div>}
      
      <div className="flex-1 overflow-y-auto">
        {products.map((p, i) => (
          <div key={i} className="classic-item">
            <div style={{ flex: 1, paddingRight: 10 }}>
              <div className="classic-prod-name">{p.name}</div>
              <div className="classic-prod-desc">{p.description}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="classic-price">${p.price}</div>
              <button className="classic-btn">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassicDelivery;