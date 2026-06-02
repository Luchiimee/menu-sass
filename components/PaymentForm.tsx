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
  onSuccess: () => void;
  onClose: () => void;
}

declare global {
  interface Window { MercadoPago: any; }
}

export default function PaymentForm({ plan, userId, userEmail, onSuccess, onClose }: PaymentFormProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const mpRef = useRef<any>(null);
  const amount = PLAN_PRICES[plan] ?? 0;

  useEffect(() => {
    if (document.getElementById('mp-sdk')) {
      initMP();
      return;
    }
    const script = document.createElement('script');
    script.id = 'mp-sdk';
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = initMP;
    document.body.appendChild(script);
  }, []);

  const initMP = () => {
    const mp = new window.MercadoPago(process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY!, { locale: 'es-AR' });
    mpRef.current = mp;

    const style = {
      color: '#111827',
      fontSize: '14px',
      fontWeight: '600',
      placeholderColor: '#9CA3AF',
    };

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

      const res = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.id, plan, userId, email: userEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar');

      toast.success('¡Suscripción activada! Los primeros 14 días son gratis.');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar el pago');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = "w-full px-4 bg-gray-50 rounded-xl border border-transparent focus-within:border-black focus-within:bg-white transition-all h-[46px] flex items-center";
  const inputClass = "w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-semibold border border-transparent focus:border-black focus:bg-white outline-none transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-black text-lg uppercase italic tracking-tighter text-gray-900">
              Activar Plan {plan.toUpperCase()}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              ${amount.toLocaleString('es-AR')} / mes · 14 días gratis
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-gray-300" size={28} />
          </div>
        ) : (
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
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                placeholder="COMO APARECE EN LA TARJETA"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>DNI del titular</label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="12345678"
                className={inputClass}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              {submitting
                ? <Loader2 className="animate-spin" size={14} />
                : <><CreditCard size={14} /> Activar Suscripción</>
              }
            </button>

          </form>
        )}

        <div className="px-6 pb-6 flex items-center gap-2 justify-center">
          <Shield size={12} className="text-gray-300" />
          <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">
            Pago seguro procesado por Mercado Pago
          </p>
        </div>

      </div>
    </div>
  );
}
