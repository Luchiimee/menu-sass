// api/webhooks/mercadopago/route.ts
import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { supabase } from "@/lib/supabase";

const client = new MercadoPagoConfig({
  accessToken:
    "APP_USR-7993102997429224-012119-bfa50f1ec737617062e24089c3bbd985-191097426",
});

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    // MP manda a veces topic y a veces type, capturamos ambos
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const id = url.searchParams.get("id") || url.searchParams.get("data.id");

    // Escuchamos suscripciones (preapproval)
    if (topic === "preapproval" && id) {
      const preapproval = new PreApproval(client);
      const subscription = await preapproval.get({ id: id });

      const userId = subscription.external_reference;
      const status = subscription.status; // 'authorized', 'paused', 'cancelled'

      if (userId && status === "authorized") {
        const amount = subscription.auto_recurring?.transaction_amount || 0;

        // --- AJUSTE DE DETECCIÓN DE PLAN ---
        let newPlan = "light";
        if (amount >= 28600) {
          newPlan = "max";
        } else if (amount >= 15900) {
          newPlan = "plus";
        } else if (amount >= 7400) {
          newPlan = "light";
        }

        console.log(
          `✅ Suscripción exitosa: Usuario ${userId} activó Plan ${newPlan.toUpperCase()}`,
        );

        // Actualizamos el plan y podemos guardar el ID de suscripción por si cancela después
        await supabase
          .from("restaurants")
          .update({
            subscription_plan: newPlan,
            // Es buena idea guardar esto para poder cancelar la suscripción desde tu app luego
            // mp_subscription_id: id
          })
          .eq("user_id", userId);
      }

      // Si el usuario cancela la suscripción desde Mercado Pago
      if (userId && (status === "cancelled" || status === "paused")) {
        console.log(
          `⚠️ Suscripción pausada o cancelada para el usuario ${userId}`,
        );
        await supabase
          .from("restaurants")
          .update({
            subscription_plan: "free", // O el plan base que tengas
          })
          .eq("user_id", userId);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
