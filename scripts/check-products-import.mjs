// Verificación de lib/productsImport.ts (importar productos desde CSV): parseo, validación, fórmulas, duplicados, límites
// y plantilla. Sin red.
//
//   node scripts/check-products-import.mjs   (Node >= 22.18 / 24: importa .ts directo)

import {
  IMPORT_LIMITS, TEMPLATE_HEADERS, validateImport, mapHeaders, parsePrice, parseHttpsUrl, neutralizeCell,
  checkProductLimit, templateCsv, productKey, normKey, readImportRows, buildProductInserts,
} from '../lib/productsImport.ts';
import Papa from 'papaparse';
import { readFileSync } from 'node:fs';
import { maxProductsForPlan, PRODUCT_LIMITS, PRODUCT_LIMIT_UNLIMITED } from '../lib/plans.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const CTX = { existing: [], hasFeatured: false };
const row = (over = {}) => ({
  categoria: 'Pizzas', nombre: 'Muzzarella', descripcion: 'Rica', precio: '9500', tipo_venta: 'unidad',
  variaciones: '', destacado: 'no', imagen_url: '', ...over,
});
const one = (over, ctx = CTX) => validateImport([row(over)], ctx).rows[0];

console.log('límite por plan (lib/plans)');
check('light 20', maxProductsForPlan('light') === 20 && PRODUCT_LIMITS.light === 20);
check('go 60', maxProductsForPlan('go') === 60);
check('plus ilimitado (9999, como antes)', maxProductsForPlan('plus') === PRODUCT_LIMIT_UNLIMITED && PRODUCT_LIMIT_UNLIMITED === 9999);
check('sin plan o desconocido: ilimitado (como antes)', maxProductsForPlan(null) === 9999 && maxProductsForPlan('x') === 9999);

console.log('fila válida');
{
  const r = one({});
  check('ok', r.status === 'ok' && r.errors.length === 0);
  check('valores', r.row.categoria === 'Pizzas' && r.row.nombre === 'Muzzarella' && r.row.precio === 9500 && r.row.tipo_venta === 'unidad');
  check('sin variaciones, no destacado, sin imagen', r.row.variaciones.length === 0 && r.row.destacado === false && r.row.imagen_url === null);
  check('categoría vacía → General', one({ categoria: '' }).row.categoria === 'General');
  check('tipo_venta vacío → unidad', one({ tipo_venta: '' }).row.tipo_venta === 'unidad');
  check('número real (no string) en precio', one({ precio: 1500 }).row.precio === 1500);
}

console.log('nombre y descripción');
{
  check('nombre vacío: error', one({ nombre: '' }).status === 'error');
  check('nombre de 200: ok', one({ nombre: 'a'.repeat(200) }).status === 'ok');
  check('nombre de 201: error', one({ nombre: 'a'.repeat(201) }).status === 'error');
  check('descripción de 1000: ok', one({ descripcion: 'a'.repeat(1000) }).status === 'ok');
  check('descripción de 1001: error', one({ descripcion: 'a'.repeat(1001) }).status === 'error');
  check('categoría de 101: error', one({ categoria: 'a'.repeat(101) }).status === 'error');
  check('caracteres de control se sacan', one({ nombre: 'Pi\u0000zza\u0007' }).row.nombre === 'Pizza');
  check('<script> queda como texto (la UI no interpreta HTML)', one({ nombre: '<script>alert(1)</script>' }).row.nombre === '<script>alert(1)</script>');
}

