// Datos de /admin/snappy (SuperAdmin): arma, con el service role, la lista perfiles + local de cada usuario.
// Lógica pura, sin imports con alias (@/): se prueba sin red en scripts/check-admin-overview.mjs.
// La usa GET /api/admin/overview (solo hasAdminSnappyAccess).
//
// Columnas: lista cerrada. NUNCA se copia la fila entera. Del local no sale mp_card_id ni mp_preapproval_id:
// la pantalla solo necesita saber SI hay tarjeta (has_card), para la regla de "Trial vencido".

export const ADMIN_PROFILE_COLUMNS = ['id', 'email', 'first_name', 'phone', 'created_at'] as const;

export const ADMIN_RESTAURANT_COLUMNS = [
  'id',
  'user_id',
  'slug',
  'subscription_status',
  'subscription_plan',
  'created_at',
  'trial_ends_at',
] as const;

// Lo que se pide a la base: las columnas públicas del panel + mp_card_id SOLO para calcular has_card.
export const ADMIN_PROFILE_SELECT = ADMIN_PROFILE_COLUMNS.join(', ');
export const ADMIN_RESTAURANT_SELECT = [...ADMIN_RESTAURANT_COLUMNS, 'mp_card_id'].join(', ');

export type AdminProfile = Record<(typeof ADMIN_PROFILE_COLUMNS)[number], unknown>;
export type AdminRestaurant = Record<(typeof ADMIN_RESTAURANT_COLUMNS)[number], unknown> & { has_card: boolean };
export type AdminOverviewRow = { profile: AdminProfile; restaurant: AdminRestaurant | null };

type Row = Record<string, unknown>;

function pick(row: Row, columns: readonly string[]): Row {
  const out: Row = {};
  for (const col of columns) out[col] = Object.prototype.hasOwnProperty.call(row, col) ? row[col] : null;
  return out;
}

// Mismo criterio que chargeScheduled (lib/trial): una tarjeta vacía o de solo espacios no cuenta.
function hasCard(v: unknown): boolean {
  return typeof v === 'string' ? v.trim() !== '' : !!v;
}

function time(v: unknown): number {
  const t = new Date(v as string).getTime();
  return Number.isNaN(t) ? 0 : t;
}

// Une por user_id. Un perfil sin local queda con restaurant: null; un local sin perfil no se lista (como hoy: la
// lista sale de los perfiles). Si un usuario tuviera más de un local, se toma el más antiguo (criterio estable).
// Orden: el más reciente primero (created_at del perfil), con el id como desempate.
export function buildAdminOverview(
  profiles: readonly Row[] | null | undefined,
  restaurants: readonly Row[] | null | undefined,
): AdminOverviewRow[] {
  const byUser = new Map<string, Row>();
  for (const r of restaurants ?? []) {
    const uid = typeof r.user_id === 'string' ? r.user_id : null;
    if (!uid) continue;
    const prev = byUser.get(uid);
    if (!prev || time(r.created_at) < time(prev.created_at)) byUser.set(uid, r);
  }

  const rows = (profiles ?? []).map((p): AdminOverviewRow => {
    const r = typeof p.id === 'string' ? byUser.get(p.id) : undefined;
    return {
      profile: pick(p, ADMIN_PROFILE_COLUMNS) as AdminProfile,
      restaurant: r ? ({ ...pick(r, ADMIN_RESTAURANT_COLUMNS), has_card: hasCard(r.mp_card_id) } as AdminRestaurant) : null,
    };
  });

  return rows.sort((a, b) => {
    const d = time(b.profile.created_at) - time(a.profile.created_at);
    return d !== 0 ? d : String(a.profile.id).localeCompare(String(b.profile.id));
  });
}
