import React from 'react';

export default function SpotlightHero({ restaurant, products }: any) {
 const accent = restaurant.theme_color || '#FFD700';
  const bg = restaurant.bg_color || '#ffffff';
  const text = restaurant.text_color || '#000000';
  const descColor = restaurant.description_color || '#666666';
  const cardBg = restaurant.card_color || '#ffffff';

  // --- VARIABLES PARA LA LISTA (LAS QUE FALTABAN) ---
  const pName = restaurant.card_name_color || text;
  const prodDesc = restaurant.card_desc_color || descColor; // <--- AQUÍ ESTÁ EL FIX
  const pPrice = restaurant.card_price_color || text;
  const btnBg = restaurant.card_btn_bg || '#000000';
  const btnText = restaurant.card_btn_text || '#ffffff';

  // Variables del Hero (Banner)
  const hBadgeBg = restaurant.hero_badge_bg || accent;
  const hBadgeColor = restaurant.hero_badge_color || '#000000';
  const hTitleColor = restaurant.hero_title_color || '#ffffff';
  const hPriceColor = restaurant.hero_price_color || accent;

  const promoBg = restaurant.promo_bg_color || '#fff8e1';
  const promoText = restaurant.promo_text_color || text;
  const showPromo = restaurant.show_promo !== false;
  const promoMessage = restaurant.promo_message || '¡Papas agrandadas GRATIS!';
  const showBanner = restaurant.show_banner !== false;
  
  const hasProducts = products && products.length > 0;
  const heroTitle = restaurant.hero_title || (hasProducts ? products[0].name : 'Plato del día');
  const heroPrice = restaurant.hero_price || (hasProducts ? products[0].price : 0);
  const heroBadge = restaurant.hero_badge_text || 'DESTACADO';
  const bannerImage = restaurant.banner_url || (hasProducts ? products[0].image_url : 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600');

  const formatPrice = (price: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

  const styles = `
    .spot-container { background: ${bg}; font-family: 'Inter', sans-serif; height: 100%; display: flex; flex-direction: column; text-align: left; }
    .spot-header { padding: 12px 15px; display: flex; align-items: center; gap: 10px; background: ${bg}; border-bottom: 1px solid rgba(0,0,0,0.05); flex-shrink: 0; }
    .spot-logo { width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.1); background-size: cover; background-position: center; flex-shrink: 0; background-color: #000; }
    .spot-brand { font-size: 14px; font-weight: 800; color: ${text}; line-height: 1.1; text-transform: uppercase; }
    .spot-desc-local { font-size: 10px; color: ${descColor}; }
    .spot-status { margin-left: auto; background: #22c55e; color: white; font-size: 8px; font-weight: 700; padding: 3px 8px; border-radius: 12px; }

    .spot-banner { height: 180px; background-size: cover; background-position: center; position: relative; display: flex; flex-direction: column; justify-content: flex-end; padding: 15px; flex-shrink: 0; }
    .spot-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.8) 100%); }
    .spot-info { position: relative; z-index: 2; }
    
    .spot-badge { background: ${hBadgeBg}; color: ${hBadgeColor}; padding: 3px 8px; font-size: 9px; font-weight: 800; border-radius: 6px; display: inline-block; margin-bottom: 4px; text-transform: uppercase; }
    .spot-title { font-size: 22px; font-weight: 900; color: ${hTitleColor}; margin-bottom: 2px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); line-height: 1; text-transform: uppercase; font-style: italic; }
    .spot-hero-price { font-size: 16px; font-weight: 700; color: ${hPriceColor}; text-shadow: 0 1px 2px black; }

    .spot-hero-btn { position: absolute; bottom: 15px; right: 15px; width: 32px; height: 32px; background: white; color: black; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 10; border: none; }

    .spot-msg { padding: 10px 15px; background: ${promoBg}; color: ${promoText}; font-size: 10px; font-weight: 700; border-bottom: 1px solid rgba(0,0,0,0.05); flex-shrink: 0; }
    
    .spot-list { flex: 1; overflow-y: auto; }
    .spot-item { display: flex; align-items: center; gap: 12px; padding: 12px 15px; border-bottom: 1px solid rgba(0,0,0,0.05); background: ${cardBg}; }
    .spot-thumb { width: 50px; height: 50px; background-size: cover; border-radius: 8px; background-color: #f0f0f0; flex-shrink: 0; }
    .spot-item-name { font-weight: 700; font-size: 13px; color: ${pName}; margin-bottom: 2px; }
    .spot-item-desc { font-size: 10px; color: ${prodDesc}; margin-bottom: 4px; line-height: 1.2; }
    .spot-item-price { font-weight: 800; font-size: 12px; color: ${pPrice}; }
    .spot-btn { width: 26px; height: 26px; background: ${btnBg}; color: ${btnText}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: none; }
  `;

  return (
    <div className="spot-container">
      <style>{styles}</style>
      <div className="spot-header">
        <div className="spot-logo" style={restaurant.logo_url ? { backgroundImage: `url('${restaurant.logo_url}')` } : {}}></div>
        <div className="spot-brand-info">
          <div className="spot-brand">{restaurant.name || 'Tu Marca'}</div>
          <div className="spot-desc-local">{restaurant.description || 'Descripción'}</div>
        </div>
        <div className="spot-status">ABIERTO</div>
      </div>
      
      {showBanner && (
        <div className="spot-banner" style={{ backgroundImage: `url('${bannerImage}')` }}>
            <div className="spot-overlay"></div>
            <div className="spot-info">
              <div className="spot-badge">{heroBadge}</div>
              <div className="spot-title">{heroTitle}</div>
              <div className="spot-hero-price">{formatPrice(heroPrice)}</div>
            </div>
            <button className="spot-hero-btn">+</button>
        </div>
      )}

      {showPromo && <div className="spot-msg">{promoMessage}</div>}
      
      <div className="spot-list no-scrollbar">
        {hasProducts ? products.map((p: any, i: number) => (
          <div key={i} className="spot-item">
            <div className="spot-thumb" style={{ backgroundImage: `url('${p.image_url || 'https://placehold.co/100'}')` }}></div>
            <div className="spot-item-details">
              <div className="spot-item-name">{p.name}</div>
              <div className="spot-item-desc">{p.description}</div>
              <div className="spot-item-price">{formatPrice(p.price)}</div>
            </div>
            <button className="spot-btn">+</button>
          </div>
        )) : <div className="p-10 text-center opacity-30 text-xs">Cargá productos para ver la lista</div>}
      </div>
    </div>
  );
}