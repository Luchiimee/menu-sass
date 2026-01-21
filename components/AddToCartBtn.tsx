'use client';

import { useCartStore } from '@/store/cart-store';
import { Plus, ShoppingBag } from 'lucide-react';

interface Props {
  product: any;
  // 'full' = Botón grande con texto "Agregar" (Sushi)
  // 'icon' = Botón redondito solo con "+" (Classic/Urban)
  variant?: 'full' | 'icon'; 
  isDark?: boolean;
}

export default function AddToCartBtn({ product, variant = 'full', isDark = false }: Props) {
  // @ts-ignore
  const addItem = useCartStore((state) => state.addItem);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    addItem({ id: product.id, name: product.name, price: product.price });
  };

  // ESTILO 1: BOTÓN REDONDO PEQUEÑO (+)
  if (variant === 'icon') {
    return (
      <button 
        onClick={handleAdd}
        className={`w-8 h-8 flex items-center justify-center rounded-full transition shadow-sm ${
            isDark 
            ? 'bg-green-500 text-white hover:bg-green-600' // Urbano
            : 'bg-black text-white hover:bg-gray-800'      // Classic
        }`}
      >
        <Plus size={18} strokeWidth={3} />
      </button>
    );
  }

  // ESTILO 2: BOTÓN GRANDE CON TEXTO ("Agregar +")
  return (
    <button 
      onClick={handleAdd}
      className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm transition ${
        isDark 
         ? 'bg-green-600 text-white hover:bg-green-700' 
         : 'bg-black text-white hover:bg-gray-800'
      }`}
    >
      Agregar <Plus size={14} />
    </button>
  );
}