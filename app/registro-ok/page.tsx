'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { trackCompleteRegistration } from '@/components/MetaPixel';
import { isLikelyNewGoogleUser } from '@/lib/registrationTracking';
import { clearOAuthPendingIfStandalone } from '@/lib/oauthPending';

// Paso intermedio de un registro nuevo con Google: el panel no tiene píxel, esta ruta sí (ALLOWED_PATHS de
// MetaPixel). Dispara CompleteRegistration una sola vez (deduplicado por usuario) y sigue al panel. No manda
// ningún dato personal a Meta. Ventana más ancha que la del callback (10 min): pasó tiempo desde que se decidió.
const PAGE_WINDOW_MS = 10 * 60_000;
const TRACK_MAX_WAIT_MS = 3000; // espera máxima a que el píxel esté disponible (con bloqueador no se queda en negro)
const REDIRECT_DELAY_MS = 400; // después de la llamada a fbq, deja salir el pedido antes de pasar a una ruta sin píxel

export default function RegistroOkPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    // Cliente con cookies: la sesión la dejó el callback del servidor en cookies, el supabase plano no la ve
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data.user && isLikelyNewGoogleUser(data.user, new Date(), PAGE_WINDOW_MS)) {
          await trackCompleteRegistration(data.user.id, TRACK_MAX_WAIT_MS);
        }
      } catch {
        // sin sesión o error de red: se sigue al panel igual
      }
      // Fin del flujo: limpia el indicador de OAuth en curso solo en modo standalone (en la pestaña personalizada lo
      // necesita la app para volver sola al panel; ver lib/oauthPending.ts)
      clearOAuthPendingIfStandalone(window);
      setTimeout(() => {
        if (!cancelled) router.replace('/dashboard');
      }, REDIRECT_DELAY_MS);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return <main className="min-h-screen bg-black" aria-busy="true" />;
}
