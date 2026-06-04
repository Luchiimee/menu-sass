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

const MP_BASE = 'https://api.mercadopago.com';
const mpHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
});

async function getOrCreateCustomer(email: string): Promise<string> {
  // Buscar cliente existente por email
  const search = await fetch(`${MP_BASE}/v1/customers/search?email=${encodeURIComponent(email)}`, {
    headers: mpHeaders(),
  });
  const searchData = await search.json();

  if (searchData.results?.length > 0) {
    return searchData.results[0].id;
  }

  // Crear nuevo cliente
  const create = await fetch(`${MP_BASE}/v1/customers`, {
    method: 'POST',
    headers: mpHeaders(),
    body: JSON.stringify({ email }),
  });
  const customer = await create.json();
  return customer.id;
}

async function saveCard(customerId: string, token: string): Promise<string> {
  const res = await fetch(`${MP_BASE}/v1/customers/${customerId}/cards`, {
    method: 'POST',
    headers: mpHeaders(),
    body: JSON.stringify({ token }),
  });
  const card = await res.json();

  if (!res.ok) {
    console.error('MP saveCard ERROR completo:', JSON.stringify(card, null, 2));
    throw new Error(card.message || 'Error al guardar la tarjeta');
  }

  return card.id;
}

export async function POST(req: Request) {
  try {
    const { token, plan, userId, email } = await req.json();

    if (!token || !plan || !userId || !email) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    if (!prices[plan]) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }

    // Calcular si el usuario está dentro del trial para programar el primer cobro
    const { data: restData } = await supabase
      .from('restaurants')
      .select('created_at')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date();
    let autoStartDate: string | undefined;
    if (restData?.created_at) {
      const trialEnd = new Date(restData.created_at);
      trialEnd.setDate(trialEnd.getDate() + 14);
      if (trialEnd > now) {
        autoStartDate = trialEnd.toISOString().split('.')[0] + 'Z';
      }
    }

    // Cancelar suscripción anterior si existe (evita suscripciones huérfanas)
    const { data: existing } = await supabase
      .from('restaurants')
      .select('mp_preapproval_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.mp_preapproval_id) {
      await fetch(`${MP_BASE}/preapproval/${existing.mp_preapproval_id}`, {
        method: 'PUT',
        headers: mpHeaders(),
        body: JSON.stringify({ status: 'cancelled' }),
      });
    }

    // 1. Obtener o crear cliente en MP
    const customerId = await getOrCreateCustomer(email);

    // 2. Borrar tarjetas existentes para evitar duplicados (especialmente en sandbox)
    const existingCardsRes = await fetch(`${MP_BASE}/v1/customers/${customerId}/cards`, { headers: mpHeaders() });
    const existingCards = await existingCardsRes.json();
    if (Array.isArray(existingCards)) {
      await Promise.all(existingCards.map((c: any) =>
        fetch(`${MP_BASE}/v1/customers/${customerId}/cards/${c.id}`, { method: 'DELETE', headers: mpHeaders() })
      ));
    }

    // 3. Guardar nueva tarjeta
    const cardId = await saveCard(customerId, token);

    // 3. Crear suscripción con card_id
    const body: any = {
      reason: `Plan ${plan.toUpperCase()} - Snappy`,
      payer_email: email,
      external_reference: userId,
      back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/plan`,
      card_id: cardId,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: prices[plan],
        currency_id: 'ARS',
      },
    };

    // Si está en trial, programar el primer cobro para el día 14
    if (autoStartDate) {
      body.auto_start_date = autoStartDate;
    }

    const mpResponse = await fetch(`${MP_BASE}/preapproval`, {
      method: 'POST',
      headers: mpHeaders(),
      body: JSON.stringify(body),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('MP ERROR (preapproval) completo:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: data.message || 'Error de Mercado Pago', details: data },
        { status: mpResponse.status }
      );
    }

    // Actualizar Supabase (el webhook también confirma)
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
    console.error('SERVER ERROR:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
