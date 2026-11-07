'use client';

import { useState } from 'react';

// Botón de confirmar la baja. El token viaja en el body del POST (no en la URL de la API).
export default function BajaForm({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const confirm = async () => {
    setState('sending');
    try {
      const res = await fetch('/api/baja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: token }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <p className="text-base text-gray-700">
        Listo. No vas a recibir más este tipo de mails. Los avisos de tu cuenta y de la prueba pueden seguir llegando.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={confirm}
        disabled={state === 'sending'}
        className="w-full py-4 rounded-2xl bg-black text-white text-xs font-black uppercase tracking-widest disabled:opacity-50"
      >
        {state === 'sending' ? 'Procesando…' : 'Sí, darme de baja'}
      </button>
      {state === 'error' && (
        <p className="text-sm text-red-600">No pudimos procesar la baja. Probá de nuevo en unos minutos.</p>
      )}
    </div>
  );
}
