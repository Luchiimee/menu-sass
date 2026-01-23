'use client';

// 1. Velocidad y datos frescos siempre
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
// 👇 Usamos el cliente seguro para evitar problemas de sesión
import { createBrowserClient } from '@supabase/ssr';
import { DollarSign, ShoppingBag, Eye, Copy, ExternalLink, Clock, CheckCircle, XCircle, ChefHat, ArrowRight, Store, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false); // Estado para detectar si es nuevo
  const [stats, setStats] = useState({ orders: 0, revenue: 0, views: 0 });
  const [storeLink, setStoreLink] = useState('');
  const [slug, setSlug] = useState('');
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  // Cliente Supabase
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

        // 1. Obtener Datos del Restaurante (Slug)
        // Usamos maybeSingle() para que NO tire error rojo si no existe
        const { data: rest } = await supabase
          .from('restaurants')
          .select('id, slug')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (mounted) {
            if (!rest) {
                // SI NO HAY RESTAURANTE -> ES NUEVO
                setIsNewUser(true);
                setLoading(false);
                return;
            }

            // SI HAY RESTAURANTE -> CARGAMOS TU DASHBOARD
            setSlug(rest.slug);
            const origin = window.location.origin;
            setStoreLink(`${origin}/${rest.slug}`);

            // 2. Obtener Pedidos de HOY
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

            // 3. Obtener ÚLTIMOS 20 PEDIDOS
            const { data: lastOrders } = await supabase
                .from('orders')
                .select('*')
                .eq('restaurant_id', rest.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (lastOrders) {
                setRecentOrders(lastOrders);
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

  if (loading) {
      return <div className="h-[60vh] flex items-center justify-center text-gray-400"><Loader2 className="animate-spin mr-2"/> Cargando...</div>;
  }

  // --- 🚨 AQUÍ ESTÁ LA LÓGICA CLAVE PARA USUARIOS NUEVOS ---
  // Si no tiene restaurante, mostramos esto en lugar de romper la página
  if (isNewUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in">
        <div className="bg-gray-100 p-6 rounded-full">
            <Store size={48} className="text-gray-400"/>
        </div>
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Bienvenido a Snappy</h1>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Todavía no tienes un negocio configurado. Comienza eligiendo un plan.
            </p>
        </div>
        <Link href="/dashboard/settings" className="bg-black text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg hover:-translate-y-1">
            Configurar mi Negocio <ArrowRight size={20}/>
        </Link>
      </div>
    );
  }

  // --- SI YA TIENE RESTAURANTE, MUESTRA TU DISEÑO ORIGINAL 👇 ---
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
      
      {/* CABECERA */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resumen de hoy</h1>
        <p className="text-gray-500 text-sm">Así va tu negocio este {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}.</p>
      </div>
      
      {/* TARJETAS DE ESTADÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Ventas Hoy</p>
            <h3 className="text-2xl font-bold text-gray-900">${stats.revenue.toLocaleString('es-AR')}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Pedidos Hoy</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.orders}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Eye size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Visitas</p>
            <h3 className="text-2xl font-bold text-gray-900">-</h3>
          </div>
        </div>
      </div>

      {/* BANNER DE LINK */}
      <div className="bg-gray-900 text-white p-6 md:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        {/* Fondo decorativo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"></div>
        
        <div className="relative z-10 space-y-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            ¡Tu tienda está activa! <span className="animate-pulse">🟢</span>
          </h2>
          <p className="text-gray-400 text-sm max-w-md">
            Este es tu enlace único. Compártelo en Instagram, WhatsApp y TikTok para que tus clientes hagan pedidos.
          </p>
          
          {/* LINK VISUAL */}
          <div className="flex items-center gap-2 mt-4 bg-white/10 p-2 rounded-lg w-fit">
             <span className="text-green-400 text-xs font-mono pl-2">snappy.uno/</span>
             <span className="font-bold text-white pr-2">{slug || '...'}</span>
          </div>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row gap-3">
          <button 
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-2 bg-white text-black px-5 py-3 rounded-xl text-sm font-bold hover:bg-gray-100 transition shadow-lg active:scale-95"
          >
            {copied ? <CheckCircle size={18} className="text-green-600"/> : <Copy size={18}/>}
            {copied ? '¡Copiado!' : 'Copiar Enlace'}
          </button>
          
          <a 
            href={storeLink} 
            target="_blank"
            className="flex items-center justify-center gap-2 bg-gray-800 text-white border border-gray-700 px-5 py-3 rounded-xl text-sm font-bold hover:bg-gray-700 transition"
          >
            <ExternalLink size={18}/> Abrir
          </a>
        </div>
      </div>

      {/* ÚLTIMOS PEDIDOS */}
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
                                    <td className="px-6 py-4">
                                        {getStatusBadge(order.status)}
                                    </td>
                                    <td className="px-6 py-4 font-bold">
                                        ${order.total}
                                    </td>
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

    </div>
  );
}