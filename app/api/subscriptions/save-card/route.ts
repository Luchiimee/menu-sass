import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MP_BASE = 'https://api.mercadopago.com';

const mpHeaders = (idempotencyKey?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
  ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
});

async function getOrCreateCustomer(
  email: string,
  existingCustomerId: string | null,
  firstName: string
): Promise<string> {
  if (existingCustomerId) return existingCustomerId;

  const search = await fetch(
    `${MP_BASE}/v1/customers/search?email=${encodeURIComponent(email)}`,
    { headers: mpHeaders() }
  );
  const searchData = await search.json();
  if (searchData.results?.length > 0) return searchData.results[0].id;

  const create = await fetch(`${MP_BASE}/v1/customers`, {
    method: 'POST',
    headers: mpHeaders(crypto.randomUUID()),
    body: JSON.stringify({ email, first_name: firstName }),
  });
  const customer = await create.json();
  if (!create.ok) throw new Error(customer.message || 'Error al crear customer en MP');
  return customer.id;
}

export async function POST(req: Request) {
  try {
    // 1. Autenticación
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const userId = sessionUser.id;

    // 2. Body
    const { token, paymentMethodId, email, planId } = await req.json();
    if (!token || !email) {
      return NextResponse.json(
        { error: 'Faltan datos: token y email son requeridos' },
        { status: 400 }
      );
    }

    // Obtener restaurant y perfil en paralelo
    const [{ data: restaurant, error: restError }, { data: profile }] = await Promise.all([
      supabase
        .from('restaurants')
        .select('id, created_at, mp_customer_id, mp_preapproval_id, subscription_status, subscription_plan, trial_ends_at, grace_period_until')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('first_name')
        .eq('id', userId)
        .maybeSingle(),
    ]);

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    // 3. Grace period — solo informativo; en ningún caso cobramos aquí
    const now = new Date();
    const inGrace =
      !!restaurant.grace_period_until &&
      new Date(restaurant.grace_period_until) > now;

    // 4. Obtener o crear customer en MP
    const customerId = await getOrCreateCustomer(
      email,
      restaurant.mp_customer_id ?? null,
      profile?.first_name ?? ''
    );

    // 5. Borrar tarjetas anteriores del customer
    const existingCardsRes = await fetch(
      `${MP_BASE}/v1/customers/${customerId}/cards`,
      { headers: mpHeaders() }
    );
    const existingCards = await existingCardsRes.json();
    if (Array.isArray(existingCards) && existingCards.length > 0) {
      await Promise.all(
        existingCards.map((c: any) =>
          fetch(`${MP_BASE}/v1/customers/${customerId}/cards/${c.id}`, {
            method: 'DELETE',
            headers: mpHeaders(),
          })
        )
      );
    }

    // 6. Guardar nueva tarjeta
    const cardRes = await fetch(`${MP_BASE}/v1/customers/${customerId}/cards`, {
      method: 'POST',
      headers: mpHeaders(crypto.randomUUID()),
      body: JSON.stringify({ token }),
    });
    const card = await cardRes.json();

    if (!cardRes.ok) {
      console.error('MP saveCard ERROR:', JSON.stringify(card, null, 2));
      return NextResponse.json(
        { error: card.message || 'Error al guardar la tarjeta en Mercado Pago' },
        { status: 502 }
      );
    }

    const cardId: string = card.id;
    const cardLastFour: string = card.last_four_digits ?? '';
    // payment_method_id es el campo real de MP (ej: "visa", "master")
    const cardBrand: string = card.payment_method_id ?? paymentMethodId ?? '';

    // 7. Calcular trial_ends_at
    let trialEndsAt: string | null = null;

    if (inGrace) {
      // Usuarios migrados en gracia: el cron cobra en grace_period_until
      trialEndsAt = restaurant.grace_period_until;
    } else if (restaurant.trial_ends_at) {
      // Ya tiene trial_ends_at → mantenerla sin tocarla
      trialEndsAt = restaurant.trial_ends_at;
    } else if (restaurant.created_at) {
      // Nuevo usuario sin trial_ends_at → calcular desde created_at
      const trialEnd = new Date(restaurant.created_at);
      trialEnd.setDate(trialEnd.getDate() + 14);
      trialEndsAt = trialEnd.toISOString();
    }

    // 8. UPDATE restaurants
    const updatePayload: Record<string, any> = {
      mp_customer_id:  customerId,
      mp_card_id:      cardId,
      card_last_four:  cardLastFour,
      card_brand:      cardBrand,
      mp_preapproval_id: null, // limpiar cualquier preapproval viejo
    };

    if (planId) updatePayload.subscription_plan = planId;
    if (trialEndsAt) updatePayload.trial_ends_at = trialEndsAt;

    const { error: updateError } = await supabase
      .from('restaurants')
      .update(updatePayload)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Supabase UPDATE error (save-card):', updateError);
      return NextResponse.json(
        { error: 'Error al guardar datos en la base de datos' },
        { status: 500 }
      );
    }

    // 9. Éxito
    return NextResponse.json({ success: true, card_last_four: cardLastFour, card_brand: cardBrand });
  } catch (err: any) {
    console.error('SERVER ERROR (save-card):', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