console.log('precio');
{
  const p = (s) => parsePrice(s);
  check('1500', p('1500') === 1500);
  check('1500.50', p('1500.50') === 1500.5);
  check('1500,50', p('1500,50') === 1500.5);
  check('1.500 = mil quinientos', p('1.500') === 1500);
  check('1.500,50', p('1.500,50') === 1500.5);
  check('1,500.50', p('1,500.50') === 1500.5);
  check('$ 1500', p('$ 1500') === 1500);
  check('0 es válido', p('0') === 0);
  check('negativo: inválido', p('-5') === null);
  check('con +: inválido', p('+5') === null);
  check('texto: inválido', p('abc') === null && p('12abc') === null);
  check('notación científica: inválida', p('1e3') === null);
  check('3 decimales: inválido', p('1.5555') === null);
  check('demasiado grande: inválido', p('999999999999') === null);
  check('vacío en unidad: error', one({ precio: '' }).status === 'error');
  check('vacío en peso con variaciones: ok (0)', one({ precio: '', tipo_venta: 'peso', variaciones: '100g:1500' }).row.precio === 0);
  check('precio negativo: error', one({ precio: '-1' }).status === 'error');
  check('precio 0 en unidad: ok con aviso', one({ precio: '0' }).status === 'ok' && one({ precio: '0' }).warnings.length === 1);
}

console.log('tipo_venta y variaciones');
{
  check('tipo inválido: error', one({ tipo_venta: 'kilo' }).status === 'error');
  check('peso sin variaciones: error', one({ tipo_venta: 'peso' }).status === 'error');
  const v = one({ tipo_venta: 'peso', precio: '', variaciones: '100g:1500|1kg:12000' });
  check('peso con variaciones: ok', v.status === 'ok');
  check('variaciones parseadas como el panel (label + precio string)', JSON.stringify(v.row.variaciones) === '[{"label":"100g","price":"1500"},{"label":"1kg","price":"12000"}]');
  check('variaciones con precio decimal', one({ variaciones: 'Chica:8.500,50' }).row.variaciones[0].price === '8500.5');
  check('unidad con variaciones: ok', one({ variaciones: 'Chica:8500|Grande:10800' }).status === 'ok');
  check('variación sin precio: error', one({ variaciones: 'Chica' }).status === 'error');
  check('variación con precio inválido: error', one({ variaciones: 'Chica:abc' }).status === 'error');
  check('variación repetida: error', one({ variaciones: 'Chica:1|chica:2' }).status === 'error');
  check('más de 20 variaciones: error', one({ variaciones: Array.from({ length: 21 }, (_, i) => `v${i}:1`).join('|') }).status === 'error');
  check('etiqueta larga: error', one({ variaciones: `${'a'.repeat(51)}:1` }).status === 'error');
  check('etiqueta con fórmula: se guarda tal cual y avisa', one({ variaciones: '=SUMA(1):100' }).row.variaciones[0].label === '=SUMA(1)' && one({ variaciones: '=SUMA(1):100' }).warnings.length === 1);
  check('etiqueta con dos puntos usa el último', one({ variaciones: 'Combo 2:1:500' }).row.variaciones[0].label === 'Combo 2:1');
}

console.log('destacado e imagen');
{
  check('si/sí/true/1/x = destacado', ['si', 'Sí', 'TRUE', '1', 'x'].every((d) => one({ destacado: d }).row.destacado === true));
  check('no/false/0/vacío = no destacado', ['no', 'false', '0', ''].every((d) => one({ destacado: d }).row.destacado === false));
  check('destacado inválido: error', one({ destacado: 'quizás' }).status === 'error');
  const w = validateImport([row({ nombre: 'A', destacado: 'si' }), row({ nombre: 'B', destacado: 'si' })], CTX);
  check('solo uno destacado en el archivo', w.rows[0].row.destacado === true && w.rows[1].row.destacado === false && w.rows[1].warnings.length > 0);
  check('si ya hay uno en el local, ninguno se destaca', one({ destacado: 'si' }, { existing: [], hasFeatured: true }).row.destacado === false);
  check('https válida', one({ imagen_url: 'https://ejemplo.com/a.jpg' }).row.imagen_url === 'https://ejemplo.com/a.jpg');
  check('http: error', one({ imagen_url: 'http://ejemplo.com/a.jpg' }).status === 'error');
  check('javascript: error', one({ imagen_url: 'javascript:alert(1)' }).status === 'error');
  check('data: error', one({ imagen_url: 'data:image/png;base64,AAAA' }).status === 'error');
  check('con credenciales: error', parseHttpsUrl('https://user:pass@ejemplo.com/a.jpg') === null);
  check('con espacios: error', parseHttpsUrl('https://ejemplo.com/a b.jpg') === null);
  check('url larga: error', parseHttpsUrl('https://ejemplo.com/' + 'a'.repeat(2000)) === null);
}

