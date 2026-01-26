'use client';

// 1. Velocidad y datos frescos siempre
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
    DollarSign, ShoppingBag, Eye, Copy, ExternalLink, Clock, 
    CheckCircle, XCircle, ChefHat, ArrowRight, Store, Loader2, 
    Zap, Lock, CheckCircle2, Crown, AlertCircle, CreditCard, ShieldCheck 
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isPlus, setIsPlus] = useState(false);
  
  // Nuevo estado para saber si ya eligió AL MENOS el plan Light
  const [hasPlan, setHasPlan] = useState(false);

  const [stats, setStats] = useState({ orders: 0, revenue: 0, views: 0 });
  const [storeLink, setStoreLink] = useState('');
  const [slug, setSlug] = useState('');
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    let mounted = true;

    const loadDashboardData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: rest } = await supabase
          .from('restaurants')
          .select('id, slug, subscription_plan')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (mounted) {
            if (!rest) {
                setIsNewUser(true); // No tiene restaurante creado
                setLoading(false);
                return;
            }

            // DETECTAR PLAN
            const plan = rest.subscription_plan;
            setHasPlan(!!plan); // True si tiene Light, Plus o Max
            setIsPlus(plan === 'plus' || plan === 'max');

            setSlug(rest.slug);
            const origin = window.location.origin;
            setStoreLink(`${origin}/${rest.slug}`);

            // SOLO CARGAMOS DATOS SI ES PLUS
            if (plan === 'plus' || plan === 'max') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const { data: todaysOrders } = await supabase
                    .from('orders')
                    .select('total, status')
                    .eq('restaurant_id', rest.id)
                    .gte('created_at', today.toISOString());

                if (todaysOrders) {
                    const validOrders = todaysOrders.filter(o => o.status !== 'cancelado');
                    const totalRevenue = validOrders.reduce((sum, order) => sum + Number(order.total), 0);
                    setStats({
                        orders: validOrders.length,
                        revenue: totalRevenue,
                        views: 0
                    });
                }

                const { data: lastOrders } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('restaurant_id', rest.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (lastOrders) setRecentOrders(lastOrders);
            }
        }
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboardData();

    return () => { mounted = false; };
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(storeLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'pendiente': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold flex w-fit items-center gap-1"><Clock size={12}/> Pendiente</span>;
        case 'en_proceso': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold flex w-fit items-center gap-1"><ChefHat size={12}/> Cocina</span>;
        case 'completado': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold flex w-fit items-center gap-1"><CheckCircle size={12}/> Listo</span>;
        case 'cancelado': return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold flex w-fit items-center gap-1"><XCircle size={12}/> Cancel</span>;
        default: return null;
    }
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center text-gray-400"><Loader2 className="animate-spin mr-2"/> Cargando...</div>;

  // CASO 1: USUARIO NUEVO SIN RESTAURANTE (BIENVENIDA + PLANES)
  if (isNewUser) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 animate-in fade-in space-y-8">
        {/* HEADER DE BIENVENIDA */}
        <div className="text-center space-y-6 mb-10">
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-purple-900/20">
                <Store size={32}/>
            </div>
            <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">¡Bienvenido a Snappy! 🚀</h1>
                <p className="text-lg text-gray-500 mt-2">Configura tu negocio en segundos. Primero, elige cómo quieres crecer.</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl max-w-3xl mx-auto text-left shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0"><ShieldCheck size={24}/></div>
                    <div>
                        <h3 className="font-bold text-blue-900 text-lg">Prueba 14 días GRATIS con total tranquilidad</h3>
                        <p className="text-sm text-blue-800 mt-1 mb-2 leading-relaxed">No te cobraremos nada hoy. Tienes dos opciones:</p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-700">
                            <li className="flex items-center gap-2 bg-white/60 p-2 rounded-lg border border-blue-100"><CreditCard size={16}/> <span><b>Configurar ahora:</b> Se debita en 14 días.</span></li>
                            <li className="flex items-center gap-2 bg-white/60 p-2 rounded-lg border border-blue-100"><Clock size={16}/> <span><b>Esperar:</b> Configura el pago luego.</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        {/* GRID DE PLANES - SELECCIÓN INICIAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* LIGHT */}
            <div className="bg-white border border-gray-200 p-6 rounded-3xl hover:border-gray-300 transition shadow-sm flex flex-col">
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-500">Plan Light</h3>
                    <div className="flex items-baseline gap-1 mt-2"><span className="text-4xl font-bold text-gray-900">$6.400</span><span className="text-sm text-gray-400">/mes</span></div>
                    <p className="text-sm text-gray-400 mt-2">Para arrancar.</p>
                </div>
                <hr className="border-gray-100 my-4"/>
                <ul className="space-y-3 text-sm text-gray-600 flex-1">
                    <li className="flex gap-2"><CheckCircle2 size={18} className="text-gray-400"/> 15 Productos</li>
                    <li className="flex gap-2"><CheckCircle2 size={18} className="text-gray-400"/> Pedidos WhatsApp</li>
                    <li className="flex gap-2 text-gray-400 line-through"><XCircle size={18}/> Métricas</li>
                </ul>
                <Link href="/dashboard/settings" className="mt-6 block w-full py-3 bg-gray-100 text-gray-600 font-bold text-center rounded-xl hover:bg-gray-200 transition">Elegir Light</Link>
            </div>
            {/* PLUS */}
            <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-2xl transform md:-translate-y-4 flex flex-col relative overflow-hidden border border-gray-800">
                <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
                <div className="mb-4 relative z-10">
                    <h3 className="text-lg font-bold text-purple-300">Plan Plus</h3>
                    <div className="flex items-baseline gap-1 mt-2"><span className="text-4xl font-bold text-white">$13.900</span><span className="text-sm text-gray-400">/mes</span></div>
                    <p className="text-sm text-green-400 font-bold mt-2 flex items-center gap-1"><Zap size={14}/> 14 días GRATIS hoy</p>
                </div>
                <hr className="border-gray-800 my-4 relative z-10"/>
                <ul className="space-y-3 text-sm text-gray-300 flex-1 relative z-10">
                    <li className="flex gap-2"><CheckCircle2 size={18} className="text-green-400"/> Productos Ilimitados</li>
                    <li className="flex gap-2"><CheckCircle2 size={18} className="text-green-400"/> Control de Caja</li>
                    <li className="flex gap-2"><CheckCircle2 size={18} className="text-green-400"/> QR Personalizado</li>
                </ul>
                <Link href="/dashboard/settings" className="mt-6 block w-full py-4 bg-white text-black font-black text-center rounded-xl hover:bg-gray-100 transition shadow-lg relative z-10">Probar Gratis</Link>
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            </div>
            {/* MAX */}
            <div className="bg-white border-2 border-gray-100 p-6 rounded-3xl flex flex-col relative overflow-hidden opacity-60">
                <div className="absolute top-4 right-4 bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200">PRÓXIMAMENTE</div>
                <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-400 flex items-center gap-2">Plan Max <Crown size={16}/></h3>
                    <div className="flex items-baseline gap-1 mt-2 select-none filter blur-[5px]"><span className="text-4xl font-bold text-gray-300">$21.200</span><span className="text-sm text-gray-300">/mes</span></div>
                    <p className="text-sm text-gray-400 mt-2">La herramienta definitiva.</p>
                </div>
                <hr className="border-gray-100 my-4"/>
                <ul className="space-y-3 text-sm text-gray-400 flex-1">
                    <li className="flex gap-2"><CheckCircle2 size={18}/> Todo lo del Plus</li>
                    <li className="flex gap-2"><CheckCircle2 size={18}/> Métricas Avanzadas</li>
                    <li className="flex gap-2"><CheckCircle2 size={18}/> Integración Mercado Pago</li>
                </ul>
                <button disabled className="mt-6 block w-full py-3 bg-gray-50 text-gray-300 font-bold text-center rounded-xl cursor-not-allowed">No Disponible</button>
            </div>
        </div>
      </div>
    );
  }

  // CASO 2: USUARIO CON PLAN (LIGHT O PLUS) - MUESTRA DASHBOARD
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in pb-10">
      
      {/* CABECERA */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resumen de hoy</h1>
        <p className="text-gray-500 text-sm">Así va tu negocio este {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}.</p>
      </div>
      
      {/* TARJETAS DE ESTADÍSTICAS (Siempre visibles, incluso en Light) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden">
          <div className={`p-3 rounded-xl ${isPlus ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Ventas Hoy</p>
            <h3 className="text-2xl font-bold text-gray-900">${stats.revenue.toLocaleString('es-AR')}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isPlus ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Pedidos Hoy</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.orders}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isPlus ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
            <Eye size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Visitas</p>
            <h3 className="text-2xl font-bold text-gray-900">-</h3>
          </div>
        </div>
      </div>

      {/* BANNER DE LINK - SIEMPRE VISIBLE */}
      <div className="bg-gray-900 text-white p-6 md:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"></div>
        <div className="relative z-10 space-y-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
            ¡Tu tienda está activa! <span className="animate-pulse">🟢</span>
            </h2>
            <p className="text-gray-400 text-sm max-w-md">
            Este es tu enlace único. Compártelo en Instagram, WhatsApp y TikTok.<br/>
            Puede editarlo desde el editor en personalizar.
            </p>
            <div className="flex items-center gap-2 mt-4 bg-white/10 p-2 rounded-lg w-fit">
                <span className="text-green-400 text-xs font-mono pl-2">snappy.uno/</span>
                <span className="font-bold text-white pr-2">{slug || '...'}</span>
            </div>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row gap-3">
            <button onClick={copyToClipboard} className="flex items-center justify-center gap-2 bg-white text-black px-5 py-3 rounded-xl text-sm font-bold hover:bg-gray-100 transition shadow-lg active:scale-95">
            {copied ? <CheckCircle size={18} className="text-green-600"/> : <Copy size={18}/>}
            {copied ? '¡Copiado!' : 'Copiar'}
            </button>
            <a href={storeLink} target="_blank" className="flex items-center justify-center gap-2 bg-gray-800 text-white border border-gray-700 px-5 py-3 rounded-xl text-sm font-bold hover:bg-gray-700 transition">
            <ExternalLink size={18}/> Abrir
            </a>
        </div>
      </div>

      {/* SECCIÓN INFERIOR */}
      {isPlus ? (
        // === VISTA PLUS: TABLA DE PEDIDOS ===
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Actividad Reciente</h2>
                <Link href="/dashboard/orders" className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    Ver todos <ArrowRight size={14}/>
                </Link>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                {recentOrders.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                        <ShoppingBag size={48} className="text-gray-200 mb-3"/>
                        <p>Aún no tienes pedidos.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-gray-500">ID</th>
                                    <th className="px-6 py-4 font-bold text-gray-500">Cliente</th>
                                    <th className="px-6 py-4 font-bold text-gray-500">Estado</th>
                                    <th className="px-6 py-4 font-bold text-gray-500">Total</th>
                                    <th className="px-6 py-4 font-bold text-gray-500">Hora</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {recentOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-mono font-bold text-gray-400">#{order.id.slice(0,5)}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {order.customer_name || 'Anónimo'}
                                            <div className="text-xs text-gray-400 font-normal">{order.order_type}</div>
                                        </td>
                                        <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                                        <td className="px-6 py-4 font-bold">${order.total}</td>
                                        <td className="px-6 py-4 text-gray-500 text-xs">
                                            {new Date(order.created_at).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
      ) : (
        // === VISTA LIGHT: BANNER PEQUEÑO (NO LA GRILLA GIGANTE) ===
        <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-full text-blue-600">
                    <Lock size={24}/>
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">Historial de Pedidos y Métricas</h3>
                    <p className="text-sm text-gray-500 max-w-md">
                        En el Plan Light recibes los pedidos por WhatsApp. Para ver el historial y estadísticas detalladas, mejora tu plan.
                    </p>
                </div>
            </div>
            <Link href="/dashboard/settings" className="bg-white border-2 border-black text-black px-6 py-3 rounded-xl font-bold hover:bg-black hover:text-white transition whitespace-nowrap">
                Ver Planes
            </Link>
        </div>
      )}

    </div>
  );
}