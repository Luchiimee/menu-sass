'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';

export default function NewPasswordPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Mínimo 6 caracteres");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("¡Contraseña actualizada!");
      router.push('/dashboard/settings');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-10 bg-white rounded-[3rem] shadow-2xl text-center border border-gray-50">
        <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock size={30} />
        </div>
        <h1 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">Nueva Contraseña</h1>
        <p className="text-gray-400 text-[10px] font-bold mb-8 uppercase tracking-widest">Escribí tu nueva clave de acceso</p>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              className="w-full p-4 pr-12 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-black/5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            disabled={loading}
            className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18}/> : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
