import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props { restaurant: any; products: any[]; loading?: boolean; }

const ClassicDelivery: React.FC<Props> = ({ restaurant, products, loading }) => {
  // VARIABLES DE COLOR (Con defaults por si están vacíos)
  const theme = restaurant.theme_color || '#d32f2f'; // Banner
  const bg = restaurant.bg_color || '#ffffff';
  const text = restaurant.text_color || '#000000';
  const descColor = restaurant.description_color || '#666666';
  const promoBg = restaurant.promo_bg_color || '#ffebee';
  // Lógica Promo
  const showPromo = restaurant.show_promo !== false;
  const promoMessage = restaurant.promo_message || '🛵 Envío GRATIS en tu primera compra';

  const styles = `
    .classic-del-container { background: ${bg}; font-family: Arial, sans-serif; height: 100%; display: flex; flex-direction: column; }
    .classic-header { background: ${theme}; padding: 15px 12px; color: white; text-align: center; position: relative; flex-shrink: 0; }
    .classic-logo { width: 30px; height: 30px; background: white; border-radius: 50%; color: ${theme}; display: grid; place-items: center; font-size: 10px; font-weight: bold; margin: 0 auto 5px; background-size: cover; }
    .classic-title { font-size: 12px; font-weight: bold; }
    .classic-desc-local { font-size: 10px; opacity: 0.8; margin-top: 2px; }
    .classic-status { position: absolute; top: 10px; right: 10px; background: white; color: ${theme}; font-size: 7px; padding: 2px 5px; border-radius: 4px; font-weight: bold; }
    .classic-msg { background: ${promoBg}; color: ${theme}; font-size: 9px; padding: 6px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.05); flex-shrink: 0; font-weight: 500; }
    .classic-item { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 8px 0; align-items: center; }
    .classic-prod { font-weight: bold; font-size: 11px; color: ${text}; margin-bottom: 2px; }
    .classic-desc { font-size: 9px; color: ${descColor}; line-height: 1.2; }
    .classic-price { font-weight: bold; font-size: 11px; color: ${theme}; margin-right: 8px; }
    .classic-btn { width: 20px; height: 20px; border: 1px solid #ddd; background: white; color: #555; display: flex; align-items: center; justify-content: center; font-size: 12px; border-radius: 4px; }
  `;

  return (
    <div className="classic-del-container">
      <style>{styles}</style>
      <div className="classic-header">
        <div className="classic-status">ABIERTO</div>
        <div className="classic-logo" style={restaurant.logo_url ? {backgroundImage: `url(${restaurant.logo_url})`, color:'transparent'} : {}}>{!restaurant.logo_url && 'LT'}</div>
        <div className="classic-title">{restaurant.name || 'Tu Negocio'}</div>
        <div className="classic-desc-local">{restaurant.description}</div>
      </div>
      {showPromo && <div className="classic-msg">{promoMessage}</div>}
      <div className="p-3 flex-1 overflow-y-auto">
        {products.map((p,i) => (
          <div key={i} className="classic-item">
            <div style={{flex:1, paddingRight:10}}>
              <div className="classic-prod">{p.name}</div>
              <div className="classic-desc">{p.description}</div>
            </div>
            <div style={{display:'flex', alignItems:'center'}}>
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