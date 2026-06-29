'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'
import { Loader2, Mail, Lock, ArrowRight, User, Phone, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [showPassword, setShowPassword] = useState(false) 
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

 const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Eliminamos el ?next=/dashboard para que la URL de retorno sea lo más corta posible
          redirectTo: `${origin}/auth/callback`, 
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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    
    const origin = typeof window !== 'undefined' ? window.location.origin : ''

    try {
      if (isRegistering) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
            data: {
              first_name: firstName,
              last_name: lastName,
              phone: phone,
              full_name: `${firstName} ${lastName}`.trim(),
            }
          },
        })

        if (authError) throw authError

        setMessage('¡Cuenta creada! Revisa tu email para confirmar.')

      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.replace('/dashboard')
      }
    } catch (error: any) {
      setMessage(error.message || 'Ocurrió un error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
        setMessage("Por favor, escribe tu email primero.")
        return
    }
    setIsLoading(true)
    try {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${origin}/auth/callback?next=/new-password`,
        })
        if (error) throw error
        setMessage("¡Te enviamos un correo para recuperar tu contraseña!")
    } catch (error: any) {
        setMessage(error.message)
    } finally {
        setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
      
      {/* Columna de Imagen: Ahora flexible para dar más espacio a la derecha en pantallas medianas */}
      <div className="hidden lg:block lg:flex-1 relative bg-gray-900">
        <div className="absolute inset-0 bg-black/30 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop" 
          alt="Fondo Restaurante" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute bottom-20 left-10 z-20 text-white max-w-xl">
          <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl">
             <h2 className="text-4xl font-bold mb-4">Gestiona tu menú en segundos.</h2>
             <p className="text-lg text-gray-200">
               "Snappy cambió la forma en que gestionamos los pedidos. Es rápido, simple y a los clientes les encanta."
             </p>
          </div>
        </div>
      </div>

      {/* Columna de Formulario: Ancho fijo en LG para que no se amontone el contenido */}
      <div className="w-full lg:w-[450px] xl:w-[550px] flex flex-col justify-center px-6 md:px-12 xl:px-20 overflow-y-auto py-10 text-gray-900 bg-white">
        
        <div className="max-w-sm w-full mx-auto">
          
          <div className="mb-6 flex flex-col items-center justify-center gap-2">
            <div className="relative w-20 h-20"> 
                <Image 
                    src="/logo-snappy.svg" 
                    alt="Snappy Logo" 
                    fill 
                    className="object-contain"
                />
            </div>
            <span className="font-bold text-2xl tracking-tight">Snappy</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">
            {isRegistering ? 'Crear cuenta' : 'Bienvenido'}
          </h1>
          <p className="text-gray-500 mb-6 text-center text-sm md:text-base">
            {isRegistering ? 'Prueba 14 días gratis.' : 'Ingresa tus datos.'}
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all mb-6 text-sm"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
            )}
            Continuar con Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">O con email</span></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            
            {isRegistering && (
                <div className="space-y-3 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nombre</label>
                            <input 
                                type="text" 
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-black transition text-sm"
                                placeholder="Juan"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Apellido</label>
                            <input 
                                type="text" 
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-black transition text-sm"
                                placeholder="Pérez"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">WhatsApp Personal</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-gray-400" size={16} />
                            <input 
                                type="tel" 
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-black transition font-bold text-sm"
                                placeholder="11 1234 5678"
                                required
                            />
                        </div>
                    </div>
                </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-black transition text-sm"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={16} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-black transition text-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-black transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {!isRegistering && (
                <div className="flex justify-end">
                    <button 
                        type="button"
                        onClick={handleResetPassword}
                        className="text-[10px] font-bold text-gray-400 hover:text-black transition uppercase tracking-wider"
                    >
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>
            )}

            {message && (
              <div className={`p-3 rounded-xl text-xs font-bold ${message.includes('creada') || message.includes('enviamos') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 text-sm mt-2"
            >
              {isLoading && <Loader2 className="animate-spin" size={18}/>}
              {isRegistering ? 'Crear Cuenta Gratis' : 'Iniciar Sesión'} 
              {!isLoading && <ArrowRight size={18}/>}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
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