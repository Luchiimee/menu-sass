'use client';

// Pantalla de vuelta de Mercado Pago (?mp=success|pending|failure&ref=<id>).
// Solo se fía de SU parámetro `ref` (el id del pedido pendiente que puso nuestro
// back_url) y de la respuesta de /api/checkout/mp/status; cualquier otro parámetro
// que agregue MP se ignora y se saca de la URL. Cuando el pedido existe hace
// setActiveOrderId(ref) y el seguimiento de CartFooter toma el control.
//
// La lógica de decisión está en lib/mpClientCheckout.ts (probada en
// scripts/check-mp-client-checkout.mjs).

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, XCircle, MessageSquare, ShieldCheck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import {
  MP_PENDING_KEY, MP_RETURN_PARAMS, POLL_START_MS, SLOW_AFTER_MS,
  decideNext, nextPollDelay, parseReturnParams, parseStoredMpPending,
  type ReturnMode, type StatusState,
} from '@/lib/mpClientCheckout';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATES: StatusState[] = ['pending', 'paid', 'order_created', 'failed', 'expired'];

type FetchResult =
  | { kind: 'ok'; state: StatusState }
  | { kind: 'not_found' }
  | { kind: 'rate_limited' }
  | { kind: 'error' };

async function fetchStatus(ref: string): Promise<FetchResult> {
  try {
    const res = await fetch(`/api/checkout/mp/status?id=${encodeURIComponent(ref)}`, { cache: 'no-store' });
    if (res.status === 429) return { kind: 'rate_limited' };
    if (res.status === 404) return { kind: 'not_found' };
    if (!res.ok) return { kind: 'error' };
    const data = await res.json();
    return STATES.includes(data?.state) ? { kind: 'ok', state: data.state } : { kind: 'error' };
  } catch {
    return { kind: 'error' };
  }
}

function cleanUrl() {
  const url = new URL(window.location.href);
  MP_RETURN_PARAMS.forEach((p) => url.searchParams.delete(p));
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}

type Session = { mp: ReturnMode; ref: string | null };
type View = 'waiting' | 'failure' | 'noref' | 'mismatch';

