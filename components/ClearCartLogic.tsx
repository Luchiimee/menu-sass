'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useCart } from '@/context/CartContext';
import { createBrowserClient } from '@supabase/ssr';

export default function ClearCartLogic({ currentRestaurantId }: { currentRestaurantId: string }) {
  const { cartRestaurantId, clearCart, activeOrderId, setActiveOrderId } = useCart();
  const lastProcessedId = useRef<string | null>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const parseDateUTC = (dateString: string) => {
      if (!dateString.endsWith('Z') && !dateString.includes('+')) {
          return new Date(dateString + 'Z').getTime();
      }
      return new Date(dateString).getTime();
  };

  useEffect(() => {
    if (cartRestaurantId && cartRestaurantId !== currentRestaurantId && lastProcessedId.current !== currentRestaurantId) {
        lastProcessedId.current = currentRestaurantId;
        setActiveOrderId(null); 
        clearCart();
    }
  }, [cartRestaurantId, currentRestaurantId, clearCart, setActiveOrderId]);

  useEffect(() => {
      const checkOrderStatus = async () => {
          if (!activeOrderId) return;

          try {
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
                      // Aquí NO hay reload, así que estamos a salvo.
                  }
              }
          } catch (e) {
              console.error("Error checkOrderStatus:", e);
          }
      };

      checkOrderStatus();
      const interval = setInterval(checkOrderStatus, 60000); 
      return () => clearInterval(interval);

  }, [activeOrderId, supabase, setActiveOrderId, clearCart]);

  return null;
}