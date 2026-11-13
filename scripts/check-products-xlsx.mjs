// Verificación de lib/productsXlsx.ts: lectura de .xlsx para importar productos (formato Fudo y plantilla propia).
// Los archivos se arman acá con exceljs, con datos inventados. Sin red.
//
//   node scripts/check-products-xlsx.mjs   (Node >= 22.18 / 24: importa .ts directo)

import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { readXlsxRecords, checkXlsxZip, cellValueToText, XLSX_LIMITS } from '../lib/productsXlsx.ts';
import { IMPORT_LIMITS, mapHeaders, validateImport, TEMPLATE_HEADERS } from '../lib/productsImport.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

const toAB = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
async function build(fn) {
  const wb = new ExcelJS.Workbook();
  fn(wb);
  return toAB(Buffer.from(await wb.xlsx.writeBuffer()));
}
const CTX = { existing: [], hasFeatured: false };
const run = async (ab) => {
  const r = await readXlsxRecords(ab);
  if (!r.ok) return { r };
  const { rows, missing } = mapHeaders(r.records);
  return { r, rows, missing, rep: missing.length ? null : validateImport(rows, CTX) };
};

// Formato Fudo (inventado): Categoría, Nombre, Descripción, Precio, Activo, Favorito + columnas que se ignoran
const FUDO_HEAD = ['Código', 'Categoría', 'Nombre', 'Descripción', 'Precio', 'Costo', 'Activo', 'Favorito', 'Stock'];
const FUDO_ROWS = [
  ['A1', 'Hamburguesas', 'Clásica', 'Carne, lechuga y tomate', 8500, 3000, 'Si', 'Si', 10],
  ['A2', 'Hamburguesas', 'Doble', 'Doble carne', 10500.5, 4000, 'Si', 'No', 5],
  ['A3', 'Bebidas', 'Agua', null, '1.500', 400, 'Si', 'No', 99],
  ['A4', 'Bebidas', 'Gaseosa vieja', 'Ya no se vende', 2000, 800, 'No', 'No', 0],
  ['A5', 'Postres', 'Flan', 'Con dulce de leche', 4200, 1500, '', '', 3],
];
const fudo = () => build((wb) => {
  const portada = wb.addWorksheet('Portada');
  portada.addRow(['Exportado de un sistema de ejemplo']);
  const ws = wb.addWorksheet('Productos');
  ws.addRow(FUDO_HEAD);
  FUDO_ROWS.forEach((r) => ws.addRow(r));
});

console.log('formato Fudo');
{
  const { r, rows, missing, rep } = await run(await fudo());
  check('se lee', r.ok === true);
  check('toma la hoja "Productos" aunque no sea la primera', r.sheetName === 'Productos' && r.sheetCount === 2);
  check('5 filas', r.records.length === 5);
  check('todo como texto', r.records.every((x) => Object.values(x).every((v) => typeof v === 'string')));
  check('detecta las columnas (Categoría, Nombre, Descripción, Precio, Activo, Favorito)', missing.length === 0 && rows[0].categoria === 'Hamburguesas' && rows[0].nombre === 'Clásica' && rows[0].descripcion === 'Carne, lechuga y tomate' && rows[0].precio === '8500' && rows[0].activo === 'Si' && rows[0].destacado === 'Si');
  check('ignora las demás columnas (Código, Costo, Stock)', !('codigo' in rows[0]) && !('costo' in rows[0]) && !('stock' in rows[0]) && Object.keys(rows[0]).length === 6);
  check('precios tal como vienen: 8500 → 8500, 10500.5 → 10500.5, "1.500" → 1.500 (miles, como el CSV)', rep.rows[0].row.precio === 8500 && rep.rows[1].row.precio === 10500.5 && rep.rows[2].row.precio === 1500);
  check('celda vacía → texto vacío', r.records[2]['Descripción'] === '');
  check('Activo = No: se omite con aviso', rep.rows[3].status === 'inactive' && rep.rows[3].warnings.length === 1 && rep.counts.inactive === 1);
  check('Activo vacío cuenta como activo', rep.rows[4].status === 'ok');
  check('Favorito = Si → destacado; los demás no', rep.rows[0].row.destacado === true && rep.rows[1].row.destacado === false);
  check('resumen: 4 se crean, 1 inactivo, sin errores ni duplicados', rep.counts.ok === 4 && rep.counts.inactive === 1 && rep.counts.errors === 0 && rep.counts.duplicates === 0 && rep.counts.total === 5);
}

