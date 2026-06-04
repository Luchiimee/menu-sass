'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Shield, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_PRICES: Record<string, number> = {
  light: 15000,
  go: 22000,
  plus: 35000,
};

interface PaymentFormProps {
  plan: string;
  userId: string;
  userEmail: string;
  mode?: 'subscribe' | 'update-card';
  mpPreapprovalId?: string;
  inline?: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

declare global {
  interface Window { MercadoPago: any; }
}

export default function PaymentForm({
  plan,
  userId,
  userEmail,
  mode = 'subscribe',
  mpPreapprovalId,
  inline = false,
  onSuccess,
  onClose,
}: PaymentFormProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const mpRef = useRef<any>(null);
  const fieldsReady = useRef(false);
  const amount = PLAN_PRICES[plan] ?? 0;

  useEffect(() => {
    if (window.MercadoPago) { initMP(); return; }

    const existing = document.getElementById('mp-sdk') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', initMP);
      return () => existing.removeEventListener('load', initMP);
    }

    const script = document.createElement('script');
    script.id = 'mp-sdk';
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = initMP;
    document.body.appendChild(script);
  }, []);

  const initMP = () => {
    if (fieldsReady.current) return;
    fieldsReady.current = true;

    const mp = new window.MercadoPago(process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY!, { locale: 'es-AR' });
    mpRef.current = mp;

    const style = { color: '#111827', fontSize: '14px', fontWeight: '600', placeholderColor: '#9CA3AF' };
    mp.fields.create('cardNumber',     { placeholder: '1234 5678 9012 3456', style }).mount('mp-cardNumber');
    mp.fields.create('expirationDate', { placeholder: 'MM/AA', style }).mount('mp-expiration');
    mp.fields.create('securityCode',   { placeholder: 'CVV', style }).mount('mp-securityCode');
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpRef.current || submitting) return;
    setSubmitting(true);
    try {
      const token = await mpRef.current.fields.createCardToken({
        cardholderName,
        identificationType: 'DNI',
        identificationNumber: docNumber,
      });

      const endpoint = mode === 'update-card' ? '/api/subscriptions/update-card' : '/api/subscriptions/create';
      const body = mode === 'update-card'
        ? { token: token.id, userId, email: userEmail, mpPreapprovalId }
        : { token: token.id, plan, userId, email: userEmail };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar');

      toast.success(mode === 'update-card'
        ? '¡Tarjeta actualizada correctamente!'
        : '¡Suscripción activada! Los primeros 14 días son gratis.'
      );
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar el pago');
    } finally {
      setSubmitting(false);
    }
  };

  const isUpdateCard = mode === 'update-card';
  const fieldClass = "w-full px-4 bg-gray-50 rounded-xl border border-transparent focus-within:border-black focus-within:bg-white transition-all h-[46px] flex items-center";
  const inputClass = "w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-semibold border border-transparent focus:border-black focus:bg-white outline-none transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5";

  const inner = (
      <div className={`bg-white ${inline ? 'rounded-[2rem] border border-gray-100 shadow-sm w-full' : 'rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200'}`}>

        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-black text-lg uppercase italic tracking-tighter text-gray-900">
              {isUpdateCard ? 'Cambiar Tarjeta' : `Activar Plan ${plan.toUpperCase()}`}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              {isUpdateCard
                ? 'Ingresá tu nueva tarjeta de pago'
                : `$${amount.toLocaleString('es-AR')} / mes · 14 días gratis`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10 py-16">
              <Loader2 className="animate-spin text-gray-300" size={28} />
            </div>
          )}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className={labelClass}>Número de tarjeta</label>
              <div id="mp-cardNumber" className={fieldClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Vencimiento</label>
                <div id="mp-expiration" className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>CVV</label>
                <div id="mp-securityCode" className={fieldClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Nombre del titular</label>
              <input type="text" value={cardholderName} onChange={(e) => setCardholderName(e.target.value.toUpperCase())} placeholder="COMO APARECE EN LA TARJETA" className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>DNI del titular</label>
              <input type="text" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="12345678" className={inputClass} required />
            </div>
            <button type="submit" disabled={submitting || loading} className="w-full py-3.5 bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:opacity-50">
              {submitting
                ? <Loader2 className="animate-spin" size={14} />
                : <><CreditCard size={14} /> {isUpdateCard ? 'Guardar Tarjeta' : 'Activar Suscripción'}</>
              }
            </button>
          </form>
        </div>

        <div className="px-6 pb-6 flex items-center gap-2 justify-center">
          <Shield size={12} className="text-gray-300" />
          <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Pago seguro procesado por Mercado Pago</p>
        </div>

      </div>
  );

  if (inline) return inner;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {inner}
    </div>
  );
}
