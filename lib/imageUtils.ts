/**
 * Convierte una URL pública de Supabase Storage en una URL de transformación
 * (resize/quality on-the-fly). Si la URL no es de Supabase, la devuelve sin cambios.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number,
  quality: number = 70
): string | undefined {
  if (!url) return url ?? undefined;

  if (!url.includes('/storage/v1/object/public/')) return url;

  const transformedUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  const separator = transformedUrl.includes('?') ? '&' : '?';
  return `${transformedUrl}${separator}width=${width}&quality=${quality}`;
}
