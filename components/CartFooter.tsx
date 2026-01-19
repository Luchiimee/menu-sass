// components/CartFooter.tsx
'use client';

import { useCart } from '../store/cart-store';
import { useEffect } from 'react';

export default function CartFooter({ restaurantPhone, restaurantId }: { restaurantPhone: string, restaurantId: string }) {
  const items = useCart((state) => state.items);
  const checkout = useCart((state) => state.checkout);
  
  // Calcular total
  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const count = items.reduce((acc, item) => acc + item.quantity, 0);

  // Inyectar datos del restaurante en el store al cargar
  useEffect(() => {
    useCart.setState({ restaurantPhone, restaurantId });
  }, [restaurantPhone, restaurantId]);

  if (items.length === 0) return null; // No mostrar si está vacío

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 pb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom-5">
      <button 
        onClick={checkout}
        className="max-w-md mx-auto w-full bg-green-600 text-white font-bold py-3.5 rounded-xl flex justify-between px-6 hover:bg-green-700 active:scale-95 transition shadow-lg"
      >
        <div className="flex gap-2 items-center">
          <span className="bg-green-800 px-2 py-0.5 rounded text-sm">{count}</span>
          <span>Enviar Pedido</span>
        </div>
        <span>${total.toLocaleString()}</span>
      </button>
    </div>
  );
}