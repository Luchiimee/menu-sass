'use client';
import { useState } from 'react';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import CartFooter from "../CartFooter";

export default function HeladeriaSoft({ restaurant, products, onAddToCart, isMockup = false }: any) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [weight, setWeight] = useState('1/4 KG');

  const THEME = restaurant?.theme_color || '#00bcd4';

  return (
    <div className="flex flex-col h-full bg-[#f0faff] font-sans relative">
      <header className="p-4 bg-white border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{ backgroundColor: THEME }}>🍦</div>
          <div className="text-left">
            <span className="text-[10px] font-black uppercase text-gray-800 block leading-none">{restaurant?.name}</span>
            <span className="text-[6px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{restaurant?.description}</span>
          </div>
        </div>
        <div className="bg-green-500 text-white text-[6px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Abierto</div>
      </header>

      <div className="p-4 space-y-3">
        {products.map((p: any) => (
          <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm border border-cyan-50 flex justify-between items-center">
            <div className="text-left">
              <h4 className="text-[10px] font-black uppercase text-gray-900">{p.name}</h4>
              <p className="text-[10px] font-black" style={{ color: THEME }}>${p.price} <span className="text-[6px] text-gray-400">/ KG</span></p>
            </div>
            <button 
              onClick={() => setSelectedProduct(p)}
              className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase text-white shadow-md active:scale-95"
              style={{ backgroundColor: THEME }}
            >
              Elegir
            </button>
          </div>
        ))}
      </div>

      {/* MODAL HELADERÍA (PESO FIJO) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 text-left">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-black uppercase text-gray-900 leading-tight">{selectedProduct.name}</h2>
              <button onClick={() => setSelectedProduct(null)} className="p-1 bg-gray-100 rounded-full"><X size={16}/></button>
            </div>
            
            <p className="text-[7px] font-black uppercase text-gray-400 mb-2">Seleccionar tamaño:</p>
            <div className="grid grid-cols-3 gap-1.5 mb-6">
              {['1/4 KG', '1/2 KG', '1 KG'].map(size => (
                <button 
                  key={size}
                  onClick={() => setWeight(size)}
                  className={`py-2 rounded-xl text-[8px] font-black border-2 transition-all ${weight === size ? 'border-cyan-500 bg-cyan-50 text-cyan-600' : 'border-gray-100 text-gray-400'}`}
                >
                  {size}
                </button>
              ))}
            </div>

            <button 
              onClick={() => {
                onAddToCart({ ...selectedProduct, name: `${selectedProduct.name} (${weight})` }, 1);
                setSelectedProduct(null);
              }}
              className="w-full py-3 rounded-xl font-black uppercase text-[10px] text-white shadow-xl active:scale-95"
              style={{ backgroundColor: '#111827' }} // Botón blindado (Negro)
            >
              Agregar al carrito
            </button>
          </div>
        </div>
      )}

      {!isMockup && <CartFooter restaurant={restaurant} />}
    </div>
  );
}