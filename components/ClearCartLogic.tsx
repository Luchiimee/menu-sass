'use client';

import { useEffect, useRef } from 'react';
import { useCart } from '@/context/CartContext';
import { fetchPublicOrder } from '@/lib/orderPollClient';
import { shouldClearOrder } from '@/lib/orderPolling';

export default function ClearCartLogic({ currentRestaurantId }: { currentRestaurantId: string }) {
  const { cartRestaurantId, clearCart, activeOrderId, setActiveOrderId } = useCart();
  const lastProcessedId = useRef<string | null>(null);

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
              // Lectura por el endpoint público (id del pedido); si falla o no existe, no se hace nada
              const result = await fetchPublicOrder(activeOrderId);
              const order = result.kind === 'ok' ? result.order : null;

              if (order) {
                  // Estado final hace más de 5 minutos (desde updated_at). Una transferencia o Mercado Pago
                  // todavía sin confirmar espera hasta 30 minutos; mesa solo limpia en completado / cancelado.
                  const lastUpdate = parseDateUTC(order.updated_at ?? "");
                  const msSinceFinal = new Date().getTime() - lastUpdate;

                  if (shouldClearOrder({
                      status: order.status,
                      orderType: order.order_type,
                      paymentMethod: order.payment_method,
                      pagoConfirmado: order.pago_confirmado,
                  }, msSinceFinal)) {
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

  }, [activeOrderId, setActiveOrderId, clearCart]);

  return null;
}