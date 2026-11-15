// Indicador "OAuth en curso" (snappy_oauth_pending = timestamp en ms) para volver a la app instalada en Android.
// Lógica pura, sin imports con alias (se prueba con scripts/check-oauth-pending.mjs).
//
// Problema: en una PWA instalada (WebAPK) en Android, "Continuar con Google" abre accounts.google.com en una pestaña
// personalizada de Chrome y, al volver por /auth/callback, el panel queda DENTRO de esa pestaña (barra con X) en vez
// de la app. La app instalada queda debajo, todavía en /login o /register. Solución parcial: /login y /register
// marcan el indicador antes del OAuth y, cuando la app vuelve a estar visible o recibe el foco (el usuario tocó la X),
// si el indicador es reciente (menos de 10 minutos) y ya hay usuario, entran solas al panel.
//
// El almacenamiento de la pestaña personalizada y el de la app comparten perfil en Android (supuesto no verificado).
// Por eso el callback y /registro-ok solo limpian el indicador cuando corren en modo standalone (el flujo terminó
// dentro de la app): si corren en la pestaña personalizada NO lo limpian, o la app no lo vería al volver. En un
// navegador común el indicador queda hasta vencer (10 minutos) o hasta que /login o /register lo consuman: no hace
// daño, solo hace que esas dos páginas, con sesión iniciada, pasen al panel.

export const OAUTH_PENDING_KEY = 'snappy_oauth_pending';
export const OAUTH_PENDING_MAX_AGE_MS = 10 * 60_000;
const FUTURE_TOLERANCE_MS = 5_000;

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

// localStorage puede lanzar al leerse (modo privado estricto, cookies bloqueadas): se devuelve null
export function getStorage(win: { localStorage?: StorageLike } | undefined | null): StorageLike | null {
  try {
    return win?.localStorage ?? null;
  } catch {
    return null;
  }
}

export function markOAuthPending(storage: StorageLike | null, nowMs: number): void {
  try {
    storage?.setItem(OAUTH_PENDING_KEY, String(nowMs));
  } catch {
    // sin almacenamiento: no hay forma de volver sola a la app, el resto del flujo sigue igual
  }
}

export function clearOAuthPending(storage: StorageLike | null): void {
  try {
    storage?.removeItem(OAUTH_PENDING_KEY);
  } catch {
    // nada
  }
}

// ¿Hay un indicador reciente (menos de 10 minutos)? Si está vencido o no es un número válido, se borra.
export function isOAuthPending(storage: StorageLike | null, nowMs: number): boolean {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(OAUTH_PENDING_KEY) ?? null;
  } catch {
    return false;
  }
  if (raw === null) return false;
  const t = Number(raw);
  const age = nowMs - t;
  if (!Number.isFinite(t) || age < -FUTURE_TOLERANCE_MS || age >= OAUTH_PENDING_MAX_AGE_MS) {
    clearOAuthPending(storage);
    return false;
  }
  return true;
}

type WinLike = {
  matchMedia?: (q: string) => { matches: boolean };
  navigator?: unknown;
  localStorage?: StorageLike;
};

export function isStandaloneDisplay(win: WinLike | undefined | null): boolean {
  try {
    return !!win && (win.matchMedia?.('(display-mode: standalone)').matches === true || (win.navigator as { standalone?: boolean } | undefined)?.standalone === true);
  } catch {
    return false;
  }
}

// Limpieza al terminar el flujo (callback y /registro-ok): solo en modo standalone (ver arriba)
export function clearOAuthPendingIfStandalone(win: WinLike | undefined | null): void {
  if (isStandaloneDisplay(win)) clearOAuthPending(getStorage(win));
}

type Listenable = {
  addEventListener(type: string, fn: () => void): void;
  removeEventListener(type: string, fn: () => void): void;
};

// Escucha visibilitychange (en document) y focus (en window). Si hay un indicador reciente y getUser confirma un
// usuario, limpia el indicador y llama a onResume. Sin usuario no limpia: puede que el usuario siga en Google.
// Un solo chequeo a la vez (visibilitychange y focus suelen llegar juntos). Devuelve la función que desuscribe.
export function watchOAuthResume(o: {
  storage: StorageLike | null;
  win: Listenable;
  doc: Listenable & { visibilityState?: string };
  hasUser: () => Promise<boolean>;
  onResume: () => void;
  nowMs?: () => number;
}): () => void {
  const now = o.nowMs ?? (() => Date.now());
  let checking = false;
  let disposed = false;
  const check = async () => {
    if (disposed || checking) return;
    if (o.doc.visibilityState === 'hidden') return;
    if (!isOAuthPending(o.storage, now())) return;
    checking = true;
    try {
      if (await o.hasUser()) {
        if (disposed) return;
        clearOAuthPending(o.storage);
        o.onResume();
      }
    } catch {
      // error de red o de sesión: se conserva el indicador y se reintenta en el próximo foco
    } finally {
      checking = false;
    }
  };
  o.doc.addEventListener('visibilitychange', check);
  o.win.addEventListener('focus', check);
  return () => {
    disposed = true;
    o.doc.removeEventListener('visibilitychange', check);
    o.win.removeEventListener('focus', check);
  };
}
