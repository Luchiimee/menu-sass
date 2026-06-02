import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prices: Record<string, number> = {
  light: 15000,
  go: 22000,
  plus: 35000,
};

export async function POST(req: Request) {
  try {
    const { userId, plan } = await req.json();

    if (!userId || !plan || !prices[plan]) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('mp_preapproval_id, subscription_status')
      .eq('user_id', userId)
      .maybeSingle();

    const preapprovalId = restaurant?.mp_preapproval_id;
    const status = restaurant?.subscription_status;

    // Si tiene suscripción activa en MP, actualizarla
    if (preapprovalId && (status === 'active' || status === 'authorized')) {
      const mpResponse = await fetch(
        `https://api.mercadopago.com/preapproval/${preapprovalId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            auto_recurring: {
              transaction_amount: prices[plan],
            },
          }),
        }
      );

      if (!mpResponse.ok) {
        const err = await mpResponse.json();
        console.error('MP change plan error:', err);
        return NextResponse.json({ error: 'Error al actualizar en MP' }, { status: 500 });
      }
    }

    // Actualizar Supabase
    await supabase
      .from('restaurants')
      .update({ subscription_plan: plan })
      .eq('user_id', userId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('SERVER ERROR (change):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
