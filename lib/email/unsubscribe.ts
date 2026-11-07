// Token de baja de los mails comerciales: firma y verificación. Puro, sin red ni alias.
//
//   token = base64url(email en minúsculas) + '.' + base64url(HMAC-SHA256(secreto, la primera parte))
//
// Sin vencimiento: el link de un mail viejo tiene que seguir funcionando. El secreto
// (EMAIL_UNSUB_SECRET) lo pasa quien llama; este módulo nunca lo lee del entorno, nunca lo
// loguea y nunca lo mete en un error: ante cualquier problema devuelve null.
// SOLO servidor (usa node:crypto).
//
// Se prueba sin red en scripts/check-unsubscribe.mjs.

import { createHmac, timingSafeEqual } from 'node:crypto';

export const UNSUBSCRIBE_BASE_URL = 'https://snappy.uno/baja';

const MAX_EMAIL_LENGTH = 254;
const B64URL = /^[A-Za-z0-9_-]+$/;

// Email normalizado para firmar y para guardar en email_unsubscribes.email_lower.
export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const e = email.trim().toLowerCase();
  if (e.length < 3 || e.length > MAX_EMAIL_LENGTH) return null;
  if (/[\s\u0000-\u001f]/.test(e)) return null;
  const at = e.indexOf('@');
  if (at < 1 || at !== e.lastIndexOf('@') || at === e.length - 1) return null;
  return e;
}

const hasSecret = (secret: unknown): secret is string => typeof secret === 'string' && secret.trim() !== '';

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

// Devuelve el token, o null si falta el secreto o el email no es válido.
export function signUnsubToken(email: string, secret: string | undefined | null): string | null {
  try {
    if (!hasSecret(secret)) return null;
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const payload = Buffer.from(normalized, 'utf8').toString('base64url');
    return `${payload}.${sign(payload, secret)}`;
  } catch {
    return null;
  }
}

// Devuelve el email (en minúsculas) si el token es válido, o null ante cualquier problema:
// sin secreto, token mal formado, cortado, firma alterada o secreto distinto.
export function verifyUnsubToken(token: string | undefined | null, secret: string | undefined | null): string | null {
  try {
    if (!hasSecret(secret) || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    if (!B64URL.test(payload) || !B64URL.test(signature)) return null;

    const expected = Buffer.from(sign(payload, secret));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

    // La firma es válida: el payload lo generamos nosotros; igual se revisa que sea un email normalizado.
    const email = Buffer.from(payload, 'base64url').toString('utf8');
    return normalizeEmail(email) === email ? email : null;
  } catch {
    return null;
  }
}

// https://snappy.uno/baja?t=<token>, o null si no se puede firmar (sin secreto o email inválido).
export function unsubscribeUrl(email: string, secret: string | undefined | null): string | null {
  const token = signUnsubToken(email, secret);
  return token ? `${UNSUBSCRIBE_BASE_URL}?t=${token}` : null;
}

// Endpoint de baja con un solo clic (RFC 8058): el cliente de mail hace POST acá, sin abrir página.
// Va en el header List-Unsubscribe; el link visible del pie va a la página /baja (que pide confirmar).
export const UNSUBSCRIBE_API_URL = 'https://snappy.uno/api/baja';

export function unsubscribeApiUrl(email: string, secret: string | undefined | null): string | null {
  const token = signUnsubToken(email, secret);
  return token ? `${UNSUBSCRIBE_API_URL}?t=${token}` : null;
}

// Headers de baja de un clic. Sin casilla de contacto en lib/email/contact.ts, va solo el link
// (sin mailto:). Si no hay URL, no hay headers.
export function unsubscribeHeaders(apiUrl: string | null | undefined): Record<string, string> | undefined {
  if (!apiUrl) return undefined;
  return {
    'List-Unsubscribe': `<${apiUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
