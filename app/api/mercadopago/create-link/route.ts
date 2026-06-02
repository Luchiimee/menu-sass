import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
const { email, plan, userId } = await req.json();

    if (!email || !plan) {
      return NextResponse.json(
        { error: "Faltan datos" },
        { status: 400 }
      );
    }

    const prices: Record<string, number> = {
      light: 15000,
      go: 22000,
      plus: 35000,
    };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 14); // Sumamos los 14 días
    const isoStartDate = startDate.toISOString().split('.')[0] + "Z";

   const body = {
  reason: `Plan ${plan.toUpperCase()} - Snappy`,
  payer_email: email,
  // 3. Vinculamos con el userId para que el Webhook funcione
  external_reference: userId, 
  back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/plan`,

  auto_recurring: {
    frequency: 1,
    frequency_type: "months",
    transaction_amount: prices[plan],
    currency_id: "ARS",
    // Agregamos esto para asegurar que el primer cobro sea $0 hoy
    free_trial: {
      frequency: 14,
      frequency_type: "days"
    }
  },
  
  auto_start_date: isoStartDate, // 👈 Fecha de inicio del primer cobro real
  status: "pending",
};

    
    const response = await fetch(
      "https://api.mercadopago.com/preapproval",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("MP ERROR:", data);
      return NextResponse.json(
        { error: data.message || "Error MP", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({
      url: data.init_point,
      mp_id: data.id,
    });

  } catch (err: any) {
    console.error("SERVER ERROR:", err);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}