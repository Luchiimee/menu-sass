// app/api/mercadopago/create-link/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { plan, restaurant_id, email } = await req.json();

    // 1. Validación de entrada para evitar errores 400
    if (!plan || !restaurant_id || !email) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const planIds: Record<string, string> = {
      light: "3aa6c7cc41fb4bfab3e9967e1bcbaeb5", 
      go: "979bc6ba5ebe4d5fa4d5b1c823586772",
      plus: "65dd4645b714425c814a482978375c74"
    };


    const startDate = new Date();
    startDate.setHours(startDate.getHours() + 1); 
    const isoStartDate = startDate.toISOString().split('.')[0] + "Z";

    // 3. Payload para Mercado Pago
const payload = {
      preapproval_plan_id: planIds[plan],
      payer_email: email.trim().toLowerCase(),
      external_reference: restaurant_id,
      back_url: "https://snappy.uno/dashboard/plan",
      reason: `Suscripción Plan ${plan.toUpperCase()} - Snappy`,
      auto_start_date: isoStartDate,
     
    };
    console.log("🚀 Generando Preapproval para:", restaurant_id);

    const response = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // 4. Debugging de errores de la API de MP
    if (!response.ok) {
      console.error("❌ Error MP API:", data);
      return NextResponse.json({ 
        error: data.message || "Error al contactar con Mercado Pago",
        details: data.cause 
      }, { status: response.status });
    }
    
    // Devolvemos el init_point para la redirección
    return NextResponse.json({ url: data.init_point });

  } catch (error: any) {
    console.error("❌ Crash en create-link:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}