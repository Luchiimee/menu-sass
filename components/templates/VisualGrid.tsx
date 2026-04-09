import React, { useState } from 'react';
import { X } from 'lucide-react'; // Importamos la X para cerrar el detalle

export default function VisualGrid({ restaurant, products }: any) {
  // --- ESTADO PARA SABER CUÁL ESTÁ ABIERTO (Como en el video) ---
  const [activeId, setActiveId] = useState<any>(null);

  // --- 1. IDENTIDAD DEL LOCAL ---
  const BG_WEB = restaurant.bg_color || '#1a1a1a';
  const L_NAME = restaurant.text_color || '#ffffff';
  const L_DESC = restaurant.description_color || '#bbbbbb';
  const ACENTO = restaurant.theme_color || '#ea580c';

  // --- 2. CARTA DE PRODUCTOS ---
  const CARD_BG = restaurant.card_color || '#2a2a2a';
  const P_NAME = restaurant.card_name_color || '#ffffff';
  const P_PRICE = restaurant.card_price_color || ACENTO;
  const BTN_BG = restaurant.card_btn_bg || ACENTO;
  const BTN_TXT = restaurant.card_btn_text || '#ffffff';

  // --- 3. OFERTAS Y BANNERS (PROMO) ---
  const PROMO_BG = restaurant.promo_bg_color || 'transparent'; 
  const PROMO_TXT = restaurant.promo_text_color || '#ffffff';

  return (
    <div style={{ 
      background: BG_WEB, height: '100%', display: 'flex', flexDirection: 'column', 
      padding: '12px', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textAlign: 'left' 
    }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '50%', 
            backgroundImage: `url('${restaurant.logo_url || ""}')`, 
            backgroundSize: 'cover', backgroundPosition: 'center',
            border: `2px solid ${ACENTO}`, backgroundColor: '#333', flexShrink: 0 
          }}></div>
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: '900', margin: 0, color: L_NAME, lineHeight: 1.1, textTransform: 'uppercase' }}>
                {restaurant.name || 'MI NEGOCIO'}
            </h4>
            <span style={{ fontSize: '7px', color: L_DESC, display: 'block', marginTop: '2px' }}>
                {restaurant.description || 'Menú Digital'}
            </span>
          </div>
        </div>
        <div style={{ fontSize: '6px', fontWeight: '900', background: '#22c55e', color: 'black', padding: '2px 6px', borderRadius: '4px' }}>OPEN</div>
      </div>

      {/* BANNER PROMO */}
    {/* BANNER PROMO ACTUALIZADO */}
      {restaurant.show_promo && (
        <div style={{ 
          background: PROMO_BG === 'transparent' ? '#1E1E1E' : PROMO_BG, // Si es transparente, forzamos el gris oscuro
          color: PROMO_TXT,
          fontSize: '9px', 
          marginBottom: '18px', // Más espacio con los productos
          marginTop: '5px',
          marginLeft: '4px',
          marginRight: '4px',
          borderLeft: `4px solid ${ACENTO}`, 
          padding: '10px 14px', 
          fontWeight: '700', 
          flexShrink: 0,
          borderRadius: '12px', // <--- REDONDEADO
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)', // <--- SOMBRA PARA QUE RESALTE
          display: 'flex',
          alignItems: 'center'
        }}>
          {restaurant.promo_message || 'Happy Hour: 2x1 en Rolls'}
        </div>
      )}

      {/* GRILLA DE 2 COLUMNAS INTERACTIVA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1, overflowY: 'auto' }} className="no-scrollbar">
        {products.map((p: any, i: number) => {
          const isActive = activeId === p.id;
          
        return (
            <div 
              key={i} 
              onClick={() => setActiveId(isActive ? null : p.id)}
              style={{ 
                aspectRatio: '1 / 1.2', borderRadius: '15px', position: 'relative', overflow: 'hidden',
                backgroundColor: CARD_BG,
                transition: 'all 0.3s ease',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              {/* --- FONDO: IMAGEN O VIDEO --- */}
          <div style={{ 
    position: 'absolute', 
    inset: 0,
    filter: isActive ? 'brightness(0.3) blur(4px)' : 'none', // Movimos el filtro acá
    transition: 'all 0.5s ease' // Movimos la transición acá
}}>
  {p.video_url ? (
    <video 
      src={p.video_url} 
      autoPlay 
      loop 
      muted 
      playsInline 
      preload="auto"
      style={{ 
        width: '100%', 
        height: '100%', 
        objectFit: 'cover'
      }} 
    />
  ) : (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      backgroundImage: `url('${p.image_url || 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=200'}')`,
      backgroundSize: 'cover', 
      backgroundPosition: 'center'
    }} />
  )}
</div>
              {/* --- 1. MODO EXPANDIDO (Al tocar, como en el video) --- */}
              {isActive ? (
                <div style={{ 
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', 
                  display: 'flex', flexDirection: 'column', padding: '10px', 
                  justifyContent: 'center', alignItems: 'center', textAlign: 'center',
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <div style={{ position: 'absolute', top: 8, right: 8, color: 'white', opacity: 0.6 }}><X size={14}/></div>
                  
                  <div style={{ fontWeight: '900', fontSize: '11px', color: 'white', marginBottom: '4px', textTransform: 'uppercase' }}>{p.name}</div>
                  <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', lineHeight: 1.2 }}>{p.description || 'Sin descripción'}</div>
                  <div style={{ color: P_PRICE, fontSize: '11px', fontWeight: '900', marginBottom: '10px' }}>${p.price}</div>
                  
                  {/* BOTÓN LARGO Y CENTRADO (MOCKUP) */}
                  <div style={{ 
                    width: '100%', background: BTN_BG, color: BTN_TXT, 
                    padding: '6px 0', borderRadius: '10px', fontSize: '8px', 
                    fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>
                    Sumar al pedido
                  </div>
                </div>
              ) : (
                /* --- 2. MODO NORMAL (Grilla simple) --- */
                <>
                  {/* Botón flotante chiquito + (como el de tu diseño) */}
                  <div style={{ 
                    position: 'absolute', top: '8px', right: '8px', width: '18px', height: '18px', 
                    background: BTN_BG, color: BTN_TXT, 
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.4)', zIndex: 10
                  }}>+</div>

                  <div style={{ 
                    position: 'absolute', inset: 0, 
                    background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 60%)', 
                    padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
                  }}>
                    <div style={{ fontWeight: '800', fontSize: '10px', color: P_NAME, textShadow: '0 1px 2px black', lineHeight: 1.1 }}>{p.name}</div>
                    <div style={{ color: P_PRICE, fontSize: '10px', fontWeight: '900', textShadow: '0 1px 2px black', marginTop: '2px' }}>${p.price}</div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}