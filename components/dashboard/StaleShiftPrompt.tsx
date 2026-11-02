'use client';

// Aviso al dueño: quedó abierta una caja que ya pasó su hora de cierre (el turno sigue
// recibiendo los pedidos nuevos, porque get_or_create_shift reutiliza cualquier turno abierto).
// Se revisa al cargar el panel y cada vez que llega un pedido (evento 'order-received' de
// OrderListener). NO cambia nada en la base: solo ofrece ir a Caja a cerrarla, seguir con esa
// caja (silencia el aviso 12 h) o decidir después (hasta la próxima carga del panel).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { AlertTriangle } from 'lucide-react';
import { hasBetaAccess } from '@/lib/access';
import { isShiftStale, shiftBusinessDate } from '@/lib/cashUtils';

const SNOOZE_MS = 12 * 60 * 60 * 1000;
const snoozeKey = (shiftId: string) => `snappy_stale_shift_snooze_${shiftId}`;

function isSnoozed(shiftId: string): boolean {
  try {
    const until = Number(localStorage.getItem(snoozeKey(shiftId)));
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

const todayAR = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
const ddmm = (isoDate: string) => {
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
};

type StaleShift = { id: string; businessDate: string };

export default function StaleShiftPrompt() {
  const router = useRouter();
  const supabase = useRef(createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )).current;
  const [stale, setStale] = useState<StaleShift | null>(null);
  // "Decidir después": no volver a mostrar hasta que se recargue el panel
  const dismissedThisLoad = useRef(false);

  // Devuelve el turno vencido, null si no hay que avisar, o undefined si no se pudo revisar
  // (sin sesión, error) o el aviso está descartado en esta carga: en ese caso no se toca el estado.
  const check = useCallback(async (): Promise<StaleShift | null | undefined> => {
    if (dismissedThisLoad.current) return undefined;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return undefined;

      // Solo el local del usuario logueado
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id, subscription_plan, cash_close_hour')
        .eq('user_id', session.user.id)
        .single();
      if (!rest) return undefined;

      // Mismo acceso que la pantalla Caja: Plan Plus o acceso anticipado
      const hasCaja = rest.subscription_plan === 'plus' || hasBetaAccess(session.user.email);
      if (!hasCaja) return null;

      const { data: shift } = await supabase
        .from('cash_shifts')
        .select('id, opened_at')
        .eq('restaurant_id', rest.id)
        .is('closed_at', null)
        .order('opened_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!shift || !isShiftStale(shift.opened_at, rest.cash_close_hour) || isSnoozed(shift.id)) return null;
      return { id: shift.id, businessDate: shiftBusinessDate(shift.opened_at, rest.cash_close_hour) };
    } catch (err) {
      console.error('[StaleShiftPrompt] no se pudo revisar la caja abierta:', err);
      return undefined;
    }
  }, [supabase]);

  useEffect(() => {
    const run = () => {
      check().then((result) => {
        if (result !== undefined && !dismissedThisLoad.current) setStale(result);
      });
    };
    run();
    const onOrder = () => { run(); };
    window.addEventListener('order-received', onOrder);
    return () => window.removeEventListener('order-received', onOrder);
  }, [check]);

  if (!stale) return null;

  // "de ayer" si el turno es de ayer; si es más viejo, con su fecha
  const yesterday = new Date(new Date(`${todayAR()}T12:00:00-03:00`).getTime() - 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  const isYesterday = stale.businessDate === yesterday;
  const cuando = isYesterday ? 'de ayer' : `del ${ddmm(stale.businessDate)}`;

  const goClose = () => {
    dismissedThisLoad.current = true;
    setStale(null);
    router.push(`/dashboard/analytics?fecha=${stale.businessDate}`);
  };
  const keepGoing = () => {
    try { localStorage.setItem(snoozeKey(stale.id), String(Date.now() + SNOOZE_MS)); } catch { /* sin localStorage: solo se cierra */ }
    setStale(null);
  };
  const later = () => {
    dismissedThisLoad.current = true;
    setStale(null);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="stale-shift-title">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-alert/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-alert" />
          </div>
          <div>
            <h2 id="stale-shift-title" className="font-black text-ink text-base leading-tight">
              Quedó la caja del {ddmm(stale.businessDate)} abierta. ¿Querés cerrarla y empezar una nueva?
            </h2>
            <p className="text-xs text-graphite font-medium mt-2">
              Mientras siga abierta, los pedidos nuevos entran en esa caja. Este aviso no cambia nada:
              los pedidos que ya entraron quedan en la caja que ya tienen.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={goClose} className="w-full py-3 bg-ink text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">
            Cerrar la caja {cuando}
          </button>
          <button onClick={keepGoing} className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">
            Continuar con la {cuando}
          </button>
          <button onClick={later} className="w-full py-2 text-gray-400 font-black text-[11px] uppercase tracking-widest">
            Decidir después
          </button>
        </div>
      </div>
    </div>
  );
}
