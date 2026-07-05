import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';
import { chargeSubscription } from '@/lib/mercadopagoBilling';

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

    // 1. Obtener datos necesarios del restaurant
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('mp_customer_id, mp_card_id, card_brand, subscription_plan, owner_email')
      .eq('user_id', userId)
      .maybeSingle();

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    if (!restaurant.mp_card_id || !restaurant.mp_customer_id) {
      return NextResponse.json(
        { error: 'No hay tarjeta guardada. Agregá un método de pago primero.' },
        { status: 400 }
      );
    }

    // 2. Cobrar con la tarjeta guardada
    const result = await chargeSubscription({
      customerId: restaurant.mp_customer_id,
      cardId:     restaurant.mp_card_id,
      cardBrand:  restaurant.card_brand,
      plan:       restaurant.subscription_plan,
      payerEmail: restaurant.owner_email,
      description: `Snappy - Reintento cobro plan ${restaurant.subscription_plan}`,
    });

    // 3. Si approved: activar y setear próximo cobro
    if (result.outcome === 'approved') {
      const nextPayment = new Date();
      nextPayment.setDate(nextPayment.getDate() + 30);

      await supabase
        .from('restaurants')
        .update({
          subscription_status: 'active',
          next_payment_date:   nextPayment.toISOString(),
          mp_preapproval_id:   null,
        })
        .eq('user_id', userId);

      return NextResponse.json({ success: true, reactivated: true });
    }

    // 4. Pago fallido (rechazado o error de red/token): informar al frontend con detalle
    console.error(`retry — ${result.outcome}:`, result.detail);
    return NextResponse.json({
      success: false,
      error:   result.detail,
    });

  } catch (err: any) {
    console.error('SERVER ERROR (retry):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
