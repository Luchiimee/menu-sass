import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { cancelSubscriptionForUser } from '@/lib/cancelSubscription';

// Cancela la suscripción del usuario logueado. El servicio sigue activo hasta el fin del período ya pagado
// (grace_period_until); la lógica está en lib/cancelSubscription.ts y la comparte POST /api/user/delete.
// Responde { success, serviceUntil } con la fecha de fin (ISO) o null si el corte es inmediato.
export async function POST() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const outcome = await cancelSubscriptionForUser(sessionUser.id);
    return NextResponse.json(outcome.body, { status: outcome.status });
  } catch (err: any) {
    console.error('SERVER ERROR (cancel):', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
