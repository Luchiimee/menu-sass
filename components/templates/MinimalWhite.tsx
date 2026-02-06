import React from 'react';
import { Coffee } from 'lucide-react';

export default function MinimalWhite({ restaurant, products }: any) {
  const bg = restaurant.bg_color || '#ffffff';
  const text = restaurant.text_color || '#222222';
  const descColor = restaurant.description_color || '#999999';
  const accent = restaurant.theme_color || '#000000';
  const promoBg = restaurant.promo_bg_color || '#fafafa';
  
  const showPromo = restaurant.show_promo !== false;
  const promoMessage = restaurant.promo_message || 'TAKE AWAY: 10% OFF';

  const styles = `
    .minimal-container { background: ${bg}; padding: 15px 10px; text-align: center; font-family: 'Lato', sans-serif; color: ${text}; height: 100%; display: flex; flex-direction: column; }
    .minimal-header { margin-bottom: 15px; position: relative; flex-shrink: 0; }
    .minimal-logo { width: 34px; height: 34px; background: ${accent}; color: ${bg}; border-radius: 50%; margin: 0 auto 6px; display: grid; place-items: center; background-size: cover; }
    .minimal-title { font-weight: 900; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${text}; }
    .minimal-desc { font-size: 8px; color: ${descColor}; margin-top: 2px; }
    .minimal-status { position: absolute; top: 0; right: 5px; font-size: 6px; font-weight: bold; text-transform: uppercase; border: 1px solid ${text}; color: ${text}; padding: 1px 3px; border-radius: 2px; }
    .minimal-msg { border: 1px solid rgba(0,0,0,0.05); background: ${promoBg}; padding: 6px; font-size: 7px; margin: 10px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: ${text}; flex-shrink: 0; }
    .minimal-list { text-align: left; flex: 1; overflow-y: auto; }
    .minimal-item { padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; }
    .minimal-prod { font-weight: 700; font-size: 10px; color: ${text}; }
    .minimal-prod-desc { font-size: 8px; color: ${descColor}; margin-top: 1px; }
    .minimal-price { font-weight: 900; font-size: 10px; color: ${text}; }
    .minimal-btn { width: 18px; height: 18px; background: ${accent}; color: ${bg}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; border: none; cursor: pointer; }
  `;

  return (
    <div className="minimal-container">
      <style>{styles}</style>
      <div className="minimal-header">
        <div className="minimal-status">Abierto</div>
        <div className="minimal-logo" style={{ backgroundImage: `url('${restaurant.logo_url || ''}')` }}>{!restaurant.logo_url && <Coffee size={14}/>}</div>
        <div className="minimal-title">{restaurant.name}</div>
        <div className="minimal-desc">{restaurant.description}</div>
      </div>
      {showPromo && <div className="minimal-msg">{promoMessage}</div>}
      <div className="minimal-list">
        {products.map((p: any, i: number) => (
          <div key={i} className="minimal-item">
            <div>
              <div className="minimal-prod">{p.name}</div>
              <div className="minimal-prod-desc">{p.description}</div>
              <div className="minimal-price">${p.price}</div>
            </div>
            <button className="minimal-btn">+</button>
          </div>
        ))}
      </div>
    </div>
  );
}