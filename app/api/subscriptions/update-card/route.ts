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

export async function POST(req: Request) {
  try {
    const { token, userId, email, mpPreapprovalId } = await req.json();

    if (!token || !userId || !email) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // 1. Buscar el cliente en MP por email
    const search = await fetch(
      `${MP_BASE}/v1/customers/search?email=${encodeURIComponent(email)}`,
      { headers: mpHeaders() }
    );
    const searchData = await search.json();

    let customerId: string;
    if (searchData.results?.length > 0) {
      customerId = searchData.results[0].id;
    } else {
      const create = await fetch(`${MP_BASE}/v1/customers`, {
        method: 'POST',
        headers: mpHeaders(),
        body: JSON.stringify({ email }),
      });
      const customer = await create.json();
      customerId = customer.id;
    }

    // 2. Guardar la nueva tarjeta
    const cardRes = await fetch(`${MP_BASE}/v1/customers/${customerId}/cards`, {
      method: 'POST',
      headers: mpHeaders(),
      body: JSON.stringify({ token }),
    });
    const card = await cardRes.json();

    if (!cardRes.ok) {
      console.error('MP update-card ERROR:', card);
      return NextResponse.json({ error: card.message || 'Error al guardar tarjeta' }, { status: 500 });
    }

    // 3. Actualizar el preapproval con la nueva tarjeta y reactivar si estaba pausado
    if (mpPreapprovalId) {
      const mpUpdate = await fetch(`${MP_BASE}/preapproval/${mpPreapprovalId}`, {
        method: 'PUT',
        headers: mpHeaders(),
        body: JSON.stringify({
          card_id: card.id,
          status: 'authorized',
        }),
      });

      if (!mpUpdate.ok) {
        const err = await mpUpdate.json();
        console.error('MP reactivate error:', err);
      }
    }

    // 4. Actualizar Supabase
    await supabase
      .from('restaurants')
      .update({ subscription_status: 'active' })
      .eq('user_id', userId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('SERVER ERROR (update-card):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
