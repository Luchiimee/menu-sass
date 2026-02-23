'use client';

import { useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner'; 

export default function OrderListener() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Cargamos el audio
    audioRef.current = new Audio('/pedido.mp3');
    audioRef.current.volume = 1.0; 

    const setupListener = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. MODIFICACIÓN: Pedimos también el 'subscription_plan'
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id, subscription_plan') 
        .eq('user_id', session.user.id)
        .single();

      if (!rest) return;

      const channel = supabase
        .channel('orders-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT', 
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${rest.id}`,
          },
          (payload) => {
            // 2. MODIFICACIÓN: Bloqueo total para Plan Light
            if (rest.subscription_plan === 'light') {
              console.log('Plan Light: Notificación en tiempo real bloqueada.');
              return; 
            }

            // Parche para apertura de caja
            if (payload.new.order_type === 'apertura') {
              console.log('Ignorando sonido: es inicio de caja');
              return; 
            }

            console.log('🔔 PEDIDO NUEVO:', payload);
            
            // 1. Mostrar Pop-up Negro (Sonner)
            toast.success('¡Nuevo Pedido Recibido!', {
                description: `Total: $${payload.new.total}`,
                duration: 8000, 
                action: {
                    label: 'Ver',
                    onClick: () => window.location.href = '/dashboard/orders'
                }
            });

            // 2. Reproducir Sonido
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              const playPromise = audioRef.current.play();
              
              if (playPromise !== undefined) {
                playPromise.catch((error) => {
                  console.error("Audio bloqueado:", error);
                  toast.info("Haz clic en la pantalla para activar el sonido.");
                });
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupListener();
  }, []);

  return null;
}