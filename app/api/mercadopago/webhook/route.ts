import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // 1. Configurar Supabase con Service Role para saltar RLS
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() { },
      },
    }
  );

  try {
    const body = await req.json();
    console.log("🔔 Webhook recibido de MP:", body);

    // Mercado Pago envía notificaciones de tipo 'subscription_preapproval'
    if (body.type === "subscription_preapproval" || body.action?.includes("created")) {
      const preapprovalId = body.data?.id || body.id;

      // 2. Consultar a Mercado Pago los detalles reales
      const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
        }
      });

      if (!mpResponse.ok) throw new Error("No se pudo obtener datos de MP");
      
      const subscriptionData = await mpResponse.json();

      // 3. Si está autorizado, activamos el plan por ID de restaurante
      if (subscriptionData.status === "authorized") {
        const restaurantId = subscriptionData.external_reference; 

        if (!restaurantId) {
          console.error("❌ No se encontró external_reference en la suscripción");
          return NextResponse.json({ error: "No ID found" }, { status: 200 });
        }

        console.log(`🚀 Activando restaurante ID: ${restaurantId}`);

        // 4. ACTUALIZACIÓN DIRECTA: Ya no necesitamos buscar perfiles por email
        const { error } = await supabase
          .from("restaurants")
          .update({
            subscription_status: "authorized",
            mp_preapproval_id: preapprovalId,
          })
          .eq("id", restaurantId); 

        if (error) throw error;
        console.log("✅ Restaurante activado con éxito en Supabase");
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Error en Webhook:", error.message);
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}