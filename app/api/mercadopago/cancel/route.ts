import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { createServerClient } from "@supabase/ssr"; // Importación correcta
import { cookies } from "next/headers";

const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN! });

export async function POST(req: Request) {
  // 1. En Next.js 15+, cookies() es una Promesa. Debemos esperar a que se resuelva.
  const cookieStore = await cookies(); 

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Ahora podemos llamar a getAll() porque ya hicimos el await arriba
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Manejo silencioso: en Route Handlers a veces no se pueden setear cookies si la respuesta ya empezó
          }
        },
      },
    }
  );

  try {
    // 2. Extraer el ID de la suscripción del cuerpo de la petición
    const { mpPreapprovalId } = await req.json();

    // 3. Validar sesión (Seguridad del Ecosistema Snappy)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 3. Cancelación permanente en Mercado Pago
    const preapproval = new PreApproval(mp);
    await preapproval.update({
      id: mpPreapprovalId,
      body: { status: "cancelled" }
    });

    // 4. Sincronización de base de datos
    await supabase
      .from("restaurants")
      .update({ 
        subscription_status: "cancelled",
        mp_preapproval_id: null,
        card_last_four: null,
        card_brand: null 
      })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Cancel Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}