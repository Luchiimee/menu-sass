import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MP_BASE = 'https://api.mercadopago.com';
const mpHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
});

const prices: Record<string, number> = {
  light: 15000,
  go: 22000,
  plus: 35000,
};

export async function POST(req: Request) {
  try {
    const { token, userId, email, mpPreapprovalId } = await req.json();

    if (!token || !userId || !email) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Obtener el plan actual del usuario
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('subscription_plan')
      .eq('user_id', userId)
      .maybeSingle();

    const plan = restaurant?.subscription_plan;
    if (!plan || !prices[plan]) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }

    // Cancelar suscripción anterior si existe
    if (mpPreapprovalId) {
      await fetch(`${MP_BASE}/preapproval/${mpPreapprovalId}`, {
        method: 'PUT',
        headers: mpHeaders(),
        body: JSON.stringify({ status: 'cancelled' }),
      });
    }

    // Crear/obtener cliente en MP
    const search = await fetch(`${MP_BASE}/v1/customers/search?email=${encodeURIComponent(email)}`, { headers: mpHeaders() });
    const searchData = await search.json();
    let customerId: string;
    if (searchData.results?.length > 0) {
      customerId = searchData.results[0].id;
    } else {
      const create = await fetch(`${MP_BASE}/v1/customers`, {
        method: 'POST', headers: mpHeaders(), body: JSON.stringify({ email }),
      });
      customerId = (await create.json()).id;
    }

    // Borrar tarjetas existentes del cliente para evitar duplicados
    const existingRes = await fetch(`${MP_BASE}/v1/customers/${customerId}/cards`, { headers: mpHeaders() });
    const existingCards = await existingRes.json();
    if (Array.isArray(existingCards)) {
      await Promise.all(existingCards.map((c: any) =>
        fetch(`${MP_BASE}/v1/customers/${customerId}/cards/${c.id}`, { method: 'DELETE', headers: mpHeaders() })
      ));
    }

    // Guardar nueva tarjeta
    const cardRes = await fetch(`${MP_BASE}/v1/customers/${customerId}/cards`, {
      method: 'POST', headers: mpHeaders(), body: JSON.stringify({ token }),
    });
    const card = await cardRes.json();

    if (!cardRes.ok) {
      console.error('MP update-card (save card) ERROR:', card);
      return NextResponse.json({ error: card.message || 'Error al guardar tarjeta' }, { status: 500 });
    }

    // Crear nueva suscripción con la nueva tarjeta
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const isoStartDate = startDate.toISOString().split('.')[0] + 'Z';

    const preapprovalRes = await fetch(`${MP_BASE}/preapproval`, {
      method: 'POST',
      headers: mpHeaders(),
      body: JSON.stringify({
        reason: `Plan ${plan.toUpperCase()} - Snappy`,
        payer_email: email,
        external_reference: userId,
        back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/plan`,
        card_id: card.id,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: prices[plan],
          currency_id: 'ARS',
        },
        auto_start_date: isoStartDate,
      }),
    });

    const preapproval = await preapprovalRes.json();

    if (!preapprovalRes.ok) {
      console.error('MP update-card (preapproval) ERROR:', preapproval);
      return NextResponse.json({ error: preapproval.message || 'Error al crear suscripción' }, { status: 500 });
    }

    // Actualizar Supabase
    await supabase
      .from('restaurants')
      .update({ subscription_status: 'active', mp_preapproval_id: preapproval.id })
      .eq('user_id', userId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('SERVER ERROR (update-card):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
