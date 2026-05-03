import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, type, data } = body;

    // 1. Usamos Service Role para saltar políticas RLS en el webhook
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Filtramos solo lo que nos interesa para Snappy
    // MP envía 'subscription_preapproval' o 'preapproval' dependiendo de la versión
    if (type !== "preapproval" && type !== "subscription_preapproval" && type !== "subscription_authorized_payment") {
      return NextResponse.json({ received: true });
    }

    const resourceId = data.id;

   const mpRes = await fetch(
  `https://api.mercadopago.com/preapproval/${resourceId}`,
  {
    headers: {
      Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
    },
  }
);

if (!mpRes.ok) {
  const errorData = await mpRes.json();
  console.error("Error al consultar MP:", errorData);
  throw new Error(`Error consultando MP: ${mpRes.status}`);
}

const subscription = await mpRes.json();

    // 4. Lógica de Idempotencia y Actualización
    // 'authorized' significa que la suscripción está activa y el trial corriendo
    // 'paused' o 'cancelled' disparan la lógica de bloqueo en el SaaS
    const status = subscription.status;
    const nextPayment = subscription.next_payment_date;
    const externalRef = subscription.external_reference; // Aquí guardamos el restaurant_id

    const { error } = await supabase
      .from("restaurants")
      .update({
        subscription_status: status,
        next_billing_date: nextPayment,
        // Guardamos el ID de suscripción si no lo teníamos (idempotencia)
        mp_preapproval_id: subscription.id 
      })
      .or(`mp_preapproval_id.eq.${subscription.id},id.eq.${externalRef}`);

    if (error) {
      console.error("Error DB Webhook:", error.message);
      return NextResponse.json({ error: "DB Update Failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error("Webhook Master Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}