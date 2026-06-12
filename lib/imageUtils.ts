/**
 * Convierte una URL pública de Supabase Storage en una URL de transformación
 * (resize/quality on-the-fly). Si la URL no es de Supabase, la devuelve sin cambios.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number,
  quality: number = 70,
  height?: number,
  resize: 'contain' | 'cover' = 'cover'
): string | undefined {
  if (!url) return url ?? undefined;

  if (!url.includes('/storage/v1/object/public/')) return url;

  const transformedUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');

  const params = new URLSearchParams();
  params.set('width', String(width));
  params.set('quality', String(quality));

  if (height) {
    // height explícito: ajusta/recorta a width x height según resize (ej. logos cuadrados con 'cover')
    params.set('height', String(height));
    params.set('resize', resize);
  } else {
    // sin height: escalar por ancho preservando el ratio real de la imagen, sin recortar ni deformar
    params.set('resize', 'contain');
  }

  const separator = transformedUrl.includes('?') ? '&' : '?';
  return `${transformedUrl}${separator}${params.toString()}`;
}
