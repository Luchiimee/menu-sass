// Envío del mail de agradecimiento con la base y el envío inyectados (se prueba sin red:
// scripts/check-thanks-run.mjs). Lo llama save-card DESPUÉS de guardar la tarjeta.
//
// Garantías (el cobro y la respuesta de save-card no pueden depender de este mail):
//   - sendThanks NUNCA lanza: todo error se captura y se devuelve como resultado.
//   - espera como máximo `maxMs` (por defecto 4 s): si se pasa, devuelve 'timeout' y el resto
//     sigue en segundo plano sin poder fallar.
//   - los logs llevan un código corto y restaurant.id: nunca email, nombre ni datos de tarjeta.
//   - el resultado no trae datos personales.
//   - NO consulta email_unsubscribes: es un mail de servicio.
//
// Orden: (a) reservar en email_log (kind 'thanks', 'thanks:<restaurant_id>', 'pending'; si el unique
// lo rechaza no se envía), (b) enviar, (c) marcar 'sent' o 'failed' con un código corto.
// Un 'pending' o 'failed' NO se reintenta solo (el unique lo bloquea): se revisa a mano.

import { thanksEmail, type ThanksMode } from './thanks.ts';

export const THANKS_MAX_WAIT_MS = 4000;

export const thanksDedupeKey = (restaurantId: string) => `thanks:${restaurantId}`;

export type ThanksReservation = 'reserved' | 'duplicate' | 'error';

export type ThanksDb = {
  reserve(row: { kind: 'thanks'; dedupe_key: string; restaurant_id: string; to_email: string }): Promise<ThanksReservation>;
  markSent(dedupeKeyValue: string, providerId: string | null): Promise<void>;
  markFailed(dedupeKeyValue: string, error: string): Promise<void>;
};

export type ThanksSendFn = (msg: { to: string; subject: string; html: string; text: string }) =>
  Promise<{ ok: true; id: string | null } | { ok: false; error: string }>;

export type ThanksRestaurant = { id: string; owner_email: string | null; name: string | null };

export type ThanksOutcome = 'sent' | 'failed' | 'duplicate' | 'reserve_error' | 'no_email' | 'timeout' | 'error';

// Sin datos personales: solo qué pasó y, si corresponde, un código corto.
export type ThanksResult = { outcome: ThanksOutcome; code?: string };

export type SendThanksOptions = {
  db: ThanksDb;
  send: ThanksSendFn;
  restaurant: ThanksRestaurant;
  mode: ThanksMode;
  plan?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  firstChargeDate?: Date | null;
  maxMs?: number;
  log?: (line: string) => void;
};

async function run(o: SendThanksOptions): Promise<ThanksResult> {
  const { db, send, restaurant, mode } = o;
  const to = (restaurant.owner_email ?? '').trim();
  if (!to) return { outcome: 'no_email', code: 'THANKS_NO_EMAIL' };

  // Armar el mail primero: si la plantilla falla no queda una reserva 'pending' colgada.
  let msg: { subject: string; html: string; text: string };
  try {
    msg = thanksEmail({
      mode, name: restaurant.name, plan: o.plan, cardBrand: o.cardBrand, cardLast4: o.cardLast4,
      firstChargeDate: o.firstChargeDate,
    });
  } catch {
    return { outcome: 'error', code: 'THANKS_RENDER_ERROR' };
  }

  // a) reservar: el unique (kind, dedupe_key) evita un segundo gracias al mismo local
  const key = thanksDedupeKey(restaurant.id);
  let reservation: ThanksReservation;
  try {
    reservation = await db.reserve({ kind: 'thanks', dedupe_key: key, restaurant_id: restaurant.id, to_email: to });
  } catch {
    return { outcome: 'reserve_error', code: 'THANKS_RESERVE_ERROR' };
  }
  if (reservation === 'duplicate') return { outcome: 'duplicate' };
  if (reservation !== 'reserved') return { outcome: 'reserve_error', code: 'THANKS_RESERVE_ERROR' };

  // b) enviar
  let sent: Awaited<ReturnType<ThanksSendFn>>;
  try {
    sent = await send({ to, ...msg });
  } catch {
    sent = { ok: false, error: 'send_exception' };
  }

  // c) registrar el resultado (si registrar falla, el mail igual ya salió o falló: no se propaga)
  try {
    if (sent.ok) {
      await db.markSent(key, sent.id);
      return { outcome: 'sent' };
    }
    await db.markFailed(key, sent.error);
    return { outcome: 'failed', code: 'THANKS_SEND_FAILED' };
  } catch {
    return sent.ok
      ? { outcome: 'sent', code: 'THANKS_MARK_ERROR' }
      : { outcome: 'failed', code: 'THANKS_MARK_ERROR' };
  }
}

export async function sendThanks(o: SendThanksOptions): Promise<ThanksResult> {
  const maxMs = o.maxMs ?? THANKS_MAX_WAIT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const work: Promise<ThanksResult> = run(o).catch(() => ({ outcome: 'error' as const, code: 'THANKS_UNEXPECTED' }));
  const timeout = new Promise<ThanksResult>((resolve) => {
    timer = setTimeout(() => resolve({ outcome: 'timeout', code: 'THANKS_TIMEOUT' }), maxMs);
  });

  const result = await Promise.race([work, timeout]);
  if (timer) clearTimeout(timer);

  if (result.code) {
    try {
      (o.log ?? console.error)(`[thanks] code=${result.code} restaurant=${o.restaurant.id}`);
    } catch {
      // un log que falla no puede romper nada
    }
  }
  return result;
}

// Adaptador de email_log para un cliente de Supabase (service_role). Tipo mínimo para no importar nada.
export function emailLogThanksDb(client: { from: (table: string) => any }): ThanksDb {
  return {
    async reserve(row) {
      const { error } = await client.from('email_log').insert({ ...row, status: 'pending' });
      if (!error) return 'reserved';
      return error.code === '23505' ? 'duplicate' : 'error';
    },
    async markSent(key, providerId) {
      await client.from('email_log')
        .update({ status: 'sent', provider_id: providerId, sent_at: new Date().toISOString() })
        .eq('kind', 'thanks').eq('dedupe_key', key);
    },
    async markFailed(key, error) {
      await client.from('email_log').update({ status: 'failed', error }).eq('kind', 'thanks').eq('dedupe_key', key);
    },
  };
}
