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

  // --- HELPER: Parsear fecha forzando UTC ---
  // Esto arregla el bug de Android que interpreta la fecha como Local en vez de UTC
  const parseDateUTC = (dateString: string) => {
      // Si la fecha viene sin zona horaria (sin Z y sin +), le agregamos la Z
      if (!dateString.endsWith('Z') && !dateString.includes('+')) {
          return new Date(dateString + 'Z').getTime();
      }
      return new Date(dateString).getTime();
  };

  // 1. Limpieza por cambio de Restaurante
  useEffect(() => {
    if (cartRestaurantId && cartRestaurantId !== currentRestaurantId) {
        console.log("🧹 Cambio de local detectado: Limpiando carrito...");
        clearCart(); 
        setActiveOrderId(null); 
    }
  }, [cartRestaurantId, currentRestaurantId, clearCart, setActiveOrderId]);

  // 2. Limpieza por Tiempo (5 MINUTOS)
  useEffect(() => {
      const checkOrderStatus = async () => {
          if (!activeOrderId) return;

          const { data: order } = await supabase
              .from('orders')
              .select('status, updated_at')
              .eq('id', activeOrderId)
              .single();

          if (order && (order.status === 'completado' || order.status === 'cancelado')) {
              // USAMOS LA FUNCIÓN SEGURA AQUÍ 👇
              const lastUpdate = parseDateUTC(order.updated_at);
              const now = new Date().getTime();
              
              const minutesPassed = (now - lastUpdate) / (1000 * 60);

              console.log(`⏱️ Minutos pasados: ${minutesPassed.toFixed(2)}`); // Para depurar si lo necesitas

              // Si pasaron más de 5 minutos
              if (minutesPassed > 5) {
                  console.log("🕒 El pedido expiró hace 5 minutos. Limpiando seguimiento...");
                  setActiveOrderId(null);
                  clearCart();
              }
          }
      };

      checkOrderStatus();
      
      const interval = setInterval(checkOrderStatus, 30000); // Revisar cada 30 segundos
      return () => clearInterval(interval);

  }, [activeOrderId, supabase, setActiveOrderId, clearCart]);

  return null;
}