console.log('fórmulas (= + - @): se guarda el texto original y solo se avisa');
{
  check('neutralizeCell sigue disponible para exportar (v2)', neutralizeCell('=1+1') === "'=1+1" && neutralizeCell('+54') === "'+54" && neutralizeCell('-x') === "'-x" && neutralizeCell('@a') === "'@a" && neutralizeCell('Pizza') === 'Pizza');
  const r = one({ nombre: '=HYPERLINK("http://malo")', categoria: '@cat', descripcion: '+cmd|calc' });
  check('nombre, categoría y descripción quedan EXACTAMENTE como vinieron (sin comilla)', r.status === 'ok' && r.row.nombre === '=HYPERLINK("http://malo")' && r.row.categoria === '@cat' && r.row.descripcion === '+cmd|calc');
  check('la vista previa avisa en cada campo', r.warnings.length === 3 && r.warnings.some((w) => w.startsWith('nombre')) && r.warnings.some((w) => w.startsWith('categoria')) && r.warnings.some((w) => w.startsWith('descripcion')));
  check('la fila sigue siendo importable (no es error)', r.errors.length === 0);
  check('una fila normal no avisa ni se toca', one({ nombre: 'Pizza', descripcion: 'Rica' }).warnings.length === 0 && one({ nombre: 'Pizza', descripcion: 'Rica' }).row.descripcion === 'Rica');
  check('guiones y signos en el medio no avisan', one({ nombre: 'Coca-Cola 1+1' }).warnings.length === 0);
  check('en un duplicado el nombre original cuenta igual', validateImport([row({ nombre: '-Combo' }), row({ nombre: '-combo' })], CTX).rows[1].status === 'duplicate');
}

console.log('duplicados');
{
  const rep = validateImport([row({ nombre: 'Muzzarella' }), row({ nombre: '  MUZZARELLA ' }), row({ nombre: 'Muzzarella', categoria: 'Otras' })], CTX);
  check('mismo nombre y categoría sin distinguir mayúsculas ni espacios: duplicado', rep.rows[0].status === 'ok' && rep.rows[1].status === 'duplicate');
  check('mismo nombre en otra categoría: no es duplicado', rep.rows[2].status === 'ok');
  check('conteos', rep.counts.total === 3 && rep.counts.ok === 2 && rep.counts.duplicates === 1 && rep.counts.errors === 0);
  const ctx = { existing: [{ name: 'Muzzarella', category: 'pizzas' }, { name: 'Sin cat', category: null }], hasFeatured: false };
  check('contra existentes: duplicado', one({ nombre: 'muzzarella' }, ctx).status === 'duplicate');
  check('existente sin categoría cuenta como General', one({ nombre: 'sin cat', categoria: '' }, ctx).status === 'duplicate');
  check('categoría distinta contra existentes: ok', one({ nombre: 'Muzzarella', categoria: 'Otras' }, ctx).status === 'ok');
  check('duplicado no trae row (no se inserta)', one({ nombre: 'muzzarella' }, ctx).row === undefined);
  check('normKey y productKey', normKey('  Pizzas   Grandes ') === 'pizzas grandes' && productKey('', 'X') === 'general|x');
}

