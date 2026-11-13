// Verificación de lib/productsExport.ts: exportar a CSV y ida y vuelta con el importador. Sin red.
//
//   node scripts/check-products-export.mjs   (Node >= 22.18 / 24: importa .ts directo)

import Papa from 'papaparse';
import { exportProductsCsv, exportProductsFile, CSV_BOM } from '../lib/productsExport.ts';
import { TEMPLATE_HEADERS, mapHeaders, validateImport, templateCsv, unneutralizeCell, neutralizeCell } from '../lib/productsImport.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const CATS = [
  { id: 'c2', name: 'Bebidas', sort_order: 2 },
  { id: 'c1', name: 'Pizzas', sort_order: 1 },
  { id: 'c3', name: 'Fiambres', sort_order: 3 },
];
const P = (over) => ({
  name: 'X', description: '', price: 100, image_url: '', sale_type: 'unidad', variations: [], es_destacado: false,
  category_id: 'c1', ...over,
});

const PRODUCTS = [
  P({ name: 'Muzzarella', description: 'Salsa, queso y aceitunas', price: 9500 }),
  P({ name: 'Napolitana', description: 'Con "tomate" fresco; y ajo', price: 10800, es_destacado: true, variations: [{ label: 'Chica', price: '8500' }, { label: 'Grande', price: '10800' }] }),
  P({ name: 'Jamón cocido', description: 'Por peso', price: 0, sale_type: 'peso', category_id: 'c3', variations: [{ label: '100g', price: '2500' }, { label: '1kg', price: '22000' }] }),
  P({ name: 'Gaseosa 1.5 L', description: 'Línea 2\nsegunda línea', price: 3200.5, category_id: 'c2', image_url: 'https://example.com/img/gaseosa.png?x=1' }),
  P({ name: '=SUMA(1;1)', description: '+54 11 5555', price: 1000, category_id: 'c2' }),
  P({ name: '-Combo', description: '@casa', price: 1, category_id: 'c2', variations: [{ label: '=raro', price: '5' }] }),
  P({ name: "'Comilla normal", description: "'hola", price: 50, category_id: 'c2' }),
  P({ name: 'Sin categoría', description: '', price: 700, category_id: null }),
  P({ name: 'Ñandú', description: 'acentos áéíóú', price: 99.99, category_id: 'c2' }),
];

const parseCsv = (text) => Papa.parse(text.replace(/^﻿/, ''), { header: true, skipEmptyLines: 'greedy' }).data;

console.log('formato del archivo');
{
  const csv = exportProductsCsv(PRODUCTS, CATS);
  const file = exportProductsFile(PRODUCTS, CATS);
  check('encabezados = los de la plantilla, separados por ;', csv.split('\r\n')[0] === TEMPLATE_HEADERS.join(';'));
  check('la plantilla propia usa los mismos encabezados', templateCsv().split('\r\n')[0] === csv.split('\r\n')[0]);
  check('el archivo empieza con BOM UTF-8', file.charCodeAt(0) === 0xfeff && file.startsWith(CSV_BOM) && file.slice(1) === csv);
  check('termina con salto de línea CRLF', csv.endsWith('\r\n'));
  const recs = parseCsv(csv);
  check('una fila por producto', recs.length === PRODUCTS.length);
  check('orden: categorías por sort_order (Pizzas, Bebidas, Fiambres) y sin categoría al final',
    recs.map((r) => r.categoria).join(',') === ['Pizzas', 'Pizzas', 'Bebidas', 'Bebidas', 'Bebidas', 'Bebidas', 'Bebidas', 'Fiambres', ''].join(','));
  check('sin productos: solo encabezado', exportProductsCsv([], CATS) === TEMPLATE_HEADERS.join(';') + '\r\n');
}

