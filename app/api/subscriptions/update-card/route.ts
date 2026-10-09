import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';
import { cancelPreapproval, getPreapproval } from '@/lib/mercadopagoBilling';
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
      .select('mp_customer_id, mp_preapproval_id, next_payment_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    // Si tiene un preapproval en MP, cancelarlo ANTES de tocar tarjetas: con la
    // tarjeta nueva pasa al modelo de cobro por cron, y si el preapproval sigue
    // vivo MP seguiría cobrando por su lado. Si MP no confirma, abortamos sin
    // tocar nada para no perder la referencia.
    const hadPreapproval = !!restaurant.mp_preapproval_id;

    // Fecha del próximo cobro que tenía en MP: el cron lo cobra en esa fecha
    // con la tarjeta nueva, así no queda gratis ni se le cobra antes de tiempo.
    let nextPaymentDate: string | null = null;

    if (restaurant.mp_preapproval_id) {
      // Leer el preapproval ANTES de cancelarlo. Si falla, abortamos sin tocar nada.
      const pre = await getPreapproval(restaurant.mp_preapproval_id);
      if (!pre.ok) {
        console.error(`update-card — no se pudo leer el preapproval ${restaurant.mp_preapproval_id}:`, pre.detail);
        return NextResponse.json(
          { error: 'No pudimos consultar tu suscripción en Mercado Pago. Intentá de nuevo en unos minutos.' },
          { status: 502 }
        );
      }

      if (pre.data?.next_payment_date && !isNaN(new Date(pre.data.next_payment_date).getTime())) {
        nextPaymentDate = new Date(pre.data.next_payment_date).toISOString();
      } else if (restaurant.next_payment_date) {
        nextPaymentDate = restaurant.next_payment_date;
      } else {
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 30);
        nextPaymentDate = fallback.toISOString();
        console.error(`update-card — preapproval ${restaurant.mp_preapproval_id} sin next_payment_date (MP ni base); usando hoy + 30 días: ${nextPaymentDate}`);
      }

      const cancel = await cancelPreapproval(restaurant.mp_preapproval_id);
      if (!cancel.ok) {
        console.error(`update-card — MP no canceló el preapproval ${restaurant.mp_preapproval_id}:`, cancel.detail);
        return NextResponse.json(
          { error: 'No pudimos actualizar la suscripción en Mercado Pago. Intentá de nuevo en unos minutos.' },
          { status: 502 }
        );
      }
    }

    // El preapproval ya quedó cancelado en MP: si algo falla más adelante,
    // limpiamos la referencia igual para que la base no apunte a uno muerto, y
    // dejamos la fecha de cobro para que el cron lo procese (y lo pause si no hay tarjeta válida).
    const clearCancelledPreapproval = async () => {
      if (!hadPreapproval) return;
      await supabase
        .from('restaurants')
        .update({ mp_preapproval_id: null, next_payment_date: nextPaymentDate })
        .eq('user_id', userId);
    };

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
          await clearCancelledPreapproval();
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
      await clearCancelledPreapproval();
      return NextResponse.json({ error: card.message || 'Error al guardar tarjeta' }, { status: 502 });
    }

    const cardLastFour: string = card.last_four_digits ?? '';
    const cardBrand: string    = card.payment_method_id ?? '';

    // Persistir en DB — NO tocar subscription_status ni trial_ends_at.
    // Si venía de un preapproval, pasa al cobro por cron en la fecha que tenía en MP.
    const updatePayload: Record<string, any> = {
      mp_customer_id:    customerId,
      mp_card_id:        card.id,
      card_last_four:    cardLastFour,
      card_brand:        cardBrand,
      mp_preapproval_id: null,
    };
    if (hadPreapproval) updatePayload.next_payment_date = nextPaymentDate;

    const { error: updateError } = await supabase
      .from('restaurants')
      .update(updatePayload)
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
