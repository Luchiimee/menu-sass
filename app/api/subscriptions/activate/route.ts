import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';
import { isPlanId } from '@/lib/plans';
import { trialBaseDate, activationBlockedByTrial } from '@/lib/trialBase';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Activa un plan en modo trial. Server-side para evitar que el usuario
// resetee su trial infinitamente manipulando el cliente.
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const userId = sessionUser.id;

    const { plan } = await req.json();
    if (!isPlanId(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('restaurants')
      .select('created_at, subscription_status, mp_preapproval_id')
      .eq('user_id', userId)
      .maybeSingle();

    const now = new Date();

    // La prueba cuenta desde el registro (lib/trialBase): la más antigua entre el perfil y el local.
    const { data: prof } = await supabase.from('profiles').select('created_at').eq('id', userId).maybeSingle();
    const baseDate = trialBaseDate(prof?.created_at, existing?.created_at, sessionUser.created_at);

    // Si el trial ya venció y no hay suscripción paga activa,
    // no se puede re-activar gratis: hay que cargar tarjeta.
    const hasPaidSub = !!existing?.mp_preapproval_id &&
      (existing?.subscription_status === 'active' || existing?.subscription_status === 'authorized');

    // Con local y la prueba vencida, sin suscripción paga: hay que cargar tarjeta (403). Sin local no se bloquea:
    // el local nace con la prueba vencida (el panel lo bloquea por la fecha base) y save-card lo desbloquea.
    if (activationBlockedByTrial({ hasLocal: !!existing, hasPaidSub, baseDate, now })) {
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
