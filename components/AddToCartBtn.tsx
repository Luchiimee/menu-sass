'use client';

import { useCart } from '@/context/CartContext';
import { Plus, Minus, Settings2 } from 'lucide-react';
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
  variant?: 'icon' | 'full'; 
  isDark?: boolean;
  disabled?: boolean;
  hasExtras?: boolean;
  onOpenExtras?: () => void;
}

export default function AddToCartBtn({ 
  product, 
  variant = 'icon', 
  isDark = false, 
  disabled = false,
  hasExtras = false,
  onOpenExtras 
}: AddToCartBtnProps) {
 const { cart, addToCart, removeFromCart } = useCart();
  const [isAnimating, setIsAnimating] = useState(false);

  // Cantidad total de este producto físico en el carrito
  const quantity = cart
    .filter((item) => item.id === product.id)
    .reduce((acc, item) => acc + item.quantity, 0);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (disabled) return; 

    if (hasExtras && onOpenExtras) {
        onOpenExtras();
        return;
    }

    addToCart(product);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    
    // Nueva lógica: buscamos el último producto base (sin extras) para restar
    const itemToRemove = cart.find(item => item.id === product.id && (!item.extrasList || item.extrasList.length === 0)) 
                       || cart.find(item => item.id === product.id);
    
    if (itemToRemove) removeFromCart(itemToRemove.uniqueId);
  };

  // Botón con cantidad 0
  if (quantity === 0) {
    return (
      <button 
        onClick={handleAdd}
        disabled={disabled}
        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-white text-black border border-gray-100 active:scale-95 transition-all ${disabled ? 'opacity-40 grayscale' : ''}`}
      >
        {hasExtras ? <Settings2 size={14} className="text-[#f0b001]" /> : <Plus size={16} />}
      </button>
    );
  }

  // Botón con cantidad > 0
  return (
    <div 
      className={`flex items-center gap-3 rounded-full px-2 py-1 shadow-md font-bold text-sm bg-white text-black border border-gray-100 ${isAnimating ? 'scale-105' : 'scale-100'} ${disabled ? 'opacity-40 grayscale' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={handleRemove} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100">
        <Minus size={14} />
      </button>
      
      <span className="min-w-[12px] text-center tabular-nums text-[#f0b001]">{quantity}</span>
      
      <button onClick={handleAdd} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100">
        {hasExtras ? <Settings2 size={14} className="text-[#f0b001]" /> : <Plus size={14} />}
      </button>
    </div>
  );
}