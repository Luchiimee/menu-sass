'use client';

import { useCart } from '@/context/CartContext';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
}

interface AddToCartBtnProps {
  product: Product;
  variant?: 'icon' | 'full'; // 'icon' es el circulito pequeño, 'full' es el botón grande
  isDark?: boolean;
}

export default function AddToCartBtn({ product, variant = 'icon', isDark = false }: AddToCartBtnProps) {
  const { cart, addToCart, removeFromCart } = useCart();
  const [isAnimating, setIsAnimating] = useState(false);

  // Buscamos si el producto ya está en el carrito para saber la cantidad
  const itemInCart = cart.find((item) => item.id === product.id);
  const quantity = itemInCart ? itemInCart.quantity : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita abrir detalles si hubiera un modal
    addToCart(product);
    
    // Pequeña vibración en móviles si lo soportan
    if (navigator.vibrate) navigator.vibrate(50);
    
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromCart(product.id);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  // --- ESTADO 1: NO ESTÁ EN EL CARRITO (MOSTRAR BOTÓN +) ---
  if (quantity === 0) {
    if (variant === 'full') {
      return (
        <button 
          onClick={handleAdd}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs shadow-sm transition-transform active:scale-95
            ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}
          `}
        >
          <Plus size={14} /> Agregar
        </button>
      );
    }

    return (
      <button 
        onClick={handleAdd}
        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95
            ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}
        `}
      >
        <Plus size={16} />
      </button>
    );
  }

  // --- ESTADO 2: YA TIENE CANTIDAD (MOSTRAR CONTROLES - 1 +) ---
  return (
    <div 
      className={`flex items-center gap-3 rounded-full px-2 py-1 shadow-md font-bold text-sm animate-in zoom-in duration-200
        ${isDark ? 'bg-white text-black' : 'bg-black text-white'}
        ${isAnimating ? 'scale-105' : 'scale-100'}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      <button 
        onClick={handleRemove}
        className={`w-6 h-6 flex items-center justify-center rounded-full transition hover:bg-gray-500/20`}
      >
        <Minus size={14} />
      </button>
      
      <span className="min-w-[10px] text-center tabular-nums">{quantity}</span>
      
      <button 
        onClick={handleAdd}
        className={`w-6 h-6 flex items-center justify-center rounded-full transition hover:bg-gray-500/20`}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}