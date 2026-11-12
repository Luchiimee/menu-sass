import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { cancelSubscriptionForUser } from '@/lib/cancelSubscription';

// Botón "Cancelar suscripción" de Configuración: cancela la suscripción del usuario LOGUEADO con la misma lógica que
// POST /api/mercadopago/subscription/cancel (lib/cancelSubscription.ts): el servicio sigue activo hasta el fin del
// período ya pagado y no se borra ningún dato del local. El usuario sale siempre de la sesión; si el body trae un
// userId (el frontend lo manda), se ignora.
export async function POST() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const outcome = await cancelSubscriptionForUser(sessionUser.id);
    return NextResponse.json(outcome.body, { status: outcome.status });
  } catch (error: any) {
    console.error('SERVER ERROR (user/delete):', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
