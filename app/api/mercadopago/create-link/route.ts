import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { plan, restaurant_id, email } = await req.json();

    if (!plan || !restaurant_id || !email) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const planIds: Record<string, string> = {
      light: "3aa6c7cc41fb4bfab3e9967e1bcbaeb5", 
      go: "979bc6ba5ebe4d5fa4d5b1c823586772",
      plus: "65dd4645b714425c814a482978375c74"
    };

    // 🚀 LA CLAVE ESTÁ ACÁ:
    // Eliminamos 'auto_start_date' y cualquier 'status'.
    // De esta forma, Mercado Pago usa la configuración del Plan que hiciste en el Dashboard.
    // Si el Plan tiene 14 días de prueba, MP lo aplicará automáticamente al abrir el link.
    
    const payload = {
      preapproval_plan_id: planIds[plan],
      payer_email: email.trim().toLowerCase(),
      external_reference: restaurant_id, // Vital para el Webhook
      back_url: "https://snappy.uno/dashboard/plan",
      reason: `Suscripción Plan ${plan.toUpperCase()} - Snappy`,
    };

    console.log("🚀 Creando suscripción para:", restaurant_id);

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
      console.error("❌ Error de MP:", data);
      // Si el error persiste acá, es por la configuración del Plan en el Dashboard de MP.
      return NextResponse.json({ 
        error: data.message || "Error al contactar con Mercado Pago" 
      }, { status: response.status });
    }
    
    // Retornamos la URL para que el frontend haga la redirección
    return NextResponse.json({ url: data.init_point });

  } catch (error: any) {
    console.error("❌ Crash:", error.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}