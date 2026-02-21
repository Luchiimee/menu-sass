'use client';

export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link'

import { useEffect, useState, useMemo, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
    Loader2, TrendingUp, ShoppingBag, Banknote, CreditCard, 
    Calculator, Plus, X, Save, History, ArrowUpRight, ArrowDownRight, 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Zap 
} from 'lucide-react';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  
  // Control de Fecha (ISO para la lógica interna)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Modales
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showAperturaModal, setShowAperturaModal] = useState(false);
  
  // Datos de formularios
  const [saleData, setSaleData] = useState({ concept: '', total: '', method: 'efectivo' });
  const [aperturaAmount, setAperturaAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- FUNCIÓN PARA MOSTRAR FECHA EN DD/MM/AAAA ---
  const formatDateDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

const loadData = async (date: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Pedimos el ID y el PLAN
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id, subscription_plan')
        .eq('user_id', user.id)
        .single();

      if (rest) {
        setRestaurantId(rest.id);
        
        // --- LÓGICA DE BLOQUEO ---
        const isSuperAdmin = user.email === 'luchiimee2@gmail.com';
        const shouldBeLocked = rest.subscription_plan === "light" && !isSuperAdmin;
        setIsLocked(shouldBeLocked);

        if (!shouldBeLocked) {
          const { data: ords } = await supabase
            .from('orders')
            .select('*')
            .eq('restaurant_id', rest.id)
            .gte('created_at', `${date}T00:00:00`)
            .lte('created_at', `${date}T23:59:59`)
            .neq('status', 'cancelado');
          
          setOrders(ords || []);
        }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };


const router = useRouter(); // Inicializar router
  const [isLocked, setIsLocked] = useState(true); // Nuevo estado de bloqueo


  useEffect(() => { loadData(selectedDate); }, [selectedDate]);

  // --- CÁLCULOS INTELIGENTES (Cazador de pagos) ---
  const totals = useMemo(() => {
      const opening = orders.find(o => o.order_type === 'apertura');
      const openingBalance = opening ? Number(opening.total) : 0;
      
      const sales = orders.filter(o => o.order_type !== 'apertura');
      
      // Suma Efectivo: Mostrador + Pedidos detectados como Efectivo por el sistema
      const cashSales = sales.filter(o => o.payment_method === 'efectivo').reduce((acc, o) => acc + Number(o.total), 0);
      
      // Suma Digital: Transferencias, MP, Tarjetas detectadas
      const digitalSales = sales.filter(o => o.payment_method === 'transferencia' || o.payment_method === 'tarjeta').reduce((acc, o) => acc + Number(o.total), 0);
      
      return {
          openingBalance,
          cashInDrawer: openingBalance + cashSales, 
          digitalMoney: digitalSales, 
          totalSales: cashSales + digitalSales, 
          isBoxOpen: !!opening
      };
  }, [orders]);

  const handleApertura = async () => {
      if (!aperturaAmount || !restaurantId) return;
      setSaving(true);
      const { data, error } = await supabase.from('orders').insert({
          restaurant_id: restaurantId,
          total: Number(aperturaAmount),
          order_type: 'apertura',
          customer_name: 'MONTO INICIAL (CAMBIO)',
          payment_method: 'efectivo',
          status: 'completado'
      }).select().single();

      if (!error) {
          setOrders([...orders, data]);
          setShowAperturaModal(false);
          setAperturaAmount('');
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
          items: []
      }).select().single();

      if (!error) {
          setOrders([data, ...orders]);
          setShowSaleModal(false);
          setSaleData({ concept: '', total: '', method: 'efectivo' });
      }
      setSaving(false);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400"/></div>;
return (
    <div className="max-w-6xl mx-auto min-h-screen relative font-sans">
        
        {/* --- 1. MODAL DE BLOQUEO (SE MUESTRA SI ES PLAN LIGHT) --- */}
        {isLocked && (
            <div className="fixed inset-0 z-[150] backdrop-blur-sm bg-white/60 flex items-center justify-center p-4">
                <div className="bg-white shadow-2xl p-10 rounded-[2.5rem] max-w-md w-full text-center border border-gray-100 relative animate-in zoom-in-95 duration-300">
                    
                    <button 
                        onClick={() => router.push('/dashboard')} 
                        className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>

                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-5 text-blue-600">
                        <Calculator size={32} />
                    </div>

                    <h2 className="text-2xl font-bold mb-2 tracking-tighter uppercase italic text-gray-900">Control de Caja</h2>
                    <p className="text-gray-500 mb-8 text-sm font-medium">Las métricas y arqueo de caja son exclusivos del <b>Plan Plus</b>.</p>
                    
                    <div className="flex flex-col gap-3">
                        <Link 
                            href="/dashboard/settings" 
                            className="w-full py-4 rounded-2xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                        >
                            Actualizar a Plus <Zap size={18} fill="currentColor" />
                        </Link>
                        <button 
                            onClick={() => router.push('/dashboard')} 
                            className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 hover:text-gray-600 transition"
                        >
                            Volver al inicio
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- 2. CONTENIDO PRINCIPAL (SE DESENFOCA SI ESTÁ BLOQUEADO) --- */}
        <div className={`space-y-6 pb-12 pt-6 px-4 transition-all duration-500 ${isLocked ? "blur-sm pointer-events-none opacity-50 select-none overflow-hidden h-screen" : ""}`}>
            
            {/* BARRA DE NAVEGACIÓN DE FECHA */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-3xl border shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() - 1);
                        setSelectedDate(d.toISOString().split('T')[0]);
                    }} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft/></button>
                    
                    <div className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer hover:bg-gray-50 px-3 py-1 rounded-xl transition-all relative" onClick={() => dateInputRef.current?.showPicker()}>
                        <CalendarIcon size={20} className="text-violet-600"/>
                        <span className="text-lg">{formatDateDisplay(selectedDate)}</span>
                        <input ref={dateInputRef} type="date" className="absolute opacity-0 pointer-events-none" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                    </div>

                    <button onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() + 1);
                        setSelectedDate(d.toISOString().split('T')[0]);
                    }} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight/></button>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    {selectedDate === new Date().toISOString().split('T')[0] && (
                        <button 
                            onClick={() => setShowAperturaModal(true)} 
                            className={`flex-1 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                                totals.isBoxOpen ? 'bg-green-600 text-white shadow-green-100 hover:bg-green-700' : 'bg-orange-500 text-white shadow-orange-100 hover:bg-orange-600'
                            }`}
                        >
                            <Calculator size={18}/> 
                            {totals.isBoxOpen ? 'Caja Abierta' : 'Iniciar Caja'}
                        </button>
                    )}
                    <button onClick={() => setShowSaleModal(true)} className="flex-1 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95">
                        <Plus size={18}/> Venta Mostrador
                    </button>
                </div>
            </div>

            {/* TARJETAS DE DINERO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border-2 border-green-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Banknote size={80} className="text-green-600"/></div>
                    <p className="text-xs font-bold text-green-600 uppercase mb-1 flex items-center gap-1"><ArrowDownRight size={14}/> Efectivo Físico</p>
                    <p className="text-4xl font-black text-gray-900">${totals.cashInDrawer.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">Incluye inicio de caja + pedidos de repartidores.</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CreditCard size={80} className="text-blue-600"/></div>
                    <p className="text-xs font-bold text-blue-600 uppercase mb-1 flex items-center gap-1"><ArrowUpRight size={14}/> Digital (Bancos)</p>
                    <p className="text-4xl font-black text-gray-900">${totals.digitalMoney.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">Transferencias, Alias y Mercado Pago.</p>
                </div>

                <div className="bg-violet-600 p-6 rounded-3xl text-white shadow-xl shadow-violet-100 flex flex-col justify-center">
                    <p className="text-xs font-bold text-violet-200 uppercase mb-1">Total Vendido</p>
                    <p className="text-4xl font-black">${totals.totalSales.toLocaleString()}</p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-violet-100">
                        <CheckCircle2 size={12}/> {orders.filter(o => o.order_type !== 'apertura').length} operaciones exitosas
                    </div>
                </div>
            </div>

            {/* TABLA DE HISTORIAL */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2"><History size={20} className="text-gray-400"/> Historial del Día</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[10px] uppercase text-gray-400 font-bold">
                            <tr>
                                <th className="px-6 py-4">Hora</th>
                                <th className="px-6 py-4">Concepto / Producto</th>
                                <th className="px-6 py-4">Pago</th>
                                <th className="px-6 py-4 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {orders.length > 0 ? (
                                orders.sort((a,b) => b.created_at.localeCompare(a.created_at)).map(o => (
                                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-xs font-bold text-gray-400">{new Date(o.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${o.order_type === 'apertura' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}><Calculator size={16}/></div>
                                                <div><p className="font-bold text-sm text-gray-900 leading-none">{o.customer_name}</p><span className="text-[10px] font-bold text-gray-400 uppercase">{o.order_type}</span></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${o.payment_method === 'efectivo' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{o.payment_method}</span></td>
                                        <td className="px-6 py-4 text-right font-black text-gray-900">${Number(o.total).toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={4} className="px-6 py-12 text-center opacity-20 font-bold">No hay movimientos registrados</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* --- 3. MODALES DE FORMULARIO (FUERA DEL BLUR PARA QUE FUNCIONEN BIEN) --- */}
        {showAperturaModal && (
            <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Iniciar Caja</h2>
                    <p className="text-gray-500 text-sm mb-6 leading-tight">Ingresa el monto de efectivo (cambio) con el que arrancas el turno.</p>
                    <div className="relative mb-6">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-black text-gray-300">$</span>
                        <input type="number" value={aperturaAmount} onChange={(e)=>setAperturaAmount(e.target.value)} className="w-full pl-10 pr-4 py-5 bg-gray-50 rounded-2xl text-4xl font-black outline-none focus:ring-4 ring-orange-100 border-none transition-all" placeholder="0" autoFocus />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowAperturaModal(false)} className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
                        <button onClick={handleApertura} disabled={saving} className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 active:scale-95 disabled:opacity-50">
                            {saving ? <Loader2 className="animate-spin mx-auto"/> : 'Abrir Caja'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {showSaleModal && (
            <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black">Registrar Venta</h2>
                        <button onClick={()=>setShowSaleModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={20}/></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block ml-1">Concepto o Producto</label>
                            <input type="text" value={saleData.concept} onChange={(e)=>setSaleData({...saleData, concept: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold outline-none focus:ring-2 ring-violet-500 transition-all" placeholder="Ej: 2 Burgers con Papas" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block ml-1">Monto Total</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                                <input type="number" value={saleData.total} onChange={(e)=>setSaleData({...saleData, total: e.target.value})} className="w-full pl-8 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-2xl font-black outline-none focus:ring-2 ring-violet-500 transition-all" placeholder="0" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block ml-1">Medio de Pago</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={()=>setSaleData({...saleData, method:'efectivo'})} className={`py-3 rounded-xl border-2 font-bold text-xs transition-all ${saleData.method === 'efectivo' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400'}`}>EFECTIVO</button>
                                <button onClick={()=>setSaleData({...saleData, method:'transferencia'})} className={`py-3 rounded-xl border-2 font-bold text-xs transition-all ${saleData.method === 'transferencia' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400'}`}>TRANSFERENCIA</button>
                            </div>
                        </div>
                        <button onClick={handleManualSale} disabled={saving} className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-violet-700 transition-all shadow-lg shadow-violet-100 mt-4 active:scale-95 disabled:opacity-50">
                            {saving ? <Loader2 className="animate-spin mx-auto"/> : 'Confirmar Venta'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}