console.log('tamaño del archivo');
{
  const many = (n) => Array.from({ length: n }, (_, i) => row({ nombre: `Producto ${i}` }));
  check('500 filas: ok', validateImport(many(500), CTX).fatal === null);
  check('501 filas: fatal', validateImport(many(501), CTX).fatal !== null);
  check('sin filas: fatal', validateImport([], CTX).fatal !== null && validateImport(null, CTX).fatal !== null);
  check('fila vacía: error, no rompe', validateImport([{}], CTX).rows[0].status === 'error');
  check('celda gigante: se acota y falla por largo', one({ nombre: 'a'.repeat(100000) }).status === 'error');
  check('valores raros (objeto/null) no rompen', validateImport([{ nombre: { x: 1 }, precio: null }], CTX).rows[0].status === 'error');
  check('IMPORT_LIMITS', IMPORT_LIMITS.maxRows === 500 && IMPORT_LIMITS.maxFileBytes === 2 * 1024 * 1024);
}

console.log('encabezados');
{
  const { rows, missing } = mapHeaders([{ 'Categoría': 'Pizzas', 'NOMBRE': 'X', 'Descripción': 'd', Precio: '1', 'Tipo de venta': 'peso', otra: 'zzz' }]);
  check('acepta mayúsculas, tildes y alias', rows[0].categoria === 'Pizzas' && rows[0].nombre === 'X' && rows[0].descripcion === 'd' && rows[0].tipo_venta === 'peso');
  check('ignora columnas desconocidas', !('otra' in rows[0]));
  check('sin faltantes', missing.length === 0);
  check('falta nombre y precio', mapHeaders([{ categoria: 'x' }]).missing.join() === 'nombre,precio');
  check('__proto__ no contamina', (() => { mapHeaders([JSON.parse('{"__proto__": {"x": 1}, "nombre": "a", "precio": "1"}')]); return ({}).x === undefined; })());
}

console.log('límite del plan: todo o nada');
{
  check('dentro del límite', checkProductLimit(10, 10, 20, false).ok === true);
  check('justo en el límite', checkProductLimit(10, 10, 20, false).available === 10 && checkProductLimit(10, 10, 20, false).excess === 0);
  const over = checkProductLimit(15, 10, 20, false);
  check('actuales + nuevos > límite: rechaza', over.ok === false && over.excess === 5 && over.available === 5);
  check('ya en el tope', checkProductLimit(20, 1, 20, false).ok === false);
  check('plus (9999) no molesta', checkProductLimit(500, 500, 9999, false).ok === true);
  check('admin sin límite', checkProductLimit(500, 500, 20, true).ok === true);
  check('cero nuevos siempre pasa', checkProductLimit(60, 0, 60, false).ok === true);
}

console.log('plantilla');
{
  const csv = templateCsv();
  check('trae los encabezados en orden', csv.split('\r\n')[0] === TEMPLATE_HEADERS.join(';'));
  check('termina con salto de línea', csv.endsWith('\r\n'));
  // la plantilla se importa sin errores
  const recs = csv.trim().split('\r\n').slice(1).map((l) => Object.fromEntries(l.split(';').map((v, i) => [TEMPLATE_HEADERS[i], v])));
  const rep = validateImport(mapHeaders(recs).rows, CTX);
  check('las filas de ejemplo son válidas', rep.counts.ok === 3 && rep.counts.errors === 0);
}

