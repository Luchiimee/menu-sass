import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MP_BASE = 'https://api.mercadopago.com';
const mpHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
});

// Devuelve los datos de la tarjeta vinculada (marca, ultimos 4, vencimiento)
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const userId = sessionUser.id;

    // Emails candidatos para buscar el cliente en MP
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    const candidates = [profile?.email, sessionUser.email].filter(Boolean) as string[];
    const emails = Array.from(new Set(candidates));

    let customerId: string | null = null;
    for (const email of emails) {
      const res = await fetch(`${MP_BASE}/v1/customers/search?email=${encodeURIComponent(email)}`, { headers: mpHeaders() });
      const data = await res.json();
      if (data.results?.length > 0) {
        customerId = data.results[0].id;
        break;
      }
    }

    if (!customerId) return NextResponse.json({ card: null });

    const cardsRes = await fetch(`${MP_BASE}/v1/customers/${customerId}/cards`, { headers: mpHeaders() });
    const cards = await cardsRes.json();
    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json({ card: null });
    }

    const c = cards[0];
    return NextResponse.json({
      card: {
        brand: c.payment_method?.name || c.payment_method?.id || 'tarjeta',
        last4: c.last_four_digits,
        expMonth: c.expiration_month,
        expYear: c.expiration_year,
      },
    });
  } catch (err: any) {
    console.error('SERVER ERROR (card):', err);
    return NextResponse.json({ card: null });
  }
}
