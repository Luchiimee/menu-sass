import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// 1. Configuración del cliente Admin (Bypassea RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// 2. Función para GUARDAR suscripciones (POST)
export async function POST(req: NextRequest) {
  try {
    const { subscription, userId } = await req.json();

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
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint, userId } = await req.json();

    if (!endpoint || !userId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Usamos el cliente Admin para que borre aunque la sesión esté cerrada
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