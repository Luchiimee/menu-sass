import React from 'react';

export default function VisualGrid({ restaurant, products }: any) {
  const bg = restaurant.bg_color || '#1a1a1a';
  const cardBg = restaurant.card_color || '#2a2a2a';
  const accent = restaurant.theme_color || '#ea580c';
  const text = restaurant.text_color || '#ffffff';
  const desc = restaurant.description_color || '#bbbbbb';
  const showPromo = restaurant.show_promo !== false;
  const promoMessage = restaurant.promo_message || '🍣 Happy Hour: 2x1 en Rolls';

  const styles = `
    .sushi-visual { background: ${bg}; color: ${text}; padding: 12px; font-family: 'Inter', sans-serif; height: 100%; display: flex; flex-direction: column; }
    .sushi-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-shrink: 0; }
    .sushi-brand { display: flex; align-items: center; gap: 8px; }
    .sushi-logo { width: 34px; height: 34px; border-radius: 50%; background-size: cover; border: 2px solid ${accent}; flex-shrink: 0; background-color: #333; }
    .sushi-info-col { display: flex; flex-direction: column; justify-content: center; }
    .sushi-name { font-size: 12px; font-weight: 800; line-height: 1.2; color: ${text}; }
    .sushi-desc-local { font-size: 8px; color: ${desc}; }
    .sushi-status { font-size: 7px; font-weight: bold; background: #22c55e; color: black; padding: 2px 5px; border-radius: 4px; margin-top: 2px; }
    .sushi-msg { font-size: 9px; color: ${desc}; margin-bottom: 12px; border-left: 2px solid ${accent}; padding-left: 6px; flex-shrink: 0; }
    .sushi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; flex: 1; overflow-y: auto; padding-bottom: 10px; }
    .sushi-item { height: 120px; border-radius: 10px; position: relative; overflow: hidden; background-size: cover; background-position: center; cursor: pointer; background-color: ${cardBg}; }
    .sushi-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 45%; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); padding: 8px; display: flex; flex-direction: column; justify-content: flex-end; transition: all 0.3s ease; }
    .sushi-title { font-weight: bold; font-size: 10px; text-shadow: 0 1px 2px black; margin-bottom: 2px; color: white; }
    .sushi-price { color: ${accent}; font-size: 10px; font-weight: bold; text-shadow: 0 1px 2px black; }
    .sushi-desc { font-size: 8px; color: #ddd; margin: 4px 0; display: none; text-align: center; line-height: 1.2; }
    .sushi-btn { background: ${accent}; color: white; border: none; padding: 4px 12px; border-radius: 12px; font-size: 8px; font-weight: bold; margin-top: 4px; display: none; align-self: center; }
    .sushi-item:hover .sushi-overlay { height: 100%; background: rgba(0,0,0,0.85); justify-content: center; align-items: center; }
    .sushi-item:hover .sushi-desc, .sushi-item:hover .sushi-btn { display: block; }
  `;

  return (
    <div className="sushi-visual">
      <style>{styles}</style>
      <div className="sushi-header">
        <div className="sushi-brand"><div className="sushi-logo" style={{ backgroundImage: `url('${restaurant.logo_url || ''}')` }}></div><div className="sushi-info-col"><div className="sushi-name">{restaurant.name}</div><div className="sushi-desc-local">{restaurant.description}</div></div></div><div className="sushi-status">ABIERTO</div>
      </div>
      {showPromo && <div className="sushi-msg">{promoMessage}</div>}
      <div className="sushi-grid">
        {products.map((p: any, i: number) => (
          <div key={i} className="sushi-item" style={{ backgroundImage: `url('${p.image_url || 'https://placehold.co/200'}' )` }}>
             <div className="sushi-overlay"><div className="sushi-title">{p.name}</div><div className="sushi-price">${p.price}</div><div className="sushi-desc">{p.description}</div><button className="sushi-btn">AGREGAR</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}