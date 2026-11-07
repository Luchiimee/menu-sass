// Corrida de los mails de ciclo de vida: junta candidatos, los reserva en email_log y los manda.
// La base y el envío entran por parámetro (LifecycleDb, send) para probarla sin red ni base:
// scripts/check-lifecycle-run.mjs. El cron (app/api/cron/lifecycle-emails) solo conecta las piezas reales.
//
// Orden por cada candidato (un fallo en uno no corta a los demás):
//   a) releer el local y volver a aplicar el filtro (pudo cargar la tarjeta desde la selección);
//   a') solo el mail B (trial_followup): omitirlo si el email está en email_unsubscribes o si falta
//       EMAIL_UNSUB_SECRET (sin secreto no hay link de baja válido: se omiten TODOS los B). Los
//       mails A (trial_ending) no consultan la lista;
//   b) insertar en email_log con status 'pending': el unique (kind, dedupe_key) evita duplicados;
//   c) mandar el mail;
//   d) marcar 'sent' o 'failed' con un código de error corto.
// Un mail 'failed' o 'pending' trabado NO se reintenta solo (el unique lo bloquea): se revisa a mano.

import {
  dedupeKey, selectTrialEnding, selectTrialFollowup, trialEndingEmail, trialFollowupEmail, trialLastDay,
  type EmailKind, type LifecycleEmail, type LifecycleRestaurant,
} from './lifecycle.ts';
import { unsubscribeUrl, unsubscribeApiUrl } from './unsubscribe.ts';

export const MAX_SENDS_PER_RUN = 50;

export type Reservation = 'reserved' | 'duplicate' | 'error';

export type LifecycleDb = {
  listCandidates(now: Date): Promise<LifecycleRestaurant[]>;
  getRestaurant(id: string): Promise<LifecycleRestaurant | null>;
  // dedupe_keys que ya están en email_log (solo lectura)
  loggedKeys(keys: string[]): Promise<Set<string>>;
  // de estos emails (en minúsculas), los que están dados de baja en email_unsubscribes (solo lectura)
  unsubscribed(emailsLower: string[]): Promise<Set<string>>;
  reserve(row: { kind: EmailKind; dedupe_key: string; restaurant_id: string; to_email: string }): Promise<Reservation>;
  markSent(kind: EmailKind, dedupeKeyValue: string, providerId: string | null): Promise<void>;
  markFailed(kind: EmailKind, dedupeKeyValue: string, error: string): Promise<void>;
};

export type SendFn = (msg: { to: string; subject: string; html: string; text: string; headers?: Record<string, string> }) =>
  Promise<{ ok: true; id: string | null } | { ok: false; error: string }>;

export type Candidate = { kind: EmailKind; restaurant_id: string; email: string };

// Mail B que no se manda, y por qué. Solo se lista en dry=1 (con el email enmascarado).
export type Omitted = { kind: EmailKind; restaurant_id: string; email: string; reason: 'unsubscribed' | 'no_secret' };

export type RunResult = {
  dry: boolean;
  candidates: Candidate[];
  omitted: Omitted[];
  sent: number;
  failed: number;
  skipped: {
    already_logged: number; changed: number; duplicate: number; over_limit: number; reserve_error: number;
    unsubscribed: number; no_secret: number; no_link: number;
  };
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

const lower = (email: string) => email.trim().toLowerCase();

function render(kind: EmailKind, r: LifecycleRestaurant, links?: { page: string; api: string }): LifecycleEmail {
  return kind === 'trial_ending'
    ? trialEndingEmail({ name: r.name, lastDay: trialLastDay(r.created_at as string) })
    : trialFollowupEmail({ name: r.name, unsubscribeUrl: links?.page, unsubscribeApiUrl: links?.api });
}

export async function runLifecycleEmails(opts: {
  db: LifecycleDb;
  send: SendFn;
  now: Date;
  adminEmails: string[];
  dry: boolean;
  limit?: number;
  // EMAIL_UNSUB_SECRET: firma los links de baja del mail B. Sin secreto no se manda ningún B.
  unsubSecret?: string | null;
}): Promise<RunResult> {
  const { db, send, now, adminEmails, dry } = opts;
  const limit = opts.limit ?? MAX_SENDS_PER_RUN;
  const secret = typeof opts.unsubSecret === 'string' && opts.unsubSecret.trim() !== '' ? opts.unsubSecret : null;
  const result: RunResult = {
    dry, candidates: [], omitted: [], sent: 0, failed: 0,
    skipped: {
      already_logged: 0, changed: 0, duplicate: 0, over_limit: 0, reserve_error: 0,
      unsubscribed: 0, no_secret: 0, no_link: 0,
    },
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

  // Sin secreto no hay link de baja válido: ningún B sale. Código corto, sin datos personales.
  const followups = pending.filter((p) => p.kind === 'trial_followup');
  if (!secret && followups.length > 0) {
    console.error(`[lifecycle-emails] code=UNSUB_SECRET_MISSING omitidos=${followups.length}`);
  }

  if (dry) {
    const unsubscribed = secret && followups.length > 0
      ? await db.unsubscribed(followups.map((p) => lower(p.r.owner_email as string)))
      : new Set<string>();
    const sendable = pending.filter((p) => {
      if (p.kind !== 'trial_followup') return true;
      const masked = maskEmail(p.r.owner_email as string);
      if (!secret) { result.omitted.push({ kind: p.kind, restaurant_id: p.r.id, email: masked, reason: 'no_secret' }); return false; }
      if (unsubscribed.has(lower(p.r.owner_email as string))) {
        result.omitted.push({ kind: p.kind, restaurant_id: p.r.id, email: masked, reason: 'unsubscribed' });
        return false;
      }
      return true;
    });
    result.candidates = sendable.slice(0, limit).map((p) => ({
      kind: p.kind, restaurant_id: p.r.id, email: maskEmail(p.r.owner_email as string),
    }));
    result.skipped.over_limit = Math.max(0, sendable.length - limit);
    return result;
  }

  let attempts = 0;
  for (const { kind, r } of pending) {
    if (attempts >= limit) { result.skipped.over_limit++; continue; }
    if (kind === 'trial_followup' && !secret) { result.skipped.no_secret++; continue; }
    try {
      // a) releer y volver a filtrar
      const fresh = await db.getRestaurant(r.id);
      if (!fresh || SELECTORS[kind]([fresh], now, adminEmails).length !== 1) { result.skipped.changed++; continue; }

      const key = dedupeKey(kind, fresh.id);
      const to = (fresh.owner_email as string).trim();

      // a') mail B: dado de baja → se omite, antes de reservar y de enviar. Si la consulta falla,
      // la excepción corta SOLO este local (no se manda): ante la duda, no se envía.
      let links: { page: string; api: string } | undefined;
      if (kind === 'trial_followup') {
        if ((await db.unsubscribed([lower(to)])).has(lower(to))) { result.skipped.unsubscribed++; continue; }
        const page = unsubscribeUrl(to, secret);
        const api = unsubscribeApiUrl(to, secret);
        if (!page || !api) { result.skipped.no_link++; continue; }
        links = { page, api };
      }

      // b) reservar (el unique evita duplicados)
      const reservation = await db.reserve({ kind, dedupe_key: key, restaurant_id: fresh.id, to_email: to });
      if (reservation === 'duplicate') { result.skipped.duplicate++; continue; }
      if (reservation === 'error') { result.skipped.reserve_error++; continue; }
      attempts++;
      result.candidates.push({ kind, restaurant_id: fresh.id, email: maskEmail(to) });

      // c) enviar
      const sent = await send({ to, ...render(kind, fresh, links) });

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
