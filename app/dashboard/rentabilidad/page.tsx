'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import {
  Loader2, TrendingUp, X, Calendar as CalendarIcon,
  AlertCircle, Package, CheckCircle2, DollarSign,
} from 'lucide-react';
import { getCashShiftRange } from '@/lib/cashUtils';
import { hasBetaAccess } from '@/lib/access';

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type Tab = 'reporte' | 'costos';

interface ItemCost {
  product_name: string;
  product_id: string | null;
  quantity: number;
  unit_cost_frozen: number | null;
  unit_price_frozen: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  cost: number | null;
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
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [deliveryOrderCount, setDeliveryOrderCount] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [items, setItems] = useState<ItemCost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [costInputs, setCostInputs] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const [tab, setTab] = useState<Tab>('reporte');
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
      return { start: new Date(s.toISOString().split('T')[0] + 'T00:00:00-03:00').toISOString(), end };
    }
    if (p === 'month') {
      const end = new Date(today + 'T23:59:59-03:00').toISOString();
      const [y, m] = today.split('-').map(Number);
      return { start: new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00-03:00`).toISOString(), end };
    }
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
        .select('id, subscription_plan, cash_close_hour, delivery_cost')
        .eq('user_id', user.id)
        .single();

      if (!rest) return;
      setRestaurantId(rest.id);
      const closeHour = rest.cash_close_hour?.slice(0, 5) ?? '00:00';
      setCashCloseHour(closeHour);
      setDeliveryCost(Number(rest.delivery_cost ?? 0));

      // Gate por plan: Light siempre bloqueado, GO solo con beta access, Plus liberado.
      // Sin excepción de admin acá — ADMIN_EMAILS solo evita el redirect de trial/cancelado.
      const plan = rest.subscription_plan;
      const locked = plan === 'plus' ? false : plan === 'go' ? !hasBetaAccess(user.email) : true;
      setIsLocked(locked);
      if (locked) return;

      const { start, end } = getRange(p, closeHour);

      const [{ data: rows }, { data: prods }, deliveryRes, shiftsRes] = await Promise.all([
        supabase
          .from('order_item_costs')
          .select(`product_name, product_id, quantity, unit_cost_frozen, unit_price_frozen, orders!inner(created_at, status)`)
          .eq('restaurant_id', rest.id)
          .gte('orders.created_at', start)
          .lte('orders.created_at', end)
          .not('orders.status', 'in', '("pendiente","cancelado")')
          .not('orders.shift_id', 'is', null),
        supabase
          .from('products')
          .select('id, name, price, cost')
          .eq('restaurant_id', rest.id)
          .order('name', { ascending: true }),
        // Pedidos delivery en el período (para calcular costo de delivery)
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', rest.id)
          .eq('order_type', 'delivery')
          .gte('created_at', start)
          .lte('created_at', end)
          .not('status', 'in', '("pendiente","cancelado")'),
        // Turnos abiertos en el período (para traer los gastos)
        supabase
          .from('cash_shifts')
          .select('id')
          .eq('restaurant_id', rest.id)
          .gte('opened_at', start)
          .lt('opened_at', end),
      ]);

      setDeliveryOrderCount(deliveryRes.count ?? 0);

      // Gastos de los turnos del período
      const shiftIds = (shiftsRes.data ?? []).map((s: any) => s.id);
      if (shiftIds.length > 0) {
        const { data: expRows } = await supabase
          .from('cash_expenses')
          .select('amount')
          .in('shift_id', shiftIds);
        setTotalExpenses((expRows ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0));
      } else {
        setTotalExpenses(0);
      }

      setItems((rows ?? []).map((r: any) => ({
        product_name: r.product_name,
        product_id: r.product_id,
        quantity: r.quantity,
        unit_cost_frozen: r.unit_cost_frozen,
        unit_price_frozen: r.unit_price_frozen,
      })));

      const prodList = (prods ?? []) as Product[];
      setProducts(prodList);
      const inputs: Record<string, string> = {};
      prodList.forEach(p => { inputs[p.id] = p.cost != null ? String(p.cost) : ''; });
      setCostInputs(inputs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(period); }, [period, customStart, customEnd]);

  const handleSaveCost = async (productId: string) => {
    const val = costInputs[productId];
    const newCost = val === '' ? null : Number(val);
    setSavingId(productId);
    const { error } = await supabase
      .from('products')
      .update({ cost: newCost })
      .eq('id', productId);
    if (!error) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, cost: newCost } : p));
      setSavedIds(prev => { const s = new Set(prev); s.add(productId); return s; });
      setTimeout(() => setSavedIds(prev => { const s = new Set(prev); s.delete(productId); return s; }), 2000);
    }
    setSavingId(null);
  };

  // Aggregate by product
  const { withCost, withoutCost, summary } = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; cost: number; hasCost: boolean }>();
    for (const item of items) {
      const key = item.product_name;
      const existing = map.get(key) ?? { name: key, qty: 0, revenue: 0, cost: 0, hasCost: item.unit_cost_frozen != null };
      existing.qty     += item.quantity;
      existing.revenue += item.quantity * item.unit_price_frozen;
      if (item.unit_cost_frozen != null) { existing.cost += item.quantity * item.unit_cost_frozen; existing.hasCost = true; }
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

  const deliveryCostTotal = deliveryOrderCount * deliveryCost;
  const netReal = summary.totalRevenue - summary.totalCost - deliveryCostTotal - totalExpenses;

  const PERIODS: { id: Period; label: string }[] = [
    { id: 'today',     label: 'Hoy' },
    { id: 'yesterday', label: 'Ayer' },
    { id: 'week',      label: 'Esta semana' },
    { id: 'month',     label: 'Este mes' },
    { id: 'custom',    label: 'Rango libre' },
  ];

  const missingCostCount = products.filter(p => p.cost == null).length;

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
            <div className="mx-auto w-16 h-16 bg-fresco/10 rounded-full flex items-center justify-center mb-5 text-fresco">
              <TrendingUp size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tighter uppercase italic text-gray-900">Próximamente</h2>
            <p className="text-gray-500 mb-8 text-sm font-medium">Esta sección estará disponible muy pronto. Estamos trabajando para traerte reportes de rentabilidad detallados.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => router.push('/dashboard')} className="w-full py-4 rounded-2xl font-bold bg-gray-900 text-white hover:bg-gray-800 transition shadow-lg uppercase text-xs tracking-widest">
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`space-y-6 pb-12 pt-6 md:pt-2 px-4 ${isLocked ? 'blur-sm pointer-events-none opacity-50 select-none overflow-hidden h-screen' : ''}`}>

        {/* HEADER + TABS */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Rentabilidad</h1>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Margen y ganancia por producto</p>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setTab('reporte')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${tab === 'reporte' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Reporte
          </button>
          <button
            onClick={() => setTab('costos')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all flex items-center gap-2 ${tab === 'costos' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Cargar Costos
            {missingCostCount > 0 && (
              <span className="bg-fresco text-[#0C2D1F] text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {missingCostCount > 9 ? '9+' : missingCostCount}
              </span>
            )}
          </button>
        </div>

        {/* ─── TAB: REPORTE ─── */}
        {tab === 'reporte' && (
          <>
            {/* PERIOD */}
            <div className="bg-white rounded-3xl border shadow-sm p-4 space-y-3">
              <div className="flex gap-2 flex-wrap">
                {PERIODS.map(p => (
                  <button key={p.id} onClick={() => setPeriod(p.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${period === p.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
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
              <div className="bg-white p-6 rounded-3xl border-2 border-[#E8F7F1] shadow-sm">
                <p className="text-xs font-bold text-fresco uppercase mb-1">Facturación</p>
                <p className="text-4xl font-black text-gray-900">{fp(summary.totalRevenue)}</p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Total vendido en el período</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-[#DEDDD3] shadow-sm">
                <p className="text-xs font-bold text-alert uppercase mb-1">Costo total</p>
                <p className="text-4xl font-black text-gray-900">{fp(summary.totalCost)}</p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Solo productos con costo cargado</p>
              </div>
              <div className={`p-6 rounded-3xl shadow-xl flex flex-col justify-center ${summary.grossProfit >= 0 ? 'bg-fresco shadow-fresco/10' : 'bg-alert shadow-alert/10'}`}>
                <p className="text-xs font-bold text-white/80 uppercase mb-1">Ganancia bruta</p>
                <p className="text-4xl font-black text-white">{fp(summary.grossProfit)}</p>
                <p className="text-[10px] text-white/70 mt-2 font-medium">Margen: {pct(summary.grossProfit, summary.totalRevenue)}</p>
              </div>
            </div>

            {/* GANANCIA NETA REAL */}
            <div className="bg-gray-900 text-white rounded-3xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Lo que te queda</p>
                  <p className={`text-5xl font-black ${netReal >= 0 ? 'text-fresco' : 'text-alert'}`}>
                    {fp(netReal)}
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium mt-2 max-w-xs">
                    No incluye productos sin costo cargado —{' '}
                    <button onClick={() => setTab('costos')} className="text-fresco underline font-bold">
                      completalos en Cargar Costos
                    </button>{' '}
                    para un número más preciso.
                  </p>
                </div>
                {/* Desglose */}
                <div className="space-y-2 min-w-[220px]">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400 font-bold uppercase">Facturación total</span>
                    <span className="text-white font-black">{fp(summary.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400 font-bold uppercase">− Costo productos</span>
                    <span className="text-alert font-black">−{fp(summary.totalCost)}</span>
                  </div>
                  {deliveryCostTotal > 0 && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-400 font-bold uppercase">− Delivery ({deliveryOrderCount} × {fp(deliveryCost)})</span>
                      <span className="text-alert font-black">−{fp(deliveryCostTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-400 font-bold uppercase">− Gastos operativos</span>
                    <span className="text-alert font-black">−{fp(totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="text-white font-black uppercase text-xs tracking-widest">= Neto</span>
                    <span className={`font-black text-lg ${netReal >= 0 ? 'text-fresco' : 'text-alert'}`}>
                      {fp(netReal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TABLE WITH COST */}
            {withCost.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <TrendingUp size={20} className="text-fresco" /> Por producto
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
                            <td className="px-6 py-4"><p className="font-bold text-sm text-gray-900">{p.name}</p></td>
                            <td className="px-6 py-4 text-right text-sm font-bold text-gray-600">{p.qty}</td>
                            <td className="px-6 py-4 text-right font-black text-gray-900 text-sm">{fp(p.revenue)}</td>
                            <td className="px-6 py-4 text-right text-sm font-bold text-alert">{fp(p.cost)}</td>
                            <td className={`px-6 py-4 text-right font-black text-sm ${profit >= 0 ? 'text-fresco' : 'text-alert'}`}>{fp(profit)}</td>
                            <td className="px-6 py-4 text-right">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${margin >= 50 ? 'bg-fresco/10 text-fresco' : margin >= 25 ? 'bg-[#F5F5EF] text-graphite' : 'bg-alert/10 text-alert'}`}>
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

            {/* TABLE WITHOUT COST */}
            {withoutCost.length > 0 && (
              <div className="bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50/30 flex items-center gap-3">
                  <AlertCircle size={18} className="text-graphite shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-gray-700">Sin costo cargado</p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      Vendidos en el período pero sin costo — no impactan la ganancia bruta.{' '}
                      <button onClick={() => setTab('costos')} className="text-fresco underline font-bold">Cargar costos →</button>
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

            {/* EMPTY */}
            {withCost.length === 0 && withoutCost.length === 0 && (
              <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center">
                <TrendingUp size={40} className="text-gray-200 mx-auto mb-4" />
                <p className="font-black text-gray-400 uppercase tracking-widest text-sm">Sin ventas en este período</p>
                <p className="text-gray-300 text-xs font-medium mt-2">Los datos aparecen cuando los pedidos pasan de Pendiente a aceptados.</p>
              </div>
            )}
          </>
        )}

        {/* ─── TAB: CARGAR COSTOS ─── */}
        {tab === 'costos' && (
          <div className="space-y-4">
            {/* Banner de estado */}
            <div className={`rounded-3xl p-5 flex items-center gap-4 ${missingCostCount === 0 ? 'bg-fresco/10 border-2 border-fresco/10' : 'bg-[#F5F5EF] border border-[#DEDDD3]'}`}>
              {missingCostCount === 0
                ? <CheckCircle2 size={22} className="text-fresco shrink-0" />
                : <AlertCircle size={22} className="text-graphite shrink-0" />
              }
              <p className={`text-sm font-bold ${missingCostCount === 0 ? 'text-ink' : 'text-graphite'}`}>
                {missingCostCount === 0
                  ? 'Todos los productos tienen costo cargado — el reporte de margen es completo.'
                  : `${missingCostCount} ${missingCostCount === 1 ? 'producto sin costo' : 'productos sin costo'} — completá los que faltan para un reporte completo.`
                }
              </p>
            </div>

            {/* Lista de productos */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-50 bg-gray-50/30">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {products.length} {products.length === 1 ? 'producto' : 'productos'} — guardado automático al salir del campo
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {products.map(p => {
                  const input = costInputs[p.id] ?? '';
                  const hasCost = p.cost != null;
                  const isSaving = savingId === p.id;
                  const justSaved = savedIds.has(p.id);
                  const margin = hasCost && p.price > 0
                    ? Math.round(((p.price - p.cost!) / p.price) * 100)
                    : null;

                  return (
                    <div key={p.id} className={`flex items-center gap-4 px-5 py-4 transition-colors ${hasCost ? 'bg-white' : 'bg-[#F5F5EF]/30'}`}>
                      {/* Status dot */}
                      <div className="shrink-0">
                        {justSaved
                          ? <CheckCircle2 size={18} className="text-fresco" />
                          : hasCost
                            ? <CheckCircle2 size={18} className="text-fresco" />
                            : <div className="w-[18px] h-[18px] rounded-full border-2 border-[#DEDDD3] bg-[#F5F5EF]" />
                        }
                      </div>

                      {/* Nombre + precio de venta */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Venta: {fp(p.price)}</p>
                      </div>

                      {/* Margen calculado (solo si tiene costo) */}
                      {margin !== null && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 ${
                          margin >= 50 ? 'bg-fresco/10 text-fresco' :
                          margin >= 25 ? 'bg-[#F5F5EF] text-graphite' :
                          'bg-alert/10 text-alert'
                        }`}>
                          {margin}% margen
                        </span>
                      )}

                      {/* Input de costo */}
                      <div className="relative shrink-0 w-36">
                        <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          value={input}
                          placeholder="Costo"
                          onChange={e => setCostInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onBlur={() => {
                            const cur = String(p.cost ?? '');
                            if (input !== cur) handleSaveCost(p.id);
                          }}
                          className={`w-full pl-7 pr-3 py-2 rounded-xl text-sm font-bold outline-none transition-all border ${
                            hasCost
                              ? 'bg-gray-50 border-gray-200 focus:border-fresco focus:bg-white'
                              : 'bg-[#F5F5EF] border-[#DEDDD3] focus:border-fresco focus:bg-white'
                          }`}
                        />
                        {isSaving && (
                          <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                        )}
                      </div>
                    </div>
                  );
                })}

                {products.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="font-black text-gray-300 uppercase tracking-widest text-xs">Sin productos cargados todavía</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
