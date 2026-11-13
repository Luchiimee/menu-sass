// Cancelar la suscripción de un usuario: lo comparten POST /api/mercadopago/subscription/cancel y POST /api/user/delete
// para que no haya dos comportamientos. SOLO servidor.
//
// El servicio sigue activo hasta el fin del período ya pagado: antes de cancelar en MP se lee el next_payment_date del
// preapproval (solo lectura; si falla, se sigue con corte inmediato, la cancelación no se bloquea) y se guarda en
// grace_period_until con subscription_status = 'cancelled'. Sin esa fecha (o fuera de rango) el corte es inmediato,
// como antes. La lógica de la fecha está en lib/cancelGrace.ts (scripts/check-cancel-grace.mjs).
//
// Los logs llevan solo un código corto: nunca ids de MP, correos ni datos del local.

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { cancelPreapproval, getPreapproval } from '@/lib/mercadopagoBilling';
import { decideCancel, PRE_NO_ID_CODE, PRE_NO_ID_MESSAGE } from '@/lib/cancelDecision';
import { computeCancelGrace, resolveServiceUntil } from '@/lib/cancelGrace';

export type CancelOutcome = { status: number; body: Record<string, unknown> };

export async function cancelSubscriptionForUser(userId: string): Promise<CancelOutcome> {
  const supabase = getSupabaseAdmin();

  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('id, subscription_status, mp_preapproval_id, mp_card_id, next_payment_date, grace_period_until')
    .eq('user_id', userId)
    .maybeSingle();

  if (restError || !restaurant) {
    return { status: 404, body: { error: 'Restaurante no encontrado' } };
  }

  const decision = decideCancel(restaurant);

  // Cobra MP por su cuenta pero Snappy no tiene el preapproval: no podemos cancelarlo desde acá. No tocamos
  // el estado ni la tarjeta, para no mostrar "cancelada" mientras MP sigue cobrando.
  if (decision === 'blocked_no_id') {
    console.error(`cancel — ${PRE_NO_ID_CODE}: activo sin mp_preapproval_id ni mp_card_id, no se cancela`);
    return { status: 409, body: { success: false, code: PRE_NO_ID_CODE, message: PRE_NO_ID_MESSAGE } };
  }

  // Fin del período pagado. Con preapproval: su next_payment_date en MP (se lee ANTES de cancelar, solo lectura).
  // Sin preapproval y cobrado por el cron de Snappy: el next_payment_date de la base, solo si está activo.
  let nextPayment: unknown = null;
  if (decision === 'cancel_mp' && restaurant.mp_preapproval_id) {
    const pre = await getPreapproval(restaurant.mp_preapproval_id);
    if (pre.ok && pre.data?.status === 'authorized') {
      nextPayment = pre.data?.next_payment_date ?? null;
    } else {
      console.error(`cancel — PRE_READ_SKIP ${pre.ok ? `status=${String(pre.data?.status)}` : 'lectura fallida'}: corte inmediato`);
    }
  } else if (decision === 'cancel_local' && restaurant.subscription_status === 'active') {
    nextPayment = restaurant.next_payment_date ?? null;
  }

  // Si tiene preapproval en MP, cancelarlo primero. Si MP no lo confirma, no tocamos la base: borrar
  // mp_preapproval_id perdería la referencia y MP seguiría cobrando.
  if (decision === 'cancel_mp' && restaurant.mp_preapproval_id) {
    const result = await cancelPreapproval(restaurant.mp_preapproval_id);
    if (!result.ok) {
      console.error('cancel — MP no canceló el preapproval:', result.detail);
      return {
        status: 502,
        body: { error: 'No pudimos cancelar la suscripción en Mercado Pago. Intentá de nuevo en unos minutos.' },
      };
    }
  }

  const now = new Date();
  const { graceUntil } = computeCancelGrace(nextPayment, now);
  // Nunca acorta una gracia futura que el local ya tenía (p. ej. la de la migración)
  const serviceUntil = resolveServiceUntil(graceUntil, restaurant.grace_period_until, now);

  // mp_card_id en null: el cron de cobro no debe cobrar a un local cancelado cuando venza la gracia
  const update: Record<string, unknown> = {
    subscription_status: 'cancelled',
    mp_preapproval_id: null,
    mp_card_id: null,
  };
  if (serviceUntil) update.grace_period_until = serviceUntil;

  const { error: updateError } = await supabase.from('restaurants').update(update).eq('user_id', userId);

  if (updateError) {
    console.error('Supabase UPDATE error (cancel):', updateError);
    return { status: 500, body: { error: 'Error al cancelar la suscripción' } };
  }

  return { status: 200, body: { success: true, serviceUntil } };
}
