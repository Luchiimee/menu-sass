'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Store, User, Phone, Mail, Lock } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: ''
  });

  // --- REGISTRO GOOGLE ---
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`, // Vuelve al dashboard
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
        alert("Error con Google: " + error.message);
        setGoogleLoading(false);
    }
  };

  // --- REGISTRO MANUAL ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Crear usuario Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
            data: {
                full_name: `${formData.firstName} ${formData.lastName}`, // Para el trigger
                phone: formData.phone
            }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Error creando usuario");

      // 2. Actualizar perfil con datos específicos manuales (Teléfono)
      // El Trigger ya creó la fila, ahora actualizamos lo que falta
      await supabase.from('profiles').update({
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone
      }).eq('id', authData.user.id);

      alert("¡Cuenta creada! Revisa tu correo.");
      router.push('/login');

    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      
      <div className="mb-6 text-center">
        <div className="bg-black text-white w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Store size={24} />
        </div>
        <h1 className="text-2xl font-black text-gray-900">Crear Cuenta</h1>
        <p className="text-gray-500 text-sm mt-1">Empieza a gestionar tu menú digital</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 w-full max-w-md">
        
        {/* BOTÓN GOOGLE */}
        <button 
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition mb-6"
        >
            {googleLoading ? <Loader2 className="animate-spin" size={20}/> : (
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
            )}
            Registrarse con Google
        </button>

        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">O manual</span></div>
        </div>

        {/* FORMULARIO MANUAL */}
        <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 ml-1">Nombre</label>
                    <div className="relative">
                        <User size={18} className="absolute left-3 top-3 text-gray-400"/>
                        <input required type="text" placeholder="Juan" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})}/>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 ml-1">Apellido</label>
                    <input required type="text" placeholder="Pérez" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})}/>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">WhatsApp</label>
                <div className="relative">
                    <Phone size={18} className="absolute left-3 top-3 text-gray-400"/>
                    <input required type="tel" placeholder="11 1234 5678" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}/>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">Correo</label>
                <div className="relative">
                    <Mail size={18} className="absolute left-3 top-3 text-gray-400"/>
                    <input required type="email" placeholder="tu@email.com" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}/>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">Contraseña</label>
                <div className="relative">
                    <Lock size={18} className="absolute left-3 top-3 text-gray-400"/>
                    <input required type="password" placeholder="••••••••" minLength={6} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}/>
                </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition transform active:scale-95 flex justify-center items-center gap-2 mt-4">
                {loading ? <Loader2 className="animate-spin" /> : 'Crear Cuenta'}
            </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '} <Link href="/login" className="font-bold text-black hover:underline">Iniciar Sesión</Link>
        </div>
      </div>
    </div>
  );
}