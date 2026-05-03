import { MercadoPagoConfig, Customer, PreApproval } from 'mercadopago';
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Inicialización del cliente con validación de entorno
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
if (!accessToken) throw new Error("MERCADO_PAGO_ACCESS_TOKEN no configurado");

const client = new MercadoPagoConfig({ accessToken });

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
    
    // 1. Validación de Sesión (Seguridad RLS)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // 2. Gestión de Customer (Idempotencia en MP)
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
      if (!newCustomer.id) throw new Error("Fallo al crear Customer en Mercado Pago");
      mpCustomerId = newCustomer.id;
    }

    // 3. Lógica de Trial Dinámico (Regla de Oro: ISO 8601 UTC)
    const { data: restData } = await supabase
      .from('restaurants')
      .select('created_at')
      .eq('id', restaurant_id)
      .single();

    if (!restData) throw new Error("Registro de restaurante no encontrado");

    // Calculamos 14 días desde la creación del restaurante
    const trialDate = new Date(restData.created_at);
    trialDate.setDate(trialDate.getDate() + 14);
    
    const now = new Date();
    // Aseguramos que el cobro sea SIEMPRE en el futuro (mínimo 1 hora adelante) para evitar 'invalid_start_date'
    const finalStartDate = trialDate > now ? trialDate : new Date(now.getTime() + 3600000);
    
    // Formato estricto: YYYY-MM-DDTHH:mm:ssZ
    const mpStartDate = finalStartDate.toISOString().split('.')[0] + "Z";

    // 4. Mapeo de Planes (Jerarquía Plan -> Suscripción)
    const planIds: Record<string, string> = {
      light: "3aa6c7cc41fb4bfab3e9967e1bcbaeb5", 
      go: "979bc6ba5ebe4d5fa4d5b1c823586772",
      plus: "65dd4645b714425c814a482978375c74"
    };

    const targetPlanId = planIds[plan as keyof typeof planIds];
    if (!targetPlanId) throw new Error(`Plan ID inválido: ${plan}`);

    // 5. Creación de la Suscripción (PreApproval)
    const preApprovalClient = new PreApproval(client);

    // Bypass de tipos con 'any' debido a propiedades dinámicas del SDK v2
    const subscriptionBody: any = {
      preapproval_plan_id: targetPlanId,
      payer_email: email,
      card_token_id: token,
      status: "authorized",
      auto_start_date: mpStartDate,
      external_reference: restaurant_id,
      back_url: "https://snappy.uno/dashboard/plan",
      reason: `Suscripción Plan ${plan.toUpperCase()} - Snappy`
    };

    const subscription = await preApprovalClient.create({ body: subscriptionBody });

    if (!subscription.id) throw new Error("Mercado Pago no devolvió un ID de suscripción válido");

    // 6. Persistencia Atómica (Lógica de Negocio: Sincronizar como Authorized)
    const updatePayload = {
      subscription_plan: plan,
      subscription_status: 'authorized', // Desbloquea UI inmediatamente
      mp_preapproval_id: subscription.id,
      card_last_four: last_four,
      card_brand: brand,
      next_billing_date: mpStartDate
    };

    const { error: upsertError } = await supabase.from('subscriptions').upsert({
      user_id: user.id,
      mp_customer_id: mpCustomerId,
      ...updatePayload,
      trial_ends_at: mpStartDate
    });

    const { error: updateError } = await supabase.from('restaurants').update({
      subscription_plan: plan,
      subscription_status: 'authorized',
      mp_preapproval_id: subscription.id,
      card_last_four: last_four,
      card_brand: brand
    }).eq('id', restaurant_id);

    if (upsertError || updateError) {
      // Loggear pero no fallar la respuesta al cliente ya que el cobro en MP ya está programado
      console.error("⚠️ Error de sincronización DB:", upsertError || updateError);
    }

    return NextResponse.json({ 
      success: true, 
      subscription_id: subscription.id,
      next_billing: mpStartDate 
    });

  } catch (error: any) {
    console.error("❌ MP Integration Master Error:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Error interno en el servidor de pagos" }, 
      { status: 400 } // Error de solicitud (ej: tarjeta rechazada o ID inválido)
    );
  }
}