console.log('hoja y encabezados');
{
  const sinProductos = await build((wb) => {
    const a = wb.addWorksheet('Menú');
    a.addRow(['nombre', 'precio']); a.addRow(['Pizza', 5000]);
    const b = wb.addWorksheet('Otra');
    b.addRow(['nombre', 'precio']); b.addRow(['NO', 1]);
  });
  const r1 = await run(sinProductos);
  check('sin hoja "Productos": usa la primera', r1.r.ok && r1.r.sheetName === 'Menú' && r1.rows[0].nombre === 'Pizza');

  const mayus = await build((wb) => {
    const ws = wb.addWorksheet('PRODUCTOS');
    ws.addRow(['CATEGORÍA', ' nombre ', 'DESCRIPCION', 'PRECIO', 'activo', 'FAVORITO']);
    ws.addRow(['Café', 'Cortado', 'Chico', 3000, 'sí', 'no']);
  });
  const r2 = await run(mayus);
  check('hoja y encabezados sin distinguir mayúsculas ni tildes', r2.r.ok && r2.r.sheetName === 'PRODUCTOS' && r2.rep.counts.ok === 1 && r2.rows[0].categoria === 'Café');

  const propia = await build((wb) => {
    const ws = wb.addWorksheet('Productos');
    ws.addRow([...TEMPLATE_HEADERS]);
    ws.addRow(['Pizzas', 'Muzzarella', 'Rica', '9500', 'unidad', '', 'no', '']);
    ws.addRow(['Fiambres', 'Jamón', 'Por peso', '', 'peso', '100g:2500|1kg:22000', 'no', 'https://example.com/a.png']);
  });
  const r3 = await run(propia);
  check('plantilla propia en .xlsx', r3.rep.counts.ok === 2 && r3.rep.rows[1].row.variaciones.length === 2 && r3.rep.rows[1].row.imagen_url === 'https://example.com/a.png');

  const conTitulo = await build((wb) => {
    const ws = wb.addWorksheet('Productos');
    ws.addRow([]); ws.addRow([]);
    ws.addRow(['Nombre', 'Precio']);
    ws.addRow(['Té', 1200]);
  });
  const r4 = await run(conTitulo);
  check('encabezado después de filas vacías', r4.r.ok && r4.rep.counts.ok === 1);

  const sinPrecio = await build((wb) => { const ws = wb.addWorksheet('Productos'); ws.addRow(['Nombre', 'Color']); ws.addRow(['Té', 'rojo']); });
  const r5 = await run(sinPrecio);
  check('sin columna Precio: faltan columnas obligatorias', r5.r.ok && r5.missing.join() === 'precio');

  const dup = await build((wb) => { const ws = wb.addWorksheet('Productos'); ws.addRow(['Nombre', 'Precio', 'Precio']); ws.addRow(['Té', 100, 999]); });
  check('encabezado repetido: vale el primero', (await run(dup)).rows[0].precio === '100');

  const vacia = await build((wb) => { wb.addWorksheet('Productos'); });
  const r6 = await readXlsxRecords(vacia);
  check('hoja vacía: error claro', r6.ok === false && /no tiene datos/.test(r6.error));

  const soloEnc = await build((wb) => { const ws = wb.addWorksheet('Productos'); ws.addRow(['Nombre', 'Precio']); });
  check('solo encabezado: error claro', (await readXlsxRecords(soloEnc)).ok === false);
}

console.log('todo como texto: números, fórmulas y celdas raras');
{
  check('número', cellValueToText(1500) === '1500' && cellValueToText(1500.5) === '1500.5');
  check('texto, vacío y null', cellValueToText('hola') === 'hola' && cellValueToText(null) === '' && cellValueToText(undefined) === '');
  check('fórmula: el resultado guardado, nunca se evalúa', cellValueToText({ formula: 'SUM(A1:A2)', result: 30 }) === '30' && cellValueToText({ formula: 'HYPERLINK("x")', result: undefined }) === '');
  check('texto enriquecido', cellValueToText({ richText: [{ text: 'Pi' }, { text: 'zza' }] }) === 'Pizza');
  check('hipervínculo: el texto', cellValueToText({ text: 'Ver', hyperlink: 'https://example.com' }) === 'Ver');
  check('error de celda', cellValueToText({ error: '#N/A' }) === '');
  check('booleano y fecha', cellValueToText(true) === 'Si' && cellValueToText(false) === 'No' && cellValueToText(new Date('2026-11-12T10:00:00Z')) === '2026-11-12');
  check('NaN e infinito', cellValueToText(NaN) === '' && cellValueToText(Infinity) === '');

  const ab = await build((wb) => {
    const ws = wb.addWorksheet('Productos');
    ws.addRow(['Nombre', 'Descripción', 'Precio']);
    ws.addRow(['=1+1', '@SUM(1)', { formula: '1500+0', result: 1500 }]);
    ws.addRow([{ richText: [{ text: 'Flan ' }, { text: 'casero' }] }, '+cmd', 99.9]);
  });
  const { r, rep } = await run(ab);
  check('fórmula en precio: se toma el resultado', r.records[0]['Precio'] === '1500');
  check('texto que empieza con = o @: se guarda tal cual y avisa', rep.rows[0].row.nombre === '=1+1' && rep.rows[0].row.descripcion === '@SUM(1)' && rep.rows[0].warnings.length === 2);
  check('texto enriquecido', rep.rows[1].row.nombre === 'Flan casero' && rep.rows[1].row.precio === 99.9);
}

