// Miniatura .jpg de un video de Cloudinary para las tarjetas del menú, sin imports con alias (@/)
// para probarlo con scripts/check-video-thumbnail.mjs.
//
// Cloudinary sirve un fotograma del video como imagen si se pide la misma URL con extensión .jpg.
// Se agrega la transformación so_0 (primer fotograma), ancho limitado, f_jpg y q_auto justo después
// de "/video/upload/"; si la URL ya traía transformaciones, quedan encadenadas detrás.

const UPLOAD_SEGMENT = '/video/upload/';

export function videoThumbnailUrl(videoUrl: string | null | undefined, width = 300): string | null {
  if (typeof videoUrl !== 'string' || videoUrl.trim() === '') return null;

  let url: URL;
  try {
    url = new URL(videoUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !/(^|\.)cloudinary\.com$/.test(url.hostname)) return null;

  const at = url.pathname.indexOf(UPLOAD_SEGMENT);
  if (at === -1) return null;

  const w = Number.isFinite(width) && width > 0 ? Math.round(width) : 300;
  const head = url.pathname.slice(0, at + UPLOAD_SEGMENT.length);
  const rest = url.pathname.slice(at + UPLOAD_SEGMENT.length);
  if (rest === '') return null;

  // Extensión del último segmento → .jpg (si no tiene extensión, se agrega)
  const lastSlash = rest.lastIndexOf('/');
  const file = rest.slice(lastSlash + 1);
  const dot = file.lastIndexOf('.');
  const jpgFile = `${dot > 0 ? file.slice(0, dot) : file}.jpg`;

  url.pathname = `${head}so_0,w_${w},c_limit,f_jpg,q_auto/${rest.slice(0, lastSlash + 1)}${jpgFile}`;
  return url.toString();
}
