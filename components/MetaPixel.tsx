'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { claimRegistrationEvent, registrationStorageKey, REGISTRATION_OK_PATH } from '@/lib/registrationTracking';

// Píxel de Meta: solo corre en las rutas de marketing y legales. En cualquier otra
// (menús públicos /[slug], /dashboard, /admin, /baja, etc.) no se carga ni se dispara.
const PIXEL_ID = '1093678972956224';
// REGISTRATION_OK_PATH (/registro-ok): paso intermedio del registro nuevo con Google, solo para disparar CompleteRegistration.
const ALLOWED_PATHS = new Set(['/', '/login', '/register', '/privacy', '/terminos', REGISTRATION_OK_PATH]);

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded: boolean;
  version: string;
  push: unknown;
  disablePushState?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let initialized = false;
let lastTracked: string | null = null;

function loadPixel() {
  if (window.fbq) return;
  // Misma función que el snippet oficial de Meta: n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
  const n: Fbq = function () {
    if (n.callMethod) n.callMethod.apply(n, arguments as unknown as unknown[]);
    else n.queue.push(arguments);
  } as Fbq;
  n.queue = [];
  n.loaded = true;
  n.version = '2.0';
  n.push = n;
  // Evita que el píxel dispare PageView por su cuenta al navegar con pushState.
  n.disablePushState = true;
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
}

function syncPixel(pathname: string | null) {
  if (pathname && ALLOWED_PATHS.has(pathname)) {
    if (!initialized) {
      loadPixel();
      window.fbq?.('init', PIXEL_ID);
      initialized = true;
    } else {
      window.fbq?.('consent', 'grant');
    }
    if (lastTracked !== pathname) {
      lastTracked = pathname;
      window.fbq?.('track', 'PageView');
    }
  } else {
    lastTracked = null;
    // Ruta no permitida: si el script ya se cargó en una ruta anterior, se lo deja sin
    // consentimiento para que no envíe ningún evento hasta volver a una ruta permitida.
    if (initialized) window.fbq?.('consent', 'revoke');
  }
}

// "fbq disponible de verdad": initialized (ya se hizo init), fbq.callMethod es una función y la ruta actual es una
// de las permitidas. fbq.callMethod lo define fbevents.js al cargarse (el stub del snippet de Meta no lo tiene y
// encola); es una COMPROBACIÓN DEL SNIPPET DE META, no una garantía: no prueba que el script esté completo ni que
// el pedido de red llegue a Meta.
function fbqReady(): boolean {
  return initialized && typeof window.fbq?.callMethod === 'function' && ALLOWED_PATHS.has(window.location.pathname);
}

// Guard síncrono a nivel de módulo, por usuario: evita el doble disparo del doble efecto de React y los doble clics
// (la comprobación y el alta son síncronas). Un usuario queda acá mientras la página siga abierta, aunque no haya
// almacenamiento; solo se saca si se agota la espera sin haber disparado (se puede reintentar más adelante).
const registrationInFlight = new Set<string>();

function newEventId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
}

export type RegistrationTrackResult = 'sent' | 'skipped' | 'timeout';

// CompleteRegistration: una sola vez por usuario, SIN ningún dato personal (ni correo, ni teléfono, ni nombre, ni id
// de usuario: el eventID es un valor aleatorio). La clave de localStorage se escribe recién en el momento de llamar
// a fbq('track'), cuando fbqReady() es verdadero; si el píxel no llega a estar listo dentro de maxWaitMs no se escribe
// nada y un intento posterior puede reintentar. Si Meta o un bloqueador descartan el evento DESPUÉS de la llamada, no
// hay forma de saberlo (fbq no avisa la entrega) y la clave ya quedó escrita: ese usuario no se reintenta (se prefiere
// perder una conversión a duplicarla). Nunca rechaza: devuelve 'sent', 'skipped' (ya registrado o sin id) o 'timeout'.
export function trackCompleteRegistration(userId: string, maxWaitMs = 5000): Promise<RegistrationTrackResult> {
  if (typeof window === 'undefined' || !userId) return Promise.resolve('skipped');
  if (registrationInFlight.has(userId)) return Promise.resolve('skipped');
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  try {
    if (storage?.getItem(registrationStorageKey(userId))) return Promise.resolve('skipped');
  } catch {
    // almacenamiento bloqueado: no se puede deduplicar entre visitas, solo con el guard del módulo
  }
  registrationInFlight.add(userId);
  const deadline = Date.now() + maxWaitMs;
  return new Promise<RegistrationTrackResult>((resolve) => {
    const fire = () => {
      if (fbqReady()) {
        const eventId = claimRegistrationEvent(storage, userId, newEventId); // escribe la clave justo antes de la llamada
        if (!eventId) return resolve('skipped'); // otra pestaña ya lo registró
        window.fbq?.('track', 'CompleteRegistration', {}, { eventID: eventId });
        return resolve('sent');
      }
      if (Date.now() < deadline) {
        setTimeout(fire, 100);
        return;
      }
      registrationInFlight.delete(userId);
      resolve('timeout');
    };
    fire();
  });
}

export default function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    syncPixel(pathname);
  }, [pathname]);

  // Si el navegador restaura la página desde bfcache, se vuelve a evaluar la ruta real.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) syncPixel(window.location.pathname);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  if (!pathname || !ALLOWED_PATHS.has(pathname)) return null;

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        alt=""
        src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
