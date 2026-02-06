import React from 'react';

const STYLES = `
  .bistro-container { background: #222; color: #eee; padding: 12px; font-family: 'Patrick Hand', cursive; height: 100%; display: flex; flex-direction: column; }
  .bistro-border { border: 2px dashed #555; height: 100%; padding: 10px; border-radius: 8px; display: flex; flex-direction: column; }
  .bistro-header { text-align: center; margin-bottom: 15px; flex-shrink: 0; }
  .bistro-logo { width: 36px; height: 36px; margin: 0 auto 5px; border: 2px solid #e6c87e; border-radius: 50%; display: grid; place-items: center; color: #e6c87e; font-size: 14px; background-size: cover; }
  .bistro-title { font-size: 16px; color: #e6c87e; margin-bottom: 2px; }
  .bistro-sub { font-size: 10px; color: #aaa; }
  .bistro-msg { border: 1px dotted #aaa; background: rgba(255,255,255,0.05); padding: 8px; margin-bottom: 20px; text-align: center; font-size: 10px; color: #fff; flex-shrink: 0; }
  .bistro-list { flex: 1; overflow-y: auto; padding-right: 5px; }
  .bistro-item { margin-bottom: 12px; }
  .bistro-row { display: flex; justify-content: space-between; align-items: baseline; }
  .bistro-name { font-size: 12px; color: #fff; }
  .bistro-dots { flex: 1; border-bottom: 1px dotted #555; margin: 0 4px; }
  .bistro-price { font-size: 12px; color: #e6c87e; }
  .bistro-desc { font-size: 9px; color: #999; margin-top: 2px; }
`;

export default function BistroChalk({ restaurant, products }: any) {
  const showPromo = restaurant?.show_promo !== false;
  const promoMessage = restaurant?.promo_message || '🍷 2x1 en Vermut hasta las 20hs';

  return (
    <div className="bistro-container">
      <style>{STYLES}</style>
      <div className="bistro-border">
        <div className="bistro-header">
          <div className="bistro-logo" style={{ backgroundImage: `url('${restaurant.logo_url || ''}')` }}>{!restaurant.logo_url && 'EB'}</div>
          <div className="bistro-title">{restaurant.name || 'El Bodegón'}</div>
          <div className="bistro-sub">{restaurant.description}</div>
        </div>

        {showPromo && <div className="bistro-msg">{promoMessage}</div>}

        <div className="bistro-list">
          {products.map((p: any, i: number) => (
            <div key={i} className="bistro-item">
              <div className="bistro-row">
                <div className="bistro-name">{p.name}</div>
                <div className="bistro-dots"></div>
                <div className="bistro-price">${p.price}</div>
              </div>
              <div className="bistro-desc">{p.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}