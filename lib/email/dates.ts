// Fechas de los mails de ciclo de vida, siempre en hora Argentina (UTC-3, sin horario de verano).
// Los "días desde el alta" se cuentan por día de calendario argentino, no por bloques de 24 hs.
//
// Sin imports (ni alias) para poder probarla sin red: scripts/check-lifecycle-emails.mjs.

const TZ = 'America/Argentina/Buenos_Aires';
const DAY_MS = 24 * 60 * 60 * 1000;

const ymdFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});

const longFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric',
});

// 'YYYY-MM-DD' del día argentino de esa fecha.
export function diaArg(date: Date): string {
  return ymdFormat.format(date);
}

// Días de calendario argentino entre el alta y ahora (0 el mismo día). null si la fecha no es válida.
export function diasDesde(createdAt: string | Date | null | undefined, now: Date): number | null {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime()) || Number.isNaN(now.getTime())) return null;
  const a = Date.parse(`${diaArg(created)}T00:00:00Z`);
  const b = Date.parse(`${diaArg(now)}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS);
}

// Suma días exactos (24 hs cada uno; Argentina no tiene horario de verano).
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

// '15 de noviembre de 2026', en hora Argentina.
export function fechaLargaArg(date: Date): string {
  return longFormat.format(date);
}
