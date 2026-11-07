import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';
import { cancelPreapproval } from '@/lib/mercadopagoBilling';
import { decideCancel, PRE_NO_ID_CODE, PRE_NO_ID_MESSAGE } from '@/lib/cancelDecision';

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
      .select('id, subscription_status, mp_preapproval_id, mp_card_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    const decision = decideCancel(restaurant);

    // Cobra MP por su cuenta pero Snappy no tiene el preapproval: no podemos cancelarlo
    // desde acá. No tocamos el estado ni la tarjeta, para no mostrar "cancelada" mientras
    // MP sigue cobrando.
    if (decision === 'blocked_no_id') {
      console.error(`cancel — ${PRE_NO_ID_CODE} restaurant=${restaurant.id}: activo sin mp_preapproval_id ni mp_card_id, no se cancela`);
      return NextResponse.json(
        { success: false, code: PRE_NO_ID_CODE, message: PRE_NO_ID_MESSAGE },
        { status: 409 }
      );
    }

    // Si tiene preapproval en MP, cancelarlo primero. Si MP no lo confirma,
    // no tocamos la base: borrar mp_preapproval_id perdería la referencia y MP
    // seguiría cobrando.
    if (decision === 'cancel_mp' && restaurant.mp_preapproval_id) {
      const result = await cancelPreapproval(restaurant.mp_preapproval_id);
      if (!result.ok) {
        console.error(`cancel — MP no canceló el preapproval ${restaurant.mp_preapproval_id}:`, result.detail);
        return NextResponse.json(
          { error: 'No pudimos cancelar la suscripción en Mercado Pago. Intentá de nuevo en unos minutos.' },
          { status: 502 }
        );
      }
    }

    // El id solo se borra si había uno y MP ya confirmó la cancelación (cancel_mp).
    const update: Record<string, any> = {
      subscription_status: 'cancelled',
      mp_card_id:          null,
    };
    if (decision === 'cancel_mp') update.mp_preapproval_id = null;

    const { error: updateError } = await supabase
      .from('restaurants')
      .update(update)
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
