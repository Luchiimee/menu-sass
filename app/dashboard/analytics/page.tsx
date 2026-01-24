'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
    Loader2, TrendingUp, DollarSign, ShoppingBag, Calendar, BarChart3, 
    Lock, Zap, Receipt, CreditCard, Banknote, Download, Plus, Store, X, Calculator 
} from 'lucide-react';
import Link from 'next/link';
import { 
    ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip 
} from 'recharts';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // --- ESTADOS PARA FILTROS DE FECHA ---
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // --- ESTADOS PARA VENTA MANUAL ---
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTotalCount, setManualTotalCount] = useState(''); // Lo que el usuario cuenta
  const [manualPayment, setManualPayment] = useState('efectivo'); 
  const [savingManual, setSavingManual] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: rest } = await supabase
            .from('restaurants')
            .select('id, subscription_plan')
            .eq('user_id', user.id)
            .single();

        if (rest) {
            setRestaurantId(rest.id);
            if (rest.subscription_plan === 'plus' || rest.subscription_plan === 'max') {
                setIsLocked(false);
                const { data: ords } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('restaurant_id', rest.id)
                    .eq('status', 'completado') 
                    .order('created_at', { ascending: false });
                
                setOrders(ords || []);
            } else {
                setIsLocked(true);
            }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- LÓGICA DE DATOS ---
  const { kpi, chartData, productBreakdown, paymentMethods, filteredOrders } = useMemo(() => {
      const start = new Date(startDate);
      start.setHours(0,0,0,0);
      const end = new Date(endDate);
      end.setHours(23,59,59,999);

      const filtered = orders.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= start && orderDate <= end;
      });

      const totalRevenue = filtered.reduce((acc, curr) => acc + Number(curr.total), 0);
      const totalOrders = filtered.length;
      const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const cashTotal = filtered
        .filter(o => o.payment_method === 'efectivo')
        .reduce((acc, curr) => acc + Number(curr.total), 0);
        
      const digitalTotal = filtered
        .filter(o => o.payment_method === 'transferencia' || o.payment_method === 'tarjeta')
        .reduce((acc, curr) => acc + Number(curr.total), 0);

      // Gráfico
      const ordersForChart = [...filtered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const chartMap = new Map();
      ordersForChart.forEach(o => {
          const date = new Date(o.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
          chartMap.set(date, (chartMap.get(date) || 0) + Number(o.total));
      });
      const chartData = Array.from(chartMap, ([name, value]) => ({ name, value }));

      // Productos
      const productMap = new Map();
      filtered.forEach(order => {
          if (order.items && Array.isArray(order.items) && order.items.length > 0) {
              order.items.forEach((item: any) => {
                  const current = productMap.get(item.name) || { quantity: 0, revenue: 0 };
                  productMap.set(item.name, {
                      quantity: current.quantity + Number(item.quantity),
                      revenue: current.revenue + (Number(item.price) * Number(item.quantity))
                  });
              });
          }
      });
      const productBreakdown = Array.from(productMap, ([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10); 

      return {
          kpi: { totalRevenue, totalOrders, avgTicket },
          paymentMethods: { cashTotal, digitalTotal },
          chartData,
          productBreakdown,
          filteredOrders: filtered
      };
  }, [orders, startDate, endDate]);

  // --- CÁLCULO INTELIGENTE (LIMPIEZA DE PUNTOS Y COMAS) ---
  const amountToRegister = useMemo(() => {
      // 1. Limpiamos cualquier cosa que no sea número (puntos, comas, letras)
      // Ej: "100.000" -> "100000" | "100,000" -> "100000"
      const cleanValue = manualTotalCount.replace(/\D/g, ''); 
      const inputVal = Number(cleanValue);

      if (isNaN(inputVal) || inputVal === 0) return 0;

      if (manualPayment === 'efectivo') {
          const diff = inputVal - paymentMethods.cashTotal;
          return Math.max(0, diff); 
      }
      return inputVal;
  }, [manualTotalCount, manualPayment, paymentMethods.cashTotal]);


  const handleAddManualSale = async () => {
      if (!amountToRegister && manualPayment !== 'efectivo') return alert("Ingresa un monto válido");
      // Permitimos registrar 0 si es efectivo (ajuste nulo) pero mejor avisar
      if (amountToRegister === 0 && manualPayment === 'efectivo') {
          return alert("El monto ingresado coincide con el sistema. No hay diferencias para registrar.");
      }
      if (!restaurantId) return;

      setSavingManual(true);
      try {
          const { data: newSale, error } = await supabase.from('orders').insert({
              restaurant_id: restaurantId,
              status: 'completado',
              total: amountToRegister,
              payment_method: manualPayment,
              order_type: 'mostrador',
              customer_name: 'Venta de Mostrador',
              items: [] 
          }).select().single();

          if (error) throw error;

          if (newSale) {
              setOrders([newSale, ...orders]);
              setShowManualModal(false);
              setManualTotalCount('');
              alert(`✅ Caja ajustada. Se agregaron $${amountToRegister.toLocaleString()} al sistema.`);
          }
      } catch (error: any) {
          alert("Error: " + error.message);
      } finally {
          setSavingManual(false);
      }
  };

  const handleExport = (filteredData: any[]) => {
      if (filteredData.length === 0) return alert("No hay datos para exportar.");
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "ID,Fecha,Tipo,Cliente,Metodo Pago,Total\n";
      filteredData.forEach(row => {
          const date = new Date(row.created_at).toLocaleDateString('es-AR');
          const type = row.order_type || 'delivery';
          const client = row.customer_name || 'Anónimo';
          const payment = row.payment_method || 'efectivo';
          const total = row.total;
          csvContent += `${row.id},${date},${type},${client},${payment},${total}\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `caja_snappy_${startDate}_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400"/></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 relative min-h-[80vh]">
        
        {isLocked && (
            <div className="absolute inset-0 z-50 backdrop-blur-sm bg-white/60 flex items-center justify-center rounded-3xl overflow-hidden p-4">
                <div className="bg-white shadow-2xl p-8 rounded-3xl max-w-md w-full text-center border border-gray-100 animate-in zoom-in-95">
                    <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-5 text-purple-600">
                        <BarChart3 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-3 text-gray-900">Control de Caja Total</h2>
                    <p className="text-gray-500 mb-8 text-base">
                        Gestiona ventas online y de mostrador, exporta reportes y analiza tu negocio con el <b>Plan Plus</b>.
                    </p>
                    <Link href="/dashboard/settings" className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 bg-black text-white hover:bg-gray-800">
                        Desbloquear Métricas <Zap size={20} fill="currentColor"/>
                    </Link>
                </div>
            </div>
        )}

        <div className={`${isLocked ? 'blur-md opacity-50 pointer-events-none' : ''} space-y-6`}>
            
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="text-gray-400"/> Caja & Métricas
                    </h1>
                    <p className="text-gray-500 text-sm">Control unificado de ventas online y mostrador.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="bg-white border p-1 rounded-xl flex items-center gap-2 shadow-sm">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs font-bold bg-transparent outline-none p-2 text-gray-600"/>
                        <span className="text-gray-300">-</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs font-bold bg-transparent outline-none p-2 text-gray-600"/>
                    </div>

                    <button onClick={() => setShowManualModal(true)} className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg whitespace-nowrap">
                        <Plus size={16}/> Cierre / Ingreso Manual
                    </button>
                    <button onClick={() => handleExport(filteredOrders)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-lg whitespace-nowrap">
                        <Download size={16}/> Excel
                    </button>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 bg-gray-900 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-wide flex items-center gap-2">
                            <Store size={16}/> Total Facturado
                        </p>
                        <p className="text-4xl font-black mt-2">${kpi.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="mt-4 flex gap-4 text-xs font-medium text-gray-400">
                        <span>{kpi.totalOrders} Operaciones</span>
                        <span>•</span>
                        <span>Ticket Prom: ${Math.round(kpi.avgTicket).toLocaleString()}</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-green-600">
                        <Banknote size={20}/> <span className="font-bold text-sm">Caja Efectivo</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">${paymentMethods.cashTotal.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 mt-1 leading-tight">Total acumulado en efectivo (Sistema + Mostrador).</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-blue-600">
                        <CreditCard size={20}/> <span className="font-bold text-sm">Digital / Bancos</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">${paymentMethods.digitalTotal.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 mt-1 leading-tight">Transferencias y tarjetas.</p>
                </div>
            </div>

            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                        <ShoppingBag size={18} className="text-gray-400"/> Productos (Top 10)
                    </h3>
                    <div className="flex-1 overflow-auto custom-scrollbar max-h-[300px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Producto</th>
                                    <th className="px-4 py-3 text-center">Cant.</th>
                                    <th className="px-4 py-3 text-right rounded-r-lg">Generado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {productBreakdown.length > 0 ? (
                                    productBreakdown.map((prod, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 font-medium text-gray-900">{prod.name}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="bg-gray-100 px-2 py-1 rounded-md font-bold text-xs">{prod.quantity}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-700">${prod.revenue.toLocaleString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-10 text-center text-gray-400">Sin datos de productos.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-gray-400"/> Tendencia
                    </h3>
                    <div className="h-48 w-full flex-1 min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                                <XAxis dataKey="name" hide />
                                <Tooltip 
                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                    formatter={(value: any) => [`$${value}`, 'Ventas']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#000" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <Receipt size={18} className="text-gray-400"/> Movimientos (Detalle)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredOrders.slice(0, 12).map((order) => (
                        <div key={order.id} className="border rounded-xl p-3 flex justify-between items-center hover:bg-gray-50 transition group">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${order.payment_method === 'efectivo' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {order.payment_method === 'efectivo' ? <Banknote size={16}/> : <CreditCard size={16}/>}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900 flex items-center gap-1">
                                        {order.order_type === 'mostrador' ? 'Mostrador' : `Pedido #${order.id.slice(0,4)}`}
                                        {order.order_type === 'mostrador' && <span className="text-[10px] bg-gray-200 text-gray-600 px-1 rounded">MANUAL</span>}
                                    </p>
                                    <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})} • {order.customer_name || 'Cliente'}</p>
                                </div>
                            </div>
                            <span className="font-bold text-gray-900">${order.total}</span>
                        </div>
                    ))}
                    {filteredOrders.length === 0 && <p className="text-gray-400 text-sm col-span-full text-center py-4">Sin movimientos en este rango de fechas.</p>}
                </div>
            </div>

        </div>

        {/* --- MODAL VENTA MANUAL INTELIGENTE --- */}
        {showManualModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95">
                    <button onClick={() => setShowManualModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 bg-gray-50 rounded-full">
                        <X size={20}/>
                    </button>

                    <h2 className="text-xl font-bold mb-1">Cierre / Ingreso Manual</h2>
                    <p className="text-gray-500 text-sm mb-6">Ingresa el total que contaste en la caja.</p>

                    <div className="space-y-4">
                        
                        {manualPayment === 'efectivo' && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-3">
                                <Calculator className="text-orange-500 shrink-0" size={20}/>
                                <div>
                                    <p className="text-xs font-bold text-orange-800 uppercase">Detectado en Sistema</p>
                                    <p className="text-sm text-orange-700 leading-tight mt-1">
                                        Ya hay <b>${paymentMethods.cashTotal.toLocaleString()}</b> registrados.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                {manualPayment === 'efectivo' ? '¿Cuánto contaste en total?' : 'Monto de la Venta'}
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input 
                                    type="text" 
                                    value={manualTotalCount}
                                    onChange={(e) => setManualTotalCount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold outline-none focus:ring-2 ring-black/5 focus:border-black transition"
                                    placeholder="Ej: 100.000"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Método</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => setManualPayment('efectivo')}
                                    className={`py-3 rounded-xl text-sm font-bold border transition flex items-center justify-center gap-2 ${manualPayment === 'efectivo' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <Banknote size={18}/> Efectivo
                                </button>
                                <button 
                                    onClick={() => setManualPayment('tarjeta')}
                                    className={`py-3 rounded-xl text-sm font-bold border transition flex items-center justify-center gap-2 ${manualPayment === 'tarjeta' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <CreditCard size={18}/> Posnet/MP
                                </button>
                            </div>
                        </div>

                        {manualPayment === 'efectivo' && amountToRegister > 0 && (
                            <div className="text-center py-2">
                                <p className="text-xs text-gray-400">El sistema agregará una venta extra de:</p>
                                <p className="text-xl font-black text-green-600">
                                    ${amountToRegister.toLocaleString()}
                                </p>
                            </div>
                        )}

                        <button 
                            onClick={handleAddManualSale}
                            disabled={savingManual || (manualPayment === 'efectivo' && amountToRegister <= 0)}
                            className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition shadow-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {savingManual ? <Loader2 className="animate-spin" size={20}/> : <><Plus size={20}/> Registrar</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
}