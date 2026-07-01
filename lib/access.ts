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

// Acceso anticipado a Caja y Rentabilidad independientemente del plan.
export const BETA_ACCESS_EMAILS = [
  'luchiimee2@gmail.com',
  'vachettigustavo@gmail.com',
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
