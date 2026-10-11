import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';

// 1. Configuración del cliente Admin (Bypassea RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// 2. Función para GUARDAR suscripciones (POST)
// El dueño de la suscripción es SIEMPRE el usuario de la sesión: si el body
// trae un userId (el frontend lo manda), se ignora.
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const userId = sessionUser.id;

    const { subscription } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }, { onConflict: 'endpoint' });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. Función para BORRAR suscripciones (DELETE) - La que arregla el iPhone
// Solo borra suscripciones del usuario de la sesión con el endpoint del body.
export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const userId = sessionUser.id;

    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Cliente Admin: filtra igual por user_id de la sesión + endpoint
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}