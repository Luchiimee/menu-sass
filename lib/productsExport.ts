// Exportar productos a CSV (Mis Productos): función PURA, sin red. Arma el mismo formato que la plantilla de
// importación, así que el archivo exportado se puede volver a importar sin errores.
//
// Formato: separador ";", UTF-8 con BOM (para que Excel en español lo abra bien), saltos CRLF.
// Seguridad: toda celda que empiece con = + - @ (tab/CR) se exporta con una comilla simple adelante, SOLO en el
// archivo. La base no se toca, y al importar se deshace esa comilla (unneutralizeCell en lib/productsImport).

import { TEMPLATE_HEADERS, neutralizeCell, type Variation } from './productsImport.ts';

export const CSV_BOM = '﻿';

// Lo mínimo que se necesita de cada producto del local (las columnas de la tabla products).
export type ExportProduct = {
  name: string | null;
  description: string | null;
  price: number | string | null;
  image_url: string | null;
  sale_type: string | null;
  variations: unknown;
  es_destacado: boolean | null;
  category_id: string | null;
};

export type ExportCategory = { id: string; name: string; sort_order?: number | null };

function csvEscape(v: string): string {
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// Precio sin separador de miles y con punto decimal ("1500", "1500.5"): el importador lo lee tal cual.
function exportPrice(raw: number | string | null): string {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  if (n === null || !Number.isFinite(n) || n < 0) return '';
  return String(Number(n.toFixed(2)));
}

// variaciones guardadas ([{label, price}]) → "100g:1500|1kg:12000". Un "|" dentro de la etiqueta se cambia por "/"
// (el importador usa "|" como separador).
function exportVariations(raw: unknown): string {
  if (!Array.isArray(raw)) return '';
  const out: string[] = [];
  for (const v of raw as Partial<Variation>[]) {
    if (!v || typeof v.label !== 'string') continue;
    const price = exportPrice(v.price === undefined || v.price === null ? null : (v.price as number | string));
    const label = v.label.replace(/\|/g, '/').trim();
    if (label === '' || price === '') continue;
    out.push(`${label}:${price}`);
  }
  return out.join('|');
}

const cell = (s: string): string => csvEscape(neutralizeCell(s));

// Una fila por producto, ordenadas por categoría (según sort_order) y por nombre. Producto sin categoría: celda vacía
// (al importar cae en "General", igual que en el panel).
export function exportProductsCsv(products: readonly ExportProduct[], categories: readonly ExportCategory[]): string {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const order = new Map(categories.map((c, i) => [c.id, c.sort_order ?? i]));

  const sorted = [...products].sort((a, b) => {
    const oa = a.category_id ? (order.get(a.category_id) ?? 1e9) : 1e9;
    const ob = b.category_id ? (order.get(b.category_id) ?? 1e9) : 1e9;
    return oa - ob || String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es');
  });

  const lines = [TEMPLATE_HEADERS.join(';')];
  for (const p of sorted) {
    const tipo = p.sale_type === 'peso' ? 'peso' : 'unidad';
    const price = tipo === 'peso' && Number(p.price) === 0 ? '' : exportPrice(p.price);
    const row = [
      (p.category_id && catById.get(p.category_id)?.name) || '',
      String(p.name ?? ''),
      String(p.description ?? ''),
      price,
      tipo,
      exportVariations(p.variations),
      p.es_destacado === true ? 'si' : 'no',
      String(p.image_url ?? ''),
    ];
    lines.push(row.map(cell).join(';'));
  }
  return lines.join('\r\n') + '\r\n';
}

// Archivo listo para descargar (con BOM).
export function exportProductsFile(products: readonly ExportProduct[], categories: readonly ExportCategory[]): string {
  return CSV_BOM + exportProductsCsv(products, categories);
}
