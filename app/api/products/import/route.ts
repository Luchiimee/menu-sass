import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { requirePlan } from '@/lib/planAccess';
import { isAdminEmail } from '@/lib/access';
import { maxProductsForPlan, PLAN_IDS } from '@/lib/plans';
import { limitByRestaurant } from '@/lib/rateLimit';
import { RATE_LIMITS } from '@/lib/rateLimitCore';
import {
  IMPORT_LIMITS, validateImport, checkProductLimit, normKey, DEFAULT_CATEGORY, readImportRows, buildProductInserts,
  type ExistingProduct, type ImportRow,
} from '@/lib/productsImport';

// Importar productos desde CSV (Mis Productos). El navegador parsea el archivo y manda el JSON; acá se REVALIDA todo
// con la misma lógica (lib/productsImport) y se escribe con el service role, SIEMPRE sobre el local de la sesión:
// el restaurant_id nunca viene del body. Todo o nada con el límite del plan: si actuales + nuevos lo supera, no se
// importa nada. Las filas con error o duplicadas se omiten y se cuentan. Respuestas sin datos del local.

const BATCH = 100;
const PAGE = 1000;
const MAX_BODY_CHARS = 2 * 1024 * 1024;

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return fail(401, 'No autenticado');

    // Plan vigente: prueba vencida, pausado o cancelado no pueden cargar productos
    const access = await requirePlan(sessionUser.id, [...PLAN_IDS]);
    if (!access.ok) return fail(access.status, access.reason);
    const restaurantId = access.restaurant.id;

    const limited = await limitByRestaurant(restaurantId, RATE_LIMITS.importPerRestaurant, 'closed', 'import');
    if (limited) return limited;

    // Cuerpo acotado antes de parsearlo
    const text = await req.text();
    if (text.length > MAX_BODY_CHARS) return fail(413, 'archivo_muy_grande');
    let body: unknown;
    try { body = JSON.parse(text); } catch { return fail(400, 'json_invalido'); }
    // Del body solo se lee `rows`: un restaurant_id u otro campo que mande el cliente se ignora
    const rows = readImportRows(body);
    if (!rows) return fail(400, 'datos_invalidos');
    if (rows.length > IMPORT_LIMITS.maxRows) return fail(400, 'demasiadas_filas', { max: IMPORT_LIMITS.maxRows });

    const db = getSupabaseAdmin();

    // Categorías y productos actuales del local
    const catsRes = await db.from('categories').select('id, name, sort_order').eq('restaurant_id', restaurantId);
    if (catsRes.error) { console.error('[products/import] categories read', catsRes.error.code); return fail(500, 'error_interno'); }
    const categories = (catsRes.data ?? []) as { id: string; name: string; sort_order: number | null }[];

    const products: { name: string; category_id: string | null; es_destacado: boolean | null }[] = [];
    for (let from = 0; ; from += PAGE) {
      const res = await db.from('products').select('name, category_id, es_destacado').eq('restaurant_id', restaurantId).order('id', { ascending: true }).range(from, from + PAGE - 1);
      if (res.error) { console.error('[products/import] products read', res.error.code); return fail(500, 'error_interno'); }
      products.push(...((res.data ?? []) as typeof products));
      if (!res.data || res.data.length < PAGE) break;
    }

    const catNameById = new Map(categories.map((c) => [c.id, c.name]));
    const existing: ExistingProduct[] = products.map((p) => ({
      name: String(p.name ?? ''),
      category: (p.category_id && catNameById.get(p.category_id)) || null,
    }));

    const report = validateImport(rows, { existing, hasFeatured: products.some((p) => p.es_destacado === true) });
    if (report.fatal) return fail(400, 'archivo_invalido', { message: report.fatal });

    const toCreate = report.rows.filter((r) => r.status === 'ok' && r.row).map((r) => r.row as ImportRow);
    const summary = { duplicates: report.counts.duplicates, invalid: report.counts.errors, inactive: report.counts.inactive };

    // Límite del plan: todo o nada (los admins no tienen tope, igual que en el panel)
    const isAdmin = isAdminEmail(sessionUser.email);
    const max = maxProductsForPlan(access.restaurant.plan);
    const limit = checkProductLimit(products.length, toCreate.length, max, isAdmin);
    if (!limit.ok) {
      return fail(409, 'limite_del_plan', { plan: access.restaurant.plan, limit: max, current: products.length, incoming: toCreate.length, available: limit.available, ...summary });
    }
    if (toCreate.length === 0) {
      return NextResponse.json({ created: 0, categoriesCreated: 0, ...summary });
    }

    // Categorías que faltan (sin distinguir mayúsculas), en el orden en que aparecen
    const catIdByKey = new Map(categories.map((c) => [normKey(c.name), c.id]));
    const missing: string[] = [];
    for (const r of toCreate) {
      const k = normKey(r.categoria || DEFAULT_CATEGORY);
      if (!catIdByKey.has(k) && !missing.some((m) => normKey(m) === k)) missing.push(r.categoria || DEFAULT_CATEGORY);
    }
    let categoriesCreated = 0;
    if (missing.length > 0) {
      const baseOrder = categories.reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0);
      const ins = await db.from('categories')
        .insert(missing.map((name, i) => ({ restaurant_id: restaurantId, name, image_url: null, sort_order: baseOrder + i + 1 })))
        .select('id, name');
      if (ins.error || !ins.data) { console.error('[products/import] categories insert', ins.error?.code); return fail(500, 'error_interno', { created: 0 }); }
      for (const c of ins.data as { id: string; name: string }[]) catIdByKey.set(normKey(c.name), c.id);
      categoriesCreated = ins.data.length;
    }

    // Productos por lotes. Mismas columnas que el panel (image_url y description vacíos = '', video_url null)
    let created = 0;
    for (let i = 0; i < toCreate.length; i += BATCH) {
      // restaurant_id = el de la sesión (access.restaurant.id), nunca el del body
      const batch = buildProductInserts(restaurantId, toCreate.slice(i, i + BATCH), catIdByKey);
      const res = await db.from('products').insert(batch);
      if (res.error) {
        console.error('[products/import] products insert', res.error.code);
        // Falla a mitad: se informa cuántos se alcanzaron a crear (los lotes anteriores ya quedaron)
        return fail(500, 'error_al_importar', { created, categoriesCreated, pending: toCreate.length - created, ...summary });
      }
      created += batch.length;
    }

    return NextResponse.json({ created, categoriesCreated, ...summary });
  } catch (err) {
    console.error('SERVER ERROR (products/import):', err instanceof Error ? err.message : 'desconocido');
    return fail(500, 'error_interno');
  }
}
