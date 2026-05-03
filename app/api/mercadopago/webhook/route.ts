import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("Webhook recibido:", body);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const type = body.type;
    const data = body.data;

    if (type !== "preapproval") {
      return NextResponse.json({ received: true });
    }

    const preapprovalId = data.id;

    const mpRes = await fetch(
      `https://api.mercadopago.com/preapproval/${preapprovalId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      }
    );

    const subscription = await mpRes.json();

    const status = subscription.status;

    console.log("Estado suscripción:", status);

    const { error } = await supabase
      .from("restaurants")
      .update({
        subscription_status: status,
      })
      .eq("mp_preapproval_id", preapprovalId);

    if (error) {
      console.error("Error actualizando suscripción:", error);
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}