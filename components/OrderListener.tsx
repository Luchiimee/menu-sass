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
    // 1. CARGAMOS EL AUDIO
    // Importante: El archivo notification.mp3 debe pesar algo (no estar vacío)
    audioRef.current = new Audio('/notification.mp3');
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
            
            // --- AQUÍ ESTÁ LA MAGIA ---
            
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
              const playPromise = audioRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch((error) => {
                  console.error("Audio bloqueado:", error);
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