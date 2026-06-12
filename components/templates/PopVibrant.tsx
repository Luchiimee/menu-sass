import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getProductDisplayPrice } from '@/lib/productPricing';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

export default function PopVibrant({ restaurant, products }: any) {
  const [activeId, setActiveId] = useState<any>(null);

  // --- IDENTIDAD DEL LOCAL ---
  const BG_WEB = restaurant.bg_color || '#fffbe6';
  const L_NAME = restaurant.text_color || '#000000'; 
  const L_DESC = restaurant.description_color || '#444444';
  const THEME_ACENTO = restaurant.theme_color || '#FF1493'; 

  // --- CARTA DE PRODUCTOS ---
  const CARD_BG = restaurant.card_color || '#ffffff';
  const P_NAME = restaurant.card_name_color || '#000000';
  const P_DESC = restaurant.card_desc_color || '#444444';
  const P_PRICE_BG = restaurant.card_price_color || '#000000'; 
  const SHADOW_COLOR = restaurant.card_shadow_color || '#000000'; // EL NUEVO BOTÓN AZUL
  
  const BTN_BG = restaurant.card_btn_bg || '#ffffff';
  const BTN_TXT = restaurant.card_btn_text || '#FF1493';

  // --- PROMOS ---
  const PROMO_BG = restaurant.promo_bg_color || '#FFD700';
  const PROMO_TXT = restaurant.promo_text_color || '#000000';

  return (
    /* AGREGAMOS PADDING LATERAL DE 18px PARA QUE NO SE CORTE LA SOMBRA */
    <div style={{ background: BG_WEB, height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 18px', fontFamily: 'Inter, sans-serif', overflowX: 'hidden', textAlign: 'left' }}>
      
      {/* HEADER: El borde y la sombra usan SHADOW_COLOR */}
      <div style={{ 
        background: CARD_BG, border: `2px solid ${SHADOW_COLOR}`, padding: '8px', borderRadius: '10px', 
        boxShadow: `3px 3px 0 ${SHADOW_COLOR}`, position: 'relative', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px'
      }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${SHADOW_COLOR}`, backgroundImage: `url('${getOptimizedImageUrl(restaurant.logo_url, 150, 75, 150, 'cover') || ""}')`, backgroundSize: 'cover', backgroundColor: THEME_ACENTO, flexShrink: 0 }}></div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 900, color: L_NAME, textTransform: 'uppercase', lineHeight: 1.1 }}>{restaurant.name || 'POP STORE'}</div>
          <div style={{ fontSize: '8px', fontWeight: 600, color: L_DESC }}>{restaurant.description}</div>
        </div>
        <div style={{ position: 'absolute', top: '-8px', right: '-5px', background: '#00CED1', border: `2px solid ${SHADOW_COLOR}`, padding: '2px 5px', fontSize: '7px', fontWeight: 900, transform: 'rotate(-5deg)' }}>OPEN</div>
      </div>

      {/* PROMO */}
      {restaurant.show_promo && (
        <div style={{ background: PROMO_BG, color: PROMO_TXT, border: `2px solid ${SHADOW_COLOR}`, padding: '6px', marginBottom: '15px', fontWeight: 700, fontSize: '9px', textAlign: 'center', boxShadow: '2px 2px 0 rgba(0,0,0,0.1)', transform: 'rotate(1deg)' }}>
          {restaurant.promo_message || '⚡ 3x2 en todos los productos'}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }} className="no-scrollbar">
        {products.map((p: any, i: number) => {
          const isExpanded = activeId === i;
          const { amount: displayPrice, isFrom } = getProductDisplayPrice(p);
          const priceLabel = isFrom ? `Desde $${displayPrice}` : `$${displayPrice}`;
          return (
            <div key={i} onClick={() => setActiveId(isExpanded ? null : i)} style={{ 
              background: CARD_BG, 
              border: `2px solid ${SHADOW_COLOR}`, 
              borderRadius: '10px', 
              padding: '10px', 
              marginBottom: '12px', 
              /* CORRECCIÓN: La sombra ahora usa SHADOW_COLOR */
              boxShadow: `4px 4px 0 ${SHADOW_COLOR}`, 
              transition: 'all 0.1s',
              position: 'relative'
            }}>
              {isExpanded ? (
                <div style={{ animation: 'popIn 0.2s ease', textAlign: 'center' }}>
                   <div style={{ fontWeight: 900, fontSize: '13px', color: P_NAME, textTransform: 'uppercase', marginBottom: '5px' }}>{p.name}</div>
                   <div style={{ fontSize: '9px', color: P_DESC, marginBottom: '10px' }}>{p.description}</div>
                   <div style={{ background: P_PRICE_BG, color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, width: 'fit-content', margin: '0 auto 10px', transform: 'rotate(2deg)' }}>{priceLabel}</div>
                   <button style={{ width: '100%', background: BTN_BG, border: `2px solid ${BTN_TXT}`, color: BTN_TXT, padding: '6px', borderRadius: '20px', fontWeight: 900, fontSize: '9px' }}>SUMAR AL PEDIDO</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                    <div style={{ fontWeight: 900, fontSize: '12px', color: P_NAME, textTransform: 'uppercase', flex: 1 }}>{p.name}</div>
                    <div style={{ background: P_PRICE_BG, color: '#fff', padding: '2px 6px', fontSize: '10px', fontWeight: 700, borderRadius: '4px', transform: 'rotate(2deg)', flexShrink: 0 }}>{priceLabel}</div>
                  </div>
                  <div style={{ fontSize: '9px', color: P_DESC }}>{p.description}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}