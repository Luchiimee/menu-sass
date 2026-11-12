// Importar productos desde CSV (Mis Productos): parseo y validación PURA de las filas.
//
// La usan el navegador (vista previa) y POST /api/products/import (que REVALIDA todo: el servidor nunca confía en
// lo que valida el navegador). Sin imports (ni alias) y sin red: se prueba en scripts/check-products-import.mjs.
//
// Columnas: categoria, nombre, descripcion, precio, tipo_venta (unidad|peso), variaciones (100g:1500|1kg:12000),
// destacado (si|no) e imagen_url (solo https).
//
// Seguridad: al IMPORTAR se guarda el texto original; una celda que empiece con = + - @ solo genera un AVISO en la
// vista previa. La neutralización contra fórmulas (neutralizeCell) es para cuando se EXPORTEN datos a una planilla
// (v2), no para la base. Los textos nunca se interpretan como HTML (la UI los muestra como texto de React).

export const IMPORT_LIMITS = {
  maxRows: 500,
  maxFileBytes: 2 * 1024 * 1024,
  maxCell: 5000, // tope de lectura por celda antes de validar
  maxName: 200,
  maxDescription: 1000,
  maxCategory: 100,
  maxUrl: 2000,
  maxVariations: 20,
  maxVariationLabel: 50,
  maxPrice: 100_000_000,
} as const;

export const TEMPLATE_HEADERS = [
  'categoria', 'nombre', 'descripcion', 'precio', 'tipo_venta', 'variaciones', 'destacado', 'imagen_url',
] as const;

export type TemplateHeader = (typeof TEMPLATE_HEADERS)[number];
export type RawRow = Partial<Record<TemplateHeader, unknown>>;

export type Variation = { label: string; price: string };

export type ImportRow = {
  categoria: string;
  nombre: string;
  descripcion: string;
  precio: number;
  tipo_venta: 'unidad' | 'peso';
  variaciones: Variation[];
  destacado: boolean;
  imagen_url: string | null;
};

export type RowStatus = 'ok' | 'duplicate' | 'error';

export type RowResult = {
  line: number; // número de fila en el archivo (la 1 es el encabezado)
  status: RowStatus;
  errors: string[];
  warnings: string[];
  row?: ImportRow; // solo con status 'ok'
  preview: { nombre: string; categoria: string; precio: string };
};

export type ExistingProduct = { name: string; category: string | null };

export type ImportContext = {
  existing: readonly ExistingProduct[];
  hasFeatured: boolean; // ya hay un producto destacado en el local (el panel permite uno solo)
};

export type ImportReport = {
  fatal: string | null;
  rows: RowResult[];
  counts: { total: number; ok: number; duplicates: number; errors: number };
};

export const DEFAULT_CATEGORY = 'General';

// ─── Texto ──────────────────────────────────────────────────────────────────────────────────────

// Texto de una celda: string recortado y acotado. null/undefined/objetos → ''.
function cellText(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v !== 'string') return '';
  return v.slice(0, IMPORT_LIMITS.maxCell).trim();
}

// Sin caracteres de control (salvo salto de línea y tab dentro de la descripción, que pasan a espacio simple).
function stripControl(s: string): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

const FORMULA_START = /^[=+\-@\t\r]/;

// Neutraliza una celda que podría ser una fórmula (comilla simple adelante). NO se usa al importar: está para la
// exportación a planilla (v2).
export function neutralizeCell(s: string): string {
  return FORMULA_START.test(s) ? `'${s}` : s;
}

export function startsLikeFormula(s: string): boolean {
  return FORMULA_START.test(s);
}

