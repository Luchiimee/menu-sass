// Corrida de los mails de ciclo de vida: junta candidatos, los reserva en email_log y los manda.
// La base y el envío entran por parámetro (LifecycleDb, send) para probarla sin red ni base:
// scripts/check-lifecycle-run.mjs. El cron (app/api/cron/lifecycle-emails) solo conecta las piezas reales.
//
// Orden por cada candidato (un fallo en uno no corta a los demás):
//   a) releer el local y volver a aplicar el filtro (pudo cargar la tarjeta desde la selección);
//   b) insertar en email_log con status 'pending': el unique (kind, dedupe_key) evita duplicados;
//   c) mandar el mail;
//   d) marcar 'sent' o 'failed' con un código de error corto.
// Un mail 'failed' o 'pending' trabado NO se reintenta solo (el unique lo bloquea): se revisa a mano.

import {
  dedupeKey, selectTrialEnding, selectTrialFollowup, trialEndingEmail, trialFollowupEmail, trialLastDay,
  type EmailKind, type LifecycleEmail, type LifecycleRestaurant,
} from './lifecycle.ts';

export const MAX_SENDS_PER_RUN = 50;

export type Reservation = 'reserved' | 'duplicate' | 'error';

export type LifecycleDb = {
  listCandidates(now: Date): Promise<LifecycleRestaurant[]>;
  getRestaurant(id: string): Promise<LifecycleRestaurant | null>;
  // dedupe_keys que ya están en email_log (solo lectura)
  loggedKeys(keys: string[]): Promise<Set<string>>;
  reserve(row: { kind: EmailKind; dedupe_key: string; restaurant_id: string; to_email: string }): Promise<Reservation>;
  markSent(kind: EmailKind, dedupeKeyValue: string, providerId: string | null): Promise<void>;
  markFailed(kind: EmailKind, dedupeKeyValue: string, error: string): Promise<void>;
};

export type SendFn = (msg: { to: string; subject: string; html: string; text: string }) =>
  Promise<{ ok: true; id: string | null } | { ok: false; error: string }>;

export type Candidate = { kind: EmailKind; restaurant_id: string; email: string };

export type RunResult = {
  dry: boolean;
  candidates: Candidate[];
  sent: number;
  failed: number;
  skipped: { already_logged: number; changed: number; duplicate: number; over_limit: number; reserve_error: number };
};

// a***@gmail.com
export function maskEmail(email: string): string {
  const [user, domain] = email.trim().split('@');
  if (!user || !domain) return '***';
  return `${user[0]}***@${domain}`;
}

const SELECTORS: Record<EmailKind, typeof selectTrialEnding> = {
  trial_ending: selectTrialEnding,
  trial_followup: selectTrialFollowup,
};

function render(kind: EmailKind, r: LifecycleRestaurant): LifecycleEmail {
  return kind === 'trial_ending'
    ? trialEndingEmail({ name: r.name, lastDay: trialLastDay(r.created_at as string) })
    : trialFollowupEmail({ name: r.name });
}

export async function runLifecycleEmails(opts: {
  db: LifecycleDb;
  send: SendFn;
  now: Date;
  adminEmails: string[];
  dry: boolean;
  limit?: number;
}): Promise<RunResult> {
  const { db, send, now, adminEmails, dry } = opts;
  const limit = opts.limit ?? MAX_SENDS_PER_RUN;
  const result: RunResult = {
    dry, candidates: [], sent: 0, failed: 0,
    skipped: { already_logged: 0, changed: 0, duplicate: 0, over_limit: 0, reserve_error: 0 },
  };

  const rows = await db.listCandidates(now);
  const picked: { kind: EmailKind; r: LifecycleRestaurant }[] = [];
  for (const kind of ['trial_ending', 'trial_followup'] as EmailKind[]) {
    for (const r of SELECTORS[kind](rows, now, adminEmails)) picked.push({ kind, r });
  }

  const logged = await db.loggedKeys(picked.map((p) => dedupeKey(p.kind, p.r.id)));
  const pending = picked.filter((p) => {
    if (logged.has(dedupeKey(p.kind, p.r.id))) { result.skipped.already_logged++; return false; }
    return true;
  });

  if (dry) {
    result.candidates = pending.slice(0, limit).map((p) => ({
      kind: p.kind, restaurant_id: p.r.id, email: maskEmail(p.r.owner_email as string),
    }));
    result.skipped.over_limit = Math.max(0, pending.length - limit);
    return result;
  }

  let attempts = 0;
  for (const { kind, r } of pending) {
    if (attempts >= limit) { result.skipped.over_limit++; continue; }
    try {
      // a) releer y volver a filtrar
      const fresh = await db.getRestaurant(r.id);
      if (!fresh || SELECTORS[kind]([fresh], now, adminEmails).length !== 1) { result.skipped.changed++; continue; }

      const key = dedupeKey(kind, fresh.id);
      const to = (fresh.owner_email as string).trim();

      // b) reservar (el unique evita duplicados)
      const reservation = await db.reserve({ kind, dedupe_key: key, restaurant_id: fresh.id, to_email: to });
      if (reservation === 'duplicate') { result.skipped.duplicate++; continue; }
      if (reservation === 'error') { result.skipped.reserve_error++; continue; }
      attempts++;
      result.candidates.push({ kind, restaurant_id: fresh.id, email: maskEmail(to) });

      // c) enviar
      const sent = await send({ to, ...render(kind, fresh) });

      // d) registrar el resultado
      if (sent.ok) { await db.markSent(kind, key, sent.id); result.sent++; }
      else { await db.markFailed(kind, key, sent.error); result.failed++; }
    } catch {
      // un local que falla no corta a los demás; no se loguea el detalle (puede traer datos)
      result.failed++;
      console.error(`[lifecycle-emails] fallo en un local (kind=${kind}, id=${r.id})`);
    }
  }
  return result;
}
