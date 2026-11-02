// Verificación de lib/fetchAllPages.ts con un cliente falso que se comporta como .range() de
// Supabase (desde y hasta inclusivos, corta a lo que haya): sin red.
//
//   node scripts/check-fetch-all-pages.mjs   (Node >= 22.18 / 24: importa .ts directo)

import { fetchAllPages, PAGE_SIZE, MAX_PAGES } from '../lib/fetchAllPages.ts';

let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

// Tabla falsa de `total` filas; registra cada .range pedido
function fakeTable(total, { errorAtCall = null } = {}) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const calls = [];
  const query = async (from, to) => {
    calls.push([from, to]);
    if (errorAtCall === calls.length) return { data: null, error: { message: 'timeout', code: '57014' } };
    return { data: rows.slice(from, to + 1), error: null };
  };
  return { query, calls };
}
const ids = (data) => data.map((r) => r.id);
const sinHuecos = (data, n) => data.length === n && data.every((r, i) => r.id === i);

console.log(`fetchAllPages (páginas de ${PAGE_SIZE}, tope ${MAX_PAGES})`);
{
  const t = fakeTable(0);
  const r = await fetchAllPages(t.query);
  check('0 filas → vacío, 1 consulta, no truncado', r.data.length === 0 && t.calls.length === 1 && !r.truncated && r.error === null);
}
{
  const t = fakeTable(999);
  const r = await fetchAllPages(t.query);
  check('999 filas → todas, 1 consulta (página corta)', sinHuecos(r.data, 999) && t.calls.length === 1 && !r.truncated);
  check('… pide .range(0, 999)', t.calls[0][0] === 0 && t.calls[0][1] === 999);
}
{
  const t = fakeTable(1000);
  const r = await fetchAllPages(t.query);
  check('1000 filas → todas, 2 consultas (la segunda vacía)', sinHuecos(r.data, 1000) && t.calls.length === 2 && !r.truncated);
  check('… segunda página .range(1000, 1999)', t.calls[1][0] === 1000 && t.calls[1][1] === 1999);
}
{
  const t = fakeTable(2500);
  const r = await fetchAllPages(t.query);
  check('2500 filas → todas sin repetir ni saltear, 3 consultas', sinHuecos(r.data, 2500) && t.calls.length === 3 && !r.truncated);
  check('… sin ids repetidos', new Set(ids(r.data)).size === 2500);
}
{
  // Antes: una sola consulta devolvía 1000 de 2500 sin avisar
  const t = fakeTable(2500);
  const unaSola = await t.query(0, 2499);
  check('referencia: el cliente falso no corta (el corte de 1000 es de Supabase)', unaSola.data.length === 2500);
}

console.log('tope de páginas');
{
  const t = fakeTable(50);
  const r = await fetchAllPages(t.query, { pageSize: 10, maxPages: 3 });
  check('más filas que el tope (50, tope 3 × 10) → 30 filas y truncated', r.data.length === 30 && r.truncated && r.error === null);
  check('… 3 páginas + 1 consulta de prueba de 1 fila', t.calls.length === 4 && t.calls[3][0] === 30 && t.calls[3][1] === 30);
}
{
  const t = fakeTable(30);
  const r = await fetchAllPages(t.query, { pageSize: 10, maxPages: 3 });
  check('exactamente en el tope (30) → completo, NO truncado', r.data.length === 30 && !r.truncated);
}
{
  const t = fakeTable(MAX_PAGES * PAGE_SIZE + 1);
  const r = await fetchAllPages(t.query);
  check(`tope real (${MAX_PAGES} × ${PAGE_SIZE} + 1) → ${MAX_PAGES * PAGE_SIZE} filas y truncated`, r.data.length === MAX_PAGES * PAGE_SIZE && r.truncated);
}

console.log('errores');
{
  const t = fakeTable(2500, { errorAtCall: 2 });
  const r = await fetchAllPages(t.query);
  check('error en la segunda página → devuelve el error y lo leído hasta ahí', r.error?.code === '57014' && r.data.length === 1000 && !r.truncated);
}
{
  const t = fakeTable(5, { errorAtCall: 1 });
  const r = await fetchAllPages(t.query);
  check('error en la primera → vacío con error', r.error !== null && r.data.length === 0);
}
{
  const r = await fetchAllPages(async () => ({ data: null, error: null }));
  check('data null sin error → vacío, no truncado', r.data.length === 0 && !r.truncated && r.error === null);
}

if (failures) { console.error(`\n${failures} caso(s) con FALLA`); process.exit(1); }
console.log('\nTodos los casos OK');
