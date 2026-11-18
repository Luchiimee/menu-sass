import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // www -> sin www: la sesión de Google (verificador PKCE en cookies) y la lista de Redirect URLs de Supabase están
  // solo para snappy.uno; entrando por www el login con Google termina en la home sin sesión.
  if (request.nextUrl.hostname === 'www.snappy.uno') {
    const url = request.nextUrl.clone()
    url.hostname = 'snappy.uno'
    url.port = ''
    return NextResponse.redirect(url, 308)
  }

  // Si Supabase manda el código de Google a la raíz (no coincidió con el callback), se lo pasamos al callback con el
  // mismo código en vez de dejar al usuario sin sesión en la home.
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  // 1. Preparamos la respuesta inicial
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Configuramos el cliente de Supabase para leer cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. Refrescamos la sesión del usuario
  const { data: { user } } = await supabase.auth.getUser()

  // 4. REGLAS DE TRÁFICO (Aquí está la magia) 🚦
  
  // Si NO está logueado y quiere entrar al dashboard o al panel de admin -> Fuera (al login)
  if (!user && (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si SÍ está logueado y quiere entrar al login -> Adentro (al dashboard)
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

 

  return response
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas EXCEPTO archivos estáticos (imágenes, iconos, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}