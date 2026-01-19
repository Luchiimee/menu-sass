'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Store, Lock, Mail, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Estado para alternar entre Login y Registro
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // --- LOGICA DE REGISTRO ---
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
          }
        });

        if (error) throw error;
        
        setMessage({
          type: 'success',
          text: '¡Cuenta creada! Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.'
        });

      } else {
        // --- LOGICA DE INICIO DE SESION ---
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        // Si entra, lo mandamos al dashboard
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message === 'Invalid login credentials' 
          ? 'Correo o contraseña incorrectos' 
          : error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-sm w-full p-8 rounded-2xl shadow-xl">
        
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="bg-black w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Store className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Panel Snappy</h1>
          <p className="text-gray-500 text-sm">Gestiona tu menú digital</p>
        </div>

        {/* Pestañas (Switch) */}
        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => { setIsSignUp(false); setMessage(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${!isSignUp ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Ingresar
          </button>
          <button
            onClick={() => { setIsSignUp(true); setMessage(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${isSignUp ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Registrarse
          </button>
        </div>

        {/* Mensajes de Alerta */}
        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium mb-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                    type="email"
                    required
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-10 p-3 border rounded-xl focus:ring-2 focus:ring-black outline-none transition"
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-10 p-3 border rounded-xl focus:ring-2 focus:ring-black outline-none transition"
                />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            {isSignUp ? 'Crear Cuenta' : 'Entrar al Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}