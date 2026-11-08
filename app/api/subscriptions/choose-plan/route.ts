import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';
import { decidePlanChange } from '@/lib/planChoice';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Elegir/cambiar el plan durante la prueba (sin cobro). Server-side porque subscription_plan está
// protegida contra escrituras con sesión de usuario. Escribe SOLO subscription_plan.
// Con active/authorized/paused/cancelled responde 409: esos cambios pasan por change o save-card.
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const userId = sessionUser.id;

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan;

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('subscription_status, subscription_plan')
      .eq('user_id', userId)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json({ error: 'no_restaurant', message: 'Todavía no tenés un local. Activá un plan primero.' }, { status: 404 });
    }

    const decision = decidePlanChange(restaurant.subscription_status, restaurant.subscription_plan, plan);

    if (decision === 'invalid_plan') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    if (decision === 'use_billing_flow') {
      return NextResponse.json(
        {
          error: 'use_billing_flow',
          message: 'Con tu suscripción en este estado el cambio de plan se hace desde el flujo de pago. Configurá tu método de pago o cambiá el plan desde "Mi plan".',
        },
        { status: 409 }
      );
    }

    const { error } = await supabase.from('restaurants').update({ subscription_plan: plan }).eq('user_id', userId);
    if (error) {
      console.error('choose-plan — update falló:', error.code);
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan });
  } catch (err: any) {
    console.error('SERVER ERROR (choose-plan):', err?.message);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
