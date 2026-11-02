// Lectura paginada de Supabase / PostgREST, sin imports con alias (@/) para probarla con
// scripts/check-fetch-all-pages.mjs con un cliente falso.
//
// Supabase devuelve como máximo 1000 filas por consulta (max rows del proyecto) y corta en
// silencio: un período con más filas se veía incompleto sin aviso. Esto pide de a PAGE_SIZE con
// .range(desde, hasta) hasta que una página venga corta. Con un tope de páginas, si se llega al
// tope y todavía quedan filas, devuelve truncated: true para avisar en pantalla.
//
// La consulta tiene que tener un ORDER BY estable (columna única): sin orden, dos páginas pueden
// repetir o saltear filas.

export const PAGE_SIZE = 1000;
export const MAX_PAGES = 20;

export type PageQueryResult<T> = { data: T[] | null; error: { message: string; code?: string } | null };

export type FetchAllPagesResult<T> = {
  data: T[];
  error: { message: string; code?: string } | null;
  truncated: boolean; // se llegó al tope y quedaban filas: los datos son parciales
};

export async function fetchAllPages<T>(
  query: (from: number, to: number) => PromiseLike<PageQueryResult<T>>,
  { pageSize = PAGE_SIZE, maxPages = MAX_PAGES }: { pageSize?: number; maxPages?: number } = {}
): Promise<FetchAllPagesResult<T>> {
  const rows: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) return { data: rows, error, truncated: false };
    const pageRows = data ?? [];
    rows.push(...pageRows);
    if (pageRows.length < pageSize) return { data: rows, error: null, truncated: false };
  }
  // Tope alcanzado con todas las páginas llenas: ¿queda al menos una fila más?
  const next = maxPages * pageSize;
  const { data, error } = await query(next, next);
  if (error) return { data: rows, error, truncated: false };
  return { data: rows, error: null, truncated: (data ?? []).length > 0 };
}
