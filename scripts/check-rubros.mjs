// Páginas por rubro (lib/rubros.ts): datos completos, sin afirmaciones que Snappy no haga, y presentes en el sitemap. Sin red.
//   node scripts/check-rubros.mjs   (Node >= 22.18 / 24: importa .ts directo)
import { readFileSync } from 'node:fs';
import { RUBROS, FEATURES, PASOS, rubroBySlug, RUBRO_PATH } from '../lib/rubros.ts';

let failures = 0;
const check = (name, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) failures++; };

console.log('datos de los rubros');
{
  const slugs = RUBROS.map((r) => r.slug);
  check('hay rubros y los slugs son únicos y en formato url', RUBROS.length >= 7 && new Set(slugs).size === slugs.length && slugs.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)));
  check('ningún slug choca con rutas fijas de la app', !slugs.some((s) => ['demo', 'login', 'register', 'admin', 'dashboard', 'api', 'privacy', 'terminos'].includes(s)));
  check('títulos únicos y de largo razonable (≤ 70)', new Set(RUBROS.map((r) => r.metaTitle)).size === RUBROS.length && RUBROS.every((r) => r.metaTitle.length <= 70));
  check('descripciones únicas y de largo razonable (80–170)', new Set(RUBROS.map((r) => r.metaDescription)).size === RUBROS.length && RUBROS.every((r) => r.metaDescription.length >= 80 && r.metaDescription.length <= 170));
  check('el h1 es "Menú digital para <rubro>"', RUBROS.every((r) => r.h1 === `Menú digital para ${r.nombre}`));
  check('cada rubro tiene intro, dolor y al menos 5 funciones existentes sin repetir', RUBROS.every((r) => r.intro && r.dolor.title && r.dolor.text && r.features.length >= 5 && new Set(r.features).size === r.features.length && r.features.every((k) => k in FEATURES)));
  check('pasos completos', PASOS.length === 3 && PASOS.every((p) => p.title && p.text));
  check('rubroBySlug y RUBRO_PATH', rubroBySlug('kioscos')?.nombre === 'kioscos' && rubroBySlug('nada') === undefined && RUBRO_PATH('kioscos') === '/menu-digital/kioscos');
}

console.log('solo afirmaciones que Snappy hace');
{
  const all = JSON.stringify(RUBROS) + JSON.stringify(FEATURES) + JSON.stringify(PASOS);
  const prohibidas = [/\bmiles\b/i, /\bmillones\b/i, /\bel mejor\b/i, /\bla mejor\b/i, /n[úu]mero 1/i, /#1/, /garantiz/i, /ilimitad/i, /\b\d+\s*%/, /aumenta/i, /duplic/i, /comisi[óo]n (del )?\d/i, /sin tarjeta/i, /gratis para siempre/i];
  check('sin cifras inventadas, superlativos ni promesas', prohibidas.every((re) => !re.test(all)));
  check('lo del cupón aclara el plan (Go en adelante), como la home', FEATURES.cupones.text.includes('plan Go'));
  const gastro = ['qr', 'reservas'];
  check('QR y reservas solo en rubros de gastronomía', RUBROS.filter((r) => r.features.some((k) => gastro.includes(k))).every((r) => r.vertical === 'gastronomia'));
  check('"por peso o unidad" solo en dietéticas, verdulerías, heladerías y panaderías', RUBROS.filter((r) => r.features.includes('peso')).every((r) => r.vertical === 'dietetica'));
}

console.log('sitemap y enlaces');
{
  const sitemap = readFileSync(new URL('../app/sitemap.ts', import.meta.url), 'utf8');
  check('el sitemap incluye los rubros', sitemap.includes('RUBROS.map') && sitemap.includes('RUBRO_PATH'));
  const home = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  check('la home enlaza a las páginas de rubro (links internos)', home.includes('RUBROS.map') && home.includes('RUBRO_PATH(r.slug)'));
  const page = readFileSync(new URL('../app/menu-digital/[rubro]/page.tsx', import.meta.url), 'utf8');
  check('la página solo genera los rubros de la lista (si no, 404) y tiene canonical', page.includes('dynamicParams = false') && page.includes('generateStaticParams') && page.includes('canonical'));
}

console.log(failures ? `\n${failures} FALLARON` : '\nTodo OK');
process.exit(failures ? 1 : 0);
