import { NextResponse } from "next/server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { createServerClient } from "@supabase/ssr"; // Miembro correcto
import { cookies } from "next/headers";

const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!
});

export async function POST(req: Request) {
  try {
    const { mpPreapprovalId, pause } = await req.json();

    // 1. SEGURIDAD: Obtener el store de cookies (Next.js 15+ requiere await)
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Manejo silencioso en Route Handlers
            }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!mpPreapprovalId) {
      return NextResponse.json({ error: "ID faltante" }, { status: 400 });
    }

    // 2. LÓGICA DE MERCADO PAGO: Pausar o Reanudar
    const preapproval = new PreApproval(mp);
    const newStatus = pause ? "paused" : "authorized";

    await preapproval.update({
      id: mpPreapprovalId,
      body: {
        status: newStatus,
      },
    });

    // 3. SINCRONIZACIÓN: Actualizamos el estado en Supabase para que el Dashboard refleje el cambio
    await supabase
      .from("restaurants")
      .update({ subscription_status: newStatus })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, status: newStatus });

  } catch (error: any) {
    console.error("Pause error:", error);
    return NextResponse.json(
      { error: error.message || "Error interno al procesar la pausa" },
      { status: 500 }
    );
  }
}