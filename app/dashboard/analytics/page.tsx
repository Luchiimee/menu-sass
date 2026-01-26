'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
    Loader2, TrendingUp, ShoppingBag, BarChart3, 
    Zap, Receipt, CreditCard, Banknote, Download, Calculator, 
    Store, X, Info, ChevronDown, ChevronUp, Lock, Plus, Coins, Monitor, Calendar
} from 'lucide-react';
import Link from 'next/link';
import { 
    ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, Tooltip 
} from 'recharts';

// --- UTILIDAD: Fecha Local ---
const getLocalISO = (date?: Date) => {
    const d = date || new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() - offset);
    return localDate.toISOString().slice(0, 10);
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Filtros de fecha
  const [startDate, setStartDate] = useState(getLocalISO());
  const [endDate, setEndDate] = useState(getLocalISO());
  
  // Estado para saber qué botón está activo ("hoy", "ayer", "custom")
  const [activeFilter, setActiveFilter] = useState<'hoy' | 'ayer' | 'custom'>('hoy');

  // Estado para "Ver más" movimientos
  const [viewAllMovements, setViewAllMovements] = useState(false);

  // Estados Modal
  const [showModal, setShowModal] = useState(false);
  const [manualMode, setManualMode] = useState<'apertura' | 'cierre'>('cierre');
  const [amountInput, setAmountInput] = useState(''); 
  const [saving, setSaving] = useState(false);

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
                    .neq('status', 'cancelado') 
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

  // --- LÓGICA DE CÁLCULO DE MÉTRICAS ---
  const { kpi, chartData, productBreakdown, paymentMethods, filteredOrders } = useMemo(() => {
      
      const startObj = new Date(`${startDate}T00:00:00`);
      const endObj = new Date(`${endDate}T23:59:59.999`);

      const filtered = orders.filter(o => {
          const orderDate = new Date(o.created_at);
          const localOrderTime = orderDate.getTime();
          return localOrderTime >= startObj.getTime() && localOrderTime <= endObj.getTime();
      });

      const openingMovements = filtered.filter(o => o.order_type === 'apertura');
      const salesMovements = filtered.filter(o => o.order_type !== 'apertura');

      // KPI 1: SALDO INICIAL
      const openingBalance = openingMovements.reduce((acc, curr) => acc + Number(curr.total), 0);

      // KPI 2: VENTAS HOY (TOTAL)
      const totalRevenue = salesMovements.reduce((acc, curr) => acc + Number(curr.total), 0);
      const totalOrders = salesMovements.length;

      // KPI 2.1: VENTAS MOSTRADOR
      const counterSales = salesMovements
        .filter(o => o.order_type === 'mostrador')
        .reduce((acc, curr) => acc + Number(curr.total), 0);

      // KPI 2.2: VENTAS WEB
      const webSales = totalRevenue - counterSales;

      // KPI 3: EFECTIVO EN CAJA
      const cashSales = salesMovements
        .filter(o => o.payment_method === 'efectivo')
        .reduce((acc, curr) => acc + Number(curr.total), 0);
      
      const totalCashInBox = openingBalance + cashSales;

      // KPI 4: DESGLOSE PAGOS
      const cashDelivery = salesMovements
        .filter(o => o.payment_method === 'efectivo' && o.order_type !== 'mostrador')
        .reduce((acc, curr) => acc + Number(curr.total), 0);

      const digitalTotal = salesMovements
        .filter(o => o.payment_method === 'transferencia' || o.payment_method === 'tarjeta')
        .reduce((acc, curr) => acc + Number(curr.total), 0);
    
      // GRÁFICOS
      const ordersForChart = [...salesMovements].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const chartMap = new Map();
      ordersForChart.forEach(o => {
          const date = new Date(o.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
          chartMap.set(date, (chartMap.get(date) || 0) + Number(o.total));
      });
      const chartData = Array.from(chartMap, ([name, value]) => ({ name, value }));

      // PRODUCTOS
      const productMap = new Map();
      salesMovements.forEach(order => {
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
          kpi: { 
              totalRevenue, 
              totalOrders, 
              openingBalance, 
              totalCashInBox, 
              counterSales, 
              webSales      
          },
          paymentMethods: { digitalTotal, cashDelivery },
          chartData,
          productBreakdown,
          filteredOrders: filtered 
      };
  }, [orders, startDate, endDate]);

  // --- LÓGICA DEL INPUT DEL MODAL ---
  const currentInputAmount = useMemo(() => {
      const cleanValue = amountInput.replace(/\D/g, ''); 
      return Number(cleanValue);
  }, [amountInput]);

  const amountToRegister = useMemo(() => {
      if (manualMode === 'apertura') return currentInputAmount;
      const diff = currentInputAmount - kpi.totalCashInBox;
      return Math.max(0, diff); 
  }, [currentInputAmount, kpi.totalCashInBox, manualMode]);

  const finalDayRevenue = useMemo(() => {
      const cashMadeToday = Math.max(0, currentInputAmount - kpi.openingBalance);
      return cashMadeToday + paymentMethods.digitalTotal;
  }, [currentInputAmount, kpi.openingBalance, paymentMethods.digitalTotal]);

  const getOrderSummary = (order: any) => {
      if (order.order_type === 'apertura') return '🟢 Inicio de Caja';
      if (order.customer_name === 'Venta Detectada (Cierre)') return '✅ Ajuste de Cierre';
      if (order.order_type === 'mostrador') return 'Venta Manual';
      
      if (!order.items || order.items.length === 0) return 'Sin detalle';
      const firstItem = order.items[0].name;
      const extraCount = order.items.length - 1;
      return extraCount > 0 ? `${firstItem} +${extraCount}` : firstItem;
  };

  // --- HANDLERS DE FECHA MEJORADOS ---
  const setDateToday = () => {
      setActiveFilter('hoy');
      setStartDate(getLocalISO());
      setEndDate(getLocalISO());
  };

  const setDateYesterday = () => {
      setActiveFilter('ayer');
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const iso = getLocalISO(d);
      setStartDate(iso);
      setEndDate(iso);
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
      setActiveFilter('custom');
      if(type === 'start') setStartDate(value);
      else setEndDate(value);
  };

  const openApertura = () => {
      setManualMode('apertura');
      setAmountInput('');
      setShowModal(true);
  };

  const openCierre = () => {
      setManualMode('cierre');
      setAmountInput('');
      setShowModal(true);
  };

  const handleProcess = async () => {
      if (manualMode === 'apertura' && !currentInputAmount) return alert("Ingresa un monto válido");
      
      if (manualMode === 'cierre' && amountToRegister === 0) {
          alert(`✅ Caja Cerrada. Total vendido hoy: $${finalDayRevenue.toLocaleString()}`);
          setShowModal(false);
          return;
      }
      
      if (!restaurantId) return;

      setSaving(true);
      try {
          const type = manualMode === 'apertura' ? 'apertura' : 'mostrador'; 
          const name = manualMode === 'apertura' ? 'Saldo Inicial / Cambio' : 'Venta Detectada (Cierre)';
          
          const finalTotal = (manualMode === 'apertura') ? currentInputAmount : amountToRegister;

          const { data: newSale, error } = await supabase.from('orders').insert({
              restaurant_id: restaurantId,
              status: 'completado', 
              total: finalTotal,
              payment_method: 'efectivo', 
              order_type: type, 
              customer_name: name,
              items: [] 
          }).select().single();

          if (error) throw error;
          
          if (newSale) {
              setOrders([newSale, ...orders]); 
              setShowModal(false);
              setAmountInput('');
              
              if (manualMode === 'cierre') {
                  alert(`✅ Cierre completado. Total vendido: $${finalDayRevenue.toLocaleString()}`);
              } else {
                  alert(`✅ Caja iniciada con $${finalTotal.toLocaleString()}.`);
              }
          }
      } catch (error: any) {
          alert("Error: " + error.message);
      } finally {
          setSaving(false);
      }
  };

  const handleExport = (filteredData: any[]) => {
      if (filteredData.length === 0) return alert("No hay datos para exportar.");
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "ID,Fecha,Tipo,Cliente,Metodo Pago,Total,Estado\n";
      filteredData.forEach(row => {
          const date = new Date(row.created_at).toLocaleDateString('es-AR');
          const total = row.total;
          csvContent += `${row.id},${date},${row.order_type},${row.customer_name},${row.payment_method},${total},${row.status}\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `caja_snappy_${startDate}.csv`);
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
            
            {/* HEADER CON FILTROS MEJORADOS */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="text-gray-400"/> Caja & Métricas
                    </h1>
                    <p className="text-gray-500 text-sm">Control unificado de ventas online y mostrador.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-3 items-end md:items-center">
                    
                    {/* --- SELECTOR DE FECHAS MEJORADO --- */}
                    <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
                        <button 
                            onClick={setDateYesterday} 
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeFilter === 'ayer' ? 'bg-white text-black shadow-sm scale-105' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Ayer
                        </button>
                        <button 
                            onClick={setDateToday} 
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeFilter === 'hoy' ? 'bg-white text-black shadow-sm scale-105' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Hoy
                        </button>
                    </div>

                    <div className={`bg-white border p-1 rounded-xl flex items-center gap-2 shadow-sm transition-all ${activeFilter === 'custom' ? 'ring-2 ring-black border-transparent' : 'border-gray-200'}`}>
                        <div className="pl-2 text-gray-400"><Calendar size={16}/></div>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => handleCustomDateChange('start', e.target.value)} 
                            className="text-xs font-bold bg-transparent outline-none p-2 text-gray-700 cursor-pointer"
                        />
                        <span className="text-gray-300">-</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => handleCustomDateChange('end', e.target.value)} 
                            className="text-xs font-bold bg-transparent outline-none p-2 text-gray-700 cursor-pointer"
                        />
                    </div>

                    <button onClick={openCierre} className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg whitespace-nowrap">
                        <Calculator size={16}/> Cierre de Caja
                    </button>
                    <button onClick={openApertura} className="bg-white border border-gray-300 text-black px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition shadow-sm whitespace-nowrap">
                        <Plus size={16}/> Inicio de Caja
                    </button>

                    <button onClick={() => handleExport(filteredOrders)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-lg whitespace-nowrap">
                        <Download size={16}/>
                    </button>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* 1. VENTAS HOY */}
                <div className="md:col-span-1 bg-gray-900 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-2">
                            <Store size={14}/> Ventas {activeFilter === 'ayer' ? 'Ayer' : 'Hoy'}
                        </p>
                        <p className="text-3xl font-black mt-2">${kpi.totalRevenue.toLocaleString()}</p>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-gray-700 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400 flex items-center gap-1"><Monitor size={10}/> Pedidos Web:</span>
                            <span className="font-bold">${kpi.webSales.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400 flex items-center gap-1"><Store size={10}/> Mostrador (Cierre):</span>
                            <span className="font-bold text-green-400">${kpi.counterSales.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* 2. SALDO INICIAL */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-orange-600">
                        <Coins size={20}/> 
                        <span className="font-bold text-sm">Saldo Inicial</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">${kpi.openingBalance.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 mt-1 leading-tight">Monto de apertura de caja.</p>
                </div>

                {/* 3. EFECTIVO (ENVÍOS) */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-green-600">
                        <Banknote size={20}/> 
                        <span className="font-bold text-sm">Envío / Efectivo</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">${paymentMethods.cashDelivery.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 mt-1 leading-tight">Dinero que traen las motos.</p>
                </div>

                {/* 4. DIGITAL (TRANSFERENCIA) */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-blue-600">
                        <CreditCard size={20}/> 
                        <span className="font-bold text-sm">Digital (Bancos)</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">${paymentMethods.digitalTotal.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 mt-1 leading-tight">Envío / Transf + MP.</p>
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
                    {(viewAllMovements ? filteredOrders : filteredOrders.slice(0, 3)).map((order) => (
                        <div key={order.id} className="border rounded-xl p-3 flex justify-between items-center hover:bg-gray-50 transition group">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${order.order_type === 'apertura' ? 'bg-orange-100 text-orange-600' : (order.payment_method === 'efectivo' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600')}`}>
                                    {order.order_type === 'apertura' ? <Coins size={16}/> : (order.payment_method === 'efectivo' ? <Banknote size={16}/> : <CreditCard size={16}/>)}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-gray-900 flex items-center gap-1 truncate">
                                        <span className="truncate">{getOrderSummary(order)}</span>
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                        {order.order_type === 'apertura' ? 'Saldo Inicial' : (
                                            order.customer_name === 'Venta Detectada (Cierre)' ? 'Ajuste de Cierre' : 
                                            (`#${order.id.slice(0,4)} • ${new Date(order.created_at).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}`)
                                        )} 
                                        {order.order_type !== 'mostrador' && order.order_type !== 'apertura' && order.customer_name !== 'Venta Detectada (Cierre)' ? ` • ${order.customer_name}` : ''}
                                    </p>
                                </div>
                            </div>
                            <span className={`font-bold whitespace-nowrap ${order.order_type === 'apertura' ? 'text-orange-600' : 'text-gray-900'}`}>
                                {order.order_type === 'apertura' ? '+' : ''}${order.total}
                            </span>
                        </div>
                    ))}
                    {filteredOrders.length === 0 && <p className="text-gray-400 text-sm col-span-full text-center py-4">Sin movimientos en este rango de fechas.</p>}
                </div>

                {filteredOrders.length > 3 && (
                    <div className="mt-4 flex justify-center border-t border-gray-100 pt-4">
                        <button 
                            onClick={() => setViewAllMovements(!viewAllMovements)}
                            className="text-xs font-bold text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
                        >
                            {viewAllMovements ? (
                                <>Ver menos <ChevronUp size={14}/></>
                            ) : (
                                <>Ver todos ({filteredOrders.length}) <ChevronDown size={14}/></>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* FEEDBACK BUTTON */}
            <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                <p className="text-sm text-gray-500 mb-2">🚀 ¿Necesitas ver algún dato extra en tu caja?</p>
                <a 
                    href="https://wa.me/5491100000000?text=Hola%20Snappy,%20tengo%20una%20sugerencia%20para%20las%20métricas..." 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs font-bold text-black hover:underline"
                >
                    Sugerir mejora por WhatsApp
                </a>
            </div>

        </div>

        {/* --- MODAL UNIFICADO --- */}
        {showModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95">
                    <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black p-2 bg-gray-50 rounded-full">
                        <X size={20}/>
                    </button>

                    <h2 className="text-xl font-bold mb-1">
                        {manualMode === 'cierre' ? 'Cierre de Caja' : 'Inicio de Caja'}
                    </h2>
                    <p className="text-gray-500 text-sm mb-6">
                        {manualMode === 'cierre' ? 'Ingresa el total de dinero físico.' : 'Ingresa el cambio inicial.'}
                    </p>

                    <div className="space-y-4">
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                {manualMode === 'cierre' ? 'Total en Cajón (Billetes)' : 'Monto Inicial'}
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input 
                                    type="text" 
                                    value={amountInput}
                                    onChange={(e) => setAmountInput(e.target.value)}
                                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold outline-none focus:ring-2 ring-black/5 focus:border-black transition"
                                    placeholder="Ej: 10.000"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {manualMode === 'cierre' && currentInputAmount > 0 && (
                            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-dashed border-gray-200 text-sm">
                                <div className="flex justify-between text-gray-500">
                                    <span>Efectivo Real:</span>
                                    <span className="font-bold">${currentInputAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-red-400">
                                    <span>(-) Inicio de Caja:</span>
                                    <span>-${kpi.openingBalance.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-blue-500">
                                    <span>(+) Ventas Digitales:</span>
                                    <span>+${paymentMethods.digitalTotal.toLocaleString()}</span>
                                </div>
                                <div className="border-t pt-2 mt-1 flex justify-between items-center">
                                    <span className="font-bold text-gray-900">Total Vendido Hoy:</span>
                                    <span className="font-black text-xl text-green-600">${finalDayRevenue.toLocaleString()}</span>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleProcess}
                            disabled={saving}
                            className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition shadow-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20}/> : <>{manualMode === 'cierre' ? 'Confirmar Cierre' : 'Iniciar Caja'}</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
}