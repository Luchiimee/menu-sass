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

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const userId = sessionUser.id;

    const { token, email } = await req.json();
    if (!token || !email) {
      return NextResponse.json({ error: 'Faltan datos: token y email son requeridos' }, { status: 400 });
    }

    // Obtener mp_customer_id guardado (evita search por email si ya lo tenemos)
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('mp_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    // Obtener o crear customer en MP
    let customerId: string = restaurant.mp_customer_id ?? '';

    if (!customerId) {
      const search = await fetch(
        `${MP_BASE}/v1/customers/search?email=${encodeURIComponent(email)}`,
        { headers: mpHeaders() }
      );
      const searchData = await search.json();

      if (searchData.results?.length > 0) {
        customerId = searchData.results[0].id;
      } else {
        const create = await fetch(`${MP_BASE}/v1/customers`, {
          method: 'POST',
          headers: mpHeaders(crypto.randomUUID()),
          body: JSON.stringify({ email }),
        });
        const customer = await create.json();
        if (!create.ok) {
          return NextResponse.json({ error: customer.message || 'Error al crear customer' }, { status: 502 });
        }
        customerId = customer.id;
      }
    }

    // Borrar tarjetas existentes del customer
    const existingRes = await fetch(
      `${MP_BASE}/v1/customers/${customerId}/cards`,
      { headers: mpHeaders() }
    );
    const existingCards = await existingRes.json();
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

    // Guardar nueva tarjeta
    const cardRes = await fetch(`${MP_BASE}/v1/customers/${customerId}/cards`, {
      method: 'POST',
      headers: mpHeaders(crypto.randomUUID()),
      body: JSON.stringify({ token }),
    });
    const card = await cardRes.json();

    if (!cardRes.ok) {
      console.error('MP update-card (save card) ERROR:', JSON.stringify(card, null, 2));
      return NextResponse.json({ error: card.message || 'Error al guardar tarjeta' }, { status: 502 });
    }

    const cardLastFour: string = card.last_four_digits ?? '';
    const cardBrand: string    = card.payment_method_id ?? '';

    // Persistir en DB — NO tocar subscription_status ni trial_ends_at
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        mp_customer_id:    customerId,
        mp_card_id:        card.id,
        card_last_four:    cardLastFour,
        card_brand:        cardBrand,
        mp_preapproval_id: null,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Supabase UPDATE error (update-card):', updateError);
      return NextResponse.json({ error: 'Error al guardar datos en la base de datos' }, { status: 500 });
    }

    return NextResponse.json({ success: true, card_last_four: cardLastFour, card_brand: cardBrand });
  } catch (err: any) {
    console.error('SERVER ERROR (update-card):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
