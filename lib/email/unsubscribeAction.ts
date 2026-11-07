// Lógica de la baja de mails, sin red ni alias: verifica el token y registra la baja.
// La base entra por parámetro (insertUnsub) para probarla con una base falsa:
// scripts/check-unsubscribe-action.mjs. La usa POST /api/baja; la página GET /baja solo
// verifica el token (nunca escribe).
//
// Las respuestas son genéricas a propósito: no distinguen token mal formado, firma alterada o
// secreto ausente, y nunca incluyen el email, el token ni detalles del error de la base.

import { verifyUnsubToken } from './unsubscribe.ts';

export type UnsubOutcome =
  | { status: 200; body: { ok: true } }
  | { status: 400; body: { ok: false; code: 'invalid_token' } }
  | { status: 500; body: { ok: false; code: 'server_error' } };

// Inserta el email (en minúsculas) con "on conflict do nothing": darse de baja dos veces no falla.
export type InsertUnsub = (emailLower: string) => Promise<{ ok: boolean }>;

export async function processUnsubscribe(
  token: string | null | undefined,
  secret: string | null | undefined,
  insertUnsub: InsertUnsub
): Promise<UnsubOutcome> {
  const email = verifyUnsubToken(token, secret);
  if (!email) return { status: 400, body: { ok: false, code: 'invalid_token' } };

  try {
    const res = await insertUnsub(email);
    if (res && res.ok === true) return { status: 200, body: { ok: true } };
  } catch {
    // el detalle puede traer datos: se descarta
  }
  return { status: 500, body: { ok: false, code: 'server_error' } };
}
