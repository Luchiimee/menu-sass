// Contacto de Snappy para los mails: WhatsApp. El número vive SOLO acá.
// Sin imports (ni alias) para poder probarlo sin red.

export const WHATSAPP_NUMBER = '5492324313123';

// Link de WhatsApp con el texto precargado y bien codificado.
export function whatsappLink(texto: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
}
