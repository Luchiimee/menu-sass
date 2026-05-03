import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prices: Record<string, number> = {
  light: 10000,
  go: 16900,
  plus: 27000,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { token, email, plan, restaurant_id } = body;

    if (!token || !email || !plan || !restaurant_id) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

    const price = prices[plan];

    const preapproval = new PreApproval(mp);

    // trial 14 días
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 14);

    const subscription = await preapproval.create({
      body: {
        reason: `Plan ${plan.toUpperCase()} - Snappy`,
        payer_email: email,
        card_token_id: token,
        status: "authorized",

        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: price,
          currency_id: "ARS",
          start_date: startDate.toISOString(),
        },

        back_url: "https://snappy.uno/dashboard",
      },
    });

    // guardar en Supabase
    const { error } = await supabase
      .from("restaurants")
      .update({
        subscription_status: "authorized",
        plan_id: plan,
        mp_preapproval_id: subscription.id,
      })
      .eq("id", restaurant_id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      start_date: startDate,
    });

  } catch (error: any) {
    console.error("MP Error:", error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}