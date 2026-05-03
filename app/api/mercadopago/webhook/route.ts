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
const status = subscription.status;
const nextPayment = subscription.next_payment_date;
const externalRef = subscription.external_reference; 

// Sacamos los datos de la tarjeta del objeto de MP
// MP suele devolver 'last_four_digits' y 'payment_method_id' en la suscripción
const cardLastFour = subscription.payment_methods_allowed?.last_four_digits || null;
const cardBrand = subscription.payment_methods_allowed?.payment_method_id || null;

const { error } = await supabase
  .from("restaurants")
  .update({
    subscription_status: status,
    subscription_plan: subscription.reason.split(' ')[1]?.toLowerCase(), // Intenta recuperar el plan del nombre
    next_billing_date: nextPayment,
    mp_preapproval_id: subscription.id,
    // ¡IMPORTANTE! Si no actualizamos esto, la UI nunca muestra la tarjeta
    card_last_four: cardLastFour, 
    card_brand: cardBrand
  })
  .eq("id", externalRef); // Usamos el external_reference que es el ID del restaurante

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