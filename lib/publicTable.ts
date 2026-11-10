// Mesas en el cliente PÚBLICO (GET /api/public/tables, GET /api/public/tables/[id] y POST
// /api/public/table/call): lista cerrada de columnas, validación del id y del nombre, y búsqueda de
// una mesa por nombre. Lógica pura, sin imports con alias (@/) para probarla con
// scripts/check-public-table.mjs.
//
// Del cliente público NUNCA sale description (nota interna del dueño), needs_attention (llamada al
// mozo) ni reservation_info (nombre, personas y nota de una reserva: dato personal). De status solo
// sale un booleano (reserved).
//
// Cómo se guarda hoy el número de mesa en orders: orders.table_number es el NOMBRE de la mesa
// (tables.name), no su id (CartFooter: table_number = nroMesa; panel del dueño: mesa.name).

export const PUBLIC_TABLE_COLUMNS = ['id', 'name', 'status'] as const;

// Para .select(): la misma lista, nunca '*'
export const PUBLIC_TABLE_SELECT = PUBLIC_TABLE_COLUMNS.join(', ');

export const MAX_TABLE_NAME_LENGTH = 60;

// Cualquier UUID: el id de una mesa lo genera la base y no se asume que sea v4
const ANY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Caracteres de control (C0, DEL, C1) y separadores de línea / párrafo de Unicode
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = new RegExp('[\x00-\x1f\x7f-\x9f' + String.fromCharCode(0x2028, 0x2029) + ']');

export function isValidTableId(id: unknown): id is string {
  return typeof id === 'string' && ANY_UUID.test(id);
}

// Nombre de mesa listo para comparar: sin espacios en los extremos, de 1 a 60 caracteres y sin
// caracteres de control. null si no sirve (no es texto, está vacío, es largo o trae control).
export function normalizeTableName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim();
  if (name.length === 0 || name.length > MAX_TABLE_NAME_LENGTH) return null;
  if (CONTROL_CHARS.test(name)) return null;
  return name;
}

export type PublicTable = { id: unknown; name: unknown; reserved: boolean };

// Copia SOLO lo permitido (nunca spread). Una columna extra en la fila se descarta.
export function toPublicTable(row: Record<string, unknown>): PublicTable {
  return { id: row.id, name: row.name, reserved: row.status === 'reservada' };
}

export type TablePick<T> = { kind: 'one'; row: T } | { kind: 'none' } | { kind: 'many' };

// Busca por IGUALDAD (sin distinguir mayúsculas ni espacios en los extremos). No es un patrón:
// % y _ valen como caracteres comunes. Con un nombre inválido o sin coincidencias → none; con
// más de una mesa del mismo nombre → many (el llamador no debe escribir en ninguna).
export function pickTableByName<T extends { name?: unknown }>(rows: readonly T[] | null | undefined, name: unknown): TablePick<T> {
  const wanted = normalizeTableName(name);
  if (wanted === null || !Array.isArray(rows)) return { kind: 'none' };
  const key = wanted.toLowerCase();
  const matches = rows.filter((r) => typeof r?.name === 'string' && r.name.trim().toLowerCase() === key);
  if (matches.length === 1) return { kind: 'one', row: matches[0] };
  return matches.length === 0 ? { kind: 'none' } : { kind: 'many' };
}
