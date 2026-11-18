// Mail que se manda al cancelar la suscripción (kind 'cancel_notice' en email_log).
// Es un mail de SERVICIO: no lleva link de baja. Dice hasta cuándo sigue el servicio, hasta cuándo se
// guardan los datos (lib/dataRetention.ts) y cómo volver. Solo texto/HTML: no envía nada ni toca la base.
//
// Importa solo con rutas relativas (sin alias) para probarlo sin red: scripts/check-cancel-notice.mjs.

import { fechaLargaArg } from './dates.ts';
import { whatsappLink } from './contact.ts';
import { emailButton, emailLayout, escapeHtml } from './layout.ts';

export const CANCEL_PLAN_URL = 'https://snappy.uno/dashboard/plan';
export const WA_TEXT_CANCEL = 'Hola, cancelé mi suscripción de Snappy y tengo una consulta';

export type CancelNoticeData = {
  name: string | null;
  // Último día con servicio; null = el servicio ya terminó (corte inmediato).
  serviceUntil: Date | null;
  // Día en que se borran los datos (lib/dataRetention.deleteOnFor).
  deleteOn: Date;
};

export type CancelNoticeEmail = { subject: string; html: string; text: string };

const display = (name?: string | null) => (name && name.trim() ? name.trim() : 'tu local');

export function cancelNoticeEmail(data: CancelNoticeData): CancelNoticeEmail {
  const name = display(data.name);
  const until = data.serviceUntil ? fechaLargaArg(data.serviceUntil) : null;
  const deleteOn = fechaLargaArg(data.deleteOn);

  const subject = 'Cancelaste tu suscripción de Snappy';
  const title = 'Lamentamos que te vayas';
  const lead = `Cancelamos la suscripción de <strong>${escapeHtml(name)}</strong>. No se te va a cobrar más.`;
  const leadText = `Cancelamos la suscripción de ${name}. No se te va a cobrar más.`;

  const service = until
    ? `Tu menú y tu panel siguen funcionando hasta el <strong>${until}</strong>.`
    : 'Tu menú y tu panel ya no están activos.';
  const serviceText = until
    ? `Tu menú y tu panel siguen funcionando hasta el ${until}.`
    : 'Tu menú y tu panel ya no están activos.';

  const keep =
    `Guardamos tus datos (productos, pedidos y configuración) hasta el <strong>${deleteOn}</strong>. ` +
    'Si volvés antes de esa fecha, elegís un plan, cargás una tarjeta y recuperás todo como lo dejaste. ' +
    'Después de esa fecha los borramos y no se pueden recuperar.';
  const keepText =
    `Guardamos tus datos (productos, pedidos y configuración) hasta el ${deleteOn}. ` +
    'Si volvés antes de esa fecha, elegís un plan, cargás una tarjeta y recuperás todo como lo dejaste. ' +
    'Después de esa fecha los borramos y no se pueden recuperar.';

  const html = emailLayout('Cancelaste tu suscripción', `
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#15160E;letter-spacing:-0.5px;line-height:1.2;">
                ${title}
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:#86877B;line-height:1.6;">
                ${lead}
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#15160E;line-height:1.6;">
                ${service}
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#15160E;line-height:1.6;">
                ${keep}
              </p>

              ${emailButton(CANCEL_PLAN_URL, 'Volver a Snappy')}

              <p style="margin:24px 0 0;font-size:12px;color:#86877B;text-align:center;line-height:1.6;">
                ¿Dudas? <a href="${whatsappLink(WA_TEXT_CANCEL)}" style="color:#1BB179;text-decoration:none;">Escribinos por WhatsApp</a>
              </p>

              <hr style="border:none;border-top:1px solid #ECEBE3;margin:40px 0;" />

              <p style="margin:0;font-size:12px;color:#86877B;text-align:center;line-height:1.6;">
                Recibiste este email porque cancelaste tu suscripción en
                <a href="https://snappy.uno" style="color:#1BB179;text-decoration:none;">snappy.uno</a>.
              </p>
`);

  const text = `${title}

${leadText}

${serviceText}

${keepText}

Volver a Snappy: ${CANCEL_PLAN_URL}

¿Dudas? Escribinos por WhatsApp: ${whatsappLink(WA_TEXT_CANCEL)}

Recibiste este email porque cancelaste tu suscripción en snappy.uno.

© ${new Date().getFullYear()} Snappy · hola@snappy.uno
`;

  return { subject, html, text };
}
