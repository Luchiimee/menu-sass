'use client'

import { createBrowserClient } from '@supabase/ssr' // Usamos la librería nueva
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Image from 'next/image' // Asegúrate de tener esto si usas <Image>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)

  // Creamos el cliente AQUÍ MISMO para asegurar que usa la config nueva
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // ESTO ES LO CLAVE: Forzamos ir al callback
          redirectTo: `${location.origin}/auth/callback?next=/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
    } catch (error) {
      console.error("Error login:", error)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl text-center border border-gray-100">
        
        {/* LOGO (Reemplaza con tu logo real si tienes) */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white font-bold text-2xl">
           ⚡
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">Bienvenido a Snappy</h1>
        <p className="mb-8 text-sm text-gray-500">
          Inicia sesión para gestionar tu menú digital
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 hover:shadow-sm disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            // Icono de Google SVG
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          {isLoading ? 'Conectando...' : 'Continuar con Google'}
        </button>
      </div>
    </div>
  )
}