'use client';

import { useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { createBrowserClient } from '@supabase/ssr';

export default function ClearCartLogic({ currentRestaurantId }: { currentRestaurantId: string }) {
  const { cartRestaurantId, clearCart, activeOrderId, setActiveOrderId } = useCart();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Limpieza por cambio de Restaurante
  useEffect(() => {
    if (cartRestaurantId && cartRestaurantId !== currentRestaurantId) {
        console.log("🧹 Cambio de local detectado: Limpiando carrito...");
        clearCart(); 
        setActiveOrderId(null); // También olvidamos el pedido del otro local
    }
  }, [cartRestaurantId, currentRestaurantId, clearCart, setActiveOrderId]);

  // 2. Limpieza por Tiempo (1 hora después de completado)
  useEffect(() => {
      const checkOrderStatus = async () => {
          if (!activeOrderId) return;

          const { data: order } = await supabase
              .from('orders')
              .select('status, updated_at') // Usamos updated_at para saber cuándo cambió a completado
              .eq('id', activeOrderId)
              .single();

          if (order && (order.status === 'completado' || order.status === 'cancelado')) {
              const lastUpdate = new Date(order.updated_at).getTime();
              const now = new Date().getTime();
              const hoursPassed = (now - lastUpdate) / (1000 * 60 * 60);

              // Si pasó más de 1 hora desde que se completó/canceló
              if (hoursPassed > 1) {
                  console.log("🕒 El pedido expiró. Limpiando seguimiento...");
                  setActiveOrderId(null);
                  clearCart();
              }
          }
      };

      checkOrderStatus();
  }, [activeOrderId, supabase, setActiveOrderId, clearCart]);

  return null;
}