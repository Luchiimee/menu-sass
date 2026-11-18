// Envío del mail de cancelación con la base y el envío inyectados (se prueba sin red:
// scripts/check-cancel-notice-run.mjs). Lo llama cancelSubscriptionForUser DESPUÉS de cancelar.
//
// Mismas garantías que thanksRun: nunca lanza, espera como máximo `maxMs`, los logs llevan solo un código
// corto y restaurant.id, y NO consulta email_unsubscribes (es un mail de servicio). La cancelación no puede
// depender de este mail.
//
// Orden: (a) reservar en email_log (kind 'cancel_notice', 'cancel_notice:<restaurant_id>:<día del borrado>',
// 'pending'; el unique evita repetirlo para la misma cancelación, y una cancelación posterior, con otro día de
// borrado, sí manda el suyo), (b) enviar, (c) marcar 'sent' o 'failed'. Un 'pending' o 'failed' no se reintenta solo.

import { cancelNoticeEmail } from './cancelNotice.ts';
import { diaArg } from './dates.ts';

export const CANCEL_NOTICE_MAX_WAIT_MS = 4000;

export const cancelNoticeDedupeKey = (restaurantId: string, deleteOn: Date) =>
  `cancel_notice:${restaurantId}:${diaArg(deleteOn)}`;

export type CancelNoticeReservation = 'reserved' | 'duplicate' | 'error';

export type CancelNoticeDb = {
  reserve(row: { kind: 'cancel_notice'; dedupe_key: string; restaurant_id: string; to_email: string }): Promise<CancelNoticeReservation>;
  markSent(dedupeKeyValue: string, providerId: string | null): Promise<void>;
  markFailed(dedupeKeyValue: string, error: string): Promise<void>;
};

export type CancelNoticeSendFn = (msg: { to: string; subject: string; html: string; text: string }) =>
  Promise<{ ok: true; id: string | null } | { ok: false; error: string }>;

export type CancelNoticeOutcome = 'sent' | 'failed' | 'duplicate' | 'reserve_error' | 'no_email' | 'timeout' | 'error';
export type CancelNoticeResult = { outcome: CancelNoticeOutcome; code?: string };

export type SendCancelNoticeOptions = {
  db: CancelNoticeDb;
  send: CancelNoticeSendFn;
  restaurant: { id: string; owner_email: string | null; name: string | null };
  serviceUntil: Date | null;
  deleteOn: Date;
  maxMs?: number;
  log?: (line: string) => void;
};

async function run(o: SendCancelNoticeOptions): Promise<CancelNoticeResult> {
  const { db, send, restaurant } = o;
  const to = (restaurant.owner_email ?? '').trim();
  if (!to) return { outcome: 'no_email', code: 'CANCEL_NOTICE_NO_EMAIL' };

  let msg: { subject: string; html: string; text: string };
  try {
    msg = cancelNoticeEmail({ name: restaurant.name, serviceUntil: o.serviceUntil, deleteOn: o.deleteOn });
  } catch {
    return { outcome: 'error', code: 'CANCEL_NOTICE_RENDER_ERROR' };
  }

  const key = cancelNoticeDedupeKey(restaurant.id, o.deleteOn);
  let reservation: CancelNoticeReservation;
  try {
    reservation = await db.reserve({ kind: 'cancel_notice', dedupe_key: key, restaurant_id: restaurant.id, to_email: to });
  } catch {
    return { outcome: 'reserve_error', code: 'CANCEL_NOTICE_RESERVE_ERROR' };
  }
  if (reservation === 'duplicate') return { outcome: 'duplicate' };
  if (reservation !== 'reserved') return { outcome: 'reserve_error', code: 'CANCEL_NOTICE_RESERVE_ERROR' };

  let sent: Awaited<ReturnType<CancelNoticeSendFn>>;
  try {
    sent = await send({ to, ...msg });
  } catch {
    sent = { ok: false, error: 'send_exception' };
  }

  try {
    if (sent.ok) {
      await db.markSent(key, sent.id);
      return { outcome: 'sent' };
    }
    await db.markFailed(key, sent.error);
    return { outcome: 'failed', code: 'CANCEL_NOTICE_SEND_FAILED' };
  } catch {
    return sent.ok
      ? { outcome: 'sent', code: 'CANCEL_NOTICE_MARK_ERROR' }
      : { outcome: 'failed', code: 'CANCEL_NOTICE_MARK_ERROR' };
  }
}

export async function sendCancelNotice(o: SendCancelNoticeOptions): Promise<CancelNoticeResult> {
  const maxMs = o.maxMs ?? CANCEL_NOTICE_MAX_WAIT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const work: Promise<CancelNoticeResult> = run(o).catch(() => ({ outcome: 'error' as const, code: 'CANCEL_NOTICE_UNEXPECTED' }));
  const timeout = new Promise<CancelNoticeResult>((resolve) => {
    timer = setTimeout(() => resolve({ outcome: 'timeout', code: 'CANCEL_NOTICE_TIMEOUT' }), maxMs);
  });

  const result = await Promise.race([work, timeout]);
  if (timer) clearTimeout(timer);

  if (result.code) {
    try {
      (o.log ?? console.error)(`[cancel-notice] code=${result.code} restaurant=${o.restaurant.id}`);
    } catch {
      // un log que falla no puede romper nada
    }
  }
  return result;
}

// Adaptador de email_log para un cliente de Supabase (service_role).
export function emailLogCancelNoticeDb(client: { from: (table: string) => any }): CancelNoticeDb {
  return {
    async reserve(row) {
      const { error } = await client.from('email_log').insert({ ...row, status: 'pending' });
      if (!error) return 'reserved';
      return error.code === '23505' ? 'duplicate' : 'error';
    },
    async markSent(key, providerId) {
      await client.from('email_log')
        .update({ status: 'sent', provider_id: providerId, sent_at: new Date().toISOString() })
        .eq('kind', 'cancel_notice').eq('dedupe_key', key);
    },
    async markFailed(key, error) {
      await client.from('email_log').update({ status: 'failed', error }).eq('kind', 'cancel_notice').eq('dedupe_key', key);
    },
  };
}