console.log('restaurant_id: sale siempre de la sesión, nunca del body');
{
  const SESION = '11111111-1111-4111-8111-111111111111';
  const AJENO = '99999999-9999-4999-8999-999999999999';
  const body = { rows: [row({ nombre: 'Muzza' })], restaurant_id: AJENO, restaurantId: AJENO, user_id: AJENO, plan: 'plus' };
  const rows = readImportRows(body);
  check('del body solo se toma rows', Array.isArray(rows) && rows.length === 1 && !('restaurant_id' in rows));
  check('body sin rows o con rows inválido: null', readImportRows({ restaurant_id: AJENO }) === null && readImportRows({ rows: 'x' }) === null && readImportRows(null) === null && readImportRows('x') === null);

  // Una columna "restaurant_id" dentro de las filas del archivo tampoco llega a ningún lado
  const conColumna = [{ ...row({ nombre: 'Muzza' }), restaurant_id: AJENO, id: 'x', es_destacado: true, user_id: AJENO }];
  const report = validateImport(mapHeaders(conColumna).rows, CTX);
  const filas = report.rows.filter((r) => r.status === 'ok').map((r) => r.row);
  check('la fila validada no tiene restaurant_id ni otras columnas ajenas', filas.length === 1 && !('restaurant_id' in filas[0]) && !('id' in filas[0]) && !('user_id' in filas[0]));
  check('es_destacado de la fila ajena no se cuela (solo "destacado")', filas[0].destacado === false);

  const catIds = new Map([['pizzas', 'cat-1']]);
  const inserts = buildProductInserts(SESION, filas, catIds);
  check('todos los inserts llevan el restaurant_id de la sesión', inserts.length === 1 && inserts.every((p) => p.restaurant_id === SESION));
  check('ningún valor del insert es el id ajeno', !JSON.stringify(inserts).includes(AJENO));
  check('el insert tiene solo las columnas esperadas', Object.keys(inserts[0]).sort().join() === 'category_id,description,es_destacado,image_url,name,price,restaurant_id,sale_type,variations,video_url');
  check('categoría resuelta por nombre', inserts[0].category_id === 'cat-1');

  // El endpoint: el id sale de requirePlan (la sesión) y de ningún otro lado
  // Código sin comentarios (los comentarios mencionan restaurant_id para explicar que se ignora)
  const src = readFileSync(new URL('../app/api/products/import/route.ts', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
  check('el endpoint toma el local de access.restaurant.id (requirePlan con la sesión)', /const restaurantId = access\.restaurant\.id;/.test(src) && /requirePlan\(sessionUser\.id/.test(src));
  check('el endpoint no lee restaurant_id del body', !/body[^\n;]*restaurant_?[iI]d/.test(src) && !/rows[^\n;]*restaurant_?[iI]d/.test(src));
  check('el endpoint arma los inserts con buildProductInserts(restaurantId, ...)', /buildProductInserts\(restaurantId,/.test(src));
  check('el endpoint solo toma rows del body con readImportRows', /readImportRows\(body\)/.test(src) && !/JSON\.parse\(text\)\)?\.restaurant/.test(src));
}

console.log('papaparse + validación (el mismo camino que el navegador)');
{
  const run = (text) => {
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: 'greedy', preview: IMPORT_LIMITS.maxRows + 1 });
    const { rows, missing } = mapHeaders(parsed.data);
    return { missing, report: validateImport(rows, CTX) };
  };
  const semi = run(templateCsv());
  check('plantilla con ";" (y su salto CRLF) se lee sin errores', semi.missing.length === 0 && semi.report.counts.ok === 3 && semi.report.counts.errors === 0);
  const comma = run('categoria,nombre,descripcion,precio\r\nPizzas,"Muzza, grande","Dice ""rica""",9500\r\n');
  check('separador "," y comillas dobles', comma.report.counts.ok === 1 && comma.report.rows[0].row.nombre === 'Muzza, grande' && comma.report.rows[0].row.descripcion === 'Dice "rica"');
  const bom = run('﻿nombre;precio\r\nCafé;1500\r\n');
  check('BOM al inicio no rompe el encabezado', bom.missing.length === 0 && bom.report.rows[0].row.nombre === 'Café');
  check('líneas vacías al final se ignoran', run('nombre;precio\r\nA;1\r\n\r\n\r\n').report.counts.total === 1);
  check('sin columna precio: faltante', run('nombre\r\nA\r\n').missing.join() === 'precio');
  const big = 'nombre;precio\r\n' + Array.from({ length: 600 }, (_, i) => `P${i};1`).join('\r\n');
  check('600 filas: el preview corta en 501 y la validación lo rechaza', run(big).report.fatal !== null);
}

if (failures > 0) {
  console.error(`\n${failures} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\nTodo ok');
