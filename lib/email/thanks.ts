// Mail de agradecimiento cuando un local carga la tarjeta (kind 'thanks' en email_log).
// Es un mail de SERVICIO: no lleva link de baja ni consulta email_unsubscribes.
//
// Tres variantes (data.mode):
//   'trial'         tarjeta guardada con la prueba en curso: primer cobro el <fecha AR> de $<precio>;
//                   hasta esa fecha no se cobra nada.
//   'trial_expired' cargó la tarjeta con la prueba ya vencida o el último día de la prueba:
//                   "tu primer cobro se hace en breve" (sin decir "tu prueba termina el X").
//   'reactivation'  el cobro se hizo ahora: sin fecha de próximo cobro.
//
// chooseThanksMode decide la variante a partir del estado, el fin de la prueba y la hora actual
// (regla única en lib/trial.ts). SOLO selección y texto: no envía nada ni toca la base.
//
// Importa solo con rutas relativas (sin alias) para probarlo sin red: scripts/check-thanks.mjs.

import { diaArg, fechaLargaArg } from './dates.ts';
import { whatsappLink } from './contact.ts';
import { emailButton, emailLayout, escapeHtml } from './layout.ts';
import { firstChargeDate as resolveFirstChargeDate } from '../trial.ts';
import { PLAN_PRICES, isPlanId } from '../plans.ts';

export const THANKS_PLAN_URL = 'https://snappy.uno/dashboard/plan';
export const WA_TEXT_THANKS = 'Hola, tengo una duda sobre mi suscripción de Snappy';

export type ThanksMode = 'trial' | 'trial_expired' | 'reactivation';

export type ThanksEmailData = {
  mode: ThanksMode;
  name: string | null;
  plan?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  // Solo para 'trial': fecha del primer cobro (la que cobra cron/charge).
  firstChargeDate?: Date | null;
};

export type ThanksEmail = { subject: string; html: string; text: string };

const display = (name?: string | null) => (name && name.trim() ? name.trim() : 'tu local');

const BRANDS: Record<string, string> = {
  visa: 'Visa', master: 'Mastercard', mastercard: 'Mastercard', amex: 'American Express',
  naranja: 'Naranja', cabal: 'Cabal', maestro: 'Maestro', debvisa: 'Visa Débito', debmaster: 'Mastercard Débito',
};

// "Visa terminada en 4242", "tu tarjeta terminada en 4242", "tu tarjeta Visa" o null (sin datos).
// Los últimos 4 solo se aceptan si son exactamente 4 dígitos; la marca, si es conocida o una palabra simple.
export function cardLabel(brand?: string | null, last4?: string | null): string | null {
  const digits = typeof last4 === 'string' && /^\d{4}$/.test(last4.trim()) ? last4.trim() : null;
  const key = typeof brand === 'string' ? brand.trim().toLowerCase() : '';
  const known = BRANDS[key] ?? (/^[a-z][a-z_ -]{1,19}$/.test(key) ? key.charAt(0).toUpperCase() + key.slice(1) : null);
  if (known && digits) return `${known} terminada en ${digits}`;
  if (digits) return `tarjeta terminada en ${digits}`;
  if (known) return `tarjeta ${known}`;
  return null;
}

const priceLabel = (plan?: string | null): string | null =>
  isPlanId(plan) ? `$${new Intl.NumberFormat('es-AR').format(PLAN_PRICES[plan])}` : null;

const planLabel = (plan?: string | null): string | null =>
  isPlanId(plan) ? plan.charAt(0).toUpperCase() + plan.slice(1) : null;

// Variante según el estado ANTES de guardar la tarjeta, el fin de la prueba y la hora actual.
//   cancelled / paused → 'reactivation' (el caller solo la usa si el cobro fue aprobado).
//   trialing           → 'trial' si el primer cobro es en un día posterior al de hoy;
//                        'trial_expired' si ya venció o hoy es el último día de la prueba
//                        (el día antes del primer cobro, día argentino).
//   cualquier otro (active, authorized, desconocido) → null: no se manda el mail.
export function chooseThanksMode(opts: {
  status: string | null | undefined;
  createdAt: string | Date | null | undefined;
  trialEndsAt: string | Date | null | undefined;
  now: Date;
}): ThanksMode | null {
  if (opts.status === 'cancelled' || opts.status === 'paused') return 'reactivation';
  if (opts.status !== 'trialing') return null;

  const charge = resolveFirstChargeDate(opts.createdAt, opts.trialEndsAt);
  // sin ninguna fecha válida no podemos decir cuándo se cobra: se usa la variante sin fecha
  if (!charge) return 'trial_expired';
  if (opts.now.getTime() >= charge.getTime()) return 'trial_expired';

  const lastTrialDay = diaArg(new Date(charge.getTime() - 1));
  return diaArg(opts.now) === lastTrialDay ? 'trial_expired' : 'trial';
}

