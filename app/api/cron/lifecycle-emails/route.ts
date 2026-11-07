import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAILS } from '@/lib/access';
import { sendEmail } from '@/lib/email/send';
import { runLifecycleEmails, type LifecycleDb } from '@/lib/email/lifecycleRun';
import type { LifecycleRestaurant } from '@/lib/email/lifecycle';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FIELDS = 'id, name, owner_email, created_at, subscription_status, mp_card_id, mp_preapproval_id, trial_ends_at, grace_period_until';
// Ventana más larga (día 30) más margen: no hace falta leer locales más viejos.
const LOOKBACK_DAYS = 32;

const db: LifecycleDb = {
  async listCandidates(now) {
    const since = new Date(now.getTime() - LOOKBACK_DAYS * 86400000).toISOString();
    const { data, error } = await supabase.from('restaurants').select(FIELDS).gte('created_at', since).limit(2000);
    if (error) throw new Error('restaurants_query_failed');
    return (data ?? []) as LifecycleRestaurant[];
  },
  async getRestaurant(id) {
    const { data, error } = await supabase.from('restaurants').select(FIELDS).eq('id', id).maybeSingle();
    if (error) throw new Error('restaurant_reread_failed');
    return (data as LifecycleRestaurant | null) ?? null;
  },
  async loggedKeys(keys) {
    if (keys.length === 0) return new Set();
    const { data, error } = await supabase.from('email_log').select('dedupe_key').in('dedupe_key', keys);
    if (error) throw new Error('email_log_query_failed');
    return new Set((data ?? []).map((r: { dedupe_key: string }) => r.dedupe_key));
  },
  async unsubscribed(emailsLower) {
    if (emailsLower.length === 0) return new Set();
    const { data, error } = await supabase.from('email_unsubscribes').select('email_lower').in('email_lower', emailsLower);
    if (error) throw new Error('email_unsubscribes_query_failed');
    return new Set((data ?? []).map((r: { email_lower: string }) => r.email_lower));
  },
  async reserve(row) {
    const { error } = await supabase.from('email_log').insert({ ...row, status: 'pending' });
    if (!error) return 'reserved';
    return error.code === '23505' ? 'duplicate' : 'error';
  },
  async markSent(kind, key, providerId) {
    await supabase.from('email_log')
      .update({ status: 'sent', provider_id: providerId, sent_at: new Date().toISOString() })
      .eq('kind', kind).eq('dedupe_key', key);
  },
  async markFailed(kind, key, error) {
    await supabase.from('email_log').update({ status: 'failed', error }).eq('kind', kind).eq('dedupe_key', key);
  },
};

// Vercel Cron (vercel.json, 11:00 UTC). ?dry=1 solo informa a quién se mandaría: no envía ni escribe.
export async function GET(request: Request) {
  // Falla cerrado: sin CRON_SECRET configurado nadie entra.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dry = new URL(request.url).searchParams.get('dry') === '1';

  try {
    const result = await runLifecycleEmails({
      db, send: sendEmail, now: new Date(), adminEmails: ADMIN_EMAILS, dry,
      unsubSecret: process.env.EMAIL_UNSUB_SECRET, // sin definir: no sale ningún mail B
    });
    console.log(`[cron/lifecycle-emails] dry=${dry} enviados=${result.sent} fallidos=${result.failed} candidatos=${result.candidates.length}`);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[cron/lifecycle-emails] error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
