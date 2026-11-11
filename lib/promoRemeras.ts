// Promo de noviembre 2026 (remeras): ranking de los locales registrados en noviembre según quién pagó primero.
// Lógica pura, sin imports con alias (@/) para probarla con scripts/check-promo-remeras.mjs.
// La usa GET /api/admin/promo-remeras (solo admins). La fecha del primer pago sale de restaurants.first_paid_at
// (docs/sql/23_first_paid_at.sql).
//
// Reglas
//   - Entran los locales creados entre el 2026-11-01 00:00 y el 2026-11-30 23:59:59.999, hora de Argentina (-03:00).
//   - Se ordenan por first_paid_at ascendente; los que todavía no pagaron, al final. Empate de first_paid_at:
//     gana el que se registró antes (created_at) y, si también empata, el id (orden estable).
//   - Puesto 1 a 10: solo para quien pagó EN PLAZO (first_paid_at <= 2026-12-15 23:59:59.999 -03:00). Quien pagó
//     después queda con fuera_de_plazo = true, sin puesto, y no ocupa un lugar: el cupo pasa a quien sí pagó.
//   - Se pueden excluir correos (cuentas internas de admin).

export const PROMO_REMERAS_SLOTS = 10;
export const PROMO_REGISTRATION_START = '2026-11-01T00:00:00-03:00';
// Exclusivo: 2026-12-01 00:00 AR = fin del 30/11 (23:59:59.999)
export const PROMO_REGISTRATION_END_EXCLUSIVE = '2026-12-01T00:00:00-03:00';
export const PROMO_PAYMENT_DEADLINE = '2026-12-15T23:59:59.999-03:00';

export type PromoRestaurantRow = {
  id: unknown;
  name?: unknown;
  owner_email?: unknown;
  created_at?: unknown;
  first_paid_at?: unknown;
  subscription_plan?: unknown;
  subscription_status?: unknown;
};

export type PromoRemeraItem = {
  id: unknown;
  nombre: unknown;
  email_dueno: unknown;
  created_at: unknown;
  first_paid_at: unknown;
  plan: unknown;
  estado: unknown;
  puesto: number | null;
  fuera_de_plazo: boolean;
};

export type PromoRemerasResponse = {
  cupos: number;
  registro_desde: string;
  registro_hasta_exclusivo: string;
  plazo_pago: string;
  total: number;
  con_pago: number;
  en_plazo: number;
  locales: PromoRemeraItem[];
};

// Milisegundos de una fecha ISO o Date; null si no es una fecha válida
export function parseTime(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const t = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

const START = Date.parse(PROMO_REGISTRATION_START);
const END = Date.parse(PROMO_REGISTRATION_END_EXCLUSIVE);
const DEADLINE = Date.parse(PROMO_PAYMENT_DEADLINE);

// ¿Creado dentro de la ventana de noviembre? Inicio inclusive, fin exclusivo.
export function isRegisteredInPromoWindow(createdAt: unknown): boolean {
  const t = parseTime(createdAt);
  return t !== null && t >= START && t < END;
}

// ¿Pagó después del plazo? false si no hay fecha de pago válida.
export function isPaidAfterDeadline(firstPaidAt: unknown): boolean {
  const t = parseTime(firstPaidAt);
  return t !== null && t > DEADLINE;
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase().trim() : '';
}

function cmpText(a: unknown, b: unknown): number {
  const x = String(a ?? '');
  const y = String(b ?? '');
  return x < y ? -1 : x > y ? 1 : 0;
}

export function buildPromoRemeras(
  rows: readonly PromoRestaurantRow[] | null | undefined,
  opts: { excludeEmails?: readonly string[] } = {},
): PromoRemeraItem[] {
  if (!Array.isArray(rows)) return [];
  const excluded = new Set((opts.excludeEmails ?? []).map(normalizeEmail));

  const eligible = rows.filter(
    (r) => r && isRegisteredInPromoWindow(r.created_at) && !excluded.has(normalizeEmail(r.owner_email)),
  );

  const keyed = eligible.map((r) => ({ r, paid: parseTime(r.first_paid_at), created: parseTime(r.created_at) as number }));
  keyed.sort((a, b) => {
    if (a.paid !== null && b.paid !== null && a.paid !== b.paid) return a.paid - b.paid;
    if (a.paid === null && b.paid !== null) return 1; // sin pago, al final
    if (a.paid !== null && b.paid === null) return -1;
    if (a.created !== b.created) return a.created - b.created;
    return cmpText(a.r.id, b.r.id);
  });

  let enPlazo = 0;
  return keyed.map(({ r, paid }) => {
    const fuera = paid !== null && paid > DEADLINE;
    let puesto: number | null = null;
    if (paid !== null && !fuera) {
      enPlazo += 1;
      if (enPlazo <= PROMO_REMERAS_SLOTS) puesto = enPlazo;
    }
    return {
      id: r.id,
      nombre: r.name,
      email_dueno: r.owner_email,
      created_at: r.created_at,
      first_paid_at: paid === null ? null : r.first_paid_at,
      plan: r.subscription_plan,
      estado: r.subscription_status,
      puesto,
      fuera_de_plazo: fuera,
    };
  });
}

export function buildPromoRemerasResponse(
  rows: readonly PromoRestaurantRow[] | null | undefined,
  opts: { excludeEmails?: readonly string[] } = {},
): PromoRemerasResponse {
  const locales = buildPromoRemeras(rows, opts);
  return {
    cupos: PROMO_REMERAS_SLOTS,
    registro_desde: new Date(START).toISOString(),
    registro_hasta_exclusivo: new Date(END).toISOString(),
    plazo_pago: new Date(DEADLINE).toISOString(),
    total: locales.length,
    con_pago: locales.filter((l) => l.first_paid_at !== null).length,
    en_plazo: locales.filter((l) => l.first_paid_at !== null && !l.fuera_de_plazo).length,
    locales,
  };
}