// Clave de comparación: minúsculas, sin espacios de más. (No quita acentos: "Pizzas" y "Pizzás" son distintas.)
export function normKey(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function productKey(category: string | null | undefined, name: string): string {
  return `${normKey(category || DEFAULT_CATEGORY)}|${normKey(name)}`;
}

// ─── Encabezados ────────────────────────────────────────────────────────────────────────────────

function headerKey(h: string): string {
  return h
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const HEADER_ALIASES: Record<string, TemplateHeader> = {
  categoria: 'categoria', categorias: 'categoria',
  nombre: 'nombre', producto: 'nombre',
  descripcion: 'descripcion',
  precio: 'precio',
  tipo_venta: 'tipo_venta', tipo_de_venta: 'tipo_venta', tipo: 'tipo_venta',
  variaciones: 'variaciones', variacion: 'variaciones', opciones_de_venta: 'variaciones',
  destacado: 'destacado',
  imagen_url: 'imagen_url', imagen: 'imagen_url', url_imagen: 'imagen_url',
};

// Pasa los registros de papaparse (header: true) a filas con las columnas canónicas. Encabezados desconocidos
// se ignoran. Devuelve las filas y los encabezados requeridos que faltan (nombre y precio).
export function mapHeaders(records: readonly Record<string, unknown>[]): { rows: RawRow[]; missing: string[] } {
  const seen = new Set<TemplateHeader>();
  const rows: RawRow[] = records.map((rec) => {
    const out: RawRow = {};
    for (const [key, value] of Object.entries(rec ?? {})) {
      const canonical = HEADER_ALIASES[headerKey(String(key))];
      if (!canonical) continue;
      seen.add(canonical);
      if (out[canonical] === undefined) out[canonical] = value;
    }
    return out;
  });
  const missing = (['nombre', 'precio'] as const).filter((h) => !seen.has(h));
  return { rows, missing };
}

// ─── Campos ─────────────────────────────────────────────────────────────────────────────────────

// Precio: "1500", "1500.5", "1.500", "1.500,50", "$ 1500". Sin signos (+/-), sin notación científica.
export function parsePrice(raw: string): number | null {
  let s = raw.replace(/\s+/g, '').replace(/^\$/, '');
  if (!/^[0-9.,]+$/.test(s) || s === '') return null;
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    // El último separador es el decimal; el otro es de miles
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    if (s.split(',').length > 2) return null;
    s = s.replace(',', '.');
  } else if (hasDot) {
    // "1.500" (o "1.500.000") son miles; "1.5" y "1500.50" son decimales
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    else if (s.split('.').length > 2) return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > IMPORT_LIMITS.maxPrice) return null;
  return n;
}

function priceString(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

const FORMULA_WARNING = (field: string) => `${field}: empieza con = + - @; se guarda tal cual (cuidado si lo abrís en una planilla)`;

// "100g:1500|1kg:12000" → [{ label: '100g', price: '1500' }, ...]. El precio va después del ÚLTIMO ':'.
function parseVariations(raw: string, errors: string[], warnings: string[]): Variation[] {
  if (!raw) return [];
  const parts = raw.split('|').map((p) => p.trim()).filter((p) => p !== '');
  if (parts.length > IMPORT_LIMITS.maxVariations) {
    errors.push(`variaciones: máximo ${IMPORT_LIMITS.maxVariations} por producto`);
    return [];
  }
  const out: Variation[] = [];
  const labels = new Set<string>();
  for (const part of parts) {
    const idx = part.lastIndexOf(':');
    if (idx <= 0) {
      errors.push(`variaciones: "${part.slice(0, 30)}" no tiene el formato etiqueta:precio`);
      return [];
    }
    const labelRaw = stripControl(part.slice(0, idx)).trim();
    const price = parsePrice(part.slice(idx + 1).trim());
    if (!labelRaw || labelRaw.length > IMPORT_LIMITS.maxVariationLabel) {
      errors.push(`variaciones: la etiqueta debe tener entre 1 y ${IMPORT_LIMITS.maxVariationLabel} caracteres`);
      return [];
    }
    if (price === null) {
      errors.push(`variaciones: el precio de "${labelRaw.slice(0, 30)}" no es válido`);
      return [];
    }
    if (labels.has(normKey(labelRaw))) {
      errors.push(`variaciones: "${labelRaw.slice(0, 30)}" está repetida`);
      return [];
    }
    labels.add(normKey(labelRaw));
    if (startsLikeFormula(labelRaw) && !warnings.includes(FORMULA_WARNING('variaciones'))) {
      warnings.push(FORMULA_WARNING('variaciones'));
    }
    out.push({ label: labelRaw, price: priceString(price) });
  }
  return out;
}

const YES = new Set(['si', 'sí', 'true', '1', 'x', 'yes', 's']);
const NO = new Set(['', 'no', 'false', '0', 'n']);

function parseBool(raw: string): boolean | null {
  const k = raw.toLowerCase();
  if (YES.has(k)) return true;
  if (NO.has(k)) return false;
  return null;
}

// Solo https, sin credenciales en la URL y de largo razonable.
export function parseHttpsUrl(raw: string): string | null {
  if (raw.length > IMPORT_LIMITS.maxUrl) return null;
  if (!/^https:\/\//i.test(raw) || /\s/.test(raw)) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || !u.hostname || u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// ─── Validación ─────────────────────────────────────────────────────────────────────────────────

function textField(raw: unknown, warnings: string[], field: string): string {
  const s = stripControl(cellText(raw));
  if (startsLikeFormula(s)) {
    warnings.push(FORMULA_WARNING(field));
  }
  return s;
}

export function validateImport(records: readonly RawRow[] | null | undefined, ctx: ImportContext): ImportReport {
  const empty = (fatal: string | null): ImportReport => ({ fatal, rows: [], counts: { total: 0, ok: 0, duplicates: 0, errors: 0 } });

  if (!Array.isArray(records) || records.length === 0) return empty('El archivo no tiene filas con productos.');
  if (records.length > IMPORT_LIMITS.maxRows) {
    return empty(`El archivo tiene más de ${IMPORT_LIMITS.maxRows} filas. Dividilo en archivos más chicos.`);
  }

  const taken = new Set<string>(ctx.existing.map((p) => productKey(p.category, String(p.name ?? ''))));
  let featuredTaken = !!ctx.hasFeatured;

  const rows: RowResult[] = records.map((rec, i) => {
    const line = i + 2; // la fila 1 es el encabezado
    const errors: string[] = [];
    const warnings: string[] = [];
    const r = (rec ?? {}) as RawRow;

    const nombreRaw = stripControl(cellText(r.nombre));
    const categoriaRaw = stripControl(cellText(r.categoria));
    const precioRaw = cellText(r.precio);
    const preview = { nombre: nombreRaw.slice(0, 60), categoria: categoriaRaw.slice(0, 40), precio: precioRaw.slice(0, 20) };

    // Fila completamente vacía: se ignora como error liviano
    const allEmpty = TEMPLATE_HEADERS.every((h) => cellText(r[h]) === '');
    if (allEmpty) return { line, status: 'error', errors: ['fila vacía'], warnings, preview };

    // nombre
    if (nombreRaw.length < 1 || nombreRaw.length > IMPORT_LIMITS.maxName) {
      errors.push(`nombre: debe tener entre 1 y ${IMPORT_LIMITS.maxName} caracteres`);
    }
    // categoria (vacía → General)
    if (categoriaRaw.length > IMPORT_LIMITS.maxCategory) {
      errors.push(`categoria: máximo ${IMPORT_LIMITS.maxCategory} caracteres`);
    }
    // descripcion
    const descripcionRaw = textField(r.descripcion, warnings, 'descripcion');
    if (descripcionRaw.length > IMPORT_LIMITS.maxDescription) {
      errors.push(`descripcion: máximo ${IMPORT_LIMITS.maxDescription} caracteres`);
    }
    // tipo_venta
    const tipoRaw = cellText(r.tipo_venta).toLowerCase();
    let tipo: 'unidad' | 'peso' = 'unidad';
    if (tipoRaw === 'peso') tipo = 'peso';
    else if (tipoRaw !== '' && tipoRaw !== 'unidad') errors.push('tipo_venta: usá "unidad" o "peso"');
    // variaciones
    const variaciones = parseVariations(stripControl(cellText(r.variaciones)), errors, warnings);
    if (tipo === 'peso' && variaciones.length === 0 && !errors.some((e) => e.startsWith('variaciones'))) {
      errors.push('variaciones: los productos por peso necesitan al menos una (ej: 100g:1500|1kg:12000)');
    }
    // precio: obligatorio en unidad; en peso puede quedar vacío (0)
    let precio = 0;
    if (precioRaw === '') {
      if (tipo === 'unidad') errors.push('precio: es obligatorio para productos por unidad');
    } else {
      const p = parsePrice(precioRaw);
      if (p === null) errors.push('precio: tiene que ser un número mayor o igual a 0 (ej: 1500 o 1500,50)');
      else precio = p;
    }
    if (errors.length === 0 && tipo === 'unidad' && precio === 0 && variaciones.length === 0) {
      warnings.push('precio 0: no se va a poder comprar online hasta que le pongas precio');
    }
    // destacado
    const destRaw = cellText(r.destacado);
    let destacado = false;
    const destParsed = parseBool(destRaw);
    if (destParsed === null) errors.push('destacado: usá "si" o "no"');
    else destacado = destParsed;
    // imagen_url
    const imgRaw = cellText(r.imagen_url);
    let imagen: string | null = null;
    if (imgRaw !== '') {
      imagen = parseHttpsUrl(imgRaw);
      if (!imagen) errors.push('imagen_url: tiene que ser un link https:// válido');
    }

    if (errors.length > 0) return { line, status: 'error', errors, warnings, preview };

    const categoria = categoriaRaw || DEFAULT_CATEGORY;
    const key = productKey(categoria, nombreRaw);
    if (taken.has(key)) {
      return { line, status: 'duplicate', errors: [], warnings: ['ya existe un producto con ese nombre en esa categoría: se omite'], preview };
    }
    taken.add(key);

    if (destacado) {
      if (featuredTaken) {
        destacado = false;
        warnings.push('ya hay un producto destacado: este se importa sin destacar');
      } else {
        featuredTaken = true;
      }
    }
    if (startsLikeFormula(categoria)) warnings.push(FORMULA_WARNING('categoria'));
    if (startsLikeFormula(nombreRaw)) warnings.push(FORMULA_WARNING('nombre'));

    return {
      line,
      status: 'ok',
      errors,
      warnings,
      preview,
      row: {
        categoria,
        nombre: nombreRaw,
        descripcion: descripcionRaw,
        precio,
        tipo_venta: tipo,
        variaciones,
        destacado,
        imagen_url: imagen,
      },
    };
  });

  const ok = rows.filter((x) => x.status === 'ok').length;
  const duplicates = rows.filter((x) => x.status === 'duplicate').length;
  const errors = rows.filter((x) => x.status === 'error').length;
  return { fatal: null, rows, counts: { total: rows.length, ok, duplicates, errors } };
}

// ─── Límite del plan ────────────────────────────────────────────────────────────────────────────

// Todo o nada: si actuales + nuevos supera el tope, no se importa nada.
export function checkProductLimit(current: number, incoming: number, max: number, isAdmin: boolean): {
  ok: boolean;
  available: number;
  excess: number;
} {
  if (isAdmin) return { ok: true, available: Number.MAX_SAFE_INTEGER, excess: 0 };
  const available = Math.max(0, max - current);
  const excess = Math.max(0, current + incoming - max);
  return { ok: excess === 0, available, excess };
}

// ─── Plantilla ──────────────────────────────────────────────────────────────────────────────────

export const TEMPLATE_EXAMPLE_ROWS: readonly (readonly string[])[] = [
  ['Pizzas', 'Muzzarella', 'Salsa de tomate, muzzarella y aceitunas', '9500', 'unidad', '', 'no', ''],
  ['Pizzas', 'Napolitana', 'Con tomate fresco y ajo', '10800', 'unidad', 'Chica:8500|Grande:10800', 'si', ''],
  ['Fiambres', 'Jamón cocido', 'Por peso', '', 'peso', '100g:2500|250g:6000|1kg:22000', 'no', ''],
];

function csvEscape(v: string): string {
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// CSV de la plantilla: separador ";" (el que abre Excel en español sin vueltas); la importación detecta ";" y ",".
export function templateCsv(): string {
  return [TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLE_ROWS].map((row) => row.map(csvEscape).join(';')).join('\r\n') + '\r\n';
}

// ─── Servidor: lo único que se toma del body y cómo se arman los inserts ─────────────────────────

// Del body SOLO se lee `rows`. Cualquier otro campo (restaurant_id, user_id, plan...) se ignora: el local sale
// siempre de la sesión. null si `rows` no es un arreglo.
export function readImportRows(body: unknown): RawRow[] | null {
  if (!body || typeof body !== 'object') return null;
  const rows = (body as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as RawRow[]) : null;
}

export type ProductInsert = {
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string;
  price: number;
  image_url: string;
  video_url: null;
  sale_type: 'unidad' | 'peso';
  variations: Variation[];
  es_destacado: boolean;
};

// Arma las filas a insertar. restaurant_id es SIEMPRE el argumento (el de la sesión), nunca algo que venga de las filas:
// las filas validadas (ImportRow) ni siquiera tienen esa columna. Mismas columnas que el panel (imagen y descripción
// vacías = '', video_url null).
export function buildProductInserts(
  restaurantId: string,
  rows: readonly ImportRow[],
  categoryIdByKey: ReadonlyMap<string, string>,
): ProductInsert[] {
  return rows.map((r) => ({
    restaurant_id: restaurantId,
    category_id: categoryIdByKey.get(normKey(r.categoria || DEFAULT_CATEGORY)) ?? null,
    name: r.nombre,
    description: r.descripcion,
    price: r.precio,
    image_url: r.imagen_url ?? '',
    video_url: null,
    sale_type: r.tipo_venta,
    variations: r.variaciones,
    es_destacado: r.destacado,
  }));
}
