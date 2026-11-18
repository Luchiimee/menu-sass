// Cron diario de retención de datos (vercel.json). Para cada local CANCELADO:
//   - 15 días antes del borrado manda el mail de aviso (kind 'delete_warning');
//   - el día del borrado (con el aviso ya enviado hace 14+ días) ELIMINARÍA los datos.
//
// Por ahora el borrado NO está implementado: solo anota en el log "se borraría <restaurant.id>". Los avisos
// por mail sí se mandan (son lo que hay que tener enviado antes de borrar). Las reglas están en
// lib/retentionPlan.ts. Los logs llevan solo códigos cortos y restaurant.id.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/send';
import { sendDeleteWarning, emailLogDeleteWarningDb } from '@/lib/email/deleteWarningRun';
import { planRetention } from '@/lib/retentionPlan';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const { data: rows, error } = await supabase
    .from('restaurants')
    .select('id, name, owner_email, subscription_status, grace_period_until')
    .eq('subscription_status', 'cancelled')
    .not('grace_period_until', 'is', null)
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
  const summary = { cancelled: restaurants.length, warned: 0, warn_failed: 0, would_delete: 0, waiting: 0 };

  for (const a of actions) {
    const r = byId.get(a.id)!;
    if (a.kind === 'wait') { summary.waiting++; continue; }

    if (a.kind === 'warn') {
      const res = await sendDeleteWarning({
        db: emailLogDeleteWarningDb(supabase),
        send: (msg) => sendEmail(msg),
        restaurant: { id: r.id, owner_email: r.owner_email, name: r.name },
        deleteOn: a.deleteOn,
      });
      if (res.outcome === 'sent') summary.warned++; else if (res.outcome !== 'duplicate') summary.warn_failed++;
      continue;
    }

    // a.kind === 'delete': todavía no se borra nada
    console.log(`[cron/data-retention] DRY_RUN would_delete restaurant=${r.id}`);
    summary.would_delete++;
  }

  console.log('[cron/data-retention] Resumen:', summary);
  return NextResponse.json({ success: true, dryRun: true, ...summary });
}
