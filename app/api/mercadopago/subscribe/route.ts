import { MercadoPagoConfig, Customer, PreApproval } from 'mercadopago';
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const client = new MercadoPagoConfig({ 
 accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN! // 👈 Ajustado a tu .env
});

export async function POST(req: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  try {
    const { token, email, plan, restaurant_id, last_four, brand } = await req.json();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const customerClient = new Customer(client);
    let mpCustomerId: string = ""; 

    const { data: subData } = await supabase
      .from('subscriptions')
      .select('mp_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subData?.mp_customer_id) {
      mpCustomerId = subData.mp_customer_id;
    } else {
      const newCustomer = await customerClient.create({ body: { email } });
      if (!newCustomer.id) throw new Error("Error al crear Customer en MP");
      mpCustomerId = newCustomer.id;
    }

    const { data: restData, error: dbError } = await supabase
      .from('restaurants')
      .select('created_at')
      .eq('id', restaurant_id)
      .single();

    if (dbError || !restData) {
      return NextResponse.json({ error: "Restaurante no encontrado" }, { status: 404 });
    }

    const startDate = new Date(restData.created_at);
    startDate.setDate(startDate.getDate() + 14);
    const mpStartDate = startDate.toISOString().split('.')[0] + "Z"; 

    // 🚀 RECUERDA: Pon aquí los IDs que sacaste del dashboard
    const planIds = {
      light: "TU_ID_REAL_LIGHT", 
      go: "TU_ID_REAL_GO",
      plus: "TU_ID_REAL_PLUS"
    };

    const preApprovalClient = new PreApproval(client);

    const subscriptionBody: any = {
      preapproval_plan_id: planIds[plan as keyof typeof planIds], 
      payer_email: email,
      card_token_id: token,
      status: "authorized",
      auto_start_date: mpStartDate, 
      external_reference: restaurant_id,
      back_url: "https://snappy.uno/dashboard/plan"
    };

    const subscription = await preApprovalClient.create({
      body: subscriptionBody
    });

    // 7. ACTUALIZACIÓN DE BASE DE DATOS
    await supabase.from('subscriptions').upsert({
      user_id: user.id,
      mp_preapproval_id: subscription.id,
      mp_customer_id: mpCustomerId,
      status: 'authorized',
      card_last_four: last_four,
      card_brand: brand,
      next_billing_date: mpStartDate,
      trial_ends_at: mpStartDate
    });

    await supabase.from('restaurants').update({
        subscription_plan: plan,
        subscription_status: 'authorized',
        mp_preapproval_id: subscription.id,
        card_last_four: last_four,
        card_brand: brand
    }).eq('id', restaurant_id);

    return NextResponse.json(subscription);

  } catch (error: any) {
    console.error("MP Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}