console.log('neutralización (solo en el archivo)');
{
  const csv = exportProductsCsv(PRODUCTS, CATS);
  const recs = parseCsv(csv);
  const byName = (n) => recs.find((r) => r.nombre === n);
  check('nombre con = va con comilla', byName("'=SUMA(1;1)") !== undefined);
  check('descripción con + va con comilla', byName("'=SUMA(1;1)").descripcion === "'+54 11 5555");
  check('nombre con - y descripción con @', byName("'-Combo").descripcion === "'@casa");
  check('variaciones que empiezan con = van con comilla', byName("'-Combo").variaciones === "'=raro:5");
  check('texto normal no se toca', byName('Muzzarella').descripcion === 'Salsa, queso y aceitunas');
  check('comilla normal no se duplica', byName("'Comilla normal") !== undefined && byName("'Comilla normal").descripcion === "'hola");
  check('los productos de origen NO se modifican', PRODUCTS[4].name === '=SUMA(1;1)' && PRODUCTS[5].variations[0].label === '=raro');
  check('ninguna celda queda empezando con = + - @ sin neutralizar',
    recs.every((r) => Object.values(r).every((v) => !/^[=+\-@\t\r]/.test(v))));
  check('unneutralizeCell es el inverso', unneutralizeCell(neutralizeCell('=1')) === '=1' && unneutralizeCell("'Pizza") === "'Pizza" && unneutralizeCell('hola') === 'hola');
}

console.log('valores');
{
  const recs = parseCsv(exportProductsCsv(PRODUCTS, CATS));
  const by = (n) => recs.find((r) => r.nombre === n);
  check('precio sin miles y con punto decimal', by('Muzzarella').precio === '9500' && by('Gaseosa 1.5 L').precio === '3200.5' && by('Ñandú').precio === '99.99');
  check('producto por peso con precio 0: precio vacío', by('Jamón cocido').precio === '' && by('Jamón cocido').tipo_venta === 'peso');
  check('variaciones con formato etiqueta:precio|etiqueta:precio', by('Napolitana').variaciones === 'Chica:8500|Grande:10800');
  check('destacado si/no', by('Napolitana').destacado === 'si' && by('Muzzarella').destacado === 'no');
  check('comillas, ; y saltos de línea se escapan', by('Napolitana').descripcion === 'Con "tomate" fresco; y ajo' && by('Gaseosa 1.5 L').descripcion === 'Línea 2\nsegunda línea');
  check('imagen_url se exporta', by('Gaseosa 1.5 L').imagen_url === 'https://example.com/img/gaseosa.png?x=1');
  check('"|" en una etiqueta pasa a "/"', exportProductsCsv([P({ variations: [{ label: 'a|b', price: '5' }] })], CATS).includes('a/b:5'));
  check('variaciones inválidas o nulas se ignoran sin romper', exportProductsCsv([P({ variations: null }), P({ name: 'Y', variations: [{ label: '', price: '1' }, null, { label: 'ok' }] })], CATS).split('\r\n').length === 4);
  check('precio como string de la base ("1500.00")', parseCsv(exportProductsCsv([P({ price: '1500.00' })], CATS))[0].precio === '1500');
}

console.log('ida y vuelta: exportar e importar da lo mismo');
{
  const csv = exportProductsFile(PRODUCTS, CATS);
  const { rows, missing } = mapHeaders(parseCsv(csv));
  check('el importador reconoce todas las columnas', missing.length === 0);
  const rep = validateImport(rows, { existing: [], hasFeatured: false });
  check('el archivo exportado se importa SIN errores', rep.fatal === null && rep.counts.errors === 0 && rep.counts.duplicates === 0);
  check('se crean todos los productos', rep.counts.ok === PRODUCTS.length);

  const norm = (s) => s.normalize('NFC');
  for (const p of PRODUCTS) {
    const r = rep.rows.find((x) => x.row && x.row.nombre === p.name);
    check(`"${p.name.replace(/\n/g, ' ')}" vuelve igual`, !!r &&
      r.row.descripcion === p.description.trim() &&
      r.row.precio === (p.sale_type === 'peso' && p.price === 0 ? 0 : Number(p.price)) &&
      r.row.tipo_venta === p.sale_type &&
      r.row.destacado === p.es_destacado &&
      (r.row.imagen_url ?? '') === p.image_url &&
      r.row.categoria === (p.category_id ? CATS.find((c) => c.id === p.category_id).name : 'General') &&
      JSON.stringify(r.row.variaciones) === JSON.stringify(p.variations) &&
      norm(r.row.nombre) === norm(p.name));
  }
  // Reimportar sobre un local que ya tiene todo: todo duplicado, sin errores
  const existing = PRODUCTS.map((p) => ({ name: p.name, category: p.category_id ? CATS.find((c) => c.id === p.category_id).name : null }));
  const again = validateImport(rows, { existing, hasFeatured: true });
  check('reimportar sobre el mismo local: todo duplicado, nada falla', again.counts.duplicates === PRODUCTS.length && again.counts.errors === 0);
}

if (failures > 0) {
  console.error(`\n${failures} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\nTodo ok');
