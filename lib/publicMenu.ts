// Datos públicos del menú: lista CERRADA de columnas de restaurants, cálculo de suspensión y validación
// de slug. Puro: sin React ni imports con alias (se prueba sin red: scripts/check-public-menu.mjs).
//
// Lo usa el endpoint app/api/public/menu/[slug] (service role) para que el navegador deje de leer
// restaurants con select("*"). Las columnas sensibles (owner_email, user_id, mp_*, card_last_four,
// card_brand, trial_ends_at, next_payment_date, grace_period_until, subscription_status, created_at,
// delivery_address, cash_*, mp_checkout_enabled...) NO están en la lista: las que hacen falta para
// decidir la suspensión se leen aparte en el servidor (SUSPENSION_COLUMNS) y no se devuelven.

import { isTrialBlocking } from './trial.ts';

// Columnas que el menú (app/[slug]/page.tsx, templates, CartFooter) y la bio usan de restaurants.
// subscription_plan entra: la página la usa como planType. Ordenadas alfabéticamente.
export const PUBLIC_RESTAURANT_COLUMNS = [
  'address',
  'alias_transferencia',
  'always_open',
  'banner_url',
  'bg_color',
  'business_hours',
  'business_type',
  'card_btn_bg',
  'card_btn_text',
  'card_color',
  'card_desc_color',
  'card_name_bg',
  'card_name_color',
  'card_price_color',
  'card_shadow_color',
  'card_show_bg',
  'cat_active_bg_color',
  'cat_active_text_color',
  'cat_bg_color',
  'cat_text_color',
  'cat_title_color',
  'city',
  'current_shift_id',
  'delivery_cost',
  'delivery_lat',
  'delivery_lng',
  'delivery_zone1_cost',
  'delivery_zone1_km',
  'delivery_zone2_cost',
  'delivery_zone2_km',
  'delivery_zones_enabled',
  'desc_font',
  'desc_size',
  'description',
  'description_color',
  'efectivo_enabled',
  'facebook',
  'google_maps_link',
  'hero_badge_bg',
  'hero_badge_color',
  'hero_badge_text',
  'hero_description',
  'hero_dessert_id',
  'hero_drink_options',
  'hero_drink_size',
  'hero_price',
  'hero_price_color',
  'hero_title',
  'hero_title_color',
  // hero_video_url NO está: la columna no existe en public.restaurants (verificado en producción el
  // 2026-11-08, daba 42703). SpotlightHero ya cae en heroProduct.video_url cuando viene undefined.
  'id',
  'instagram',
  'is_open',
  'logo_url',
  'name',
  'opening_hours',
  'phone',
  'promo_bg_color',
  'promo_font',
  'promo_message',
  'promo_text_color',
  'receive_whatsapp',
  'reservations_enabled',
  'scheduled_delivery_config',
  'scheduled_delivery_enabled',
  'scheduled_delivery_slots',
  'search_bg_color',
  'search_icon_color',
  'secondary_menu_description',
  'secondary_menu_dessert_id',
  'secondary_menu_drink_options',
  'secondary_menu_drink_size',
  'secondary_menu_entrance_id',
  'secondary_menu_name',
  'secondary_menu_price',
  'show_banner',
  'show_promo',
  'subscription_plan',
  'template_id',
  'text_color',
  'theme_color',
  'tiktok',
  'title_font',
  'transferencia_enabled',
] as const;

// Columnas que SOLO se leen en el servidor para decidir la suspensión. Nunca se devuelven.
export const SUSPENSION_COLUMNS = [
  'owner_email',
  'subscription_status',
  'created_at',
  'mp_card_id',
  'trial_ends_at',
  'grace_period_until',
] as const;

// Columnas propias de snappylinks que usa la página para armar la bio.
export const PUBLIC_SNAPPYLINK_COLUMNS = [
  'bio',
  'links',
  'template_id',
  'is_active',
  'title',
  'bg_color',
  'bg_img',
  'btn_color',
  'btn_text_color',
  'shadow_color',
  'title_color',
  'desc_color',
  'social_links',
  'social_pos',
] as const;

export type PublicRestaurant = Record<string, unknown>;

function pick(row: Record<string, unknown> | null | undefined, columns: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!row) return out;
  for (const col of columns) {
    if (Object.prototype.hasOwnProperty.call(row, col)) out[col] = row[col];
  }
  return out;
}

// Copia SOLO las columnas permitidas (nunca el spread de la fila).
export function toPublicRestaurant(row: Record<string, unknown> | null | undefined): PublicRestaurant {
  return pick(row, PUBLIC_RESTAURANT_COLUMNS);
}

// Copia SOLO las columnas permitidas de snappylinks.
export function toPublicSnappylink(row: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return pick(row, PUBLIC_SNAPPYLINK_COLUMNS);
}

export type SuspensionRow = {
  owner_email?: string | null;
  subscription_status?: string | null;
  created_at?: string | Date | null;
  mp_card_id?: string | null;
  trial_ends_at?: string | Date | null;
  grace_period_until?: string | Date | null;
};

// Copia EXACTA de la lógica de app/[slug]/page.tsx (~:2756-2779):
//   - admin: el DUEÑO del local está en ADMIN_EMAILS (comparación exacta, sin normalizar)
//   - prueba vencida: isTrialBlocking (lib/trial)
//   - gracia: grace_period_until futura
//   - suspendido: no admin, no en gracia y (cancelled | paused | prueba vencida)
export function computeMenuSuspension(
  row: SuspensionRow | null | undefined,
  adminEmails: readonly string[],
  now: Date,
): { isSuspended: boolean; isAdmin: boolean } {
  const r = row ?? {};
  const ownerEmail = r.owner_email || '';
  const isAdmin = adminEmails.includes(ownerEmail);

  const trialExpired = isTrialBlocking({
    status: r.subscription_status,
    createdAt: r.created_at,
    mpCardId: r.mp_card_id,
    trialEndsAt: r.trial_ends_at,
    now,
  });

  const inGracePeriod = !!(r.grace_period_until && new Date(r.grace_period_until) > now);

  const isSuspended = !isAdmin && !inGracePeriod && (
    r.subscription_status === 'cancelled' ||
    r.subscription_status === 'paused' ||
    trialExpired
  );

  return { isSuspended, isAdmin };
}

// Slug válido: minúsculas, números y guiones, entre 1 y 80 caracteres.
export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && /^[a-z0-9-]{1,80}$/.test(slug);
}

// Nombre de la columna de un error 42703 de Postgres/PostgREST ("column restaurants.hero_video_url
// does not exist"). Devuelve SOLO el nombre (sin mensaje completo) o null si no matchea de forma estricta.
// Sirve para loguear qué columna falta sin volcar texto de la base.
export function columnFromPgError(message: unknown): string | null {
  if (typeof message !== 'string' || message.length > 500) return null;
  const m = message.match(/column "?([a-z0-9_]+(?:\.[a-z0-9_]+)?)"? does not exist/i);
  return m ? m[1] : null;
}
