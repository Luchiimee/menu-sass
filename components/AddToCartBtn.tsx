'use client';

import { useCart } from '@/context/CartContext';
import { Plus, Minus } from 'lucide-react';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
}

// 1. DEFINIMOS LA INTERFAZ CORRECTAMENTE
interface AddToCartBtnProps {
  product: Product;
  variant?: 'icon' | 'full'; 
  isDark?: boolean;
  disabled?: boolean; // <--- ESTA ES LA CLAVE
}

export default function AddToCartBtn({ product, variant = 'icon', isDark = false, disabled = false }: AddToCartBtnProps) {
  const { cart, addToCart, removeFromCart } = useCart();
  const [isAnimating, setIsAnimating] = useState(false);

  const itemInCart = cart.find((item) => item.id === product.id);
  const quantity = itemInCart ? itemInCart.quantity : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (disabled) return; // SI ESTÁ DESHABILITADO, NO HACE NADA

    addToCart(product);
    if (navigator.vibrate) navigator.vibrate(50);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    
    removeFromCart(product.id);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const disabledStyle = disabled ? 'opacity-40 grayscale cursor-not-allowed pointer-events-none' : '';

  if (quantity === 0) {
    if (variant === 'full') {
      return (
        <button 
          onClick={handleAdd}
          disabled={disabled}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs shadow-sm transition-transform active:scale-95
            ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}
            ${disabledStyle}
          `}
        >
          <Plus size={14} /> {disabled ? 'Cerrado' : 'Agregar'}
        </button>
      );
    }

    return (
      <button 
        onClick={handleAdd}
        disabled={disabled}
        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95
            ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}
            ${disabledStyle}
        `}
      >
        <Plus size={16} />
      </button>
    );
  }

  return (
    <div 
      className={`flex items-center gap-3 rounded-full px-2 py-1 shadow-md font-bold text-sm animate-in zoom-in duration-200
        ${isDark ? 'bg-white text-black' : 'bg-black text-white'}
        ${isAnimating ? 'scale-105' : 'scale-100'}
        ${disabledStyle}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={handleRemove} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-500/20"><Minus size={14} /></button>
      <span className="min-w-[10px] text-center tabular-nums">{quantity}</span>
      <button onClick={handleAdd} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-500/20"><Plus size={14} /></button>
    </div>
  );
}