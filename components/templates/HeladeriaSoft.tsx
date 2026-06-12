'use client';
import { useState } from 'react';
import { X, Check, Clock } from 'lucide-react';
import CartFooter from "../CartFooter";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

export default function HeladeriaSoft({ restaurant, products, onAddToCart, isOpen, isMockup = false, mesaLabel = null }: any) {
  const [selections, setSelections] = useState<{ [key: string]: number }>({});
  const [showClosedModal, setShowClosedModal] = useState(false);
  const THEME = restaurant?.theme_color || '#6366f1';
  const BG = restaurant?.bg_color || '#f8fafc';

  return (
    <div className="flex flex-col h-full font-sans relative min-h-screen" style={{ backgroundColor: BG }}>
      
      {/* HEADER DINÁMICO */}
      <header className="p-6 pt-10 bg-white border-b flex items-center sticky top-0 z-30 shadow-md relative">
        
        {/* BOTÓN ESTADO DINÁMICO (CORREGIDO) */}
        <div 
          className="absolute top-4 right-4 px-4 py-1.5 rounded-full font-black uppercase italic tracking-widest text-[9px] shadow-sm flex items-center gap-1.5 transition-colors duration-500"
          style={{
            backgroundColor: mesaLabel ? '#d97706' : isOpen ? '#10b981' : '#ef4444',
            color: 'white'
          }}
        >
          <div className={`w-1.5 h-1.5 rounded-full bg-white ${isOpen && !mesaLabel ? 'animate-pulse' : ''}`} />
          {mesaLabel ? `📍 ${mesaLabel}` : isOpen ? 'Abierto' : 'Cerrado'}
        </div>

        <div className="flex items-center gap-5">
          {/* LOGO */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-4xl shadow-md overflow-hidden bg-gray-50 flex-shrink-0 border-2 border-white" style={{ backgroundColor: THEME }}>
            {restaurant?.logo_url ? <img src={getOptimizedImageUrl(restaurant.logo_url, 150, 75, 150, 'cover')} className="w-full h-full object-cover" alt="Logo" /> : "✨"}
          </div>
          
          <div className="text-left leading-tight flex-1 pr-10">
            <span className="text-[18px] font-black uppercase text-gray-900 tracking-tighter block leading-none">{restaurant?.name || 'Mi Tienda'}</span>
            {restaurant?.description && <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mt-2 leading-relaxed opacity-80">{restaurant.description}</span>}
          </div>
        </div>
      </header>

      <div className="p-5 space-y-6 pb-32">
        {/* BANNER DE PROMOCIÓN */}
        {restaurant?.show_promo && restaurant?.promo_message && (
          <div 
            className="p-4 rounded-[1.5rem] text-[10px] font-black text-center border-2 border-dashed animate-in fade-in zoom-in duration-500 shadow-sm"
            style={{ 
              backgroundColor: restaurant.promo_bg_color || '#e0f7fa', 
              color: restaurant.promo_text_color || THEME,
              borderColor: THEME + '40'
            }}
          >
             {restaurant.promo_message}
          </div>
        )}

        {/* LISTADO DE PRODUCTOS (GENÉRICO) */}
        {products?.length > 0 ? (
          products.filter((p: any) => p && p.id).map((p: any) => {
            const isPeso = p.sale_type === 'peso';
            const variations = isPeso ? (p.variations || []) : [];
            const selectedIdx = selections[p.id] ?? 0;
            const displayPrice = variations[selectedIdx]?.price || p.price || 0;

            return (
              <div key={p.id} className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-cyan-900/5 border border-cyan-50 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-start mb-4 text-left">
                  <div className="flex-1 pr-2">
                    <h4 className="text-[15px] font-black uppercase text-gray-900 leading-tight">{p.name}</h4>
                    
                    {/* DESCRIPCIÓN DINÁMICA (REEMPLAZA A LOS SABORES) */}
                    {p.description && (
                      <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-tight italic">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black block leading-none" style={{ color: THEME }}>${displayPrice}</span>
                    <span className="text-[6px] text-gray-400 font-bold uppercase tracking-tighter">precio cargado</span>
                  </div>
                </div>

                <p className="text-[7px] font-black uppercase text-gray-300 mb-2 text-left tracking-widest">Seleccionar opción:</p>
                <div className="grid grid-cols-3 gap-1.5 mb-5">
                  {variations.length > 0 ? (
                    variations.map((v: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelections({ ...selections, [p.id]: idx })}
                        className={`py-2.5 rounded-xl text-[8px] font-black border-2 transition-all ${selectedIdx === idx ? 'scale-105 shadow-sm' : 'border-gray-100 text-gray-400'}`}
                        style={selectedIdx === idx ? { borderColor: THEME, backgroundColor: THEME + '10', color: THEME } : {}}
                      >
                        {v.label}
                      </button>
                    ))
                  ) : (
                    <div className="col-span-3 py-2 bg-gray-50 rounded-xl text-[8px] text-gray-400 font-bold uppercase text-center italic">Precio único</div>
                  )}
                </div>

               <button
  onClick={() => {
    if (!isOpen && !isMockup) {
      setShowClosedModal(true); // <--- Muestra el aviso si está cerrado
    } else {
      const itemToAdd = variations.length > 0 
        ? { ...p, id: `${p.id}-${selectedIdx}`, name: `${p.name} (${variations[selectedIdx].label})`, price: Number(variations[selectedIdx].price) }
        : { ...p };
      onAddToCart(itemToAdd, 1);
    }
  }}
  className="w-full py-4 rounded-[1.5rem] text-[10px] font-black uppercase text-white shadow-xl active:scale-95 transition-all"
  style={{ backgroundColor: THEME }}
>
  Agregar al pedido
</button>
              </div>
            )
          })
        ) : (
          <div className="text-center py-20 text-gray-400 text-xs font-bold uppercase tracking-widest italic">No hay productos en esta sección...</div>
        )}
      </div>

      {!isMockup && <CartFooter restaurant={restaurant} />}
      {/* --- MODAL DE AVISO: LOCAL CERRADO --- */}
      {showClosedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowClosedModal(false)} />
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
}