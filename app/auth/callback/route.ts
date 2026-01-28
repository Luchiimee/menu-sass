import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Intercambiamos el código por la sesión
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      // 🚀 GANCHO DE SUPERADMIN CORREGIDO: 
      // Apuntamos a la ruta real donde tienes el archivo: /dashboard/superadmin
      if (data.user.email === 'luchiimee2@gmail.com') {
        return NextResponse.redirect(`${origin}/dashboard/superadmin`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si algo falla, al login con error
  return NextResponse.redirect(`${origin}/login?error=auth`)
}