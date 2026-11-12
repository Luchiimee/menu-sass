'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Píxel de Meta: solo corre en las rutas de marketing y legales. En cualquier otra
// (menús públicos /[slug], /dashboard, /admin, /baja, etc.) no se carga ni se dispara.
const PIXEL_ID = '1093678972956224';
const ALLOWED_PATHS = new Set(['/', '/login', '/register', '/privacy', '/terminos']);

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
