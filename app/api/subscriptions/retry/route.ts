import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const userId = sessionUser.id;

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('mp_preapproval_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!restaurant?.mp_preapproval_id) {
      return NextResponse.json({ error: 'No hay suscripción activa' }, { status: 400 });
    }

    // Intentar reactivar la suscripción pausada
    const mpResponse = await fetch(
      `https://api.mercadopago.com/preapproval/${restaurant.mp_preapproval_id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ status: 'authorized' }),
      }
    );

    const data = await mpResponse.json();

    if (!mpResponse.ok || data.status === 'paused') {
      return NextResponse.json({ success: false, retry: true });
    }

    // Cobro exitoso — actualizar Supabase
    await supabase
      .from('restaurants')
      .update({ subscription_status: 'active' })
      .eq('user_id', userId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('SERVER ERROR (retry):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
