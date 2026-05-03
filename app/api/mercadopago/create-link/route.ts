// app/api/mercadopago/create-link/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { plan, restaurant_id, email } = await req.json();

    const planIds: Record<string, string> = {
      light: "3aa6c7cc41fb4bfab3e9967e1bcbaeb5", 
      go: "979bc6ba5ebe4d5fa4d5b1c823586772",
      plus: "65dd4645b714425c814a482978375c74"
    };

    // EL PAYLOAD MÍNIMO: 
    // No mandamos fechas, no mandamos status, no mandamos payer complejo.
    const payload = {
      preapproval_plan_id: planIds[plan],
      payer_email: email.trim().toLowerCase(),
      external_reference: restaurant_id, // 👈 Importante para tu Webhook
      back_url: "https://snappy.uno/dashboard/plan",
      reason: `Suscripción Plan ${plan.toUpperCase()} - Snappy`,
    };

    const response = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Error MP:", data);
      return NextResponse.json({ error: data.message }, { status: 400 });
    }
    
    // Devolvemos la URL para que el usuario navegue a Mercado Pago
    return NextResponse.json({ url: data.init_point });

  } catch (error: any) {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}