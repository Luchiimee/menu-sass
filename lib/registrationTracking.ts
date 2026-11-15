// Evento CompleteRegistration del píxel de Meta: lógica pura (sin imports con alias, probada con
// scripts/check-registration-tracking.mjs). La usan app/auth/callback/route.ts, app/registro-ok/page.tsx y
// components/MetaPixel.tsx.
//
// Distinguir un registro NUEVO con Google de un login de una cuenta existente NO tiene una señal infalible.
// Se usa una HEURÍSTICA sobre el usuario que devuelve Supabase al canjear el código del callback:
//   - app_metadata.provider === 'google' (así el link de confirmación de un registro con email, que también
//     vuelve por el callback, no cuenta);
//   - created_at reciente (NEW_USER_WINDOW_MS, ~120 s);
//   - last_sign_in_at cercano a created_at (MAX_SIGNIN_GAP_MS): en el primer ingreso las dos fechas son casi
//     iguales; en un login posterior last_sign_in_at es mucho más nuevo que created_at.
// Falsos negativos (un registro real que no se cuenta):
//   - quien se registró antes con email y entra por primera vez con Google: Supabase vincula la identidad a la
//     cuenta vieja y created_at es viejo;
//   - un callback que tarda más que la ventana (red lenta, el usuario deja abierta la pantalla de Google);
//   - un usuario sin last_sign_in_at o con fechas inválidas (se descarta por precaución).
// Falsos positivos (algo que se cuenta sin ser un registro nuevo):
//   - el mismo registro nuevo que vuelve a pasar por el callback dentro de la ventana (reintento, recarga):
//     lo absorbe la deduplicación por usuario en localStorage (claimRegistrationEvent) y el guard por módulo;
//   - si el navegador no deja usar localStorage (modo privado estricto) no hay deduplicación y ese reintento
//     contaría de nuevo;
//   - el mismo usuario que borra la cuenta y la recrea cuenta como nuevo (es razonable).
// Pérdidas después de la llamada a fbq: si Meta o un bloqueador de red descartan el evento ya enviado, no hay forma de
// saberlo y la clave queda escrita (no se reintenta ese usuario).
// Es una estimación: no usar el evento como certeza contable.

export const NEW_USER_WINDOW_MS = 120_000;
export const MAX_SIGNIN_GAP_MS = 60_000;
export const REGISTRATION_OK_PATH = '/registro-ok';

export type UserLike = {
  created_at?: unknown;
  last_sign_in_at?: unknown;
  app_metadata?: { provider?: unknown } | null;
} | null | undefined;

function ms(value: unknown): number | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const t = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

// ¿Parece el primer ingreso de una cuenta nueva creada con Google? (heurística, ver arriba)
export function isLikelyNewGoogleUser(user: UserLike, now: Date = new Date(), windowMs: number = NEW_USER_WINDOW_MS): boolean {
  if (!user || user.app_metadata?.provider !== 'google') return false;
  const created = ms(user.created_at);
  const lastSignIn = ms(user.last_sign_in_at);
  if (created === null || lastSignIn === null) return false;
  const age = now.getTime() - created;
  if (age < -5_000 || age > windowMs) return false; // 5 s de tolerancia por diferencia de relojes
  return Math.abs(lastSignIn - created) <= MAX_SIGNIN_GAP_MS;
}

// A dónde manda el callback tras canjear el código. Solo el destino por defecto (/dashboard) y un usuario que
// parece nuevo con Google pasan por la página con el píxel; cualquier otro destino (por ejemplo /new-password) no cambia.
export function callbackDestination(next: string, user: UserLike, now: Date = new Date()): string {
  return next === '/dashboard' && isLikelyNewGoogleUser(user, now) ? REGISTRATION_OK_PATH : next;
}

export function registrationStorageKey(userId: string): string {
  return `snappy_cr_${userId}`;
}

type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void };

// Deduplicación por usuario: devuelve un id de evento SOLO la primera vez que se pide para ese usuario y deja la clave
// escrita. Se llama en el momento de disparar (MetaPixel.tsx, cuando fbq está disponible), justo antes de
// fbq('track'): si el píxel no llega a estar listo nunca se llama y no se consume la clave. Si no hay almacenamiento
// utilizable no se puede deduplicar y devuelve un id igual (el guard por módulo de MetaPixel cubre esa página).
export function claimRegistrationEvent(storage: StorageLike | null, userId: string, newId: () => string): string | null {
  if (!userId) return null;
  const id = newId();
  if (!storage) return id;
  const key = registrationStorageKey(userId);
  try {
    if (storage.getItem(key)) return null;
    storage.setItem(key, id);
  } catch {
    return id;
  }
  return id;
}
