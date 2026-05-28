'use client';

import { useEffect } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { X, Shield } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_PRICES: Record<string, number> = {
  light: 10000,
  go: 16900,
  plus: 27000,
};

interface PaymentFormProps {
  plan: string;
  userId: string;
  userEmail: string;
  onSuccess: () => void;
  onClose: () => void;
}

let mpInitialized = false;

export default function PaymentForm({ plan, userId, userEmail, onSuccess, onClose }: PaymentFormProps) {
  const amount = PLAN_PRICES[plan] ?? 0;

  useEffect(() => {
    if (!mpInitialized && process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY) {
      initMercadoPago(process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY, { locale: 'es-AR' });
      mpInitialized = true;
    }
  }, []);

  const handleSubmit = async (formData: any) => {
    try {
      const res = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: formData.token,
          paymentMethodId: formData.payment_method_id,
          plan,
          userId,
          email: userEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar');
      }

      toast.success('¡Suscripción activada! Los primeros 14 días son gratis.');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar el pago');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-black text-lg uppercase italic tracking-tighter text-gray-900">
              Activar Plan {plan.toUpperCase()}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              ${amount.toLocaleString('es-AR')} / mes · 14 días gratis
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Brick */}
        <div className="p-6">
          <CardPayment
            initialization={{
              amount,
              payer: { email: userEmail },
            }}
            onSubmit={handleSubmit}
            onError={(error) => {
              console.error('MP Brick error:', error);
              toast.error('Error en el formulario de pago');
            }}
            customization={{
              visual: {
                style: { theme: 'flat' },
              },
              paymentMethods: {
                maxInstallments: 1,
              },
            }}
          />
        </div>

        {/* Footer */}
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
