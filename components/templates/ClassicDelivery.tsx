import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props { restaurant: any; products: any[]; loading?: boolean; }

const ClassicDelivery: React.FC<Props> = ({ restaurant, products, loading }) => {
  // --- SEPARACIÓN DE CABLES (VARIABLES) ---
  
  // 1. Identidad del Local
  const bannerHeader = restaurant.theme_color || '#d32f2f';
  const nombreLocal = restaurant.text_color || '#000000';
  const descLocal = restaurant.description_color || '#666666';
  const fondoWeb = restaurant.bg_color || '#ffffff';

  // 2. Carta de Productos (Ahora son independientes)
  const nombreProducto = restaurant.card_name_color || '#000000';
  const descProducto = restaurant.card_desc_color || '#999999';
  const precioColor = restaurant.card_price_color || bannerHeader; // Fallback al theme
  const botonBg = restaurant.card_btn_bg || '#ffffff';
  const botonTexto = restaurant.card_btn_text || '#555555';

  // 3. Promo
  const promoBg = restaurant.promo_bg_color || '#ffebee';
  const promoTexto = restaurant.promo_text_color || bannerHeader;
  const showPromo = restaurant.show_promo !== false;
  const promoMessage = restaurant.promo_message || '🛵 Envío GRATIS en tu primera compra';

  const styles = `
    .classic-del-container { background: ${fondoWeb}; font-family: Arial, sans-serif; height: 100%; display: flex; flex-direction: column; }
    
    /* Header */
    .classic-header { background: ${bannerHeader}; padding: 15px 12px; color: white; text-align: center; position: relative; flex-shrink: 0; }
    .classic-logo { width: 30px; height: 30px; background: white; border-radius: 50%; color: ${bannerHeader}; display: grid; place-items: center; font-size: 10px; font-weight: bold; margin: 0 auto 5px; background-size: cover; }
    .classic-title { font-size: 12px; font-weight: bold; color: ${nombreLocal}; }
    .classic-desc-local { font-size: 10px; color: ${descLocal}; opacity: 0.9; margin-top: 2px; }
    .classic-status { position: absolute; top: 10px; right: 10px; background: white; color: ${bannerHeader}; font-size: 7px; padding: 2px 5px; border-radius: 4px; font-weight: bold; }
    
    /* Mensaje Promo */
    .classic-msg { background: ${promoBg}; color: ${promoTexto}; font-size: 9px; padding: 6px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.05); flex-shrink: 0; font-weight: 700; }
    
    /* Items de la lista */
    .classic-item { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.05); padding: 10px 0; align-items: center; }
    .classic-prod { font-weight: 800; font-size: 11px; color: ${nombreProducto}; margin-bottom: 2px; }
    .classic-desc { font-size: 9px; color: ${descProducto}; line-height: 1.2; }
    .classic-price { font-weight: bold; font-size: 11px; color: ${precioColor}; margin-right: 8px; }
    
    /* Botón MAS */
    .classic-btn { width: 22px; height: 22px; border: 1px solid #eee; background: ${botonBg}; color: ${botonTexto}; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
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
        {products.map((p, i) => (
          <div key={i} className="classic-item">
            <div style={{ flex: 1, paddingRight: 10 }}>
              <div className="classic-prod">{p.name}</div>
              <div className="classic-desc">{p.description}</div>
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