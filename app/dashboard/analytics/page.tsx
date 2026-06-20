'use client';
export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useMemo, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  Loader2, Banknote, CreditCard, Calculator, Plus, X,
  History, ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, CheckCircle2, Zap, Trash2, Lock,
  TrendingDown, Receipt, ShoppingBag, Bike, Store, ChefHat, AlertCircle,
} from 'lucide-react';
import { getCashShiftRange, buildShiftSummary } from '@/lib/cashUtils';

const SALE_TYPE_META: Record<string, { label: string; Icon: any }> = {
  mesa:      { label: 'Mesa',      Icon: ChefHat },
  retiro:    { label: 'Retiro',    Icon: Store },
  delivery:  { label: 'Delivery',  Icon: Bike },
  mostrador: { label: 'Mostrador', Icon: ShoppingBag },
};

export default function AnalyticsPage() {
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
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [cashCloseHour, setCashCloseHour] = useState('00:00');
  const [selectedDate, setSelectedDate] = useState(getARDate);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [shifts, setShifts] = useState<any[]>([]);
  const [shiftIdx, setShiftIdx] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const [showAperturaModal, setShowAperturaModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');

  const [aperturaAmount, setAperturaAmount] = useState('');
  const [saleData, setSaleData] = useState({ concept: '', total: '', method: 'efectivo' });
  const [expenseData, setExpenseData] = useState({ description: '', amount: '', category: '' });
  const [saving, setSaving] = useState(false);

  const currentShift = shifts[shiftIdx] ?? null;
  const isShiftOpen = currentShift ? !currentShift.closed_at : false;
  const isToday = selectedDate === getARDate();

  const fp = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;
  const fd = (s: string) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
  const ft = (s: string) =>
    new Date(s).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });

  const liveSummary = useMemo(() => {
    if (!currentShift) return null;
    if (currentShift.closed_at && currentShift.summary) return currentShift.summary;
    const apertura = orders.find((o: any) => o.order_type === 'apertura');
    return buildShiftSummary(orders, expenses, deliveryCost, Number(apertura?.total ?? 0));
  }, [orders, expenses, currentShift, deliveryCost]);

  const loadShiftData = async (shift_id: string) => {
    const [{ data: ords }, expRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('shift_id', shift_id)
        .not('status', 'in', '("pendiente","cancelado")')
        .order('created_at', { ascending: false }),
      fetch(`/api/cash/expenses?shift_id=${shift_id}`),
    ]);
    const exps = await expRes.json();
    setOrders(ords ?? []);
    setExpenses(Array.isArray(exps) ? exps : []);
  };

  const loadData = async (date: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rest } = await supabase
        .from('restaurants')
        .select('id, subscription_plan, delivery_cost, cash_close_hour')
        .eq('user_id', user.id)
        .single();

      if (!rest) return;

      setRestaurantId(rest.id);
      setDeliveryCost(Number(rest.delivery_cost ?? 0));
      const closeHour = rest.cash_close_hour?.slice(0, 5) ?? '00:00';
      setCashCloseHour(closeHour);

      const isSuperAdmin = user.email === 'luchiimee2@gmail.com';
      const locked = rest.subscription_plan === 'light' && !isSuperAdmin;
      setIsLocked(locked);
      if (locked) return;

      const { start, end } = getCashShiftRange(date, closeHour);
      const { data: dayShifts } = await supabase
        .from('cash_shifts')
        .select('*')
        .eq('restaurant_id', rest.id)
        .gte('opened_at', start)
        .lt('opened_at', end)
        .order('opened_at', { ascending: true });

      const list = dayShifts ?? [];
      setShifts(list);
      const newIdx = list.length > 0 ? list.length - 1 : 0;
      setShiftIdx(newIdx);

      if (list.length > 0) {
        await loadShiftData(list[newIdx].id);
      } else {
        setOrders([]);
        setExpenses([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(selectedDate); }, [selectedDate]);

  const goToShift = async (idx: number) => {
    setShiftIdx(idx);
    await loadShiftData(shifts[idx].id);
  };

  const handleOpenCaja = async () => {
    setSaving(true);
    const res = await fetch('/api/cash/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opening_balance: Number(aperturaAmount) || 0 }),
    });
    if (res.ok) {
      setShowAperturaModal(false);
      setAperturaAmount('');
      await loadData(selectedDate);
    } else {
      const err = await res.json();
      alert(err.error ?? 'Error al abrir la caja');
    }
    setSaving(false);
  };

  const handleCloseCaja = async () => {
    if (!currentShift) return;
    setSaving(true);
    const res = await fetch('/api/cash/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift_id: currentShift.id }),
    });
    if (res.ok) {
      setShowCloseConfirm(false);
      await loadData(selectedDate);
    } else {
      const err = await res.json();
      alert(err.error ?? 'Error al cerrar la caja');
    }
    setSaving(false);
  };

  const handleManualSale = async () => {
    if (!saleData.total || !restaurantId) return;
    setSaving(true);
    const { data, error } = await supabase.from('orders').insert({
      restaurant_id: restaurantId,
      total: Number(saleData.total),
      order_type: 'mostrador',
      customer_name: saleData.concept || 'Venta Manual',
      payment_method: saleData.method,
      status: 'completado',
      items: [],
      shift_id: currentShift?.id ?? null,
    }).select().single();
    if (!error && data) {
      setOrders((prev: any[]) => [data, ...prev]);
      setShowSaleModal(false);
      setSaleData({ concept: '', total: '', method: 'efectivo' });
    }
    setSaving(false);
  };

  const handleAddExpense = async () => {
    if (!expenseData.description || !expenseData.amount || !currentShift) return;
    setSaving(true);
    const res = await fetch('/api/cash/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shift_id: currentShift.id,
        description: expenseData.description,
        amount: Number(expenseData.amount),
        category: expenseData.category || null,
      }),
    });
    if (res.ok) {
      const newExp = await res.json();
      setExpenses((prev: any[]) => [...prev, newExp]);
      setShowExpenseModal(false);
      setExpenseData({ description: '', amount: '', category: '' });
    }
    setSaving(false);
  };

  const handleDeleteExpense = async (expense_id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    const res = await fetch(`/api/cash/expenses?expense_id=${expense_id}`, { method: 'DELETE' });
    if (res.ok) setExpenses((prev: any[]) => prev.filter((e: any) => e.id !== expense_id));
  };

  const handleUpdateOpeningBalance = async () => {
    if (!currentShift || balanceInput === '') return;
    setSaving(true);
    const { error } = await supabase
      .from('cash_shifts')
      .update({ opening_balance: Number(balanceInput) })
      .eq('id', currentShift.id);
    if (!error) {
      setShifts(prev => prev.map((s, i) =>
        i === shiftIdx ? { ...s, opening_balance: Number(balanceInput) } : s
      ));
      setShowBalanceModal(false);
      setBalanceInput('');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="h-[80vh] flex items-center justify-center text-gray-400">
      <Loader2 className="animate-spin" size={40} />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto min-h-screen relative font-sans">

      {/* LOCK MODAL */}
      {isLocked && (
        <div className="fixed inset-0 z-[150] backdrop-blur-sm bg-white/60 flex items-center justify-center p-4">
          <div className="bg-white shadow-2xl p-10 rounded-[2.5rem] max-w-md w-full text-center border border-gray-100 relative animate-in zoom-in-95 duration-300">
            <button onClick={() => router.push('/dashboard')} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-5 text-blue-600">
              <Calculator size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tighter uppercase italic text-gray-900">Control de Caja</h2>
            <p className="text-gray-500 mb-8 text-sm font-medium">Las métricas y arqueo de caja son exclusivos del <b>Plan Plus</b>.</p>
            <div className="flex flex-col gap-3">
              <Link href="/dashboard/settings" className="w-full py-4 rounded-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                Actualizar a Plus <Zap size={18} fill="currentColor" />
              </Link>
              <button onClick={() => router.push('/dashboard')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 hover:text-gray-600 transition">
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`space-y-6 pb-12 pt-6 md:pt-2 px-4 transition-all duration-500 ${isLocked ? 'blur-sm pointer-events-none opacity-50 select-none overflow-hidden h-screen' : ''}`}>

        {/* DATE NAV + ACTIONS */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-3xl border shadow-sm gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => {
                const d = new Date(selectedDate + 'T12:00:00');
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft /></button>
              <div className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer hover:bg-gray-50 px-3 py-1 rounded-xl transition-all relative" onClick={() => dateInputRef.current?.showPicker()}>
                <CalendarIcon size={20} className="text-violet-600" />
                <span className="text-lg">{fd(selectedDate)}</span>
                <input ref={dateInputRef} type="date" className="absolute opacity-0 pointer-events-none" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
              <button onClick={() => {
                const d = new Date(selectedDate + 'T12:00:00');
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight /></button>
            </div>

            <div className="flex gap-2 w-full md:w-auto flex-wrap justify-end">
              {isToday && !currentShift && (
                <button onClick={() => setShowAperturaModal(true)} className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-orange-500 text-white shadow-lg shadow-orange-100 hover:bg-orange-600 active:scale-95 transition-all">
                  <Calculator size={18} /> Iniciar Caja
                </button>
              )}
              {currentShift && isShiftOpen && isToday && (
                <button onClick={() => setShowCloseConfirm(true)} className="flex-1 md:flex-none px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-red-500 text-white shadow-lg shadow-red-100 hover:bg-red-600 active:scale-95 transition-all">
                  <Lock size={16} /> Cerrar Caja
                </button>
              )}
              {currentShift && isShiftOpen && (
                <>
                  <button onClick={() => setShowSaleModal(true)} className="flex-1 md:flex-none bg-gray-900 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95">
                    <Plus size={16} /> Venta
                  </button>
                  <button onClick={() => setShowExpenseModal(true)} className="flex-1 md:flex-none bg-white border-2 border-red-100 text-red-500 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-all active:scale-95">
                    <TrendingDown size={16} /> Gasto
                  </button>
                </>
              )}
              {currentShift && !isShiftOpen && (
                <span className="px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest bg-gray-100 text-gray-500 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-500" /> Caja Cerrada
                </span>
              )}
            </div>
          </div>

          {shifts.length > 1 && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-100 self-start">
              <button onClick={() => shiftIdx > 0 && goToShift(shiftIdx - 1)} disabled={shiftIdx === 0} className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button>
              <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest px-2">
                Turno {shiftIdx + 1} / {shifts.length}
              </span>
              <button onClick={() => shiftIdx < shifts.length - 1 && goToShift(shiftIdx + 1)} disabled={shiftIdx === shifts.length - 1} className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors"><ChevronRight size={14} /></button>
            </div>
          )}
        </div>

        {/* NO SHIFT */}
        {!currentShift && (
          <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-16 text-center">
            <Calculator size={40} className="text-gray-200 mx-auto mb-4" />
            <p className="font-black text-gray-400 uppercase tracking-widest text-sm">Sin caja para este día</p>
            {isToday && (
              <button onClick={() => setShowAperturaModal(true)} className="mt-6 px-8 py-3 bg-orange-500 text-white rounded-2xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 active:scale-95">
                Iniciar Caja
              </button>
            )}
          </div>
        )}

        {/* SHIFT EXISTS */}
        {currentShift && liveSummary && (
          <>
            {/* TOP CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white p-5 md:p-6 rounded-3xl border-2 border-green-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Banknote size={80} className="text-green-600" /></div>
                <p className="text-xs font-bold text-green-600 uppercase mb-1 flex items-center gap-1"><ArrowDownRight size={14} /> Efectivo</p>
                <p className="text-3xl md:text-4xl font-black text-gray-900">{fp(liveSummary.byPaymentMethod.efectivo + liveSummary.openingBalance)}</p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Ventas efectivo + inicio de caja</p>
              </div>
              <div className="bg-white p-5 md:p-6 rounded-3xl border-2 border-blue-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CreditCard size={80} className="text-blue-600" /></div>
                <p className="text-xs font-bold text-blue-600 uppercase mb-1 flex items-center gap-1"><ArrowUpRight size={14} /> Digital</p>
                <p className="text-3xl md:text-4xl font-black text-gray-900">{fp(liveSummary.byPaymentMethod.tarjeta + liveSummary.byPaymentMethod.transferencia)}</p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Transferencias y tarjetas</p>
              </div>
              <div className="bg-violet-600 p-5 md:p-6 rounded-3xl text-white shadow-xl shadow-violet-100 flex flex-col justify-center">
                <p className="text-xs font-bold text-violet-200 uppercase mb-1">Total Vendido</p>
                <p className="text-3xl md:text-4xl font-black">{fp(liveSummary.totalSales)}</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-violet-100">
                  <CheckCircle2 size={12} /> {liveSummary.orderCount} {liveSummary.orderCount === 1 ? 'operación' : 'operaciones'}
                </div>
              </div>
              {/* 4ta card: NETO — placeholder si abierto, valor real si cerrado */}
              <div className={`p-5 md:p-6 rounded-3xl shadow-sm flex flex-col justify-center ${
                isShiftOpen
                  ? 'bg-gray-50 border-2 border-dashed border-gray-200'
                  : liveSummary.netProfit >= 0
                    ? 'bg-green-600 shadow-xl shadow-green-100'
                    : 'bg-red-500 shadow-xl shadow-red-100'
              }`}>
                <p className={`text-xs font-bold uppercase mb-1 ${isShiftOpen ? 'text-gray-400' : 'text-white/80'}`}>
                  Neto
                </p>
                {isShiftOpen ? (
                  <>
                    <p className="text-3xl md:text-4xl font-black text-gray-300">—</p>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">Disponible al cerrar</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl md:text-4xl font-black text-white">{fp(liveSummary.netProfit)}</p>
                    <p className="text-[10px] text-white/70 mt-2 font-medium">Ventas − gastos − delivery</p>
                  </>
                )}
              </div>
            </div>

            {/* BANNER: TURNO ABIERTO AUTOMÁTICAMENTE */}
            {isShiftOpen && currentShift.opened_type === 'auto' && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 flex items-start gap-4 animate-in fade-in duration-300">
                <div className="bg-amber-400 p-2.5 rounded-2xl shrink-0 mt-0.5">
                  <AlertCircle size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-amber-900 uppercase tracking-tight text-sm">Turno abierto automáticamente</p>
                  <p className="text-amber-700 text-xs font-medium leading-relaxed mt-1">
                    Este turno se abrió con el primer pedido del día — el monto de cambio inicial quedó en $0.
                    Actualizalo para un arqueo correcto.
                  </p>
                </div>
                <button
                  onClick={() => { setBalanceInput(String(currentShift.opening_balance ?? 0)); setShowBalanceModal(true); }}
                  className="shrink-0 px-4 py-2 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all active:scale-95 whitespace-nowrap"
                >
                  Editar cambio
                </button>
              </div>
            )}

            {/* CLOSED BANNER */}
            {!isShiftOpen && (
              <div className="bg-gray-900 text-white rounded-3xl p-5 flex items-center gap-4">
                <div className="bg-green-500 p-3 rounded-2xl shrink-0"><CheckCircle2 size={22} /></div>
                <div>
                  <p className="font-black uppercase tracking-tight">Caja cerrada — {currentShift.close_type === 'auto' ? 'Cierre automático' : 'Cierre manual'}</p>
                  <p className="text-[11px] text-gray-400 font-bold">
                    {new Date(currentShift.closed_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
                  </p>
                </div>
              </div>
            )}

            {/* 5 METRICS BREAKDOWN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sales by type */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Ventas por tipo</h3>
                <div className="space-y-2">
                  {(Object.entries(liveSummary.salesByType) as [string, any][]).map(([type, data]) => {
                    const meta = SALE_TYPE_META[type];
                    if (!meta || data.count === 0) return null;
                    const Icon = meta.Icon;
                    return (
                      <div key={type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-100 p-2 rounded-xl"><Icon size={14} className="text-gray-500" /></div>
                          <div>
                            <p className="font-black text-sm text-gray-800">{meta.label}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{data.count} {data.count === 1 ? 'pedido' : 'pedidos'}</p>
                          </div>
                        </div>
                        <span className="font-black text-gray-900">{fp(data.total)}</span>
                      </div>
                    );
                  })}
                  {liveSummary.orderCount === 0 && (
                    <p className="text-[11px] text-gray-300 text-center py-4 font-bold uppercase">Sin ventas en este turno</p>
                  )}
                </div>
              </div>

              {/* Payment methods + net profit */}
              <div className="space-y-4">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Por método de pago</h3>
                  <div className="space-y-2">
                    {[
                      { key: 'efectivo',       label: 'Efectivo',       color: 'text-green-600' },
                      { key: 'tarjeta',         label: 'Tarjeta',        color: 'text-blue-600' },
                      { key: 'transferencia',   label: 'Transferencia',  color: 'text-purple-600' },
                    ].map(({ key, label, color }) => (
                      <div key={key} className="flex justify-between items-center py-1.5">
                        <span className={`text-xs font-black uppercase ${color}`}>{label}</span>
                        <span className="font-black text-gray-900 text-sm">{fp((liveSummary.byPaymentMethod as any)[key])}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Resumen del turno</p>

                  {/* Ventas totales */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ventas totales</span>
                    <span className="text-sm font-black text-gray-900">{fp(liveSummary.totalSales)}</span>
                  </div>

                  {/* Gastos */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Gastos</span>
                    <span className={`text-sm font-black ${liveSummary.totalExpenses > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      -{fp(liveSummary.totalExpenses)}
                    </span>
                  </div>

                  {/* Costo delivery — solo si aplica */}
                  {deliveryCost > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Costo delivery{liveSummary.deliveryCount > 0 ? ` (${liveSummary.deliveryCount})` : ''}
                      </span>
                      <span className={`text-sm font-black ${liveSummary.deliveryCostTotal > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        -{fp(liveSummary.deliveryCostTotal)}
                      </span>
                    </div>
                  )}

                  {/* Separador */}
                  <div className="border-t-2 border-dashed border-gray-200 pt-3 mt-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Ganancia Neta</span>
                      <span className={`text-2xl font-black ${liveSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {fp(liveSummary.netProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* EXPENSES */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Receipt size={20} className="text-red-400" /> Gastos del Turno
                  {liveSummary.totalExpenses > 0 && (
                    <span className="text-sm font-black text-red-500 ml-1">{fp(liveSummary.totalExpenses)}</span>
                  )}
                </h3>
                {isShiftOpen && (
                  <button onClick={() => setShowExpenseModal(true)} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-700 flex items-center gap-1 transition-colors">
                    <Plus size={12} /> Agregar
                  </button>
                )}
              </div>
              {expenses.length === 0 ? (
                <p className="text-center text-gray-300 font-bold py-8 text-[11px] uppercase tracking-widest">Sin gastos registrados</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {expenses.map((exp: any) => (
                    <div key={exp.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50/50 group transition-colors">
                      <div>
                        <p className="font-bold text-sm text-gray-800">{exp.description}</p>
                        {exp.category && <p className="text-[10px] text-gray-400 font-bold uppercase">{exp.category}</p>}
                        <p className="text-[10px] text-gray-400">{ft(exp.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-gray-900">{fp(Number(exp.amount))}</span>
                        {isShiftOpen && (
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HISTORY */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <History size={20} className="text-gray-400" /> Historial del Turno
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-[10px] uppercase text-gray-400 font-bold">
                    <tr>
                      <th className="px-6 py-4">Hora</th>
                      <th className="px-6 py-4">Concepto</th>
                      <th className="px-6 py-4">Pago</th>
                      <th className="px-6 py-4 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.length > 0 ? orders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-gray-400">{ft(o.created_at)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${o.order_type === 'apertura' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                              <Calculator size={16} />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-gray-900 leading-none">{o.customer_name}</p>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">{o.order_type}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                            o.payment_method === 'efectivo' ? 'bg-green-100 text-green-700' :
                            o.payment_method === 'tarjeta'  ? 'bg-blue-100 text-blue-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>{o.payment_method}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-gray-900">{fp(Number(o.total))}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="px-6 py-12 text-center opacity-20 font-bold">Sin movimientos en este turno</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL: APERTURA */}
      {showAperturaModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Iniciar Caja</h2>
            <p className="text-gray-500 text-sm mb-6 leading-tight">Ingresá el monto de efectivo (cambio) con el que arrancás el turno.</p>
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-black text-gray-300">$</span>
              <input type="number" value={aperturaAmount} onChange={(e) => setAperturaAmount(e.target.value)} className="w-full pl-10 pr-4 py-5 bg-gray-50 rounded-2xl text-4xl font-black outline-none focus:ring-4 ring-orange-100 border-none transition-all" placeholder="0" autoFocus />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAperturaModal(false)} className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
              <button onClick={handleOpenCaja} disabled={saving} className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin mx-auto" /> : 'Abrir Caja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CERRAR CONFIRM */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black text-gray-900 mb-2">¿Cerrar Caja?</h2>
            <p className="text-gray-500 text-sm mb-6 leading-tight">El resumen del turno quedará congelado. No podrás agregar más ventas ni gastos.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCloseConfirm(false)} className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
              <button onClick={handleCloseCaja} disabled={saving} className="flex-[2] bg-red-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-red-600 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin mx-auto" /> : 'Sí, cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VENTA */}
      {showSaleModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">Registrar Venta</h2>
              <button onClick={() => setShowSaleModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block ml-1">Concepto</label>
                <input type="text" value={saleData.concept} onChange={(e) => setSaleData({ ...saleData, concept: e.target.value })} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none focus:ring-2 ring-violet-500 transition-all" placeholder="Ej: 2 Burgers con Papas" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block ml-1">Monto Total</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                  <input type="number" value={saleData.total} onChange={(e) => setSaleData({ ...saleData, total: e.target.value })} className="w-full pl-8 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-2xl font-black outline-none focus:ring-2 ring-violet-500 transition-all" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block ml-1">Medio de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{ v: 'efectivo', l: 'Efectivo' }, { v: 'transferencia', l: 'Transf.' }, { v: 'tarjeta', l: 'Tarjeta' }].map(({ v, l }) => (
                    <button key={v} onClick={() => setSaleData({ ...saleData, method: v })} className={`py-3 rounded-xl border-2 font-bold text-xs transition-all ${saleData.method === v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-100 text-gray-400'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <button onClick={handleManualSale} disabled={saving} className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-violet-700 transition-all shadow-lg shadow-violet-100 mt-4 active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin mx-auto" /> : 'Confirmar Venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GASTO */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">Registrar Gasto</h2>
              <button onClick={() => setShowExpenseModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block ml-1">Descripción *</label>
                <input type="text" value={expenseData.description} onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none focus:ring-2 ring-red-300 transition-all" placeholder="Ej: Limpieza, Insumos..." autoFocus />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block ml-1">Categoría (opcional)</label>
                <input type="text" value={expenseData.category} onChange={(e) => setExpenseData({ ...expenseData, category: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none focus:ring-2 ring-red-300 transition-all" placeholder="Ej: Servicios, Personal..." />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block ml-1">Importe *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                  <input type="number" value={expenseData.amount} onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })} className="w-full pl-8 pr-4 py-4 bg-gray-50 rounded-2xl text-2xl font-black outline-none focus:ring-2 ring-red-300 transition-all" placeholder="0" />
                </div>
              </div>
              <button onClick={handleAddExpense} disabled={saving || !expenseData.description || !expenseData.amount} className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-red-600 transition-all shadow-lg mt-4 active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin mx-auto" /> : 'Registrar Gasto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR MONTO INICIAL (turno auto-abierto) */}
      {showBalanceModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Monto de Cambio Inicial</h2>
            <p className="text-gray-500 text-sm mb-6 leading-tight">
              Ingresá el efectivo con el que arrancó el turno para un arqueo correcto.
            </p>
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-black text-gray-300">$</span>
              <input
                type="number"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                className="w-full pl-10 pr-4 py-5 bg-gray-50 rounded-2xl text-4xl font-black outline-none focus:ring-4 ring-amber-100 border-none transition-all"
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBalanceModal(false)} className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
              <button onClick={handleUpdateOpeningBalance} disabled={saving} className="flex-[2] bg-amber-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin mx-auto" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
