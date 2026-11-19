// Qué tarjeta se muestra en "Mi plan". Lógica pura, sin imports con alias: scripts/check-card-display.mjs.

export type ShownCard = { brand: string; last4: string; expMonth: number; expYear: number };

// 'debvisa' → 'Visa Débito', etc.; marca desconocida o vacía → 'Tarjeta'
const CARD_BRANDS: Record<string, string> = {
  visa: 'Visa', debvisa: 'Visa Débito', master: 'Mastercard', debmaster: 'Mastercard Débito', mastercard: 'Mastercard',
  amex: 'American Express', naranja: 'Naranja', cabal: 'Cabal', maestro: 'Maestro',
};

export function cardBrandName(brand: string | null | undefined): string {
  return CARD_BRANDS[(brand ?? '').trim().toLowerCase()] ?? 'Tarjeta';
}

// La tarjeta guardada en la cuenta (últimos 4 de la última que se cargó) manda; el vencimiento y la marca del listado de
// Mercado Pago solo se usan si ese listado trae esa MISMA tarjeta (una suscripción guarda la tarjeta por su cuenta y el
// listado del cliente puede estar vacío o traer una vieja). Sin dato guardado se usa el listado, como antes.
export function pickShownCard(
  saved: { last4?: unknown; brand?: unknown },
  listed: ShownCard | null,
): ShownCard | null {
  const last4 = typeof saved.last4 === 'string' && /^\d{4}$/.test(saved.last4) ? saved.last4 : null;
  if (!last4) return listed;
  const same = listed !== null && listed.last4 === last4;
  return {
    brand: same ? listed.brand : typeof saved.brand === 'string' ? saved.brand : '',
    last4,
    expMonth: same ? listed.expMonth : 0,
    expYear: same ? listed.expYear : 0,
  };
}
