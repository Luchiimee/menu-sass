/**
 * Brillo percibido (YIQ) de un color hex. Usado para decidir si un color
 * de texto contrasta lo suficiente contra un fondo.
 */
export function getYiq(hexcolor?: string | null): number {
  if (!hexcolor) return 128;
  const hex = hexcolor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 128;
  return ((r * 299) + (g * 587) + (b * 114)) / 1000;
}

/**
 * Color de texto con buen contraste para un fondo dado.
 */
export function getContrastColor(bg?: string | null, dark: string = '#000000', light: string = '#ffffff'): string {
  return getYiq(bg) >= 128 ? dark : light;
}

/**
 * Devuelve `color` si contrasta lo suficiente contra `bg`, o un color de
 * respaldo (negro/blanco) en caso contrario.
 */
export function pickReadableColor(
  color: string | null | undefined,
  bg: string,
  dark: string = '#000000',
  light: string = '#ffffff',
  threshold: number = 60
): string {
  if (color && Math.abs(getYiq(color) - getYiq(bg)) > threshold) return color;
  return getContrastColor(bg, dark, light);
}
