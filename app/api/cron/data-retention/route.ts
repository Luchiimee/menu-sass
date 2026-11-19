// Cron diario de retención de datos (vercel.json). Para cada local CANCELADO o con la PRUEBA GRATIS ABANDONADA (nunca
// cargó tarjeta ni pagó; la prueba cuenta 14 días desde que se creó el local):
//   - 15 días antes del borrado manda el mail de aviso (kind 'delete_warning');
//   - el día del borrado (con el aviso ya enviado hace 14+ días) ELIMINARÍA los datos.
//
// El borrado REAL solo corre si DATA_RETENTION_DELETE = '1' en las variables de Vercel (por defecto NO: solo anota en
// el log "se borraría <restaurant.id>"). Aun activado: máximo MAX_DELETIONS_PER_RUN por corrida, y la base se niega a
// borrar un local que no esté 'cancelled' (docs/sql/35). Los avisos por mail sí se mandan siempre (son lo que hay que
// tener enviado antes de borrar). Reglas: lib/retentionPlan.ts. Los logs llevan solo códigos cortos y restaurant.id.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/send';
import { sendDeleteWarning, emailLogDeleteWarningDb } from '@/lib/email/deleteWarningRun';
import { planRetention } from '@/lib/retentionPlan';
import { deleteRestaurantData } from '@/lib/deleteRestaurantData';
import { deleteMpCustomer } from '@/lib/mercadopagoBilling';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// Freno de seguridad: aunque haya muchos para borrar, por corrida se borran como mucho estos.
const MAX_DELETIONS_PER_RUN = 5;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const { data: rows, error } = await supabase
    .from('restaurants')
    .select('id, name, owner_email, subscription_status, grace_period_until, created_at, mp_card_id, mp_customer_id, mp_preapproval_id, first_paid_at')
    .or(
      'and(subscription_status.eq.cancelled,grace_period_until.not.is.null),' +
      'and(subscription_status.eq.trialing,mp_card_id.is.null,mp_customer_id.is.null,mp_preapproval_id.is.null,first_paid_at.is.null)',
    )
    .limit(2000);
  if (error) {
    console.error('[cron/data-retention] code=RESTAURANTS_QUERY_FAILED');
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }
  const restaurants = rows ?? [];

  // Último aviso ENVIADO por local
  const warnedAt = new Map<string, Date>();
  if (restaurants.length > 0) {
    const { data: logs, error: logError } = await supabase
      .from('email_log')
      .select('restaurant_id, sent_at')
      .eq('kind', 'delete_warning')
      .eq('status', 'sent')
      .in('restaurant_id', restaurants.map((r) => r.id));
    if (logError) {
      // Sin saber qué avisos salieron no se decide nada (jamás se borra a ciegas)
      console.error('[cron/data-retention] code=EMAIL_LOG_QUERY_FAILED');
      return NextResponse.json({ error: 'email_log_query_failed' }, { status: 500 });
    }
    for (const l of logs ?? []) {
      if (!l.restaurant_id || !l.sent_at) continue;
      const d = new Date(l.sent_at);
      const prev = warnedAt.get(l.restaurant_id);
      if (!prev || d > prev) warnedAt.set(l.restaurant_id, d);
    }
  }

  const actions = planRetention(restaurants, warnedAt, now);
  const byId = new Map(restaurants.map((r) => [r.id, r]));
  const deleteEnabled = process.env.DATA_RETENTION_DELETE === '1';
  const summary = { cancelled: restaurants.length, warned: 0, warn_failed: 0, would_delete: 0, deleted: 0, delete_failed: 0, delete_deferred: 0, waiting: 0 };

  for (const a of actions) {
    const r = byId.get(a.id)!;
    if (a.kind === 'wait') { summary.waiting++; continue; }

    if (a.kind === 'warn') {
      const res = await sendDeleteWarning({
        db: emailLogDeleteWarningDb(supabase),
        send: (msg) => sendEmail(msg),
        restaurant: { id: r.id, owner_email: r.owner_email, name: r.name },
        deleteOn: a.deleteOn,
        reason: a.reason,
      });
      if (res.outcome === 'sent') summary.warned++; else if (res.outcome !== 'duplicate') summary.warn_failed++;
      continue;
    }

    // a.kind === 'delete'
    if (!deleteEnabled) {
      console.log(`[cron/data-retention] DRY_RUN would_delete restaurant=${r.id}`);
      summary.would_delete++;
      continue;
    }
    if (summary.deleted + summary.delete_failed >= MAX_DELETIONS_PER_RUN) { summary.delete_deferred++; continue; }

    const out = await deleteRestaurantData(r.id, {
      getMpCustomerId: async (id) => {
        const { data, error } = await supabase.from('restaurants').select('mp_customer_id').eq('id', id).maybeSingle();
        if (error) throw new Error('read_failed');
        return { found: !!data, mpCustomerId: (data?.mp_customer_id as string | null) ?? null };
      },
      rpc: async (fn, args) => {
        const { data, error } = await supabase.rpc(fn, args);
        return { data, error: error ? { message: error.message } : null };
      },
      removeImages: async (names) => {
        const { error } = await supabase.storage.from('images').remove(names);
        return { error: error ? { message: error.message } : null };
      },
      deleteMpCustomer,
    });
    if (out.ok) {
      console.log(`[cron/data-retention] DELETED restaurant=${r.id} images=${out.images} mp=${out.mpCustomer}`);
      summary.deleted++;
    } else {
      summary.delete_failed++;
    }
  }

  console.log('[cron/data-retention] Resumen:', summary);
  return NextResponse.json({ success: true, dryRun: !deleteEnabled, ...summary });
}
