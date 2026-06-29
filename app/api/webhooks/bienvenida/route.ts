import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const welcomeHtml = (email: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a Snappy</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5EF;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- HEADER NEGRO -->
          <tr>
            <td style="background-color:#15160E;border-radius:24px 24px 0 0;padding:40px 48px;text-align:center;">
              <img src="https://snappy.uno/logo-snappy.svg" alt="Snappy" width="48" height="48"
                style="display:block;margin:0 auto 16px;" />
              <span style="color:#F5F5EF;font-size:22px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;">
                Snappy
              </span>
            </td>
          </tr>

          <!-- CONTENIDO BLANCO -->
          <tr>
            <td style="background-color:#FFFFFF;padding:48px;border-radius:0 0 24px 24px;">

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
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://snappy.uno/dashboard"
                      style="display:inline-block;background-color:#1BB179;color:#0C2D1F;text-decoration:none;
                             font-weight:900;font-size:13px;letter-spacing:1px;text-transform:uppercase;
                             padding:16px 40px;border-radius:16px;">
                      Empezar ahora →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- SEPARADOR -->
              <hr style="border:none;border-top:1px solid #ECEBE3;margin:40px 0;" />

              <p style="margin:0;font-size:12px;color:#86877B;text-align:center;line-height:1.6;">
                Recibiste este email porque te registraste en
                <a href="https://snappy.uno" style="color:#1BB179;text-decoration:none;">snappy.uno</a>
                con la cuenta <strong>${email}</strong>.<br />
                Si no fuiste vos, podés ignorar este mensaje.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#86877B;">
                © ${new Date().getFullYear()} Snappy · hola@snappy.uno
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export async function POST(request: Request) {
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

  // Verificar que el restaurant exista y no hayamos mandado el email antes
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, welcome_email_sent')
    .eq('user_id', userId)
    .maybeSingle();

  if (!restaurant) {
    console.warn(`[webhook/bienvenida] No existe restaurant para user_id=${userId} — skip`);
    return NextResponse.json({ skipped: 'restaurant not found' });
  }

  if (restaurant.welcome_email_sent) {
    console.log(`[webhook/bienvenida] Email ya enviado para user_id=${userId} — skip`);
    return NextResponse.json({ skipped: 'already sent' });
  }

  // Enviar email vía EnvíaloSimple
  const apiKey = process.env.ENVIALOSIMPLE_API_KEY;
  if (!apiKey) {
    console.error('[webhook/bienvenida] ENVIALOSIMPLE_API_KEY no configurada');
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
  }

  const emailRes = await fetch('https://backend.envialosimple.email/api/v1/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from:    'hola@snappy.uno',
      to:      email,
      subject: '¡Bienvenido a Snappy! Tu menú digital está listo',
      html:    welcomeHtml(email),
    }),
  });

  if (!emailRes.ok) {
    const errBody = await emailRes.text();
    console.error(`[webhook/bienvenida] Error EnvíaloSimple: ${errBody}`);
    return NextResponse.json({ error: 'Failed to send email', detail: errBody }, { status: 500 });
  }

  // Marcar como enviado para evitar duplicados
  await supabase
    .from('restaurants')
    .update({ welcome_email_sent: true })
    .eq('id', restaurant.id);

  console.log(`[webhook/bienvenida] ✅ Email enviado a ${email} (restaurant_id=${restaurant.id})`);
  return NextResponse.json({ sent: true, email });
}
