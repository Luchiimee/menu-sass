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
    // CORRECCIÓN AQUÍ: Cambiamos el nombre para que coincida con tu archivo
    audioRef.current = new Audio('/pedido.mp3');
    audioRef.current.volume = 1.0; 

    const setupListener = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: rest } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!rest) return;

      const channel = supabase
        .channel('orders-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT', // Escuchamos pedidos nuevos
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${rest.id}`,
          },
          (payload) => {
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
              // Reiniciamos el audio por si ya estaba sonando
              audioRef.current.currentTime = 0;
              const playPromise = audioRef.current.play();
              
              if (playPromise !== undefined) {
                playPromise.catch((error) => {
                  console.error("Audio bloqueado por el navegador:", error);
                  // Si no suena, avisamos con un toast pequeño
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