import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MP_BASE = 'https://api.mercadopago.com';
const mpHeaders = () => ({
  Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
});

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener el email del usuario desde su perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', sessionUser.id)
      .maybeSingle();

    const email = profile?.email || sessionUser.email;
    if (!email) {
      return NextResponse.json({ card: null });
    }

    // Buscar el customer en MP por email
    const searchRes = await fetch(
      `${MP_BASE}/v1/customers/search?email=${encodeURIComponent(email)}`,
      { headers: mpHeaders() }
    );
    if (!searchRes.ok) return NextResponse.json({ card: null });

    const searchData = await searchRes.json();
    const customerId = searchData.results?.[0]?.id;
    if (!customerId) return NextResponse.json({ card: null });

    // Obtener tarjetas del customer
    const cardsRes = await fetch(
      `${MP_BASE}/v1/customers/${customerId}/cards`,
      { headers: mpHeaders() }
    );
    if (!cardsRes.ok) return NextResponse.json({ card: null });

    const cards = await cardsRes.json();
    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json({ card: null });
    }

    // Tomamos la primera tarjeta (la más reciente)
    const c = cards[0];
    return NextResponse.json({
      card: {
        brand: c.payment_method_id ?? 'card',
        last4: c.last_four_digits ?? '????',
        expMonth: c.expiration_month ?? 0,
        expYear: c.expiration_year ?? 0,
      },
    });
  } catch (err: any) {
    console.error('SERVER ERROR (card):', err);
    return NextResponse.json({ card: null });
  }
}
