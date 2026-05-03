'use client';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';

// Inicializa con tu PUBLIC_KEY
initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!);

export default function PaymentForm({ userEmail }: { userEmail: string }) {
  
  const onSubmit = async (formData: any) => {
    //formData contiene el card_token generado por MP
    const response = await fetch('/api/subscriptions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: formData.token,
        payment_method_id: formData.payment_method_id,
        email: userEmail,
      }),
    });
    
    if (response.ok) {
        // Redirigir a "Mi Cuenta" tipo Netflix
    }
  };

  return (
    <CardPayment
      initialization={{ amount: 1 }} // El monto lo define el Plan, pero MP pide un valor inicial
      onSubmit={onSubmit}
      customization={{
        visual: {
          style: {
            theme: 'flat', // Diseño limpio para Snappy
          }
        },
        paymentMethods: {
          maxInstallments: 1, // Suscripciones no suelen tener cuotas
        }
      }}
    />
  );
}