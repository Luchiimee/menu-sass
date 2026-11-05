// Envío de mails transaccionales de Snappy, sin atarse a un proveedor.
//
//   EMAIL_PROVIDER = 'resend' (por defecto) | 'envialosimple' (respaldo mientras dure la
//                    migración) | 'console' (pruebas: imprime asunto y destinatario, no manda nada)
//
// Resend va por fetch directo a la API (sin el paquete npm). Nunca se devuelven ni se loguean las
// claves ni el cuerpo de la respuesta del proveedor: el error es un código corto
// ('resend_http_422', 'timeout', ...). SOLO servidor.
//
// Sin imports (ni alias) para poder probarla sin red: scripts/check-email-send.mjs.

export const EMAIL_FROM = 'Equipo Snappy <hola@updates.snappy.uno>';
// Remitente del respaldo: el dominio que ya tenía verificado EnvíaloSimple.
const ENVIALOSIMPLE_FROM = 'hola@snappy.uno';

const RESEND_URL = 'https://api.resend.com/emails';
const ENVIALOSIMPLE_URL = 'https://backend.envialosimple.email/api/v1/mail/send';
export const EMAIL_TIMEOUT_MS = 8000;

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

export type SendEmailOptions = {
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
};

type ProviderRequest = { url: string; headers: Record<string, string>; body: string };

function buildRequest(provider: string, msg: EmailMessage, apiKey: string): ProviderRequest {
  if (provider === 'resend') {
    return {
      url: RESEND_URL,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: EMAIL_FROM, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text }),
    };
  }
  // envialosimple: mismo cuerpo que mandaba la ruta de bienvenida (sin `text`).
  return {
    url: ENVIALOSIMPLE_URL,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: ENVIALOSIMPLE_FROM, to: msg.to, subject: msg.subject, html: msg.html }),
  };
}

export async function sendEmail(msg: EmailMessage, opts: SendEmailOptions = {}): Promise<SendEmailResult> {
  const env = opts.env ?? process.env;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? EMAIL_TIMEOUT_MS;
  const provider = (env.EMAIL_PROVIDER || 'resend').trim().toLowerCase();

  if (provider === 'console') {
    console.log(`[email:console] to=${msg.to} subject=${msg.subject}`);
    return { ok: true, id: 'console' };
  }

  if (provider !== 'resend' && provider !== 'envialosimple') {
    return { ok: false, error: 'unknown_provider' };
  }

  const apiKey = provider === 'resend' ? env.RESEND_API_KEY : env.ENVIALOSIMPLE_API_KEY;
  if (!apiKey) return { ok: false, error: `${provider}_not_configured` };

  const req = buildRequest(provider, msg, apiKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(req.url, {
      method: 'POST',
      headers: req.headers,
      body: req.body,
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, error: `${provider}_http_${res.status}` };

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
