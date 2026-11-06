// Turnos de entrega programada: genera los horarios que ve el cliente en el checkout.
//
// - La hora y el día de la semana se toman en America/Argentina/Buenos_Aires, no en la zona del
//   navegador del cliente: depende solo del instante `now`.
// - Una franja "desde-hasta" es [desde, hasta). hasta = 00:00 se lee como 24:00; hasta <= desde cruza
//   la medianoche (22:00-02:00).
// - Los turnos pasada la medianoche (de la franja de hoy) llevan nextDay = true y se muestran con su
//   hora real y el sufijo "(día siguiente)".
// - Pasada la medianoche también se ofrece el tramo restante de la franja del día anterior
//   (a las 00:10, la franja 22:00-02:00 de ayer sigue ofreciendo 00:45, 01:00, ...).
// - Un turno está disponible si es posterior a ahora + el tiempo mínimo de preparación (buffer).
//
// Sin imports (ni alias) para poder probarla sin red: scripts/check-delivery-slots.mjs.

export const DELIVERY_TIME_ZONE = 'America/Argentina/Buenos_Aires';
export const NEXT_DAY_SUFFIX = '(día siguiente)';

export type SlotRange = { from: string; to: string };
// Franjas por día: { lunes: [{from:'20:30', to:'00:00'}], martes: [...], ... }
export type SlotAgenda = { [day: string]: SlotRange[] | undefined } | null | undefined;

export type DeliverySlot = {
  time: string;      // 'HH:MM' real
  nextDay: boolean;  // cae después de la medianoche, ya en el día siguiente
  label: string;     // lo que se muestra y se guarda en el pedido: 'HH:MM' o 'HH:MM (día siguiente)'
};

const DAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const WEEKDAY_INDEX: { [name: string]: number } = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};
const DAY_MINUTES = 1440;

const zoneFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: DELIVERY_TIME_ZONE,
  hourCycle: 'h23',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

// Día de la semana (0 = domingo) y minutos desde las 00:00 de hoy, en hora Argentina.
export function argentinaClock(now: Date): { dayIndex: number; minutes: number } {
  const parts: { [type: string]: string } = {};
  for (const p of zoneFormat.formatToParts(now)) parts[p.type] = p.value;
  const h = Number(parts.hour) % 24;
  return {
    dayIndex: WEEKDAY_INDEX[parts.weekday],
    minutes: h * 60 + Number(parts.minute) + Number(parts.second) / 60,
  };
}

function parseHHMM(value: unknown): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min !== 0)) return null;
  return h * 60 + min;
}

// Franja en minutos desde las 00:00 del día de apertura: end puede pasar de 1440 si cruza la medianoche.
function rangeMinutes(range: SlotRange): { start: number; end: number } | null {
  const start = parseHHMM(range?.from);
  let end = parseHHMM(range?.to);
  if (start === null || end === null) return null;
  if (end === 0) end = DAY_MINUTES;          // hasta 00:00 = 24:00
  else if (end <= start) end += DAY_MINUTES; // cruza la medianoche
  if (end <= start) return null;             // p. ej. 00:00-00:00 ya quedó como 0-1440; esto es defensivo
  return { start, end };
}

function hhmm(minutes: number): string {
  const m = ((Math.round(minutes) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function generateSlots(
  now: Date,
  agenda: SlotAgenda,
  intervalMinutes: number,
  bufferMinutes: number,
): DeliverySlot[] {
  const interval = Number(intervalMinutes) > 0 ? Number(intervalMinutes) : 30;
  const buffer = Number(bufferMinutes) > 0 ? Number(bufferMinutes) : 0;
  const { dayIndex, minutes: nowMin } = argentinaClock(now);
  const minAllowed = nowMin + buffer;

  // Minutos absolutos desde las 00:00 de hoy → turno. Si se repite un horario queda uno solo.
  const byMinute = new Map<number, DeliverySlot>();

  // Tramo de ayer que cruzó la medianoche (ya es "hoy"): solo los turnos desde las 00:00 en adelante.
  const yesterday = agenda?.[DAYS[(dayIndex + 6) % 7]] ?? [];
  for (const range of yesterday) {
    const r = rangeMinutes(range);
    if (!r || r.end <= DAY_MINUTES) continue;
    for (let t = r.start; t < r.end; t += interval) {
      if (t < DAY_MINUTES) continue;
      const today = t - DAY_MINUTES;
      if (today > minAllowed) byMinute.set(today, { time: hhmm(today), nextDay: false, label: hhmm(today) });
    }
  }

  // Franjas de hoy; lo que pasa de las 24:00 es del día siguiente.
  const todays = agenda?.[DAYS[dayIndex]] ?? [];
  for (const range of todays) {
    const r = rangeMinutes(range);
    if (!r) continue;
    for (let t = r.start; t < r.end; t += interval) {
      if (t <= minAllowed || byMinute.has(t)) continue;
      const time = hhmm(t);
      const nextDay = t >= DAY_MINUTES;
      byMinute.set(t, { time, nextDay, label: nextDay ? `${time} ${NEXT_DAY_SUFFIX}` : time });
    }
  }

  return [...byMinute.entries()].sort((a, b) => a[0] - b[0]).map(([, slot]) => slot);
}
