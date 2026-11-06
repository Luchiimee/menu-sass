import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidWebhookSecret } from '@/lib/webhookAuth';
import { sendEmail } from '@/lib/email/send';
import { emailLayout, emailButton } from '@/lib/email/layout';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const welcomeHtml = (email: string) => emailLayout('Bienvenido a Snappy', `
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#15160E;letter-spacing:-0.5px;line-height:1.2;">
                ¡Ya sos parte de Snappy! 🎉
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:#86877B;line-height:1.6;">
                Tu cuenta está confirmada y tu menú digital está listo para arrancar.
              </p>

              <p style="margin:0 0 8px;font-size:15px;color:#15160E;font-weight:600;line-height:1.6;">
                Con Snappy podés:
              </p>
              <ul style="margin:0 0 32px;padding-left:20px;color:#86877B;font-size:14px;line-height:2;">
                <li>Cargar tu carta con fotos, precios y categorías</li>
                <li>Recibir pedidos de delivery, retiro y mesas</li>
                <li>Personalizar los colores y el estilo de tu menú</li>
                <li>Ver el análisis de ventas en tiempo real</li>
              </ul>

              <!-- CTA -->
              ${emailButton('https://snappy.uno/dashboard', 'Empezar ahora →')}

              <!-- SEPARADOR -->
              <hr style="border:none;border-top:1px solid #ECEBE3;margin:40px 0;" />

              <p style="margin:0;font-size:12px;color:#86877B;text-align:center;line-height:1.6;">
                Recibiste este email porque te registraste en
                <a href="https://snappy.uno" style="color:#1BB179;text-decoration:none;">snappy.uno</a>
                con la cuenta <strong>${email}</strong>.<br />
                Si no fuiste vos, podés ignorar este mensaje.
              </p>
`);

// Versión de texto plano del mismo mail (clientes sin HTML y filtros de spam).
const welcomeText = (email: string) => `¡Ya sos parte de Snappy!

Tu cuenta está confirmada y tu menú digital está listo para arrancar.

Con Snappy podés:
- Cargar tu carta con fotos, precios y categorías
- Recibir pedidos de delivery, retiro y mesas
- Personalizar los colores y el estilo de tu menú
- Ver el análisis de ventas en tiempo real

Empezar ahora: https://snappy.uno/dashboard

Recibiste este email porque te registraste en snappy.uno con la cuenta ${email}.
Si no fuiste vos, podés ignorar este mensaje.

© ${new Date().getFullYear()} Snappy · hola@snappy.uno
`;

// Database Webhook de Supabase (auth.users). Exige el header
// x-webhook-secret = SUPABASE_WEBHOOK_SECRET (lib/webhookAuth.ts).
export async function POST(request: Request) {
  if (!isValidWebhookSecret(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, record, old_record } = payload;

  // Disparar solo cuando email_confirmed_at pasa de null a un valor
  // Cubre: UPDATE (confirmación por link) e INSERT con email_confirmed_at seteado (Google OAuth)
  const isConfirmation =
    (type === 'UPDATE' && !old_record?.email_confirmed_at && !!record?.email_confirmed_at) ||
    (type === 'INSERT' && !!record?.email_confirmed_at);

  if (!isConfirmation) {
    return NextResponse.json({ skipped: 'no confirmation event' });
  }

  const userId = record?.id;
  const email  = record?.email;

  if (!userId || !email) {
    return NextResponse.json({ skipped: 'missing user id or email' });
  }

  // Idempotencia: verificar si ya se mandó el email para este user_id
  const { data: alreadySent } = await supabase
    .from('welcome_emails_sent')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (alreadySent) {
    console.log(`[webhook/bienvenida] Email ya enviado para user_id=${userId} — skip`);
    return NextResponse.json({ skipped: 'already sent' });
  }

  // Enviar el email (Resend, ver lib/email/send.ts)
  const sent = await sendEmail({
    to:      email,
    subject: '¡Bienvenido a Snappy! Tu menú digital está listo',
    html:    welcomeHtml(email),
    text:    welcomeText(email),
  });

  if (!sent.ok) {
    console.error(`[webhook/bienvenida] No se pudo enviar el email (user_id=${userId}): ${sent.error}`);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  // Marcar como enviado para evitar duplicados
  await supabase
    .from('welcome_emails_sent')
    .insert({ user_id: userId });

  console.log(`[webhook/bienvenida] ✅ Email enviado a ${email} (user_id=${userId})`);
  return NextResponse.json({ sent: true, email });
}
