'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, AlertCircle } from 'lucide-react';

function ResetRedirectInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const token_hash = searchParams.get('token_hash');
    const type       = searchParams.get('type');

    if (!token_hash || !type) {
      setError('Link inválido o incompleto.');
      return;
    }

    const verify = async () => {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'recovery' | 'email' | 'signup' | 'invite' | 'magiclink' | 'email_change',
      });

      if (error) {
        setError('El link expiró o ya fue usado. Solicitá uno nuevo desde Configuración.');
        return;
      }

      if (type === 'recovery') {
        router.replace('/new-password');
      } else {
        router.replace('/dashboard');
      }
    };

    verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full p-10 bg-white rounded-[3rem] shadow-2xl text-center border border-gray-100">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={26} className="text-red-400" />
          </div>
          <h1 className="text-base font-black uppercase tracking-tighter mb-2">Link inválido</h1>
          <p className="text-[11px] text-gray-400 font-medium mb-8">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
          >
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-gray-300" />
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Verificando...</p>
      </div>
    </div>
  );
}

export default function ResetRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-gray-300" />
        </div>
      }
    >
      <ResetRedirectInner />
    </Suspense>
  );
}
