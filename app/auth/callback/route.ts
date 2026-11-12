import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  // Diagnostico: codigo corto del primer fallo (E0..E4). No cambia el flujo.
  let failCode = 'E1'
  try {
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type')
  const next       = searchParams.get('next') ?? '/dashboard'

  const oauthError = searchParams.get('error')
  const oauthErrorDesc = searchParams.get('error_description')
  if (oauthError || oauthErrorDesc) {
    failCode = 'E0'
    console.error('[auth/cb] E0 error en searchParams', { error: oauthError, error_description: oauthErrorDesc })
  }
  if (!code && !token_hash) {
    console.error('[auth/cb] E1 sin code ni token_hash', { hasCode: false, hasTokenHash: false, type })
  }

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
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )

  // Flujo PKCE — OAuth / magic link
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const redirectUrl = `${origin}${next}`
      return new NextResponse(
        `<html>
          <head>
            <script>
              setTimeout(function() {
                window.location.replace("${redirectUrl}");
              }, 100);
            </script>
          </head>
          <body style="background: #000;"></body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }
    if (failCode !== 'E0') failCode = 'E2'
    console.error('[auth/cb] E2 exchangeCodeForSession', { status: error.status, name: error.name, message: error.message })
  }

  // Flujo OTP — reset de contraseña (type=recovery) y confirmación de email
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'email' | 'signup' | 'invite' | 'magiclink' | 'email_change',
    })
    if (!error) {
      const destination = type === 'recovery' ? '/new-password' : next
      return NextResponse.redirect(`${origin}${destination}`)
    }
    if (failCode !== 'E0') failCode = 'E3'
    console.error('[auth/cb] E3 verifyOtp', { type, status: error.status, message: error.message })
  }
  } catch (e) {
    failCode = 'E4'
    console.error('[auth/cb] E4 excepcion', { name: (e as Error)?.name, message: (e as Error)?.message })
  }

  return NextResponse.redirect(`${origin}/login?error=auth&c=${failCode}`)
}