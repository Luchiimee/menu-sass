import React from 'react';
import { Utensils } from 'lucide-react';

const STYLES = `
  .elegant-container { background: #f9f5f0; padding: 15px; font-family: 'Playfair Display', serif; color: #333; text-align: center; height: 100%; display: flex; flex-direction: column; }
  .elegant-header { margin-bottom: 15px; flex-shrink: 0; }
  .elegant-logo { width: 32px; height: 32px; margin: 0 auto 5px; border: 1px solid #D4AF37; border-radius: 50%; display: grid; place-items: center; color: #D4AF37; background-size: cover; }
  .elegant-title { font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .elegant-sub { font-size: 8px; font-style: italic; color: #777; font-family: 'Inter', sans-serif; }
  .elegant-msg { background: #f0e8dc; border: 1px solid #e0d0b8; padding: 8px; font-size: 9px; color: #5c4b30; margin: 10px 0; font-style: italic; flex-shrink: 0; }
  .elegant-list { text-align: left; flex: 1; overflow-y: auto; padding-right: 5px; }
  .elegant-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eaddc5; }
  .elegant-prod { font-weight: 700; font-size: 11px; }
  .elegant-desc { font-size: 8px; font-style: italic; color: #888; margin-top: 2px; }
  .elegant-price { color: #D4AF37; font-weight: 700; font-size: 10px; }
  .elegant-btn { width: 24px; height: 24px; background: #D4AF37; color: white; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 14px; }
`;

export default function ElegantSerif({ restaurant, products }: any) {
  const showPromo = restaurant?.show_promo !== false;
  const promoMessage = restaurant?.promo_message || '"Sugerencia del Chef: Maridaje de quesos."';

  return (
    <div className="elegant-container">
      <style>{STYLES}</style>
      <div className="elegant-header">
        <div className="elegant-logo" style={{ backgroundImage: `url('${restaurant.logo_url || ''}')` }}>{!restaurant.logo_url && <Utensils size={14}/>}</div>
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
            <div style={{textAlign:'right'}}>
               <div className="elegant-price">${p.price}</div>
            </div>
            <button className="elegant-btn">+</button>
          </div>
        ))}
      </div>
    </div>
  );
}