import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const prices: Record<string, number> = { light: 15000, go: 22000, plus: 35000 };

// Activa un plan en modo trial. Server-side para evitar que el usuario
// resetee su trial infinitamente manipulando el cliente.
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const userId = sessionUser.id;

    const { plan } = await req.json();
    if (!plan || !prices[plan]) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('restaurants')
      .select('created_at, subscription_status, mp_preapproval_id')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date();

    // ¿El usuario sigue dentro de su ventana de trial original?
    let trialActive = true;
    if (existing?.created_at) {
      const trialEnd = new Date(existing.created_at);
      trialEnd.setDate(trialEnd.getDate() + 14);
      trialActive = trialEnd > now;
    }

    // Si el trial ya venció y no hay suscripción paga activa,
    // no se puede re-activar gratis: hay que cargar tarjeta.
    const hasPaidSub = !!existing?.mp_preapproval_id &&
      (existing?.subscription_status === 'active' || existing?.subscription_status === 'authorized');

    if (existing && !trialActive && !hasPaidSub) {
      return NextResponse.json(
        { error: 'trial_expired', message: 'Tu prueba gratuita ya finalizó. Configurá un método de pago para activar el plan.' },
        { status: 403 }
      );
    }

    // Construir update SIN tocar created_at (lo preserva en updates;
    // en un insert nuevo, Supabase lo setea por default).
    const payload: Record<string, any> = {
      user_id: userId,
      subscription_plan: plan,
    };
    // Solo ponemos status trialing si realmente está en trial.
    // Si ya tiene sub paga, no le bajamos el estado.
    if (!hasPaidSub) {
      payload.subscription_status = 'trialing';
    }
    if (!existing) {
      payload.name = 'Mi Local';
      payload.slug = `local-${userId.substring(0, 5)}`;
    }

    const { error } = await supabase
      .from('restaurants')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('SERVER ERROR (activate):', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
