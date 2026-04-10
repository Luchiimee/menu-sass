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
          // 🛡️ AGREGAMOS TRY/CATCH AQUÍ:
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Si falla es normal en ciertos entornos de servidor, 
              // el Middleware se encargará del resto.
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Lo mismo aquí para el borrado.
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const redirectUrl = `${origin}${next}`;
      
      return new NextResponse(
        `<html>
          <head>
            <script>
              // 🚀 SUBIMOS A 100ms: Para darle tiempo a Chrome/iOS 
              // de guardar esa cookie GIGANTE de Google.
              setTimeout(function() {
                window.location.replace("${redirectUrl}");
              }, 100); 
            </script>
          </head>
          <body style="background: #000;"></body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}