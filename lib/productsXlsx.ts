// Leer un .xlsx en el NAVEGADOR para importar productos (Mis Productos). Devuelve filas como texto (objeto
// encabezado → texto) que siguen el mismo camino que el CSV: mapHeaders → validateImport → POST /api/products/import
// (el servidor revalida todo igual).
//
// Reglas: máx 2 MB y 500 filas; solo la hoja "Productos" (sin distinguir mayúsculas ni tildes) o, si no existe, la
// primera; TODO se lee como texto y nunca se evalúa una fórmula (se toma el resultado guardado); los números se leen
// tal como vienen en el archivo (los precios no se convierten ni redondean). Antes de descomprimir se mira el
// directorio central del zip para rechazar archivos que se expanden de más (zip bomb).

import { IMPORT_LIMITS } from './productsImport.ts';

export const XLSX_LIMITS = {
  maxUncompressedBytes: 30 * 1024 * 1024, // suma de lo que se descomprime
  maxEntries: 500, // archivos dentro del zip
  maxColumns: 60,
  maxScanRows: 20000, // filas que se recorren como máximo buscando datos (hay planillas con formato hasta la fila 1.000.000)
  headerScanRows: 20, // el encabezado tiene que estar entre las primeras filas
} as const;

export const PRODUCTS_SHEET = 'productos';

export type XlsxReadResult =
  | { ok: true; records: Record<string, string>[]; sheetName: string; sheetCount: number; truncated: boolean }
  | { ok: false; error: string };

const fail = (error: string): XlsxReadResult => ({ ok: false, error });

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// ─── Zip: se mira el directorio central sin descomprimir nada ───────────────────────────────────

// null si está bien; si no, el motivo (en castellano).
export function checkXlsxZip(buf: ArrayBuffer): string | null {
  const dv = new DataView(buf);
  const len = buf.byteLength;
  if (len < 22 || dv.getUint32(0, true) !== 0x04034b50) return 'El archivo no parece un .xlsx válido.';

  // Fin del directorio central (EOCD), buscando hacia atrás
  let eocd = -1;
  for (let i = len - 22; i >= Math.max(0, len - 22 - 0xffff); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return 'El archivo no parece un .xlsx válido.';
  const entries = dv.getUint16(eocd + 10, true);
  const cdSize = dv.getUint32(eocd + 12, true);
  const cdOffset = dv.getUint32(eocd + 16, true);
  if (entries === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) return 'El archivo .xlsx es demasiado complejo.';
  if (entries === 0 || entries > XLSX_LIMITS.maxEntries) return 'El archivo no parece un .xlsx válido.';
  if (cdOffset + cdSize > len) return 'El archivo no parece un .xlsx válido.';

  let total = 0;
  let pos = cdOffset;
  for (let n = 0; n < entries; n++) {
    if (pos + 46 > len || dv.getUint32(pos, true) !== 0x02014b50) return 'El archivo no parece un .xlsx válido.';
    const size = dv.getUint32(pos + 24, true);
    if (size === 0xffffffff) return 'El archivo .xlsx es demasiado complejo.';
    total += size;
    if (total > XLSX_LIMITS.maxUncompressedBytes) return 'El archivo .xlsx es demasiado grande una vez descomprimido.';
    pos += 46 + dv.getUint16(pos + 28, true) + dv.getUint16(pos + 30, true) + dv.getUint16(pos + 32, true);
  }
  return null;
}

// ─── Celdas → texto ─────────────────────────────────────────────────────────────────────────────

// Texto de un valor de celda de exceljs. Fórmulas: el resultado guardado (nunca se evalúa nada). Sin formato de
// número: 1500 → "1500", 1500.5 → "1500.5".
export function cellValueToText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'boolean') return v ? 'Si' : 'No';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.richText)) return (o.richText as { text?: unknown }[]).map((t) => (typeof t?.text === 'string' ? t.text : '')).join('');
    if ('result' in o) return cellValueToText(o.result); // fórmula
    if (typeof o.text === 'string') return o.text; // hipervínculo
    if (typeof o.error === 'string') return ''; // #N/A, #REF!...
  }
  return '';
}

// ─── Lectura ────────────────────────────────────────────────────────────────────────────────────

export async function readXlsxRecords(buf: ArrayBuffer): Promise<XlsxReadResult> {
  if (buf.byteLength > IMPORT_LIMITS.maxFileBytes) return fail('El archivo pesa más de 2 MB. Dividilo en archivos más chicos.');
  const zipProblem = checkXlsxZip(buf);
  if (zipProblem) return fail(zipProblem);

  let wb;
  try {
    const ExcelJS = (await import('exceljs')).default;
    wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
  } catch {
    return fail('No pude leer el archivo .xlsx. Probá guardarlo de nuevo desde Excel.');
  }

  const sheets = wb.worksheets;
  if (sheets.length === 0) return fail('El archivo no tiene hojas.');
  const ws = sheets.find((s) => norm(s.name) === PRODUCTS_SHEET) ?? sheets[0];

  const colCount = Math.min(Math.max(ws.columnCount, 1), XLSX_LIMITS.maxColumns);
  const rowText = (r: number): string[] => {
    const row = ws.getRow(r);
    const out: string[] = [];
    for (let c = 1; c <= colCount; c++) out.push(cellValueToText(row.getCell(c).value).trim());
    return out;
  };

  // Encabezado: la primera fila con contenido entre las primeras filas
  let headerRow = -1;
  let headers: string[] = [];
  for (let r = 1; r <= XLSX_LIMITS.headerScanRows && r <= ws.rowCount; r++) {
    const t = rowText(r);
    if (t.some((x) => x !== '')) { headerRow = r; headers = t; break; }
  }
  if (headerRow < 0) return fail('La hoja no tiene datos. Revisá que tenga encabezados y al menos un producto.');

  // Si un encabezado se repite, vale el primero
  const keys: (string | null)[] = [];
  const seen = new Set<string>();
  for (const h of headers) {
    if (h === '' || seen.has(h)) keys.push(null);
    else { seen.add(h); keys.push(h); }
  }

  const records: Record<string, string>[] = [];
  let truncated = false;
  const last = Math.min(ws.rowCount, headerRow + XLSX_LIMITS.maxScanRows);
  for (let r = headerRow + 1; r <= last; r++) {
    const t = rowText(r);
    if (t.every((x) => x === '')) continue;
    // Una más que el máximo: alcanza para que la validación avise que se pasa
    if (records.length >= IMPORT_LIMITS.maxRows + 1) { truncated = true; break; }
    const rec: Record<string, string> = {};
    keys.forEach((k, i) => { if (k !== null) rec[k] = t[i]; });
    records.push(rec);
  }
  if (records.length === 0) return fail('No encontré filas con productos en la hoja.');

  return { ok: true, records, sheetName: ws.name, sheetCount: sheets.length, truncated };
}
