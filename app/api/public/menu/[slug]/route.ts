import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { ADMIN_EMAILS } from '@/lib/access';
import {
  PUBLIC_RESTAURANT_COLUMNS,
  PUBLIC_SNAPPYLINK_COLUMNS,
  SUSPENSION_COLUMNS,
  columnFromPgError,
  computeMenuSuspension,
  isValidSlug,
  toPublicRestaurant,
  toPublicSnappylink,
} from '@/lib/publicMenu';

// Menú público con lista CERRADA de columnas (ver lib/publicMenu). Service role: el navegador no
// lee restaurants. Mismo orden que getRestaurant de app/[slug]/page.tsx: primero el menú, después la bio.
// Con el local suspendido NO se devuelve ningún dato del local (la pantalla "Servicio Pausado" no usa ninguno).
// Aditivo: nada del código existente llama todavía a este endpoint.

const NO_STORE = { 'Cache-Control': 'no-store' };

const notFound = () => NextResponse.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
// Log de un fallo de consulta: qué parte falló + código de Postgres/PostgREST. Con 42703 (columna
// inexistente) suma solo el NOMBRE de la columna. Nunca el mensaje completo ni datos de la fila.
function logQueryError(part: 'MENU_RESTAURANTS' | 'MENU_BIO', error: { code?: string; message?: string }) {
  const col = error.code === '42703' ? columnFromPgError(error.message) : null;
  console.error(`[public-menu] code=${part} db=${error.code ?? 'n/a'}${col ? ` column=${col}` : ''}`);
}

const serverError = () => NextResponse.json({ error: 'error' }, { status: 500, headers: NO_STORE });

const RESTAURANT_SELECT = [...PUBLIC_RESTAURANT_COLUMNS, ...SUSPENSION_COLUMNS].join(', ');

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug: rawSlug } = await ctx.params;
    // Igual que la página: minúsculas y sin espacios en los bordes; recién después se valida.
    const slug = String(rawSlug ?? '').toLowerCase().trim();
    if (!isValidSlug(slug)) return notFound();

    const db = getSupabaseAdmin();
    const now = new Date();

    // A. Prioridad 1: menú. El slug ya está validado (sin % ni _), así que ilike no tiene comodines.
    const menu = await db
      .from('restaurants')
      .select(`${RESTAURANT_SELECT}, categories (id, name, image_url)`)
      .ilike('slug', slug)
      .maybeSingle();

    // PGRST116 (más de una fila) se trata como "sin menú", igual que hoy; cualquier otro error es un fallo.
    if (menu.error && menu.error.code !== 'PGRST116') {
      logQueryError('MENU_RESTAURANTS', menu.error);
      return serverError();
    }

    if (menu.data) {
      const row = menu.data as unknown as Record<string, unknown>;
      const { isSuspended, isAdmin } = computeMenuSuspension(row, ADMIN_EMAILS, now);
      if (isSuspended) {
        return NextResponse.json({ type: 'menu', isSuspended: true, isAdmin: false }, { headers: NO_STORE });
      }
      const restaurant = toPublicRestaurant(row);
      return NextResponse.json(
        {
          type: 'menu',
          isSuspended: false,
          isAdmin,
          planType: (restaurant.subscription_plan as string | null | undefined) ?? null,
          restaurant,
          categories: (row.categories as unknown[]) ?? [],
        },
        { headers: NO_STORE }
      );
    }

    // B. Prioridad 2: solo si no hay menú, la bio (snappylinks con su local embebido, también filtrado)
    const bio = await db
      .from('snappylinks')
      .select(`${PUBLIC_SNAPPYLINK_COLUMNS.join(', ')}, restaurant:restaurants(${RESTAURANT_SELECT})`)
      .ilike('slug', slug)
      .maybeSingle();

    if (bio.error && bio.error.code !== 'PGRST116') {
      logQueryError('MENU_BIO', bio.error);
      return serverError();
    }
    if (!bio.data) return notFound();

    const bioRow = bio.data as unknown as Record<string, unknown>;
    const restaurantRow = bioRow.restaurant as Record<string, unknown> | null;
    if (!restaurantRow) {
      console.error('[public-menu] code=BIO_WITHOUT_RESTAURANT');
      return notFound();
    }

    // La suspensión se evalúa antes que la bio inactiva, como en la página.
    const { isSuspended, isAdmin } = computeMenuSuspension(restaurantRow, ADMIN_EMAILS, now);
    if (isSuspended) {
      return NextResponse.json({ type: 'bio', isSuspended: true, isAdmin: false }, { headers: NO_STORE });
    }
    if (bioRow.is_active === false) return notFound();

    const restaurant = toPublicRestaurant(restaurantRow);
    return NextResponse.json(
      {
        type: 'bio',
        isSuspended: false,
        isAdmin,
        planType: (restaurant.subscription_plan as string | null | undefined) ?? null,
        restaurant,
        snappylink: toPublicSnappylink(bioRow),
      },
      { headers: NO_STORE }
    );
  } catch {
    console.error('[public-menu] code=UNEXPECTED');
    return serverError();
  }
}
