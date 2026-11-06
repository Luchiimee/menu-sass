// Mails de ciclo de vida de Snappy: a quién le toca cada uno (funciones puras) y las plantillas.
//
//   trial_ending   días 10 a 13 desde el alta, local en prueba sin tarjeta ni preapproval.
//   trial_followup días 20 a 30 desde el alta, local que NUNCA se suscribió.
//
// Los días se cuentan por día de calendario argentino (lib/email/dates.ts) y los dos extremos
// entran. Cada mail se manda una sola vez por local: eso lo garantiza email_log
// (docs/sql/16_email_log.sql, dedupe_key = '<kind>:<restaurant_id>'), no estas funciones.
// SOLO selección y texto: no envía nada ni toca la base.
//
// Importa solo con rutas relativas (sin alias) para probarla sin red: scripts/check-lifecycle-emails.mjs.

import { addDays, diasDesde, fechaLargaArg } from './dates.ts';
import { whatsappLink } from './contact.ts';
import { emailButton, emailLayout, escapeHtml } from './layout.ts';

export const TRIAL_DAYS = 14;
export const TRIAL_ENDING_FROM_DAY = 10;
export const TRIAL_ENDING_TO_DAY = 13;
export const TRIAL_FOLLOWUP_FROM_DAY = 20;
export const TRIAL_FOLLOWUP_TO_DAY = 30;

export const PLAN_URL = 'https://snappy.uno/dashboard/plan';
export const WA_TEXT_ENDING = 'Hola, tengo una duda sobre mi prueba de Snappy';
export const WA_TEXT_FOLLOWUP = 'Hola, probé Snappy y quiero ayuda para empezar';

export type EmailKind = 'trial_ending' | 'trial_followup';

// Campos de restaurants que usan los mails (nombres reales de la tabla).
export type LifecycleRestaurant = {
  id: string;
  name: string | null;
  owner_email: string | null;
  created_at: string | null;
  subscription_status: string | null;
  mp_card_id: string | null;
  mp_preapproval_id: string | null;
  trial_ends_at: string | null;
  grace_period_until: string | null;
};

export const dedupeKey = (kind: EmailKind, restaurantId: string) => `${kind}:${restaurantId}`;

const norm = (e?: string | null) => (e ?? '').toLowerCase().trim();

// Filtros comunes: sin email, admin (ADMIN_EMAILS) o en ventana de gracia futura.
function passesCommon(r: LifecycleRestaurant, now: Date, adminEmails: string[]): boolean {
  const email = norm(r.owner_email);
  if (!email) return false;
  if (adminEmails.map(norm).includes(email)) return false;
  if (r.grace_period_until && new Date(r.grace_period_until) > now) return false;
  return true;
}

const PAID_OR_BLOCKED = ['active', 'authorized', 'paused', 'cancelled'];
const hasValue = (v?: string | null) => !!v && v.trim() !== '';

function inWindow(r: LifecycleRestaurant, now: Date, from: number, to: number): boolean {
  const d = diasDesde(r.created_at, now);
  return d !== null && d >= from && d <= to;
}

export function selectTrialEnding(rows: LifecycleRestaurant[], now: Date, adminEmails: string[]): LifecycleRestaurant[] {
  return rows.filter((r) =>
    passesCommon(r, now, adminEmails) &&
    !PAID_OR_BLOCKED.includes(r.subscription_status ?? '') &&
    !hasValue(r.mp_card_id) &&
    !hasValue(r.mp_preapproval_id) &&
    inWindow(r, now, TRIAL_ENDING_FROM_DAY, TRIAL_ENDING_TO_DAY)
  );
}

export function selectTrialFollowup(rows: LifecycleRestaurant[], now: Date, adminEmails: string[]): LifecycleRestaurant[] {
  return rows.filter((r) =>
    passesCommon(r, now, adminEmails) &&
    !PAID_OR_BLOCKED.includes(r.subscription_status ?? '') &&
    !hasValue(r.mp_card_id) &&
    !hasValue(r.mp_preapproval_id) &&
    !hasValue(r.trial_ends_at) &&
    inWindow(r, now, TRIAL_FOLLOWUP_FROM_DAY, TRIAL_FOLLOWUP_TO_DAY)
  );
}

// Fin de la prueba: created_at + 14 días exactos.
export function trialEndDate(createdAt: string): Date {
  return addDays(new Date(createdAt), TRIAL_DAYS);
}

export type LifecycleEmail = { subject: string; html: string; text: string };

