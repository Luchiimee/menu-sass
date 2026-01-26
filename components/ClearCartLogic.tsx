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
              .select('status, updated_at')
              .eq('id', activeOrderId)
              .single();

          if (order && (order.status === 'completado' || order.status === 'cancelado')) {
              const lastUpdate = new Date(order.updated_at).getTime();
              const now = new Date().getTime();
              
              // CAMBIO AQUÍ: Dividimos por (1000 * 60) para obtener MINUTOS
              const minutesPassed = (now - lastUpdate) / (1000 * 60);

              // Si pasaron más de 5 minutos
              if (minutesPassed > 5) {
                  console.log("🕒 El pedido expiró hace 5 minutos. Limpiando seguimiento...");
                  setActiveOrderId(null);
                  clearCart();
              }
          }
      };

      // Revisamos cada vez que se carga el componente
      checkOrderStatus();
      
      // Opcional: Revisar cada 1 minuto automáticamente por si el cliente deja la pantalla abierta
      const interval = setInterval(checkOrderStatus, 60000);
      return () => clearInterval(interval);

  }, [activeOrderId, supabase, setActiveOrderId, clearCart]);

  return null;
}