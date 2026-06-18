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
