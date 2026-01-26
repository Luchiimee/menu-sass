'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, ShoppingBag, Clock, CheckCircle, XCircle, Bike, Store, MapPin, CreditCard, Banknote, Trash2, ChefHat, Check, User, MessageCircle, LayoutGrid, List, Zap, Send } from 'lucide-react';
import Link from 'next/link';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [restaurantName, setRestaurantName] = useState(''); 
  const [isLocked, setIsLocked] = useState(true);
  
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const savedView = localStorage.getItem('ordersView');
    if (savedView) {
        setView(savedView);
    }
  }, []);

  const changeView = (newView: string) => {
      setView(newView);
      localStorage.setItem('ordersView', newView);
  };

  // 1. CARGA INICIAL
  useEffect(() => {
    let mounted = true;

    const loadOrders = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: rest } = await supabase
                .from('restaurants')
                .select('id, subscription_plan, name')
                .eq('user_id', user.id)
                .single();
            
            if (mounted && rest) {
                setRestaurantName(rest.name || 'nuestro local');
                setRestaurantId(rest.id); 

                if (rest.subscription_plan === 'plus' || rest.subscription_plan === 'max') {
                    setIsLocked(false);
                    
                    const { data: ords } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('restaurant_id', rest.id)
                        .neq('order_type', 'apertura') // Oculta Inicios de Caja
                        .neq('customer_name', 'Venta Detectada (Cierre)') // Oculta Ajustes de Cierre
                        .order('created_at', { ascending: false });

                    setOrders(ords || []);
                } else {
                    setIsLocked(true);
                }
            }
        } catch (e) { 
            console.error(e); 
        } finally { 
            if(mounted) setLoading(false); 
        }
    };

    loadOrders();

    return () => { mounted = false; };
  }, []);

  // 2. REALTIME OPTIMIZADO
  useEffect(() => {
      if (!restaurantId || isLocked) return;

      console.log("🟢 Conectando Realtime para:", restaurantId);

      const channel = supabase
          .channel('orders_channel')
          .on(
              'postgres_changes',
              {
                  event: '*', 
                  schema: 'public',
                  table: 'orders',
                  filter: `restaurant_id=eq.${restaurantId}` 
              },
              (payload) => {
                  console.log("🔔 Cambio:", payload);

                  // --- FILTRO DE SEGURIDAD EN VIVO ---
                  // Ignoramos aperturas Y cierres automáticos para que no aparezcan de la nada
                  if (payload.new && 'order_type' in payload.new) {
                      if (payload.new.order_type === 'apertura') return;
                      if (payload.new.customer_name === 'Venta Detectada (Cierre)') return;
                  }

                  if (payload.eventType === 'INSERT') {
                      setOrders((prev) => [payload.new, ...prev]);
                  } 
                  else if (payload.eventType === 'UPDATE') {
                      setOrders((prev) => prev.map(o => o.id === payload.new.id ? payload.new : o));
                  }
                  else if (payload.eventType === 'DELETE') {
                      setOrders((prev) => prev.filter(o => o.id !== payload.old.id));
                  }
              }
          )
          .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
  }, [restaurantId, isLocked]);

  const updateStatus = async (id: string, newStatus: string) => {
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
      await supabase.from('orders').update({ status: newStatus }).eq('id', id);
  };

  const deleteOrder = async (id: string) => {
      if(!confirm("¿Eliminar este pedido del historial?")) return;
      setOrders(orders.filter(o => o.id !== id));
      await supabase.from('orders').delete().eq('id', id);
  };

  // --- LÓGICA WHATSAPP (Directo a la App) ---
  const getWhatsAppLink = (phone: string, type: 'notify' | 'chat') => {
      let message = '';
      if (type === 'notify') {
          message = `Hola! 🛵 Tu pedido de *${restaurantName}* acaba de salir hacia tu dirección.`;
      }
      // Usamos whatsapp:// para abrir la app directo en PC y Móvil
      return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'pendiente': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><Clock size={12}/> Pendiente</span>;
          case 'en_proceso': return <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><ChefHat size={12}/> En Cocina</span>;
          case 'en_camino': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><Bike size={12}/> En Camino</span>;
          case 'entregado': 
          case 'completado': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle size={12}/> Completado</span>;
          case 'cancelado': return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><XCircle size={12}/> Cancelado</span>;
          default: return null;
      }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar p-2 relative">
      
      {isLocked && (
        <div className="absolute inset-0 z-50 backdrop-blur-sm bg-white/60 flex items-center justify-center rounded-3xl overflow-hidden p-4 h-full">
            <div className="bg-white shadow-2xl p-8 rounded-3xl max-w-md w-full text-center border border-gray-100 animate-in zoom-in-95 duration-300">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-5 text-blue-600">
                    <Zap size={32} fill="currentColor" />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-gray-900">Gestor de Pedidos</h2>
                <p className="text-gray-500 mb-8 text-base">
                    El panel de control en tiempo real, estados de cocina y notificaciones automáticas es exclusivo del <b>Plan Plus</b>.
                </p>
                <Link href="/dashboard/settings" className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 bg-blue-600 text-white hover:bg-blue-700">
                    Actualizar a Plus <Zap size={20} fill="currentColor"/>
                </Link>
                <p className="text-xs text-gray-400 mt-3">Tus pedidos seguirán llegando a WhatsApp con el Plan Light.</p>
            </div>
        </div>
      )}

      <div className={`${isLocked ? 'blur-sm pointer-events-none opacity-50 select-none overflow-hidden h-full' : ''}`}>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                Pedidos <span className="bg-black text-white text-sm px-2 py-0.5 rounded-full">{orders.length}</span>
            </h1>

            <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-1 rounded-lg flex items-center">
                    <button onClick={() => changeView('list')} className={`p-2 rounded-md transition ${view === 'list' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`} title="Vista Lista">
                        <List size={20} />
                    </button>
                    <button onClick={() => changeView('grid')} className={`p-2 rounded-md transition ${view === 'grid' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`} title="Vista Cuadros">
                        <LayoutGrid size={20} />
                    </button>
                </div>

                <div className="bg-green-50 border border-green-200 px-4 py-2 rounded-xl text-right">
                    <p className="text-[10px] text-green-600 font-bold uppercase">Ventas Hoy</p>
                    <p className="text-lg font-bold text-green-900">${orders.filter(o => o.status === 'completado' || o.status === 'entregado').reduce((acc, curr) => acc + Number(curr.total), 0)}</p>
                </div>
            </div>
          </div>

          <div className={view === 'list' ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 align-start'}>
              
              {!isLocked && orders.length === 0 && (
                  <div className="col-span-full py-20 text-center text-gray-400">
                      <ShoppingBag size={48} className="mx-auto mb-4 opacity-20"/>
                      <p>No tienes pedidos activos.</p>
                  </div>
              )}

              {isLocked && [1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border rounded-xl p-5 shadow-sm h-48 flex items-center justify-center text-gray-300">
                      Contenido Oculto
                  </div>
              ))}

              {orders.map((order) => (
                <div key={order.id} className={`bg-white border rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between ${order.status === 'cancelado' ? 'opacity-60 grayscale' : ''}`}>
                    <div>
                        <div className="flex justify-between items-start mb-4 border-b pb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-mono font-bold text-gray-500">#{order.id.slice(0,5)}</span>
                                    {getStatusBadge(order.status)}
                                </div>
                                {order.customer_name && (
                                    <div className="flex items-center gap-1 text-sm font-bold text-gray-800 mb-2">
                                        <User size={14} className="text-gray-400"/> {order.customer_name}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2 text-xs font-bold text-gray-600">
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                        {order.order_type === 'delivery' && <Bike size={14}/>}
                                        {order.order_type === 'retiro' && <Store size={14}/>}
                                        {order.order_type === 'local' && <MapPin size={14}/>}
                                        {order.order_type?.toUpperCase() || 'DELIVERY'}
                                    </span>
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                                        {order.payment_method === 'transferencia' ? <CreditCard size={14}/> : <Banknote size={14}/>}
                                        {order.payment_method?.toUpperCase() || 'EFECTIVO'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-2xl">${order.total}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{new Date(order.created_at).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>

                        <div className={`space-y-1 mb-4 ${view === 'grid' ? 'max-h-40 overflow-y-auto custom-scrollbar' : ''}`}>
                            {order.items?.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm border-b border-dashed pb-1 last:border-0">
                                    <span className="text-gray-700"><span className="font-bold text-black">{item.quantity}x</span> {item.name}</span>
                                    <span className="font-medium">${item.price * item.quantity}</span>
                                </div>
                            ))}
                            {order.delivery_cost > 0 && (
                                <div className="flex justify-between text-sm text-blue-600 pt-1"><span>Envío</span><span>+${order.delivery_cost}</span></div>
                            )}
                        </div>
                    </div>

                    <div className={`flex flex-col gap-2 pt-2 border-t mt-2`}>
                        {order.status === 'pendiente' && (
                            <div className="flex gap-2">
                                <button onClick={() => updateStatus(order.id, 'cancelado')} className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition flex-1">Rechazar</button>
                                <button onClick={() => updateStatus(order.id, 'en_proceso')} className="bg-black text-white hover:bg-gray-800 px-6 py-2 rounded-lg text-sm font-bold transition shadow-lg flex items-center justify-center gap-2 flex-1"><ChefHat size={16}/> Cocinar</button>
                            </div>
                        )}

                        {order.status === 'en_proceso' && (
                            <button onClick={() => updateStatus(order.id, 'en_camino')} className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-lg text-sm font-bold transition shadow-lg flex items-center justify-center gap-2 w-full">
                                <Send size={16}/> Enviar Pedido
                            </button>
                        )}

                        {/* 👇 AQUÍ ESTÁ EL BOTÓN QUE FALTABA 👇 */}
                        {order.status === 'en_camino' && (
                            <div className="flex flex-col gap-2">
                                {order.customer_phone && (
                                    /* Se eliminó target="_blank" para que funcione fluido */
                                    <a 
                                        href={getWhatsAppLink(order.customer_phone, 'notify')}
                                        className="bg-green-500 text-white hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-bold transition shadow flex items-center justify-center gap-2 w-full no-underline"
                                    >
                                        <MessageCircle size={18}/> Avisar: "Tu pedido salió" 🛵
                                    </a>
                                )}
                                <button onClick={() => updateStatus(order.id, 'completado')} className="bg-gray-900 text-white hover:bg-black px-6 py-2 rounded-lg text-sm font-bold transition shadow flex items-center justify-center gap-2 w-full">
                                    <Check size={16}/> Marcar Entregado/Cobrado
                                </button>
                            </div>
                        )}

                        {(order.status === 'completado' || order.status === 'entregado' || order.status === 'cancelado') && (
                            <div className="flex gap-2">
                                {order.customer_phone && (
                                    <a 
                                        href={getWhatsAppLink(order.customer_phone, 'chat')}
                                        className="flex-1 bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-lg hover:bg-green-100 transition flex items-center justify-center gap-2 font-bold text-xs no-underline"
                                    >
                                        <MessageCircle size={16}/> Chat
                                    </a>
                                )}
                                <button onClick={() => deleteOrder(order.id)} className="text-gray-400 hover:text-red-500 p-2 transition flex justify-center w-10 bg-gray-50 rounded-lg border border-gray-200" title="Eliminar del historial"><Trash2 size={18}/></button>
                            </div>
                        )}
                    </div>
                </div>
              ))}
          </div>
      </div>
    </div>
  );
}