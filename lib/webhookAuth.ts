// Autenticación de los Database Webhooks de Supabase (push de pedidos,
// email de bienvenida). Supabase manda un header fijo configurado en el
// webhook; acá se compara contra SUPABASE_WEBHOOK_SECRET.
//
// Fail closed: si la variable no está cargada, se rechaza todo.
// SOLO servidor.

import crypto from 'crypto';

export const WEBHOOK_SECRET_HEADER = 'x-webhook-secret';

export function isValidWebhookSecret(request: Request): boolean {
  const expected = process.env.SUPABASE_WEBHOOK_SECRET;
  if (!expected) {
    console.error('[webhookAuth] SUPABASE_WEBHOOK_SECRET no está configurada: webhook rechazado.');
    return false;
  }

  const received = request.headers.get(WEBHOOK_SECRET_HEADER);
  if (!received) return false;

  // timingSafeEqual exige el mismo largo: se comparan los hashes, así tampoco
  // se filtra el largo del secreto.
  const a = crypto.createHash('sha256').update(received).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}