const display = (name?: string | null) => (name && name.trim() ? name.trim() : 'tu local');

export function trialEndingEmail(data: { name: string | null; endDate: Date }): LifecycleEmail {
  const name = display(data.name);
  const fecha = fechaLargaArg(data.endDate);
  const html = emailLayout('Tu prueba de Snappy está por vencer', `
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#15160E;letter-spacing:-0.5px;line-height:1.2;">
                Tu prueba está por terminar
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:#86877B;line-height:1.6;">
                Te quedan unos días para cargar una tarjeta y seguir usando Snappy en <strong>${escapeHtml(name)}</strong>.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#15160E;line-height:1.6;">
                Tu prueba de 14 días se vence el <strong>${fecha}</strong>. Si cargás una tarjeta antes,
                tu menú y tus pedidos siguen funcionando sin cortes.
              </p>

              ${emailButton(PLAN_URL, 'Cargar mi tarjeta')}

              <p style="margin:24px 0 0;font-size:12px;color:#86877B;text-align:center;line-height:1.6;">
                ¿Dudas? <a href="${whatsappLink(WA_TEXT_ENDING)}" style="color:#1BB179;text-decoration:none;">Escribinos por WhatsApp</a>
              </p>

              <hr style="border:none;border-top:1px solid #ECEBE3;margin:40px 0;" />

              <p style="margin:0;font-size:12px;color:#86877B;text-align:center;line-height:1.6;">
                Recibiste este email porque tenés una cuenta en
                <a href="https://snappy.uno" style="color:#1BB179;text-decoration:none;">snappy.uno</a>.
              </p>
`);
  const text = `Tu prueba está por terminar

Te quedan unos días para cargar una tarjeta y seguir usando Snappy en ${name}.

Tu prueba de 14 días se vence el ${fecha}. Si cargás una tarjeta antes, tu menú y tus pedidos siguen funcionando sin cortes.

Cargar mi tarjeta: ${PLAN_URL}

¿Dudas? Escribinos por WhatsApp: ${whatsappLink(WA_TEXT_ENDING)}

Recibiste este email porque tenés una cuenta en snappy.uno.

© ${new Date().getFullYear()} Snappy · hola@snappy.uno
`;
  return { subject: `Tu prueba de Snappy vence el ${fecha}`, html, text };
}

export function trialFollowupEmail(data: { name: string | null }): LifecycleEmail {
  const name = display(data.name);
  const html = emailLayout('Se venció tu prueba de Snappy', `
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#15160E;letter-spacing:-0.5px;line-height:1.2;">
                Se venció tu prueba
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:#86877B;line-height:1.6;">
                La prueba de <strong>${escapeHtml(name)}</strong> en Snappy terminó. ¿Necesitás ayuda?
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#15160E;line-height:1.6;">
                Si algo no te cerró o te quedó una duda, escribinos por WhatsApp y te damos una mano.
                Cuando quieras retomar, elegí un plan y tu menú vuelve a estar activo.
              </p>

              ${emailButton(whatsappLink(WA_TEXT_FOLLOWUP), 'Hablar por WhatsApp')}

              <p style="margin:24px 0 0;font-size:12px;color:#86877B;text-align:center;line-height:1.6;">
                O mirá los planes: <a href="${PLAN_URL}" style="color:#1BB179;text-decoration:none;">snappy.uno/dashboard/plan</a>
              </p>

              <hr style="border:none;border-top:1px solid #ECEBE3;margin:40px 0;" />

              <p style="margin:0;font-size:12px;color:#86877B;text-align:center;line-height:1.6;">
                Recibiste este email porque tenés una cuenta en
                <a href="https://snappy.uno" style="color:#1BB179;text-decoration:none;">snappy.uno</a>.
              </p>
`);
  const text = `Se venció tu prueba

La prueba de ${name} en Snappy terminó. ¿Necesitás ayuda?

Si algo no te cerró o te quedó una duda, escribinos por WhatsApp y te damos una mano. Cuando quieras retomar, elegí un plan y tu menú vuelve a estar activo.

Hablar por WhatsApp: ${whatsappLink(WA_TEXT_FOLLOWUP)}

O mirá los planes: ${PLAN_URL}

Recibiste este email porque tenés una cuenta en snappy.uno.

© ${new Date().getFullYear()} Snappy · hola@snappy.uno
`;
  return { subject: 'Se venció tu prueba de Snappy: ¿necesitás ayuda?', html, text };
}
