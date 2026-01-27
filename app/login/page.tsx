'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'
import { Loader2, Mail, Lock, ArrowRight, User, Phone, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [showPassword, setShowPassword] = useState(false) // Nuevo estado para el ojito
  
  // Estados para el formulario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Estados nuevos para el registro
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
      console.log("Intentando redirigir a:", `${origin}/auth/callback`) 

      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=/dashboard`,
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
        // --- LÓGICA DE REGISTRO ---
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
            data: {
                full_name: `${firstName} ${lastName}`.trim(),
            }
          },
        })

        if (authError) throw authError

        if (authData.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone,
                })
            
            if (profileError) {
                console.error("Error guardando perfil:", profileError)
            }
        }

        setMessage('¡Cuenta creada! Si no entraste automático, revisa tu email.')

      } else {
        // --- LÓGICA DE LOGIN ---
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

  // Función para resetear contraseña
  const handleResetPassword = async () => {
    if (!email) {
        setMessage("Por favor, escribe tu email primero.")
        return
    }
    setIsLoading(true)
    try {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${origin}/auth/callback?next=/dashboard/settings`,
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
    <div className="flex h-screen w-full bg-white overflow-hidden">
      
      {/* --- SECCIÓN IMAGEN (70%) --- */}
      <div className="hidden lg:block lg:w-[65%] xl:w-[70%] relative bg-gray-900">
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
          
          <div className="mb-8 flex flex-col items-center justify-center gap-3">
            <div className="relative w-20 h-20"> 
                <Image 
                    src="/logo-animado.svg" 
                    alt="Snappy Logo" 
                    fill 
                    className="object-contain"
                />
            </div>
            <span className="font-bold text-2xl tracking-tight text-gray-900">Snappy</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            {isRegistering ? 'Crear cuenta' : 'Bienvenido de nuevo'}
          </h1>
          <p className="text-gray-500 mb-8 text-center">
            {isRegistering ? 'Empieza tus 14 días de prueba gratis.' : 'Ingresa tus datos para acceder al panel.'}
          </p>

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

          <form onSubmit={handleEmailAuth} className="space-y-4">
            
            {isRegistering && (
                <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre</label>
                            <input 
                                type="text" 
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-black focus:ring-1 ring-black transition"
                                placeholder="Juan"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Apellido</label>
                            <input 
                                type="text" 
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-black focus:ring-1 ring-black transition"
                                placeholder="Pérez"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="tel" 
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-black focus:ring-1 ring-black transition"
                                placeholder="11 1234 5678"
                                required
                            />
                        </div>
                    </div>
                </div>
            )}

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
                  type={showPassword ? "text" : "password"} // Alternar tipo
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl outline-none focus:border-black focus:ring-1 ring-black transition"
                  placeholder="••••••••"
                  required
                />
                {/* Botón del Ojito */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-black transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botón Olvidé Contraseña (solo en login) */}
            {!isRegistering && (
                <div className="flex justify-end">
                    <button 
                        type="button"
                        onClick={handleResetPassword}
                        className="text-xs font-bold text-gray-500 hover:text-black transition"
                    >
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>
            )}

            {message && (
              <div className={`p-3 rounded-lg text-sm ${message.includes('creada') || message.includes('enviamos') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
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