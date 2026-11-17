import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';
import { getPreapproval } from '@/lib/mercadopagoBilling';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fecha del próximo cobro REAL de la cuenta (solo lectura, no cobra ni modifica nada):
// - con suscripción en MP: el next_payment_date de esa suscripción (si sigue autorizada)
// - sin suscripción y cobrada por el cron de Snappy: el next_payment_date de la base
// Si no se puede determinar devuelve null y la pantalla usa su cálculo de siempre.
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('subscription_status, mp_preapproval_id, next_payment_date')
      .eq('user_id', sessionUser.id)
      .maybeSingle();

    if (!restaurant || restaurant.subscription_status !== 'active') {
      return NextResponse.json({ nextChargeDate: null });
    }

    let raw: string | null = null;
    if (restaurant.mp_preapproval_id) {
      const pre = await getPreapproval(restaurant.mp_preapproval_id);
      if (pre.ok && pre.data?.status === 'authorized') raw = pre.data?.next_payment_date ?? null;
    } else {
      raw = restaurant.next_payment_date ?? null;
    }

    const d = raw ? new Date(raw) : null;
    return NextResponse.json({ nextChargeDate: d && !isNaN(d.getTime()) ? d.toISOString() : null });
  } catch (err: any) {
    console.error('SERVER ERROR (next-charge):', err);
    return NextResponse.json({ nextChargeDate: null });
  }
}
