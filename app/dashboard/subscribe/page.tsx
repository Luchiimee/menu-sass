"use client";

import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { useState } from "react";

initMercadoPago(process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY!);

export default function SubscribePage() {

  const [plan, setPlan] = useState("light");

  return (
    <div className="max-w-xl mx-auto p-10">

      <h1 className="text-2xl font-bold mb-6">
        Activar Suscripción
      </h1>

      <CardPayment
        initialization={{
          amount: 10000,
          payer: {
            email: "",
          },
        }}

        onReady={() => {
          console.log("Formulario listo");
        }}

        onError={(error) => {
          console.error("Error Brick:", error);
        }}

        onSubmit={async (formData) => {

          const res = await fetch("/api/mercadopago/create-subscription", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token: formData.token,
              email: formData.payer.email,
              plan: plan,
              restaurant_id: "RESTAURANT_ID_AQUI"
            }),
          });

          const data = await res.json();

          console.log("Respuesta servidor:", data);
        }}
      />

    </div>
  );
}