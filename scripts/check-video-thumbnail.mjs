// Verificación de lib/videoThumbnail.ts (miniatura .jpg de un video de Cloudinary).
//
//   node scripts/check-video-thumbnail.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { videoThumbnailUrl } from '../lib/videoThumbnail.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}
const BASE = 'https://res.cloudinary.com/demo/video/upload/';
const T = 'so_0,w_300,c_limit,f_jpg,q_auto/';

console.log('videoThumbnailUrl');
check('.mp4 con versión (v123) → transformación + .jpg',
  videoThumbnailUrl(`${BASE}v123/snappy/hambur.mp4`) === `${BASE}${T}v123/snappy/hambur.jpg`);
check('.mov → .jpg', videoThumbnailUrl(`${BASE}v1/clip.mov`) === `${BASE}${T}v1/clip.jpg`);
check('con transformaciones previas → la nuestra va primero, las otras quedan encadenadas',
  videoThumbnailUrl(`${BASE}q_auto,w_600/v9/a.webm`) === `${BASE}${T}q_auto,w_600/v9/a.jpg`);
check('ancho a medida (w_150)',
  videoThumbnailUrl(`${BASE}v1/clip.mp4`, 150) === `${BASE}so_0,w_150,c_limit,f_jpg,q_auto/v1/clip.jpg`);
check('sin extensión → agrega .jpg', videoThumbnailUrl(`${BASE}v1/clip`) === `${BASE}${T}v1/clip.jpg`);
check('punto en la carpeta no se toma como extensión',
  videoThumbnailUrl(`${BASE}v1/mi.carpeta/clip.mp4`) === `${BASE}${T}v1/mi.carpeta/clip.jpg`);
check('con query string → se conserva después del .jpg',
  videoThumbnailUrl(`${BASE}v1/clip.mp4?_a=XYZ`) === `${BASE}${T}v1/clip.jpg?_a=XYZ`);
check('otro host → null', videoThumbnailUrl('https://example.com/video/upload/v1/clip.mp4') === null);
check('host que solo termina parecido (evilcloudinary.com) → null',
  videoThumbnailUrl('https://evilcloudinary.com/video/upload/v1/clip.mp4') === null);
check('http (no https) → null', videoThumbnailUrl('http://res.cloudinary.com/demo/video/upload/v1/clip.mp4') === null);
check('Cloudinary sin /video/upload/ (imagen) → null',
  videoThumbnailUrl('https://res.cloudinary.com/demo/image/upload/v1/foto.png') === null);
check('nada después de /video/upload/ → null', videoThumbnailUrl(BASE) === null);
check("vacía ('' y '   ') → null", videoThumbnailUrl('') === null && videoThumbnailUrl('   ') === null);
check('null / undefined → null', videoThumbnailUrl(null) === null && videoThumbnailUrl(undefined) === null);
check('texto que no es URL → null', videoThumbnailUrl('no es una url') === null);

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
