'use client';

import { useEffect, useState } from 'react';

// Contador de la promo de remeras (landing): cuenta REGISTROS y no menciona pagos. Lee GET /api/public/promo-remeras
// ({ registered, slots }). Hidratación: arranca inactivo y sin datos, así que servidor y cliente renderizan lo mismo
// (nada); recién en el cliente, si la promo sigue vigente (endsAt, ms, hora Argentina), pide el dato. Solo se muestra
// el dato real: si el fetch falla o responde algo raro, se muestra el texto sin número.
type Counter = { registered: number; slots: number };

function parseCounter(data: unknown): Counter | null {
  if (!data || typeof data !== 'object') return null;
  const { registered, slots } = data as Record<string, unknown>;
  // Enteros >= 0 (slots > 0); si algo no cierra, se muestra el texto sin número
  if (typeof registered !== 'number' || !Number.isInteger(registered) || registered < 0) return null;
  if (typeof slots !== 'number' || !Number.isInteger(slots) || slots <= 0) return null;
  return { registered, slots };
}

export default function PromoCounter({ endsAt }: { endsAt: number }) {
  const [active, setActive] = useState(false);
  const [counter, setCounter] = useState<Counter | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (Date.now() > endsAt) return;
    setActive(true);
    const controller = new AbortController();
    fetch('/api/public/promo-remeras', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('http'))))
      .then((data) => {
        const parsed = parseCounter(data);
        if (parsed) setCounter(parsed);
        else setFailed(true);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setFailed(true);
      });
    // Se oculta sola al llegar la fecha límite si la página queda abierta
    const ms = endsAt - Date.now();
    const timer = ms > 0 && ms < 2 ** 31 ? setTimeout(() => setActive(false), ms) : undefined;
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [endsAt]);

  if (!active || (!counter && !failed)) return null;

  const pill = 'inline-flex max-w-full items-center gap-2 bg-white border border-gray-200 shadow-sm px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-gray-600';

  if (counter && counter.registered >= counter.slots) {
    return (
      <div role="status" className="mb-3 mx-auto lg:mx-0 max-w-md rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm">
        <p className="text-sm font-black text-ink break-words">Ya hay {counter.registered} negocios registrados en la promo de noviembre.</p>
        <p className="mt-1 text-[11px] sm:text-xs leading-snug text-gray-600 break-words">
          Si no llegás a los 10 primeros, no te preocupes: al abonar tu 3.ª suscripción te ganás 4 remeras (registros hasta el 31/12). Nos comunicamos con vos para confirmarte en cuál de las dos promos entrás.
        </p>
      </div>
    );
  }

  const text = !counter
    ? 'Lugares limitados para la promo de noviembre'
    : counter.registered === 0
      ? 'Quedan lugares disponibles en la promo de remeras'
      : counter.registered === 1
        ? '1 negocio ya se registró en la promo de remeras'
        : `${counter.registered} negocios ya se registraron en la promo de remeras`;

  return (
    <div role="status" className="mb-3">
      <span className={pill}>
        <span className="w-2 h-2 rounded-full bg-[#ffcc03] shrink-0"></span>
        {text}
      </span>
    </div>
  );
}
