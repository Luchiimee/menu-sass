'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, Loader2 } from 'lucide-react';

export default function NewPasswordPage() {
  const [password, setPassword] = useState('');
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
    // 💡 Supabase.auth.updateUser permite cambiar la clave de la sesión actual
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
    <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[3rem] shadow-2xl text-center border border-gray-50">
      <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Lock size={30} />
      </div>
      <h1 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">Nueva Contraseña</h1>
      <p className="text-gray-400 text-[10px] font-bold mb-8 uppercase tracking-widest">Escribí tu nueva clave de acceso</p>
      
      <form onSubmit={handleUpdate} className="space-y-4">
        <input 
          type="password" 
          placeholder="Mínimo 6 caracteres" 
          className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-black/5"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button 
          disabled={loading}
          className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={18}/> : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
}