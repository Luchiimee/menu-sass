import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    // 👇 AQUÍ ESTÁ EL CAMBIO: Agregamos 'await' antes de cookies()
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

 // ... (todo tu código de imports y Supabase igual hasta el intercambio del código)

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 🚀 EL SECRETO: En lugar de NextResponse.redirect, usamos un "Puente HTML"
      // Esto asegura que las cookies se guarden bien en el iPhone y no salgan las barras.
      const redirectUrl = `${origin}${next}`;
      
      return new NextResponse(
        `<html>
          <head>
           <script>
  // Pequeña espera para que iOS guarde la cookie de sesión
  setTimeout(function() {
    window.location.replace("${redirectUrl}");
  }, 50); 
</script>
          </head>
          <body style="background: #000;"></body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
  }

  // Si hay error, volvemos al login pero también con puente para mayor seguridad
  return NextResponse.redirect(`${origin}/login?error=auth`)
}