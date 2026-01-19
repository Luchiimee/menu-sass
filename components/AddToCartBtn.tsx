'use client'; 

import { useCart } from '@/store/cart-store';
import { Plus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
}

// Agregamos la prop "minimal" opcional
export default function AddToCartBtn({ product, minimal }: { product: Product, minimal?: boolean }) {
  const addItem = useCart((state) => state.addItem);

  if (minimal) {
    return (
        <button 
        onClick={() => addItem(product)}
        className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition shadow-lg"
      >
        <Plus size={18} />
      </button>
    );
  }

  return (
    <button 
      onClick={() => addItem(product)}
      className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-gray-800 active:scale-95 transition flex items-center gap-1 shadow-md"
    >
      <Plus size={16} />
      Agregar
    </button>
  );
}