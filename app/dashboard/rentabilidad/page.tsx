'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, TrendingUp, TrendingDown, X, Zap,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  AlertCircle, Package,
} from 'lucide-react';
import { getCashShiftRange } from '@/lib/cashUtils';

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

interface ItemCost {
  product_name: string;
  product_id: string | null;
  quantity: number;
  unit_cost_frozen: number | null;
  unit_price_frozen: number;
}

export default function RentabilidadPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const getARDate = () =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [cashCloseHour, setCashCloseHour] = useState('00:00');
  const [items, setItems] = useState<ItemCost[]>([]);

  const [period, setPeriod] = useState<Period>('today');
  const [customStart, setCustomStart] = useState(getARDate());
  const [customEnd, setCustomEnd] = useState(getARDate());
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  const fp = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;
  const pct = (n: number, d: number) =>
    d === 0 ? '—' : `${Math.round((n / d) * 100)}%`;

  function getRange(p: Period, closeHour: string): { start: string; end: string } {
    const today = getARDate();

    if (p === 'today') return getCashShiftRange(today, closeHour);
    if (p === 'yesterday') {
      const d = new Date(today + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      return getCashShiftRange(d.toISOString().split('T')[0], closeHour);
    }
    if (p === 'week') {
      const end = new Date(today + 'T23:59:59-03:00').toISOString();
      const s = new Date(today + 'T12:00:00');
      s.setDate(s.getDate() - 6);
      const start = new Date(s.toISOString().split('T')[0] + 'T00:00:00-03:00').toISOString();
      return { start, end };
    }
    if (p === 'month') {
      const end = new Date(today + 'T23:59:59-03:00').toISOString();
      const [y, m] = today.split('-').map(Number);
      const start = new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00-03:00`).toISOString();
      return { start, end };
    }
    // custom
    return {
      start: new Date(customStart + 'T00:00:00-03:00').toISOString(),
      end:   new Date(customEnd   + 'T23:59:59-03:00').toISOString(),
    };
  }

  const loadData = async (p: Period) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rest } = await supabase
        .from('restaurants')
        .select('id, subscription_plan, cash_close_hour')
        .eq('user_id', user.id)
        .single();

      if (!rest) return;
      setRestaurantId(rest.id);
      const closeHour = rest.cash_close_hour?.slice(0, 5) ?? '00:00';
      setCashCloseHour(closeHour);

      const isSuperAdmin = user.email === 'luchiimee2@gmail.com';
      const locked = rest.subscription_plan === 'light' && !isSuperAdmin;
      setIsLocked(locked);
      if (locked) return;

      const { start, end } = getRange(p, closeHour);

      // Fetch order_item_costs joined via orders for date + status filter
      const { data: rows, error } = await supabase
        .from('order_item_costs')
        .select(`
          product_name,
          product_id,
          quantity,
          unit_cost_frozen,
          unit_price_frozen,
          orders!inner (
            created_at,
            status
          )
        `)
        .eq('restaurant_id', rest.id)
        .gte('orders.created_at', start)
        .lte('orders.created_at', end)
        .not('orders.status', 'in', '("pendiente","cancelado")');

      setItems((rows ?? []).map((r: any) => ({
        product_name: r.product_name,
        product_id: r.product_id,
        quantity: r.quantity,
        unit_cost_frozen: r.unit_cost_frozen,
        unit_price_frozen: r.unit_price_frozen,
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(period); }, [period, customStart, customEnd]);

  // Aggregate by product
  const { withCost, withoutCost, summary } = useMemo(() => {
    const map = new Map<string, {
      name: string; qty: number; revenue: number;
      cost: number; hasCost: boolean;
    }>();

    for (const item of items) {
      const key = item.product_name;
      const existing = map.get(key) ?? { name: key, qty: 0, revenue: 0, cost: 0, hasCost: item.unit_cost_frozen != null };
      existing.qty      += item.quantity;
      existing.revenue  += item.quantity * item.unit_price_frozen;
      if (item.unit_cost_frozen != null) {
        existing.cost   += item.quantity * item.unit_cost_frozen;
        existing.hasCost = true;
      }
      map.set(key, existing);
    }

    const all = [...map.values()].sort((a, b) => b.revenue - a.revenue);
    const withCost    = all.filter(p => p.hasCost);
    const withoutCost = all.filter(p => !p.hasCost);

    const totalRevenue = all.reduce((s, p) => s + p.revenue, 0);
    const totalCost    = withCost.reduce((s, p) => s + p.cost, 0);
    const grossProfit  = withCost.reduce((s, p) => s + (p.revenue - p.cost), 0);

    return { withCost, withoutCost, summary: { totalRevenue, totalCost, grossProfit } };
  }, [items]);

  const PERIODS: { id: Period; label: string }[] = [
    { id: 'today',     label: 'Hoy' },
    { id: 'yesterday', label: 'Ayer' },
    { id: 'week',      label: 'Esta semana' },
    { id: 'month',     label: 'Este mes' },
    { id: 'custom',    label: 'Rango libre' },
  ];

  if (loading) return (
    <div className="h-[80vh] flex items-center justify-center text-gray-400">
      <Loader2 className="animate-spin" size={40} />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto min-h-screen font-sans">

      {/* LOCK */}
      {isLocked && (
        <div className="fixed inset-0 z-[150] backdrop-blur-sm bg-white/60 flex items-center justify-center p-4">
          <div className="bg-white shadow-2xl p-10 rounded-[2.5rem] max-w-md w-full text-center border border-gray-100 relative animate-in zoom-in-95">
            <button onClick={() => router.push('/dashboard')} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5 text-emerald-600">
              <TrendingUp size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tighter uppercase italic text-gray-900">Rentabilidad</h2>
            <p className="text-gray-500 mb-8 text-sm font-medium">El reporte de rentabilidad por producto es exclusivo del <b>Plan Plus</b>.</p>
            <div className="flex flex-col gap-3">
              <Link href="/dashboard/settings" className="w-full py-4 rounded-2xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-lg uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                Actualizar a Plus <Zap size={18} fill="currentColor" />
              </Link>
              <button onClick={() => router.push('/dashboard')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 hover:text-gray-600 transition">
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`space-y-6 pb-12 pt-6 md:pt-2 px-4 ${isLocked ? 'blur-sm pointer-events-none opacity-50 select-none overflow-hidden h-screen' : ''}`}>

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Rentabilidad</h1>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Margen y ganancia por producto</p>
          </div>
        </div>

        {/* PERIOD SELECTOR */}
        <div className="bg-white rounded-3xl border shadow-sm p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                  period === p.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-3 animate-in fade-in">
              <div className="relative cursor-pointer" onClick={() => startRef.current?.showPicker()}>
                <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input ref={startRef} type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="pl-8 pr-3 py-2 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200 outline-none focus:border-gray-900 cursor-pointer" />
              </div>
              <span className="text-gray-400 text-xs font-bold">→</span>
              <div className="relative cursor-pointer" onClick={() => endRef.current?.showPicker()}>
                <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input ref={endRef} type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="pl-8 pr-3 py-2 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200 outline-none focus:border-gray-900 cursor-pointer" />
              </div>
            </div>
          )}
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl border-2 border-violet-100 shadow-sm">
            <p className="text-xs font-bold text-violet-600 uppercase mb-1">Facturación</p>
            <p className="text-4xl font-black text-gray-900">{fp(summary.totalRevenue)}</p>
            <p className="text-[10px] text-gray-400 mt-2 font-medium">Total vendido en el período</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border-2 border-red-100 shadow-sm">
            <p className="text-xs font-bold text-red-500 uppercase mb-1">Costo total</p>
            <p className="text-4xl font-black text-gray-900">{fp(summary.totalCost)}</p>
            <p className="text-[10px] text-gray-400 mt-2 font-medium">Solo productos con costo cargado</p>
          </div>
          <div className={`p-6 rounded-3xl shadow-xl flex flex-col justify-center ${
            summary.grossProfit >= 0 ? 'bg-emerald-600 shadow-emerald-100' : 'bg-red-500 shadow-red-100'
          }`}>
            <p className="text-xs font-bold text-white/80 uppercase mb-1">Ganancia bruta</p>
            <p className="text-4xl font-black text-white">{fp(summary.grossProfit)}</p>
            <p className="text-[10px] text-white/70 mt-2 font-medium">
              Margen: {pct(summary.grossProfit, summary.totalRevenue)}
            </p>
          </div>
        </div>

        {/* TABLE: PRODUCTS WITH COST */}
        {withCost.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/30">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-500" /> Por producto
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-[10px] uppercase text-gray-400 font-bold">
                  <tr>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4 text-right">Unidades</th>
                    <th className="px-6 py-4 text-right">Facturación</th>
                    <th className="px-6 py-4 text-right">Costo</th>
                    <th className="px-6 py-4 text-right">Ganancia</th>
                    <th className="px-6 py-4 text-right">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {withCost.map(p => {
                    const profit = p.revenue - p.cost;
                    const margin = p.revenue > 0 ? (profit / p.revenue) * 100 : 0;
                    return (
                      <tr key={p.name} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-sm text-gray-900">{p.name}</p>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-600">{p.qty}</td>
                        <td className="px-6 py-4 text-right font-black text-gray-900 text-sm">{fp(p.revenue)}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-red-500">{fp(p.cost)}</td>
                        <td className={`px-6 py-4 text-right font-black text-sm ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {fp(profit)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                            margin >= 50 ? 'bg-emerald-100 text-emerald-700' :
                            margin >= 25 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {Math.round(margin)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABLE: PRODUCTS WITHOUT COST */}
        {withoutCost.length > 0 && (
          <div className="bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/30 flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-500 shrink-0" />
              <div>
                <p className="font-bold text-sm text-gray-700">Sin costo cargado</p>
                <p className="text-[10px] text-gray-400 font-medium">
                  Estos productos se vendieron pero no tienen costo configurado — no impactan la ganancia bruta.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-[10px] uppercase text-gray-400 font-bold">
                  <tr>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4 text-right">Unidades</th>
                    <th className="px-6 py-4 text-right">Facturación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {withoutCost.map(p => (
                    <tr key={p.name} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-gray-300 shrink-0" />
                          <p className="font-bold text-sm text-gray-600">{p.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-400">{p.qty}</td>
                      <td className="px-6 py-4 text-right font-black text-gray-500 text-sm">{fp(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {withCost.length === 0 && withoutCost.length === 0 && !loading && (
          <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center">
            <TrendingUp size={40} className="text-gray-200 mx-auto mb-4" />
            <p className="font-black text-gray-400 uppercase tracking-widest text-sm">Sin ventas en este período</p>
            <p className="text-gray-300 text-xs font-medium mt-2">
              Los datos aparecen cuando los pedidos pasan de "Pendiente" a aceptados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
