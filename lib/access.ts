/**
 * Fuente única de verdad para accesos especiales por email.
 * No hardcodear estas listas en ningún otro archivo — importar desde acá.
 */

// Admin global: bypass de trial/pausado/cancelado, inmunidad de suspensión
// en el menú público, y acceso a herramientas internas.
export const ADMIN_EMAILS = [
  'luchiimee2@gmail.com',
  'snappyuno25@gmail.com',
  'ginoroblabelleggia@gmail.com',
];

// Subconjunto de ADMIN_EMAILS con acceso al panel interno /admin/snappy.
// Gino es admin global pero no tiene acceso a esta sección específica.
export const ADMIN_SNAPPY_ACCESS_EMAILS = [
  'luchiimee2@gmail.com',
  'snappyuno25@gmail.com',
];

// Mercado Pago Connect (cada restaurante vincula su cuenta de MP).
// Las fases 2 a 4 (checkout online, pedidos pagados, webhooks) y el límite de uso
// de /api/checkout/mp/* (lib/rateLimit.ts) ya están hechos. Antes de pasar a true:
// correr docs/sql/15_rate_limits.sql y cargar RATE_LIMIT_IP_SALT en Vercel (sin la
// función o la sal, POST /api/checkout/mp responde 503). Mientras sea false, solo
// los admins (ADMIN_EMAILS) pueden conectar. El plan GO o Plus se exige siempre.
export const MP_CONNECT_PUBLIC = false;

// Acceso anticipado a Caja y Rentabilidad independientemente del plan.
export const BETA_ACCESS_EMAILS = [
  'luchiimee2@gmail.com',
];

function normalize(email?: string | null) {
  return (email ?? '').toLowerCase().trim();
}

export function isAdminEmail(email?: string | null) {
  return ADMIN_EMAILS.includes(normalize(email));
}

export function hasAdminSnappyAccess(email?: string | null) {
  return ADMIN_SNAPPY_ACCESS_EMAILS.includes(normalize(email));
}

export function hasBetaAccess(email?: string | null) {
  return BETA_ACCESS_EMAILS.includes(normalize(email));
}

export function canUseMpConnect(email?: string | null) {
  return MP_CONNECT_PUBLIC || isAdminEmail(email);
}
