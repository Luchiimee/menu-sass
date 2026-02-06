import React from 'react';

export default function PopVibrant({ restaurant, products }: any) {
  const accent = restaurant.theme_color || '#FF1493';
  const bg = restaurant.bg_color || '#fffbe6';
  const cardBg = restaurant.card_color || '#ffffff';
  const text = restaurant.text_color || '#000000';
  const descColor = restaurant.description_color || '#444444';
  const promoBg = restaurant.promo_bg_color || '#FFD700';
  
  const showPromo = restaurant.show_promo !== false;
  const promoMessage = restaurant.promo_message || '⚡ 3x2 en todos los productos';

  const styles = `
    .pop-container { background: ${bg}; padding: 12px; font-family: 'Inter', sans-serif; height: 100%; display: flex; flex-direction: column; }
    .pop-header { display: flex; align-items: center; gap: 8px; margin-bottom: 15px; background: ${cardBg}; border: 2px solid ${text}; padding: 8px; border-radius: 10px; box-shadow: 3px 3px 0 ${text}; position: relative; flex-shrink: 0; }
    .pop-logo { width: 32px; height: 32px; background: ${accent}; border: 2px solid ${text}; border-radius: 50%; display: grid; place-items: center; font-weight: 900; color: white; font-size: 8px; background-size: cover; flex-shrink: 0; }
    .pop-title { font-weight: 900; font-size: 12px; text-transform: uppercase; color: ${text}; line-height: 1; }
    .pop-desc-local { font-size: 9px; font-weight: 600; color: ${descColor}; }
    .pop-status { background: #00CED1; color: black; border: 2px solid ${text}; font-size: 7px; font-weight: 900; padding: 2px 5px; transform: rotate(-5deg); position: absolute; top: -8px; right: -5px; }
    .pop-msg { background: ${promoBg}; border: 2px solid ${text}; padding: 6px; margin-bottom: 15px; font-weight: 700; font-size: 9px; text-align: center; box-shadow: 2px 2px 0 rgba(0,0,0,0.2); transform: rotate(1deg); flex-shrink: 0; }
    .pop-list { flex: 1; overflow-y: auto; padding: 4px; }
    .pop-item { background: ${cardBg}; border: 2px solid ${text}; border-radius: 10px; padding: 10px; margin-bottom: 12px; box-shadow: 4px 4px 0 ${accent}; transition: transform 0.1s; }
    .pop-item:hover { transform: translate(1px, 1px); box-shadow: 3px 3px 0 ${accent}; }
    .pop-item-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
    .pop-prod { font-weight: 900; font-size: 12px; text-transform: uppercase; color: ${accent}; }
    .pop-price { background: ${text}; color: #fff; padding: 2px 6px; font-size: 10px; font-weight: 700; border-radius: 4px; transform: rotate(2deg); }
    .pop-desc { font-size: 9px; color: ${descColor}; line-height: 1.2; margin-bottom: 10px; }
    .pop-btn { width: 100%; background: ${cardBg}; border: 2px solid ${accent}; color: ${accent}; padding: 5px; border-radius: 20px; font-weight: 900; font-size: 9px; text-transform: uppercase; text-align: center; cursor: pointer; }
    .pop-btn:hover { background: ${accent}; color: white; }
  `;

  return (
    <div className="pop-container">
      <style>{styles}</style>
      <div className="pop-header">
        <div className="pop-logo" style={{ backgroundImage: `url('${restaurant.logo_url || ''}')` }}>{!restaurant.logo_url && 'P!'}</div>
        <div><div className="pop-title">{restaurant.name || 'POP STORE'}</div><div className="pop-desc-local">{restaurant.description}</div></div>
        <div className="pop-status">OPEN</div>
      </div>
      {showPromo && <div className="pop-msg">{promoMessage}</div>}
      <div className="pop-list">
        {products.map((p: any, i: number) => (
          <div key={i} className="pop-item">
            <div className="pop-item-top"><div className="pop-prod">{p.name}</div><div className="pop-price">${p.price}</div></div>
            <div className="pop-desc">{p.description}</div>
            <button className="pop-btn">+ AGREGAR</button>
          </div>
        ))}
      </div>
    </div>
  );
}