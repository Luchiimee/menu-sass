'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'
import { Loader2, Mail, Lock, ArrowRight, Check } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false) // Para alternar entre Login y Registro
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

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
          redirectTo: `${location.origin}/auth/callback?next=/dashboard`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
    } catch (error) {
      console.error(error)
      setIsLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      if (isRegistering) {
        // --- LOGICA DE REGISTRO ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setMessage('¡Cuenta creada! Revisa tu email para confirmar (o entra si desactivaste la confirmación).')
      } else {
        // --- LOGICA DE INICIO DE SESIÓN ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (error: any) {
      setMessage(error.message || 'Ocurrió un error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      
      {/* --- SECCIÓN IMAGEN (70% o oculto en móvil) --- */}
      <div className="hidden lg:block lg:w-[65%] xl:w-[70%] relative bg-gray-900">
        <div className="absolute inset-0 bg-black/30 z-10" /> {/* Oscurecedor */}
        {/* Puedes cambiar esta URL por una foto de tu producto o una de Unsplash */}
        <img 
          src="https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop" 
          alt="Restaurant Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute bottom-20 left-10 z-20 text-white max-w-xl">
          <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl">
             <h2 className="text-4xl font-bold mb-4">Gestiona tu menú en segundos.</h2>
             <p className="text-lg text-gray-200">
               "Snappy cambió la forma en que gestionamos los pedidos. Es rápido, simple y a los clientes les encanta."
             </p>
             <div className="flex items-center gap-3 mt-6">
                <div className="flex -space-x-2">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white"/>
                   ))}
                </div>
                <span className="text-sm font-medium">+500 restaurantes confían en nosotros</span>
             </div>
          </div>
        </div>
      </div>

      {/* --- SECCIÓN FORMULARIO (30%) --- */}
      <div className="w-full lg:w-[35%] xl:w-[30%] flex flex-col justify-center px-8 md:px-12 lg:px-16 overflow-y-auto py-10">
        
        <div className="max-w-sm w-full mx-auto">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-2">
            <div className="h-10 w-10 bg-black text-white rounded-xl flex items-center justify-center font-bold text-xl">⚡</div>
            <span className="font-bold text-2xl tracking-tight">Snappy</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isRegistering ? 'Crear cuenta' : 'Bienvenido de nuevo'}
          </h1>
          <p className="text-gray-500 mb-8">
            {isRegistering ? 'Empieza tus 14 días de prueba gratis.' : 'Ingresa tus datos para acceder al panel.'}
          </p>

          {/* Botón Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all mb-6"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
            )}
            Continuar con Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">O ingresa con email</span></div>
          </div>

          {/* Formulario Email/Pass */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-black focus:ring-1 ring-black transition"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-black focus:ring-1 ring-black transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${message.includes('creada') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="animate-spin" size={18}/>}
              {isRegistering ? 'Crear Cuenta Gratis' : 'Iniciar Sesión'} 
              {!isLoading && <ArrowRight size={18}/>}
            </button>
          </form>

          {/* Toggle Registro/Login */}
          <p className="text-center text-sm text-gray-500 mt-8">
            {isRegistering ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setMessage(null); }} 
              className="font-bold text-black ml-1 hover:underline"
            >
              {isRegistering ? 'Inicia sesión' : 'Regístrate gratis'}
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}