export function thanksEmail(data: ThanksEmailData): ThanksEmail {
  const name = display(data.name);
  const card = cardLabel(data.cardBrand, data.cardLast4);
  const price = priceLabel(data.plan);
  const plan = planLabel(data.plan);
  const planPart = plan ? ` (Plan ${plan})` : '';
  // "de $20.000 (Plan Light)" o, si el plan no se reconoce, "del valor de tu plan"
  const amount = price ? `de <strong>${price}</strong>${planPart}` : 'del valor de tu plan';
  const amountText = price ? `de ${price}${planPart}` : 'del valor de tu plan';

  let subject: string;
  let title: string;
  let lead: string;       // HTML
  let leadText: string;
  let detail: string;     // HTML
  let detailText: string;

  if (data.mode === 'trial') {
    const fecha = data.firstChargeDate ? fechaLargaArg(data.firstChargeDate) : null;
    subject = 'Gracias: tu tarjeta quedó guardada en Snappy';
    title = '¡Gracias por sumar tu tarjeta!';
    lead = `Guardamos tu tarjeta${card ? ` (${escapeHtml(card)})` : ''} para <strong>${escapeHtml(name)}</strong>.`;
    leadText = `Guardamos tu tarjeta${card ? ` (${card})` : ''} para ${name}.`;
    detail = fecha
      ? `Tu primer cobro es el <strong>${fecha}</strong> y es ${amount}. Hasta esa fecha no se te cobra nada y seguís usando Snappy con normalidad.`
      : `Tu primer cobro es ${amount} y se hace cuando termina tu prueba. Hasta entonces no se te cobra nada.`;
    detailText = fecha
      ? `Tu primer cobro es el ${fecha} y es ${amountText}. Hasta esa fecha no se te cobra nada y seguís usando Snappy con normalidad.`
      : `Tu primer cobro es ${amountText} y se hace cuando termina tu prueba. Hasta entonces no se te cobra nada.`;
  } else if (data.mode === 'trial_expired') {
    subject = 'Gracias: recibimos tu tarjeta en Snappy';
    title = '¡Gracias por sumar tu tarjeta!';
    lead = `Guardamos tu tarjeta${card ? ` (${escapeHtml(card)})` : ''} para <strong>${escapeHtml(name)}</strong>.`;
    leadText = `Guardamos tu tarjeta${card ? ` (${card})` : ''} para ${name}.`;
    detail = `Tu primer cobro se hace en breve y es ${amount}.`;
    detailText = `Tu primer cobro se hace en breve y es ${amountText}.`;
  } else {
    subject = 'Gracias: tu suscripción de Snappy está activa';
    title = '¡Gracias por volver a Snappy!';
    lead = `Tu suscripción de <strong>${escapeHtml(name)}</strong> está activa${card ? ` con tu tarjeta ${escapeHtml(card)}` : ''}.`;
    leadText = `Tu suscripción de ${name} está activa${card ? ` con tu tarjeta ${card}` : ''}.`;
    detail = `El cobro ${amount} se hizo ahora y tu menú ya está activo.`;
    detailText = `El cobro ${amountText} se hizo ahora y tu menú ya está activo.`;
  }

  const html = emailLayout('Gracias por sumar tu tarjeta', `
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#15160E;letter-spacing:-0.5px;line-height:1.2;">
                ${title}
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:#86877B;line-height:1.6;">
                ${lead}
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#15160E;line-height:1.6;">
                ${detail}
              </p>

              ${emailButton(THANKS_PLAN_URL, 'Ver mi plan')}

              <p style="margin:24px 0 0;font-size:12px;color:#86877B;text-align:center;line-height:1.6;">
                ¿Dudas? <a href="${whatsappLink(WA_TEXT_THANKS)}" style="color:#1BB179;text-decoration:none;">Escribinos por WhatsApp</a>
              </p>

              <hr style="border:none;border-top:1px solid #ECEBE3;margin:40px 0;" />

              <p style="margin:0;font-size:12px;color:#86877B;text-align:center;line-height:1.6;">
                Recibiste este email porque cargaste una tarjeta en
                <a href="https://snappy.uno" style="color:#1BB179;text-decoration:none;">snappy.uno</a>.
              </p>
`);

  const text = `${title}

${leadText}

${detailText}

Ver mi plan: ${THANKS_PLAN_URL}

¿Dudas? Escribinos por WhatsApp: ${whatsappLink(WA_TEXT_THANKS)}

Recibiste este email porque cargaste una tarjeta en snappy.uno.

© ${new Date().getFullYear()} Snappy · hola@snappy.uno
`;

  return { subject, html, text };
}
