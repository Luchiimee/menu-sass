// Envío de mails transaccionales de Snappy por Resend.
//
//   EMAIL_PROVIDER = 'resend' (por defecto) | 'console' (pruebas: imprime asunto y destinatario,
//                    no manda nada). Cualquier otro valor da el error unknown_provider.
//
// Resend va por fetch directo a la API (sin el paquete npm). Nunca se devuelven ni se loguean las
// claves ni el cuerpo de la respuesta del proveedor: el error es un código corto
// ('resend_http_422', 'timeout', ...). SOLO servidor.
//
// Sin imports (ni alias) para poder probarla sin red: scripts/check-email-send.mjs.

export const EMAIL_FROM = 'Equipo Snappy <hola@updates.snappy.uno>';

const RESEND_URL = 'https://api.resend.com/emails';
export const EMAIL_TIMEOUT_MS = 8000;

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  // Headers extra del mail (p. ej. List-Unsubscribe). Opcional: sin headers el body queda igual que siempre.
  headers?: Record<string, string>;
};

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

export type SendEmailOptions = {
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
};

export async function sendEmail(msg: EmailMessage, opts: SendEmailOptions = {}): Promise<SendEmailResult> {
  const env = opts.env ?? process.env;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? EMAIL_TIMEOUT_MS;
  const provider = (env.EMAIL_PROVIDER || 'resend').trim().toLowerCase();

  if (provider === 'console') {
    console.log(`[email:console] to=${msg.to} subject=${msg.subject}`);
    return { ok: true, id: 'console' };
  }

  if (provider !== 'resend') {
    return { ok: false, error: 'unknown_provider' };
  }

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'resend_not_configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: EMAIL_FROM, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text,
        ...(msg.headers && Object.keys(msg.headers).length > 0 ? { headers: msg.headers } : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, error: `resend_http_${res.status}` };

    let id: string | null = null;
    try {
      const data = await res.json();
      if (data && typeof data.id === 'string') id = data.id;
    } catch {
      // respuesta sin JSON: el envío igual fue aceptado
    }
    return { ok: true, id };
  } catch (err) {
    if (controller.signal.aborted) return { ok: false, error: 'timeout' };
    return { ok: false, error: 'network_error' };
  } finally {
    clearTimeout(timer);
  }
}
