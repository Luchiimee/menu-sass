// Reglas de los medios de pago del local (Efectivo / Transferencia / Mercado Pago).
// Sin imports ni alias: las usan la pantalla Pagos y el checkout, y se prueban con
// scripts/check-payment-methods.mjs.

export type PaymentMethodId = 'efectivo' | 'transferencia' | 'mercadopago';

// Estado que guarda el dueño. Mercado Pago cuenta SOLO si el interruptor está
// encendido Y la cuenta está conectada.
export type OwnerMethods = {
  efectivo: boolean;
  transferencia: boolean;
  mpEnabled: boolean;
  mpConnected: boolean;
};

export function activeMethodsCount(s: OwnerMethods): number {
  return (s.efectivo ? 1 : 0) + (s.transferencia ? 1 : 0) + (s.mpEnabled && s.mpConnected ? 1 : 0);
}

// ¿Se puede apagar este medio sin dejar el local sin ninguno?
export function canTurnOff(s: OwnerMethods, method: PaymentMethodId): boolean {
  const after: OwnerMethods = {
    ...s,
    efectivo: method === 'efectivo' ? false : s.efectivo,
    transferencia: method === 'transferencia' ? false : s.transferencia,
    mpEnabled: method === 'mercadopago' ? false : s.mpEnabled,
  };
  return activeMethodsCount(after) >= 1;
}

// Al desconectar MP se apaga su interruptor: ¿cuántos medios quedan?
export function methodsAfterMpDisconnect(s: OwnerMethods): number {
  return activeMethodsCount({ ...s, mpEnabled: false, mpConnected: false });
}

export const LAST_METHOD_MESSAGE = 'Dejá al menos un medio de pago activo para seguir recibiendo pedidos.';
export const MP_DISABLED_MESSAGE = 'Mercado Pago desactivado. Activá efectivo o transferencia para seguir recibiendo pedidos';
export const NO_METHODS_MESSAGE = 'Este local no está recibiendo pedidos por ahora';

// Checkout: medios que ve el cliente, en este orden de preferencia.
export type AvailableMethods = Record<PaymentMethodId, boolean>;

const ORDER: PaymentMethodId[] = ['efectivo', 'transferencia', 'mercadopago'];

export function availableCount(a: AvailableMethods): number {
  return ORDER.filter((m) => a[m]).length;
}

// Mantiene el medio elegido si sigue disponible; si no, el primero disponible
// (con uno solo queda preseleccionado). null si no hay ninguno.
export function pickPaymentMethod(current: string, a: AvailableMethods): PaymentMethodId | null {
  if ((ORDER as string[]).includes(current) && a[current as PaymentMethodId]) return current as PaymentMethodId;
  return ORDER.find((m) => a[m]) ?? null;
}
