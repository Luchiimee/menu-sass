// Mail de aviso 15 días antes de borrar los datos de un local cancelado (kind 'delete_warning' en email_log).
// Es un mail de SERVICIO: no lleva link de baja. Solo texto/HTML: no envía nada ni toca la base.
//
// Importa solo con rutas relativas (sin alias) para probarlo sin red: scripts/check-retention-plan.mjs.

import { fechaLargaArg } from './dates.ts';
import { whatsappLink } from './contact.ts';
import { emailButton, emailLayout, escapeHtml } from './layout.ts';

export const WARNING_PLAN_URL = 'https://snappy.uno/dashboard/plan';
export const WA_TEXT_WARNING = 'Hola, quiero conservar mis datos de Snappy';

export type DeleteWarningData = {
  name: string | null;
  // Día en que se borran los datos.
  deleteOn: Date;
};

export type DeleteWarningEmail = { subject: string; html: string; text: string };

const display = (name?: string | null) => (name && name.trim() ? name.trim() : 'tu local');

export function deleteWarningEmail(data: DeleteWarningData): DeleteWarningEmail {
  const name = display(data.name);
  const deleteOn = fechaLargaArg(data.deleteOn);

  const subject = `El ${deleteOn} borramos los datos de ${name}`;
  const title = 'Vamos a borrar tus datos';
  const lead = `El <strong>${deleteOn}</strong> borramos todos los datos de <strong>${escapeHtml(name)}</strong> de Snappy.`;
  const leadText = `El ${deleteOn} borramos todos los datos de ${name} de Snappy.`;
  const detail =
    'Se borra el menú público, los productos, los pedidos, la configuración y tu cuenta. No va a quedar nada y no se puede recuperar. ' +
    'Si querés conservarlos, reactivá tu plan antes de esa fecha: elegís un plan, cargás una tarjeta y seguís donde lo dejaste.';

  const html = emailLayout('Vamos a borrar tus datos', `
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#15160E;letter-spacing:-0.5px;line-height:1.2;">
                ${title}
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:#86877B;line-height:1.6;">
                ${lead}
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#15160E;line-height:1.6;">
                ${detail}
              </p>

              ${emailButton(WARNING_PLAN_URL, 'Reactivar mi plan')}

              <p style="margin:24px 0 0;font-size:12px;color:#86877B;text-align:center;line-height:1.6;">
                ¿Dudas? <a href="${whatsappLink(WA_TEXT_WARNING)}" style="color:#1BB179;text-decoration:none;">Escribinos por WhatsApp</a>
              </p>

              <hr style="border:none;border-top:1px solid #ECEBE3;margin:40px 0;" />

              <p style="margin:0;font-size:12px;color:#86877B;text-align:center;line-height:1.6;">
                Recibiste este email porque cancelaste tu suscripción en
                <a href="https://snappy.uno" style="color:#1BB179;text-decoration:none;">snappy.uno</a>.
              </p>
`);

  const text = `${title}

${leadText}

${detail}

Reactivar mi plan: ${WARNING_PLAN_URL}

¿Dudas? Escribinos por WhatsApp: ${whatsappLink(WA_TEXT_WARNING)}

Recibiste este email porque cancelaste tu suscripción en snappy.uno.

© ${new Date().getFullYear()} Snappy · hola@snappy.uno
`;

  return { subject, html, text };
}
