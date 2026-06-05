import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Obtiene el usuario autenticado a partir de las cookies de sesión.
 * Devuelve el user de Supabase o null si no hay sesión válida.
 *
 * Usar en endpoints de API para NO confiar en el userId que venga
 * en el body: el id real es el de la sesión.
 */
export async function getSessionUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}