console.log('límites');
{
  const filas = (n) => build((wb) => {
    const ws = wb.addWorksheet('Productos');
    ws.addRow(['Nombre', 'Precio']);
    for (let i = 1; i <= n; i++) ws.addRow([`Producto ${i}`, 100 + i]);
  });
  const ok500 = await run(await filas(500));
  check('500 filas: ok', ok500.r.ok && ok500.r.truncated === false && ok500.rep.fatal === null && ok500.rep.counts.ok === 500);
  const de501 = await run(await filas(501));
  check('501 filas: la validación avisa que se pasa (no importa nada)', de501.r.ok && de501.r.records.length === 501 && /más de 500/.test(de501.rep.fatal ?? ''));
  const de900 = await run(await filas(900));
  check('900 filas: se corta la lectura en 501 y se avisa', de900.r.ok && de900.r.records.length === 501 && de900.r.truncated === true && de900.rep.fatal !== null);

  const conVacias = await build((wb) => {
    const ws = wb.addWorksheet('Productos');
    ws.addRow(['Nombre', 'Precio']);
    ws.addRow(['A', 1]); ws.addRow([]); ws.addRow(['', '']); ws.addRow(['B', 2]);
    ws.getRow(5000).getCell(1).value = '';
  });
  const rv = await run(conVacias);
  check('filas vacías intercaladas se saltean', rv.r.records.length === 2 && rv.rep.counts.ok === 2);

  const grande = new Uint8Array(IMPORT_LIMITS.maxFileBytes + 1);
  const rg = await readXlsxRecords(grande.buffer);
  check('más de 2 MB: se rechaza', rg.ok === false && /2 MB/.test(rg.error));
}

console.log('archivos que no son .xlsx y zip bombs');
{
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  check('una imagen renombrada: se rechaza', (await readXlsxRecords(png.buffer)).ok === false);
  check('texto: se rechaza', (await readXlsxRecords(new TextEncoder().encode('Nombre;Precio\nA;1\n').buffer)).ok === false);
  check('vacío: se rechaza', (await readXlsxRecords(new ArrayBuffer(0))).ok === false);

  const zipSimple = new JSZip(); zipSimple.file('hola.txt', 'hola');
  const zsAB = toAB(Buffer.from(await zipSimple.generateAsync({ type: 'nodebuffer' })));
  check('un zip válido que no es xlsx: pasa el control de tamaño pero exceljs lo rechaza', checkXlsxZip(zsAB) === null && (await readXlsxRecords(zsAB)).ok === false);

  // 40 MB de ceros comprimen a unos pocos KB: se rechaza mirando el directorio central, sin descomprimir
  const bomb = new JSZip();
  bomb.file('xl/worksheets/sheet1.xml', new Uint8Array(XLSX_LIMITS.maxUncompressedBytes + 5 * 1024 * 1024), { compression: 'DEFLATE' });
  const bombAB = toAB(Buffer.from(await bomb.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })));
  check('la bomba pesa poco comprimida', bombAB.byteLength < IMPORT_LIMITS.maxFileBytes);
  const rb = await readXlsxRecords(bombAB);
  check('zip bomb: se rechaza antes de descomprimir', rb.ok === false && /descomprimido/.test(rb.error) && /descomprimido/.test(checkXlsxZip(bombAB) ?? ''));

  const muchos = new JSZip();
  for (let i = 0; i <= XLSX_LIMITS.maxEntries; i++) muchos.file(`f${i}.txt`, 'x');
  const muchosAB = toAB(Buffer.from(await muchos.generateAsync({ type: 'nodebuffer' })));
  check('demasiados archivos dentro del zip: se rechaza', checkXlsxZip(muchosAB) !== null);

  const truncado = (await fudo()).slice(0, 400);
  check('xlsx cortado: se rechaza sin romper', (await readXlsxRecords(truncado)).ok === false);
  const real = await fudo();
  check('un xlsx real pasa el control del zip', checkXlsxZip(real) === null);
}

if (failures > 0) {
  console.error(`\n${failures} verificación(es) fallaron`);
  process.exit(1);
}
console.log('\nTodo ok');
