// Decide, para cada local cancelado, qué toca hoy con la retención de datos. Lógica pura, sin red ni base:
// la usa app/api/cron/data-retention y se prueba con scripts/check-retention-plan.mjs.
//
// Reglas (definidas con Luciano):
//   - locales con subscription_status = 'cancelled' y un fin de servicio válido (grace_period_until);
//   - también las PRUEBAS GRATIS ABANDONADAS: 'trialing' que nunca cargó tarjeta ni pagó (sin mp_card_id, mp_customer_id,
//     mp_preapproval_id ni first_paid_at). Su "fin de servicio" es el fin de la prueba de 14 días contado desde
//     restaurants.created_at (más tardío o igual que la base real de la prueba: nunca borra antes de tiempo);
//   - el borrado es RETENTION_DAYS días después del fin del servicio; el aviso por mail, WARNING_DAYS antes;
//   - NUNCA se borra sin un aviso ya enviado: el borrado exige un 'delete_warning' enviado hace al menos
//     MIN_DAYS_AFTER_WARNING días (14) y haber llegado el día del borrado;
//   - si el aviso no salió a tiempo (cron caído, cuenta cancelada tarde), se manda igual y se corre el borrado:
//     la fecha que dice el mail es la más lejana entre el día del borrado y hoy + WARNING_DAYS.

import { addDays } from './email/dates.ts';
import { deleteOnFor, warningOnFor, WARNING_DAYS } from './dataRetention.ts';
import { trialExpiresAt } from './trial.ts';

export const MIN_DAYS_AFTER_WARNING = 14;

export type RetentionRow = {
  id: string;
  subscription_status: string | null;
  grace_period_until: string | Date | null;
  // Solo para las pruebas abandonadas (si faltan, el local no se considera abandonado)
  created_at?: string | Date | null;
  mp_card_id?: string | null;
  mp_customer_id?: string | null;
  mp_preapproval_id?: string | null;
  first_paid_at?: string | Date | null;
};

// Por qué el local entra en la retención: canceló, o dejó vencer la prueba sin suscribirse.
export type RetentionReason = 'cancelled' | 'trial';

export type RetentionAction =
  | { kind: 'warn'; id: string; deleteOn: Date; reason: RetentionReason }
  | { kind: 'delete'; id: string; deleteOn: Date; reason: RetentionReason }
  | { kind: 'wait'; id: string; deleteOn: Date; reason: RetentionReason };

// Una prueba abandonada: nunca tuvo tarjeta, cliente ni suscripción en Mercado Pago, ni pagó jamás.
// Exige que los cuatro campos estén presentes y vacíos (undefined = no se leyó → no se considera abandonada).
export function isAbandonedTrial(r: RetentionRow): boolean {
  if (r.subscription_status !== 'trialing') return false;
  const vacio = (v: unknown) => v === null;
  return vacio(r.mp_card_id) && vacio(r.mp_customer_id) && vacio(r.mp_preapproval_id) && vacio(r.first_paid_at);
}

// Fin del servicio y motivo, o null si el local no entra en la retención.
function serviceEnd(r: RetentionRow): { end: Date; reason: RetentionReason } | null {
  if (r.subscription_status === 'cancelled') {
    const end = validDate(r.grace_period_until);
    return end ? { end, reason: 'cancelled' } : null;
  }
  if (isAbandonedTrial(r)) {
    const end = trialExpiresAt(r.created_at ?? null);
    return end ? { end, reason: 'trial' } : null;
  }
  return null;
}

function validDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// warnedAt: cuándo salió el último aviso enviado (por id), si salió.
export function planRetention(rows: RetentionRow[], warnedAt: Map<string, Date>, now: Date): RetentionAction[] {
  const actions: RetentionAction[] = [];
  for (const r of rows) {
    const se = serviceEnd(r);
    if (!se) continue;
    const { end, reason } = se;

    const deleteOn = deleteOnFor(end, end);
    // Un aviso de una cancelación anterior (antes del fin del servicio actual) no cuenta: tiene que ser de este ciclo.
    const w = warnedAt.get(r.id) ?? null;
    const warned = w && w.getTime() >= end.getTime() ? w : null;

    if (!warned) {
      if (now.getTime() >= warningOnFor(deleteOn).getTime()) {
        const effective = new Date(Math.max(deleteOn.getTime(), addDays(now, WARNING_DAYS).getTime()));
        actions.push({ kind: 'warn', id: r.id, deleteOn: effective, reason });
      } else {
        actions.push({ kind: 'wait', id: r.id, deleteOn, reason });
      }
      continue;
    }

    const earliestDelete = Math.max(deleteOn.getTime(), addDays(warned, MIN_DAYS_AFTER_WARNING).getTime());
    actions.push(
      now.getTime() >= earliestDelete
        ? { kind: 'delete', id: r.id, deleteOn, reason }
        : { kind: 'wait', id: r.id, deleteOn, reason },
    );
  }
  return actions;
}
