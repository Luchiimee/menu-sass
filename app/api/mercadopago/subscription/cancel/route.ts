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

    // Buscar el preapproval_id del usuario
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('mp_preapproval_id')
      .eq('user_id', userId)
      .maybeSingle();

    const preapprovalId = restaurant?.mp_preapproval_id;

    // Cancelar en MP si hay suscripción activa
    if (preapprovalId) {
      const mpResponse = await fetch(
        `https://api.mercadopago.com/preapproval/${preapprovalId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({ status: 'cancelled' }),
        }
      );

      if (!mpResponse.ok) {
        const err = await mpResponse.json();
        console.error('MP cancel error:', err);
        return NextResponse.json({ error: 'Error al cancelar en MP' }, { status: 500 });
      }
    }

    // Actualizar Supabase
    await supabase
      .from('restaurants')
      .update({ subscription_status: 'cancelled', mp_preapproval_id: null })
      .eq('user_id', userId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('SERVER ERROR (cancel):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
