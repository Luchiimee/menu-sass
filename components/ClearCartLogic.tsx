'use client';

import { useEffect, useRef } from 'react';
import { useCart } from '@/context/CartContext';
import { createBrowserClient } from '@supabase/ssr';

export default function ClearCartLogic({ currentRestaurantId }: { currentRestaurantId: string }) {
  const { cartRestaurantId, clearCart, activeOrderId, setActiveOrderId } = useCart();
  
  // Referencia para guardar el último ID procesado y evitar bucles
  const lastProcessedId = useRef<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const parseDateUTC = (dateString: string) => {
      if (!dateString.endsWith('Z') && !dateString.includes('+')) {
          return new Date(dateString + 'Z').getTime();
      }
      return new Date(dateString).getTime();
  };

  // 1. Limpieza por cambio de Restaurante (CORREGIDO)
  useEffect(() => {
    // Si el ID del carrito existe y es distinto al actual Y no lo procesamos ya...
    if (cartRestaurantId && cartRestaurantId !== currentRestaurantId && lastProcessedId.current !== currentRestaurantId) {
        lastProcessedId.current = currentRestaurantId;
        setActiveOrderId(null); 
        clearCart();
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

          if (order && ['completado', 'cancelado', 'entregado'].includes(order.status)) { 
              const lastUpdate = parseDateUTC(order.updated_at);
              const now = new Date().getTime();
              const minutesPassed = (now - lastUpdate) / (1000 * 60);

              if (minutesPassed > 5) {
                  setActiveOrderId(null);
                  clearCart();
                  // No hacemos reload, dejamos que el estado fluya
              }
          }
      };

      checkOrderStatus();
      const interval = setInterval(checkOrderStatus, 30000); 
      return () => clearInterval(interval);

  }, [activeOrderId, supabase, setActiveOrderId, clearCart]);

  return null;
}