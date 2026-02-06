import React from 'react';

export default function SpotlightHero({ restaurant, products }: any) {
  // 1. Definir variables con Fallbacks
  const accent = restaurant.theme_color || '#FFD700';
  // Si el usuario elige un color, lo usamos. Si no, usamos el default.
  const bg = restaurant.bg_color || '#ffffff';
  const text = restaurant.text_color || '#000000';
  const descColor = restaurant.description_color || '#666666';
  const promoBg = restaurant.promo_bg_color || '#fff8e1';
  const cardBg = restaurant.card_color || '#ffffff'; // Nuevo: Fondo de los items

  const showPromo = restaurant.show_promo !== false;
  const promoMessage = restaurant.promo_message || '¡Papas agrandadas GRATIS!';
  const showBanner = restaurant.show_banner !== false;
  
  const hasProducts = products && products.length > 0;
  const heroProduct = hasProducts ? products[0] : { name: 'Súper Doble XL', price: 8500, image_url: '' };
  const listProducts = hasProducts ? products.slice(1) : [];
  const bannerImage = restaurant.banner_url || heroProduct.image_url || 'https://placehold.co/600x400/333/fff?text=Banner';

  const formatPrice = (price: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

  // 2. CSS DINÁMICO (Inyectamos las variables ${bg}, ${text}, etc.)
  const styles = `
    .spot-container { 
        background: ${bg}; 
        font-family: 'Inter', sans-serif; 
        height: 100%; 
        display: flex; flex-direction: column; 
    }
    .spot-header { 
        padding: 12px 15px; display: flex; align-items: center; gap: 10px; 
        background: ${bg}; border-bottom: 1px solid rgba(0,0,0,0.05); flex-shrink: 0; 
    }
    .spot-logo { 
        width: 38px; height: 38px; background: #000; border-radius: 50%; 
        display: grid; place-items: center; color: white; font-size: 10px; 
        font-weight: bold; background-size: cover; background-position: center; flex-shrink: 0; 
    }
    .spot-brand-info { display: flex; flex-direction: column; justify-content: center; }
    .spot-brand { font-size: 14px; font-weight: 800; color: ${text}; line-height: 1.1; margin-bottom: 2px; text-transform: uppercase; }
    .spot-desc-local { font-size: 10px; color: ${descColor}; font-weight: 500; }
    
    .spot-status { margin-left: auto; background: #22c55e; color: white; font-size: 8px; font-weight: 700; padding: 3px 8px; border-radius: 12px; }

    .spot-banner { height: 180px; background-size: cover; background-position: center; position: relative; display: flex; flex-direction: column; justify-content: flex-end; padding: 15px; flex-shrink: 0; background-color: #eee; }
    .spot-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.8) 100%); }
    .spot-info { position: relative; z-index: 2; color: white; }
    
    .spot-badge { background: ${accent}; color: black; padding: 3px 8px; font-size: 9px; font-weight: 800; border-radius: 6px; display: inline-block; margin-bottom: 4px; text-transform: uppercase; }
    .spot-title { font-size: 22px; font-weight: 900; margin-bottom: 2px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); line-height: 1; }
    .spot-hero-price { font-size: 16px; font-weight: 700; color: ${accent}; text-shadow: 0 1px 2px black; }

    .spot-msg { padding: 10px 15px; background: ${promoBg}; color: ${text}; font-size: 10px; font-weight: 700; border-bottom: 1px solid rgba(0,0,0,0.05); flex-shrink: 0; display: flex; align-items: center; gap: 5px; }

    .spot-list { padding: 0; flex: 1; overflow-y: auto; background: ${bg}; }
    .spot-cat-title { padding: 15px 15px 5px; font-weight: 800; font-size: 12px; color: ${text}; text-transform: uppercase; letter-spacing: 0.5px; }
    .spot-item { display: flex; align-items: center; gap: 12px; padding: 12px 15px; border-bottom: 1px solid rgba(0,0,0,0.05); background: ${cardBg}; }
    .spot-thumb { width: 50px; height: 50px; background-size: cover; border-radius: 8px; background-color: #f0f0f0; flex-shrink: 0; }
    .spot-item-details { flex: 1; }
    .spot-item-name { font-weight: 700; font-size: 13px; color: ${text}; margin-bottom: 2px; }
    .spot-item-desc { font-size: 10px; color: ${descColor}; margin-bottom: 4px; line-height: 1.2; }
    .spot-item-price { font-weight: 700; font-size: 12px; color: ${text}; }
    
    .spot-btn { width: 26px; height: 26px; background: ${text}; color: ${bg}; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; transition: 0.2s; }
  `;

  return (
    <div className="spot-container">
      <style>{styles}</style>
      <div className="spot-header">
        <div className="spot-logo" style={{ backgroundImage: `url('${restaurant.logo_url || ''}')` }}>{!restaurant.logo_url && 'BK'}</div>
        <div className="spot-brand-info"><div className="spot-brand">{restaurant.name || 'Tu Marca'}</div><div className="spot-desc-local">{restaurant.description || 'Descripción'}</div></div>
        <div className="spot-status">ABIERTO</div>
      </div>
      {showBanner && (
        <div className="spot-banner" style={{ backgroundImage: `url('${bannerImage}')` }}>
            <div className="spot-overlay"></div>
            <div className="spot-info">
            <div className="spot-badge">DESTACADO</div>
            <div className="spot-title">{heroProduct.name}</div>
            <div className="spot-hero-price">{formatPrice(heroProduct.price)}</div>
            </div>
        </div>
      )}
      {showPromo && <div className="spot-msg">🍟 {promoMessage}</div>}
      <div className="spot-list">
        <div className="spot-cat-title">Populares</div>
        {listProducts.length > 0 ? listProducts.map((p: any, i: number) => (
          <div key={i} className="spot-item">
            <div className="spot-thumb" style={{ backgroundImage: `url('${p.image_url || 'https://placehold.co/100'}')` }}></div>
            <div className="spot-item-details"><div className="spot-item-name">{p.name}</div><div className="spot-item-desc">{p.description}</div><div className="spot-item-price">{formatPrice(p.price)}</div></div>
            <button className="spot-btn">+</button>
          </div>
        )) : <div className="p-4 text-center text-gray-400 text-xs">Agrega productos.</div>}
      </div>
    </div>
  );
}