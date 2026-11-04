// Normalización de la dirección de una cotización de envío, compartida por el servidor
// (lib/deliveryQuote.ts) y el navegador (lib/mpQuoteClient.ts). Va aparte porque
// deliveryQuote.ts usa node:crypto y no puede ir al bundle del navegador.

// Minúsculas, sin espacios de más (para comparar la dirección cotizada con la del pago)
export function normalizeQuoteAddress(address: string): string {
  return String(address ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}
