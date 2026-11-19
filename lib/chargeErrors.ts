// Mensajes claros para el usuario según el motivo del rechazo de un cobro (status_detail de Mercado Pago).
// Sin imports: lo usan el servidor (cobros, cancelar) y el panel (aviso de pago fallido).
// El motivo del último cobro rechazado del cron queda en restaurants.last_charge_error (docs/sql/33).

// Traduce el status_detail de Mercado Pago a un mensaje claro y accionable
// para mostrarle al usuario. La clave es que sepa QUÉ hacer.
const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_call_for_authorize:
    'Tu banco no autorizó el pago automático. Comunicate con tu banco para autorizarlo, o probá con otra tarjeta.',
  cc_rejected_insufficient_amount:
    'La tarjeta no tiene fondos suficientes. Probá con otra tarjeta.',
  cc_rejected_bad_filled_security_code:
    'El código de seguridad (CVV) es incorrecto. Revisalo e intentá de nuevo.',
  cc_rejected_bad_filled_date:
    'La fecha de vencimiento es incorrecta. Revisala e intentá de nuevo.',
  cc_rejected_bad_filled_other:
    'Hay un dato de la tarjeta mal cargado. Revisá los datos e intentá de nuevo.',
  cc_rejected_high_risk:
    'Mercado Pago rechazó el pago por seguridad. Probá con otra tarjeta o medio de pago.',
  cc_rejected_card_disabled:
    'La tarjeta está inhabilitada para compras online. Llamá a tu banco para activarla o usá otra.',
  cc_rejected_blacklist:
    'La tarjeta no fue aceptada. Probá con otra tarjeta.',
  cc_rejected_max_attempts:
    'Superaste el límite de intentos. Esperá un momento o probá con otra tarjeta.',
  cc_rejected_duplicated_payment:
    'Ya hay un pago igual en proceso. Esperá unos minutos antes de reintentar.',
  cc_rejected_other_reason:
    'El banco rechazó el pago. Probá con otra tarjeta o comunicate con tu banco.',
};

export function friendlyChargeError(detail: string | null | undefined): string {
  if (!detail) return 'No se pudo procesar el pago. Probá con otra tarjeta.';
  if (REJECTION_MESSAGES[detail]) return REJECTION_MESSAGES[detail];
  // CC_VAL_xxx: Mercado Pago no pudo validar los datos de la tarjeta (nunca llegó al banco; no hay movimiento).
  // Casi siempre es un dato mal cargado, sobre todo el DNI del titular: que sea el de quien figura en la tarjeta.
  if (/^CC_VAL_\d+/i.test(detail.trim())) {
    return 'No pudimos validar la tarjeta. Revisá el número, el vencimiento, el nombre y el DNI del titular (tiene que ser el de la persona a cuyo nombre está la tarjeta) e intentá de nuevo.';
  }
  // Rechazo del banco con un motivo que no tenemos traducido
  if (detail.startsWith('cc_rejected')) {
    return 'El pago fue rechazado por el banco. Probá con otra tarjeta o comunicate con tu banco.';
  }
  // Error nuestro o de red (no es un rechazo del banco): no culpar a la tarjeta
  return 'No pudimos procesar el cobro. Probá de nuevo o cargá otra tarjeta.';
}
