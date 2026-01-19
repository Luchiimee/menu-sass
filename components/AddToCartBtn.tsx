// components/AddToCartBtn.tsx
'use client'; // <--- Esto es vital para que funcionen los clicks

import { useCart } from '../store/cart-store';
import { Plus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
}

export default function AddToCartBtn({ product }: { product: Product }) {
  const addItem = useCart((state) => state.addItem);

  return (
    <button 
      onClick={() => addItem(product)}
      className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 active:scale-95 transition flex items-center gap-1"
    >
      <Plus size={16} />
      Agregar
    </button>
  );
}