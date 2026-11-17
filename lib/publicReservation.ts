// Reservas desde el menú PÚBLICO (POST /api/public/reservations y POST /api/public/reservations/lookup).
// Antes el navegador leía e insertaba en `reservations` con la clave pública. Ahora todo pasa por el servidor
// (service_role) con validación y límite de uso. Lógica pura, sin imports con alias (@/), para probarla con
// scripts/check-public-reservation.mjs.
//
// Del cliente público NUNCA sale admin_notes (nota interna del dueño) ni created_at: solo la lista cerrada de
// columnas de abajo.

export const PUBLIC_RESERVATION_COLUMNS = [
  'customer_name',
  'reservation_date',
  'reservation_time',
  'guests',
  'status',
] as const;

export const PUBLIC_RESERVATION_SELECT = PUBLIC_RESERVATION_COLUMNS.join(', ');

export const RESERVATION_MAX_BODY_BYTES = 4 * 1024;
export const MAX_RESERVATION_GUESTS = 50;
export const MAX_RESERVATION_DAYS_AHEAD = 366;

const ANY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
// Solo dígitos, espacios, + - ( ): de 8 a 20 caracteres, con 8 a 15 dígitos
const PHONE_RE = /^[0-9 +\-()]{8,20}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = new RegExp('[\x00-\x08\x0b-\x1f\x7f-\x9f' + String.fromCharCode(0x2028, 0x2029) + ']');

export function isValidReservationRestaurantId(id: unknown): id is string {
  return typeof id === 'string' && ANY_UUID.test(id);
}

function cleanText(raw: unknown, max: number, required: boolean): string | null {
  if (raw === undefined || raw === null) return required ? null : '';
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (required && s.length === 0) return null;
  if (s.length > max) return null;
  if (CONTROL_CHARS.test(s)) return null;
  return s;
}

// Teléfono tal como se guarda y se busca (sin espacios en los extremos). null si no sirve.
export function normalizeReservationPhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!PHONE_RE.test(s)) return null;
  const digits = s.replace(/\D/g, '').length;
  if (digits < 8 || digits > 15) return null;
  return s;
}

function isRealDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const a = Date.parse(`${fromYmd}T00:00:00Z`);
  const b = Date.parse(`${toYmd}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

// Fecha y hora actuales de Argentina ('YYYY-MM-DD' y 'HH:MM')
export function argentinaNow(now: Date = new Date()): { date: string; time: string } {
  const date = now.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  const time = now.toLocaleTimeString('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

export type ReservationInput = {
  restaurantId: string;
  name: string;
  lastname: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  notes: string;
};

export type ReservationParse = { ok: true; value: ReservationInput } | { ok: false; error: string };

export function parseReservationRequest(body: unknown, now: Date = new Date()): ReservationParse {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'datos_invalidos' };
  const b = body as Record<string, unknown>;

  if (!isValidReservationRestaurantId(b.restaurantId)) return { ok: false, error: 'datos_invalidos' };
  const name = cleanText(b.name, 60, true);
  const lastname = cleanText(b.lastname, 60, true);
  const notes = cleanText(b.notes, 500, false);
  const phone = normalizeReservationPhone(b.phone);
  if (name === null || lastname === null || notes === null || phone === null) return { ok: false, error: 'datos_invalidos' };

  if (typeof b.date !== 'string' || !isRealDate(b.date)) return { ok: false, error: 'datos_invalidos' };
  if (typeof b.time !== 'string' || !TIME_RE.test(b.time)) return { ok: false, error: 'datos_invalidos' };
  const guests = b.guests;
  if (typeof guests !== 'number' || !Number.isInteger(guests) || guests < 1 || guests > MAX_RESERVATION_GUESTS) {
    return { ok: false, error: 'datos_invalidos' };
  }

  const today = argentinaNow(now);
  const ahead = daysBetween(today.date, b.date);
  if (ahead < 0) return { ok: false, error: 'fecha_pasada' };
  if (ahead > MAX_RESERVATION_DAYS_AHEAD) return { ok: false, error: 'datos_invalidos' };
  // Hoy: la hora tiene que ser futura (misma regla que tenía la página)
  if (b.date === today.date && b.time <= today.time) return { ok: false, error: 'fecha_pasada' };

  return {
    ok: true,
    value: { restaurantId: b.restaurantId.toLowerCase(), name, lastname, phone, date: b.date, time: b.time, guests, notes },
  };
}

export type LookupParse = { ok: true; value: { restaurantId: string; phone: string } } | { ok: false };

export function parseLookupRequest(body: unknown): LookupParse {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false };
  const b = body as Record<string, unknown>;
  if (!isValidReservationRestaurantId(b.restaurantId)) return { ok: false };
  const phone = normalizeReservationPhone(b.phone);
  if (phone === null) return { ok: false };
  return { ok: true, value: { restaurantId: b.restaurantId.toLowerCase(), phone } };
}

// Copia solo las columnas públicas de una fila de reservations
export function toPublicReservation(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const col of PUBLIC_RESERVATION_COLUMNS) out[col] = row[col] ?? null;
  return out;
}
