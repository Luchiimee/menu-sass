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

  // Helper para fechas UTC
  const parseDateUTC = (dateString: string) => {
      if (!dateString.endsWith('Z') && !dateString.includes('+')) {
          return new Date(dateString + 'Z').getTime();
      }
      return new Date(dateString).getTime();
  };

  // 1. Limpieza por cambio de Restaurante
  useEffect(() => {
    if (cartRestaurantId && cartRestaurantId !== currentRestaurantId) {
        clearCart(); 
        setActiveOrderId(null); 
    }
  }, [cartRestaurantId, currentRestaurantId, clearCart, setActiveOrderId]);

  // 2. Limpieza por Tiempo (5 Minutos)
  useEffect(() => {
      const checkOrderStatus = async () => {
          if (!activeOrderId) return;

          const { data: order } = await supabase
              .from('orders')
              .select('status, updated_at')
              .eq('id', activeOrderId)
              .single();

          if (order && (order.status === 'completado' || order.status === 'cancelado' || order.status === 'entregado')) { 
              const lastUpdate = parseDateUTC(order.updated_at);
              const now = new Date().getTime();
              const minutesPassed = (now - lastUpdate) / (1000 * 60);

              if (minutesPassed > 5) {
                  setActiveOrderId(null);
                  clearCart();
                  window.location.reload(); // Recarga suave para limpiar la UI
              }
          }
      };

      checkOrderStatus();
      const interval = setInterval(checkOrderStatus, 30000); // Revisar cada 30 segs
      return () => clearInterval(interval);

  }, [activeOrderId, supabase, setActiveOrderId, clearCart]);

  return null;
}