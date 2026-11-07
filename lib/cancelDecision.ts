// Decide qué hace "cancelar suscripción" según cómo cobra al local. Función pura, sin red ni imports.
//
//   cancel_mp      → tiene mp_preapproval_id: se cancela en MP y recién después se actualiza Snappy.
//   cancel_local   → no hay preapproval y (el cron de Snappy lo cobra con su tarjeta, o no está
//                    active/authorized, o sea que nadie lo está cobrando): se cancela solo en Snappy.
//   blocked_no_id  → status active/authorized, sin preapproval y sin tarjeta guardada: lo cobra MP
//                    fuera del conocimiento de Snappy (caso Casa Delia). NO se cambia nada.

export type CancelDecision = 'cancel_mp' | 'cancel_local' | 'blocked_no_id';

export interface CancelDecisionInput {
  subscription_status?: string | null;
  mp_preapproval_id?: string | null;
  mp_card_id?: string | null;
}

export const PRE_NO_ID_CODE = 'PRE_NO_ID';

export const PRE_NO_ID_MESSAGE =
  'Tu suscripción de Mercado Pago no está vinculada a tu cuenta y no la pudimos cancelar desde acá. ' +
  'Cancelala desde Mercado Pago (Suscripciones) o escribinos por WhatsApp y lo resolvemos.';

const has = (v: string | null | undefined): boolean => typeof v === 'string' && v.trim() !== '';

export function decideCancel(restaurant: CancelDecisionInput | null | undefined): CancelDecision {
  if (has(restaurant?.mp_preapproval_id)) return 'cancel_mp';
  if (has(restaurant?.mp_card_id)) return 'cancel_local'; // lo cobra el cron de Snappy

  const status = restaurant?.subscription_status;
  if (status === 'active' || status === 'authorized') return 'blocked_no_id';
  return 'cancel_local';
}
