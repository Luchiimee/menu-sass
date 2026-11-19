'use client';

// Mantiene viva la sesión de Supabase mientras la pestaña está abierta.
//
// Problema que resuelve: el token de acceso dura 1 hora. Una pestaña que queda abierta (el panel de admin no tiene
// cliente de Supabase propio) o dormida no lo renueva; al volver, el primer click dispara VARIOS pedidos a /api a la
// vez y el servidor intenta renovar el mismo token en paralelo (en los logs de Auth: 6 renovaciones en 3 segundos).
// Esa carrera puede dejar la sesión caída ("Tu sesión venció").
//
// Acá la renovación la hace el NAVEGADOR, una sola vez y antes de que haga falta:
//   - useKeepSession(): renueva al volver a la pestaña, al recuperar internet y cada minuto.
//   - fetchKeepingSession(): si un pedido a /api devuelve 401, renueva una vez y lo repite; recién si falla de nuevo,
//     el 401 llega a la pantalla.
// getSession() solo toca la red cuando el token está por vencer; el resto del tiempo no hace nada.

import { useEffect } from 'react';

type AuthClient = {
  auth: {
    getSession: () => Promise<unknown>;
    refreshSession: () => Promise<{ error: unknown }>;
  };
};

export const KEEP_SESSION_EVERY_MS = 60 * 1000; // getSession() es local salvo que el token esté por vencer (margen de 90 s)

export function useKeepSession(supabase: AuthClient) {
  useEffect(() => {
    let inFlight = false;
    const touch = async () => {
      if (inFlight) return;
      inFlight = true;
      try { await supabase.auth.getSession(); } catch { /* sin red: se reintenta en el próximo aviso */ }
      finally { inFlight = false; }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void touch(); };

    void touch();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', touch);
    window.addEventListener('online', touch);
    const timer = setInterval(touch, KEEP_SESSION_EVERY_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', touch);
      window.removeEventListener('online', touch);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// fetch que, ante un 401, renueva la sesión una vez y repite el pedido. Cualquier otro estado se devuelve tal cual.
export async function fetchKeepingSession(supabase: AuthClient, input: string, init?: RequestInit): Promise<Response> {
  const first = await fetch(input, init);
  if (first.status !== 401) return first;
  try {
    const { error } = await supabase.auth.refreshSession();
    if (error) return first;
  } catch {
    return first;
  }
  return fetch(input, init);
}