export default function MpReturn({ restaurantId, restaurantPhone }: { restaurantId: string; restaurantPhone?: string | null }) {
  const searchParams = useSearchParams();
  const { setActiveOrderId, restoreCart } = useCart();
  // El provider recrea estas funciones en cada render: por ref, para que no
  // reinicien la consulta de estado.
  const setActiveOrderIdRef = useRef(setActiveOrderId);
  const restoreCartRef = useRef(restoreCart);
  setActiveOrderIdRef.current = setActiveOrderId;
  restoreCartRef.current = restoreCart;
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<View>('waiting');
  const [paid, setPaid] = useState(false);   // el pago ya está acreditado, falta el pedido
  const [slow, setSlow] = useState(false);   // ~60 s sin pedido
  const started = useRef(false);
  const deadline = useRef(0);
  const cartRestored = useRef(false);

  // 1. Leer la URL UNA vez (después se limpia y el hook cambia de valor).
  useEffect(() => {
    if (started.current) return;
    const parsed = parseReturnParams(searchParams);
    if (!parsed) return;
    started.current = true;

    const stored = parseStoredMpPending(localStorage.getItem(MP_PENDING_KEY), restaurantId, Date.now());
    const ref = parsed.ref ?? stored?.ref ?? null; // sin ref en la URL: el respaldo
    deadline.current = Date.now() + SLOW_AFTER_MS;
    if (!ref) {
      setView(parsed.mp === 'failure' ? 'failure' : 'noref');
    }
    setSession({ mp: parsed.mp, ref });
  }, [searchParams, restaurantId]);

  // 2. Consultar el estado hasta que el pedido exista (o se dé por perdido).
  useEffect(() => {
    if (!session?.ref) return;
    const { mp, ref } = session;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = POLL_START_MS;
    let recheckDone = false;

    const schedule = () => { if (!cancelled) timer = setTimeout(tick, delay); };

    const finish = async () => {
      // El pedido tiene que ser de ESTE local (el ref viene de la URL).
      const { data } = await supabase.from('orders').select('restaurant_id').eq('id', ref).maybeSingle();
      if (cancelled) return;
      if (data && data.restaurant_id !== restaurantId) { setView('mismatch'); return; }

      const stored = parseStoredMpPending(localStorage.getItem(MP_PENDING_KEY), restaurantId, Date.now());
      if (stored && stored.ref === ref) localStorage.setItem('metodoEnvio', stored.metodoEnvio);
      localStorage.removeItem(MP_PENDING_KEY);
      setActiveOrderIdRef.current(ref);
      cleanUrl();
      setSession(null); // el seguimiento de CartFooter toma el control
    };

    const tick = async () => {
      if (cancelled) return;
      const res = await fetchStatus(ref);
      if (cancelled) return;

      if (res.kind === 'rate_limited' || res.kind === 'error') {
        delay = nextPollDelay(delay, res.kind);
        if (Date.now() > deadline.current) setSlow(true);
        schedule();
        return;
      }

      const state = res.kind === 'not_found' ? 'not_found' : res.state;
      const decision = decideNext({ state, mode: mp, recheckDone });

      if (decision === 'order_created') { await finish(); return; }
      if (decision === 'failure') { setView('failure'); return; }
      if (decision === 'recheck') {
        recheckDone = true; // una consulta más antes de decir "no se completó"
        delay = POLL_START_MS;
        schedule();
        return;
      }

      setPaid(decision === 'wait_paid');
      if (Date.now() > deadline.current) setSlow(true);
      delay = nextPollDelay(delay, 'ok');
      schedule();
    };

    tick();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [session, restaurantId]);

  // 3. Pago no completado: devolver el carrito (la navegación a MP lo descartó).
  useEffect(() => {
    if (view !== 'failure' || cartRestored.current) return;
    cartRestored.current = true;
    const stored = parseStoredMpPending(localStorage.getItem(MP_PENDING_KEY), restaurantId, Date.now());
    if (stored && (!session?.ref || stored.ref === session.ref)) restoreCartRef.current(stored.cart);
  }, [view, session, restaurantId]);

  if (!session) return null;

  const code = session.ref ? session.ref.slice(0, 5) : null;
  const dismiss = () => {
    localStorage.removeItem(MP_PENDING_KEY);
    cleanUrl();
    setSession(null);
  };
  const whatsapp = () => {
    const digits = String(restaurantPhone ?? '').replace(/\D/g, '');
    if (!digits) return;
    const text = code
      ? `Hola! Pagué mi pedido con Mercado Pago (código ${code}) y no veo la confirmación.`
      : 'Hola! Pagué un pedido con Mercado Pago y no veo la confirmación.';
    window.open(`whatsapp://send?phone=${digits}&text=${encodeURIComponent(text)}`);
  };
  const hasPhone = String(restaurantPhone ?? '').replace(/\D/g, '').length > 0;

  const whatsappButton = hasPhone && (
    <button
      onClick={whatsapp}
      className="w-full bg-green-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
    >
      <MessageSquare size={18} /> Avisar por WhatsApp
    </button>
  );

  let body: React.ReactNode;
  if (view === 'failure') {
    body = (
      <>
        <XCircle className="text-alert mb-4" size={56} />
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 mb-2">El pago no se completó</h2>
        <p className="text-gray-500 text-xs font-bold leading-relaxed mb-6">
          No se hizo ningún cobro. Tu carrito sigue como lo dejaste: podés intentar de nuevo o elegir otro medio de pago.
          Si te cobraron igual, avisanos{code ? ` (código ${code})` : ''}.
        </p>
        <div className="w-full space-y-3">
          {whatsappButton}
          <button onClick={dismiss} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md active:scale-95 transition-all">
            Volver al menú
          </button>
        </div>
      </>
    );
  } else if (view === 'noref') {
    body = (
      <>
        <XCircle className="text-alert mb-4" size={56} />
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 mb-2">No pudimos identificar tu pedido</h2>
        <p className="text-gray-500 text-xs font-bold leading-relaxed mb-6">
          Si pagaste, avisale al local para que lo confirme.
        </p>
        <div className="w-full space-y-3">
          {whatsappButton}
          <button onClick={dismiss} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md active:scale-95 transition-all">
            Volver al menú
          </button>
        </div>
      </>
    );
  } else if (view === 'mismatch') {
    body = (
      <>
        <XCircle className="text-alert mb-4" size={56} />
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 mb-2">Este pedido es de otro local</h2>
        <button onClick={dismiss} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md active:scale-95 transition-all mt-4">
          Volver al menú
        </button>
      </>
    );
  } else if (slow) {
    body = (
      <>
        <Loader2 className="animate-spin text-green-600 mb-4" size={56} />
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 mb-2">Tu pago se está procesando</h2>
        <p className="text-gray-500 text-xs font-bold leading-relaxed mb-1">
          Si te cobraron, el local va a recibir tu pedido.
        </p>
        {code && <p className="text-gray-400 text-[11px] font-black uppercase tracking-widest mb-6">Código {code}</p>}
        <div className="w-full space-y-3">
          {whatsappButton}
          <button
            onClick={() => { deadline.current = Date.now() + SLOW_AFTER_MS; setSlow(false); }}
            className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
          >
            Seguir esperando
          </button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        {paid ? <ShieldCheck className="text-green-600 mb-4" size={56} /> : <Loader2 className="animate-spin text-green-600 mb-4" size={56} />}
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 mb-2">
          {paid ? 'Pago recibido, preparando tu pedido…' : 'Confirmando tu pago…'}
        </h2>
        <p className="text-gray-500 text-xs font-bold leading-relaxed">
          No cierres esta pantalla. Puede tardar unos segundos.
        </p>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in duration-300">
      <div className="w-full max-w-md mx-auto bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.3)] rounded-t-[2.5rem] p-8 pb-10 flex flex-col items-center text-center font-sans text-black animate-in slide-in-from-bottom-full duration-300">
        {body}
      </div>
    </div>
  );
}
