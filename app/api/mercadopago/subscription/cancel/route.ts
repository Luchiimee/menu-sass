import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';
import { cancelPreapproval } from '@/lib/mercadopagoBilling';

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

    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('mp_preapproval_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    // Si tiene preapproval en MP, cancelarlo primero. Si MP no lo confirma,
    // no tocamos la base: borrar mp_preapproval_id perdería la referencia y MP
    // seguiría cobrando.
    if (restaurant.mp_preapproval_id) {
      const result = await cancelPreapproval(restaurant.mp_preapproval_id);
      if (!result.ok) {
        console.error(`cancel — MP no canceló el preapproval ${restaurant.mp_preapproval_id}:`, result.detail);
        return NextResponse.json(
          { error: 'No pudimos cancelar la suscripción en Mercado Pago. Intentá de nuevo en unos minutos.' },
          { status: 502 }
        );
      }
    }

    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        subscription_status: 'cancelled',
        mp_preapproval_id:   null,
        mp_card_id:          null,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Supabase UPDATE error (cancel):', updateError);
      return NextResponse.json({ error: 'Error al cancelar la suscripción' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('SERVER ERROR (cancel):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
