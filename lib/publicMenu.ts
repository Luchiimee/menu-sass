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
  'user_id', // solo para leer profiles.created_at (base de la prueba, lib/trialBase); nunca se devuelve
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
  // Fecha base de la prueba ya resuelta (lib/trialBase: la más antigua entre perfil y local); manda sobre created_at
  trial_base_at?: string | Date | null;
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
    createdAt: r.trial_base_at ?? r.created_at,
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

// Slug para la comparación: sin espacios en los bordes. No se pasa a minúsculas porque la búsqueda es
// insensible a mayúsculas (ilike) y hay locales cuyo slug guardado tiene mayúsculas ("Donacocafrutosecos").
export function normalizeSlug(slug: unknown): string {
  return String(slug ?? '').trim();
}

// Slug válido: letras (mayúsculas y minúsculas), números, guion, punto y guion bajo; entre 1 y 80 caracteres.
// Rechaza vacío, espacios, %, *, comillas, barras, caracteres de control y cualquier otro.
export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(slug);
}

// Escapa la barra invertida, % y _ para usar el slug como patrón de ilike SIN comodines: "a_b" no coincide
// con "axb" y "a%" no coincide con "abc". (En ilike el escape por defecto de Postgres es la barra invertida.)
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

// Nombre de la columna de un error 42703 de Postgres/PostgREST ("column restaurants.hero_video_url
// does not exist"). Devuelve SOLO el nombre (sin mensaje completo) o null si no matchea de forma estricta.
// Sirve para loguear qué columna falta sin volcar texto de la base.
export function columnFromPgError(message: unknown): string | null {
  if (typeof message !== 'string' || message.length > 500) return null;
  const m = message.match(/column "?([a-z0-9_]+(?:\.[a-z0-9_]+)?)"? does not exist/i);
  return m ? m[1] : null;
}

export type MenuResponse =
  | { type: 'menu' | 'bio'; isSuspended: true }
  | {
      type: 'menu' | 'bio';
      isSuspended: false;
      planType: string | null;
      restaurant: PublicRestaurant;
      categories?: unknown[];
      snappylink?: Record<string, unknown>;
    };

// Arma el cuerpo JSON del endpoint. La respuesta NUNCA trae isAdmin (la página no lo usa y le diría a
// cualquier visitante si el dueño es admin) ni columnas fuera de la lista pública. Suspendido: solo
// { type, isSuspended: true }, sin ningún dato del local.
export function buildMenuResponse(input: {
  type: 'menu' | 'bio';
  row: Record<string, unknown>;
  adminEmails: readonly string[];
  now: Date;
  categories?: unknown[];
  snappylinkRow?: Record<string, unknown> | null;
}): MenuResponse {
  const { isSuspended } = computeMenuSuspension(input.row as SuspensionRow, input.adminEmails, input.now);
  if (isSuspended) return { type: input.type, isSuspended: true };

  const restaurant = toPublicRestaurant(input.row);
  const planType = (restaurant.subscription_plan as string | null | undefined) ?? null;

  if (input.type === 'bio') {
    return { type: 'bio', isSuspended: false, planType, restaurant, snappylink: toPublicSnappylink(input.snappylinkRow) };
  }
  return { type: 'menu', isSuspended: false, planType, restaurant, categories: input.categories ?? [] };
}

// ─── Mapeo de la respuesta del endpoint a lo que esperan la página y los templates ─────────────────
// Reproduce lo que armaba getRestaurant de app/[slug]/page.tsx con la lectura vieja (select('*')).

// El Plan Light no incluye video en el catálogo: se saca acá aunque haya quedado cargado de un plan anterior.
export function productsForPlan(rawProducts: any[] | null | undefined, planType: string | null | undefined): any[] {
  return (rawProducts || []).map((p: any) => (planType === 'light' ? { ...p, video_url: null } : p));
}

// Menú: { ...local, categories (con sus products), fetched_products, fetched_extras, page_type: 'menu' }
export function mapMenuResponse(resp: { restaurant: any; categories?: any[] | null; planType?: string | null }, rawProducts: any[] | null | undefined, allExtras: any[] | null | undefined): any {
  const products = productsForPlan(rawProducts, resp.planType ?? resp.restaurant?.subscription_plan);
  const categoriesWithProducts = (resp.categories || []).map((cat: any) => ({
    ...cat,
    products: products.filter((p: any) => String(p.category_id) === String(cat.id)),
  }));
  return {
    ...resp.restaurant,
    categories: categoriesWithProducts,
    fetched_products: products,
    fetched_extras: allExtras || [],
    page_type: 'menu',
  };
}

// Bio: { ...local, snappylink_* (mismos nombres y valores por defecto de siempre), is_bio_active, page_type: 'bio' }
export function mapBioResponse(resp: { restaurant: any; snappylink?: any }): any {
  const sl = resp.snappylink || {};
  return {
    ...resp.restaurant,
    snappylink_bio: sl.bio,
    snappylink_links: sl.links,
    snappylink_template_id: sl.template_id,
    is_bio_active: sl.is_active,
    snappylink_title: sl.title,
    snappylink_bg_color: sl.bg_color,
    snappylink_bg_img: sl.bg_img,
    snappylink_btn_color: sl.btn_color,
    snappylink_btn_text_color: sl.btn_text_color,
    snappylink_shadow_color: sl.shadow_color,
    snappylink_title_color: sl.title_color,
    snappylink_desc_color: sl.desc_color,
    snappylink_social_links: sl.social_links || [],
    snappylink_social_pos: sl.social_pos || 'bottom',
    page_type: 'bio',
  };
}
