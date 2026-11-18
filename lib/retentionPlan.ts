// Decide, para cada local cancelado, qué toca hoy con la retención de datos. Lógica pura, sin red ni base:
// la usa app/api/cron/data-retention y se prueba con scripts/check-retention-plan.mjs.
//
// Reglas (definidas con Luciano):
//   - solo locales con subscription_status = 'cancelled' y un fin de servicio válido (grace_period_until);
//   - el borrado es RETENTION_DAYS días después del fin del servicio; el aviso por mail, WARNING_DAYS antes;
//   - NUNCA se borra sin un aviso ya enviado: el borrado exige un 'delete_warning' enviado hace al menos
//     MIN_DAYS_AFTER_WARNING días (14) y haber llegado el día del borrado;
//   - si el aviso no salió a tiempo (cron caído, cuenta cancelada tarde), se manda igual y se corre el borrado:
//     la fecha que dice el mail es la más lejana entre el día del borrado y hoy + WARNING_DAYS.

import { addDays } from './email/dates.ts';
import { deleteOnFor, warningOnFor, WARNING_DAYS } from './dataRetention.ts';

export const MIN_DAYS_AFTER_WARNING = 14;

export type RetentionRow = {
  id: string;
  subscription_status: string | null;
  grace_period_until: string | Date | null;
};

export type RetentionAction =
  | { kind: 'warn'; id: string; deleteOn: Date }
  | { kind: 'delete'; id: string; deleteOn: Date }
  | { kind: 'wait'; id: string; deleteOn: Date };

function validDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// warnedAt: cuándo salió el último aviso enviado (por id), si salió.
export function planRetention(rows: RetentionRow[], warnedAt: Map<string, Date>, now: Date): RetentionAction[] {
  const actions: RetentionAction[] = [];
  for (const r of rows) {
    if (r.subscription_status !== 'cancelled') continue;
    const end = validDate(r.grace_period_until);
    if (!end) continue;

    const deleteOn = deleteOnFor(end, end);
    // Un aviso de una cancelación anterior (antes del fin del servicio actual) no cuenta: tiene que ser de este ciclo.
    const w = warnedAt.get(r.id) ?? null;
    const warned = w && w.getTime() >= end.getTime() ? w : null;

    if (!warned) {
      if (now.getTime() >= warningOnFor(deleteOn).getTime()) {
        const effective = new Date(Math.max(deleteOn.getTime(), addDays(now, WARNING_DAYS).getTime()));
        actions.push({ kind: 'warn', id: r.id, deleteOn: effective });
      } else {
        actions.push({ kind: 'wait', id: r.id, deleteOn });
      }
      continue;
    }

    const earliestDelete = Math.max(deleteOn.getTime(), addDays(warned, MIN_DAYS_AFTER_WARNING).getTime());
    actions.push(
      now.getTime() >= earliestDelete
        ? { kind: 'delete', id: r.id, deleteOn }
        : { kind: 'wait', id: r.id, deleteOn },
    );
  }
  return actions;
}
