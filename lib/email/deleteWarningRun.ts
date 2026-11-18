// Envío del aviso de borrado de datos (15 días antes) con la base y el envío inyectados (se prueba sin red:
// scripts/check-retention-plan.mjs). Lo llama el cron de retención (app/api/cron/data-retention).
//
// Mismas garantías que thanksRun: nunca lanza, espera como máximo `maxMs`, los logs llevan solo un código
// corto y restaurant.id, y NO consulta email_unsubscribes (es un mail de servicio). El cron no puede
// depender de este mail.
//
// Orden: (a) reservar en email_log (kind 'delete_warning', 'delete_warning:<restaurant_id>:<día del borrado>',
// 'pending'; el unique evita repetirlo para el mismo día de borrado; una cancelación posterior, con otro día de
// borrado, sí manda el suyo), (b) enviar, (c) marcar 'sent' o 'failed'. Un 'pending' o 'failed' no se reintenta solo.

import { deleteWarningEmail } from './deleteWarning.ts';
import { diaArg } from './dates.ts';

export const DELETE_WARNING_MAX_WAIT_MS = 4000;

export const deleteWarningDedupeKey = (restaurantId: string, deleteOn: Date) =>
  `delete_warning:${restaurantId}:${diaArg(deleteOn)}`;

export type DeleteWarningReservation = 'reserved' | 'duplicate' | 'error';

export type DeleteWarningDb = {
  reserve(row: { kind: 'delete_warning'; dedupe_key: string; restaurant_id: string; to_email: string }): Promise<DeleteWarningReservation>;
  markSent(dedupeKeyValue: string, providerId: string | null): Promise<void>;
  markFailed(dedupeKeyValue: string, error: string): Promise<void>;
};

export type DeleteWarningSendFn = (msg: { to: string; subject: string; html: string; text: string }) =>
  Promise<{ ok: true; id: string | null } | { ok: false; error: string }>;

export type DeleteWarningOutcome = 'sent' | 'failed' | 'duplicate' | 'reserve_error' | 'no_email' | 'timeout' | 'error';
export type DeleteWarningResult = { outcome: DeleteWarningOutcome; code?: string };

export type SendDeleteWarningOptions = {
  db: DeleteWarningDb;
  send: DeleteWarningSendFn;
  restaurant: { id: string; owner_email: string | null; name: string | null };
  deleteOn: Date;
  maxMs?: number;
  log?: (line: string) => void;
};

async function run(o: SendDeleteWarningOptions): Promise<DeleteWarningResult> {
  const { db, send, restaurant } = o;
  const to = (restaurant.owner_email ?? '').trim();
  if (!to) return { outcome: 'no_email', code: 'DELETE_WARNING_NO_EMAIL' };

  let msg: { subject: string; html: string; text: string };
  try {
    msg = deleteWarningEmail({ name: restaurant.name, deleteOn: o.deleteOn });
  } catch {
    return { outcome: 'error', code: 'DELETE_WARNING_RENDER_ERROR' };
  }

  const key = deleteWarningDedupeKey(restaurant.id, o.deleteOn);
  let reservation: DeleteWarningReservation;
  try {
    reservation = await db.reserve({ kind: 'delete_warning', dedupe_key: key, restaurant_id: restaurant.id, to_email: to });
  } catch {
    return { outcome: 'reserve_error', code: 'DELETE_WARNING_RESERVE_ERROR' };
  }
  if (reservation === 'duplicate') return { outcome: 'duplicate' };
  if (reservation !== 'reserved') return { outcome: 'reserve_error', code: 'DELETE_WARNING_RESERVE_ERROR' };

  let sent: Awaited<ReturnType<DeleteWarningSendFn>>;
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
    return { outcome: 'failed', code: 'DELETE_WARNING_SEND_FAILED' };
  } catch {
    return sent.ok
      ? { outcome: 'sent', code: 'DELETE_WARNING_MARK_ERROR' }
      : { outcome: 'failed', code: 'DELETE_WARNING_MARK_ERROR' };
  }
}

export async function sendDeleteWarning(o: SendDeleteWarningOptions): Promise<DeleteWarningResult> {
  const maxMs = o.maxMs ?? DELETE_WARNING_MAX_WAIT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const work: Promise<DeleteWarningResult> = run(o).catch(() => ({ outcome: 'error' as const, code: 'DELETE_WARNING_UNEXPECTED' }));
  const timeout = new Promise<DeleteWarningResult>((resolve) => {
    timer = setTimeout(() => resolve({ outcome: 'timeout', code: 'DELETE_WARNING_TIMEOUT' }), maxMs);
  });

  const result = await Promise.race([work, timeout]);
  if (timer) clearTimeout(timer);

  if (result.code) {
    try {
      (o.log ?? console.error)(`[delete-warning] code=${result.code} restaurant=${o.restaurant.id}`);
    } catch {
      // un log que falla no puede romper nada
    }
  }
  return result;
}

// Adaptador de email_log para un cliente de Supabase (service_role).
export function emailLogDeleteWarningDb(client: { from: (table: string) => any }): DeleteWarningDb {
  return {
    async reserve(row) {
      const { error } = await client.from('email_log').insert({ ...row, status: 'pending' });
      if (!error) return 'reserved';
      return error.code === '23505' ? 'duplicate' : 'error';
    },
    async markSent(key, providerId) {
      await client.from('email_log')
        .update({ status: 'sent', provider_id: providerId, sent_at: new Date().toISOString() })
        .eq('kind', 'delete_warning').eq('dedupe_key', key);
    },
    async markFailed(key, error) {
      await client.from('email_log').update({ status: 'failed', error }).eq('kind', 'delete_warning').eq('dedupe_key', key);
    },
  };
}
