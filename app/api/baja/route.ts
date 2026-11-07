// POST /api/baja?t=<token> — baja de los mails comerciales (hoy, el de seguimiento de la prueba).
// PÚBLICO: lo llama el botón de /baja (con el token en el body) y los clientes de mail con la baja
// de un clic (List-Unsubscribe-Post, con el token en la URL). Solo POST: un GET nunca escribe.
//
// Verifica el token (HMAC con EMAIL_UNSUB_SECRET) y guarda el email en email_unsubscribes con
// "on conflict do nothing". Respuestas genéricas, sin email ni detalles. Límite por IP
// (lib/rateLimit.ts): si no se puede contar, sigue (falla abierto); el token firmado es la defensa.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { limitByIp } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';
import { processUnsubscribe } from '@/lib/email/unsubscribeAction';

export const dynamic = 'force-dynamic';

// El token viene en la URL (baja de un clic) o en el body (JSON del botón o formulario).
async function readToken(req: Request): Promise<string | null> {
  const fromUrl = new URL(req.url).searchParams.get('t');
  if (fromUrl) return fromUrl;
  try {
    const type = req.headers.get('content-type') ?? '';
    if (type.includes('application/json')) {
      const body = await req.json();
      return typeof body?.t === 'string' ? body.t : null;
    }
    if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
      const t = (await req.formData()).get('t');
      return typeof t === 'string' ? t : null;
    }
  } catch {
    // body ilegible: se trata como token ausente
  }
  return null;
}

export async function POST(req: Request) {
  const limited = await limitByIp(req, 'public', RATE_LIMITS.publicPerIp, 'open', { ok: false });
  if (limited) return limited;

  const secret = process.env.EMAIL_UNSUB_SECRET;
  if (!secret) console.error('[baja] code=UNSUB_SECRET_MISSING');

  const outcome = await processUnsubscribe(await readToken(req), secret, async (emailLower) => {
    const { error } = await getSupabaseAdmin()
      .from('email_unsubscribes')
      .upsert({ email_lower: emailLower }, { onConflict: 'email_lower', ignoreDuplicates: true });
    if (error) console.error(`[baja] code=INSERT_FAILED db=${error.code ?? 'sin_codigo'}`);
    return { ok: !error };
  });

  return NextResponse.json(outcome.body, { status: outcome.status });
}
