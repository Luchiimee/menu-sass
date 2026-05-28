import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prices: Record<string, number> = {
  light: 10000,
  go: 16900,
  plus: 27000,
};

export async function POST(req: Request) {
  try {
    const { token, paymentMethodId, plan, userId, email } = await req.json();

    if (!token || !plan || !userId || !email) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    if (!prices[plan]) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 14);
    const isoStartDate = startDate.toISOString().split('.')[0] + 'Z';

    const body = {
      reason: `Plan ${plan.toUpperCase()} - Snappy`,
      payer_email: email,
      external_reference: userId,
      back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/plan`,
      card_token_id: token,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: prices[plan],
        currency_id: 'ARS',
        free_trial: {
          frequency: 14,
          frequency_type: 'days',
        },
      },
      auto_start_date: isoStartDate,
      status: 'authorized',
    };

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('MP ERROR (subscriptions/create):', data);
      return NextResponse.json(
        { error: data.message || 'Error de Mercado Pago', details: data },
        { status: mpResponse.status }
      );
    }

    // Actualizamos Supabase de inmediato (el webhook también lo confirma)
    await supabase
      .from('restaurants')
      .update({
        mp_preapproval_id: data.id,
        subscription_status: 'active',
        subscription_plan: plan,
      })
      .eq('user_id', userId);

    return NextResponse.json({ success: true, preapprovalId: data.id });
  } catch (err: any) {
    console.error('SERVER ERROR (subscriptions/create):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}