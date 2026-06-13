/**
 * Limpia un prefijo "Mesa " duplicado al inicio del nombre (case-insensitive).
 * No agrega nada — devuelve el nombre "pelado" tal como lo puso el dueño.
 */
export function formatTableLabel(name?: string | null): string {
  if (!name) return '';
  const trimmed = String(name).trim();
  if (!trimmed) return '';
  return trimmed.replace(/^mesa\s+/i, '');
}

/**
 * Versión "para mostrar": si el nombre limpio es puramente numérico,
 * antepone "Mesa " (o "MESA " si uppercase) para que no quede un número solo.
 */
export function displayTableLabel(name?: string | null, uppercase = false): string {
  const cleaned = formatTableLabel(name);
  if (!cleaned) return '';
  const withPrefix = /^\d+$/.test(cleaned) ? `Mesa ${cleaned}` : cleaned;
  return uppercase ? withPrefix.toUpperCase() : withPrefix;
}
