import React, { useState } from 'react'; 
import { Clock } from 'lucide-react';

interface Props { 
  restaurant: any; 
  products: any[]; 
  isOpen: boolean; 
  onAddToCart: any; 
  isMockup?: boolean;
}

const ClassicDelivery: React.FC<Props> = ({ restaurant, products, isOpen, onAddToCart, isMockup = false }) => {
  // --- ESTADO (Ahora dentro de la función) ---
  const [showClosedModal, setShowClosedModal] = useState(false);

  // --- VARIABLES PURAS ---
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
    .classic-status { position: absolute; top: 12px; right: 12px; font-size: 7px; padding: 3px 6px; border-radius: 4px; font-weight: 900; text-transform: uppercase; }
    
    .classic-msg { background: ${promoBg}; color: ${promoText}; font-size: 10px; padding: 8px; text-align: center; font-weight: 700; border-bottom: 1px solid rgba(0,0,0,0.03); }
    
    .classic-item { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 12px 15px; align-items: center; background: ${cardBg}; }
    .classic-prod-name { font-weight: 800; font-size: 12px; color: ${prodName}; margin-bottom: 2px; text-align: left; }
    .classic-prod-desc { font-size: 9px; color: ${prodDesc}; line-height: 1.2; text-align: left; opacity: 0.8; }
    .classic-price { font-weight: 900; font-size: 12px; color: ${prodPrice}; margin-right: 10px; }
    
    .classic-btn { width: 24px; height: 24px; background: ${btnBg}; color: ${btnText}; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); cursor: pointer; }
  `;

  return (
    <div className="classic-container">
      <style>{styles}</style>
      <div className="classic-header">
        <div 
          className="classic-status"
          style={{ 
            backgroundColor: isOpen ? 'white' : '#fef2f2', 
            color: isOpen ? headerBg : '#ef4444',
            border: isOpen ? 'none' : '1px solid #fecaca'
          }}
        >
          {isOpen ? "ABIERTO" : "CERRADO"}
        </div>
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
              <button 
                className="classic-btn"
                onClick={() => {
                  if (!isOpen && !isMockup) {
                    setShowClosedModal(true);
                  } else {
                    onAddToCart(p);
                  }
                }}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL DE AVISO: LOCAL CERRADO --- */}
      {showClosedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowClosedModal(false)} />
          <div className="bg-white w-full max-w-xs p-8 rounded-[2.5rem] shadow-2xl text-center relative animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Clock size={32} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">Local Cerrado</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-widest leading-relaxed">
              ¡Hola! Actualmente estamos fuera de nuestro horario de atención.
            </p>
            <button 
              onClick={() => setShowClosedModal(false)}
              className="mt-6 w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg active:scale-95 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassicDelivery;