// Fecha del próximo cobro mensual: el MISMO día del mes siguiente (hora Argentina), no "+30 días".
//
// Ej.: primer cobro el 8/12 → 8/1 → 8/2 → 8/3. Si el mes siguiente no tiene ese día (29, 30 o 31),
// se usa el último día de ese mes (31/1 → 28/2). El cobro queda a las 00:00 hora Argentina de ese día;
// el cron (10:00 UTC) lo levanta esa mañana.
//
// `due` es la fecha de cobro que se acaba de cumplir (next_payment_date, o trial_ends_at en el primer cobro).
// Si falta o es inválida se parte de `now`. Si por un atraso el resultado no queda en el futuro, se sigue
// sumando meses hasta que lo esté (nunca devuelve una fecha ya vencida, para no cobrar dos veces seguidas).
//
// Solo importa ./email/dates.ts con ruta relativa para probarse sin red: scripts/check-billing-date.mjs.

import { diaArg } from './email/dates.ts';

function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export function nextMonthlyChargeDate(
  due: string | Date | null | undefined,
  now: Date = new Date(),
): Date {
  const parsed = due ? new Date(due) : null;
  const base = parsed && !Number.isNaN(parsed.getTime()) ? parsed : now;
  const [y0, m0, anchorDay] = diaArg(base).split('-').map(Number);

  let year = y0;
  let month = m0;
  for (let i = 0; i < 24; i++) {
    month += 1;
    if (month > 12) { month = 1; year += 1; }
    const day = Math.min(anchorDay, daysInMonth(year, month));
    const candidate = new Date(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00-03:00`,
    );
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  // Atraso absurdo (más de 2 años): se vuelve a partir de hoy
  return nextMonthlyChargeDate(now, now);
}
