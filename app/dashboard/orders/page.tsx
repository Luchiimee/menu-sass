'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
// 👇 Usamos el cliente seguro
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, ShoppingBag, Clock, CheckCircle, XCircle, Calendar, Bike, Store, MapPin, CreditCard, Banknote, Trash2, ChefHat, Check, User, MessageCircle, LayoutGrid, List, Zap } from 'lucide-react';
import Link from 'next/link';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  
  // --- ESTADO DE BLOQUEO ---
  // Bloqueado por defecto hasta demostrar que es PLUS o MAX
  const [isLocked, setIsLocked] = useState(true);

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

  useEffect(() => {
    let mounted = true;

    const loadOrders = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Verificar Plan
            const { data: rest } = await supabase
                .from('restaurants')
                .select('id, subscription_plan')
                .eq('user_id', user.id)
                .single();
            
            if (mounted && rest) {
                // LÓGICA ESTRICTA: Solo se desbloquea si es PLUS o MAX
                // Si es Light o no tiene plan, se queda bloqueado.
                if (rest.subscription_plan === 'plus' || rest.subscription_plan === 'max') {
                    setIsLocked(false);
                    
                    // Solo cargamos pedidos si está desbloqueado
                    const { data: ords } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('restaurant_id', rest.id)
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

    // Realtime (Solo si no está bloqueado para ahorrar recursos)
    const channel = supabase.channel('orders_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          if (!isLocked) {
             const fetchAgain = async () => {
                 const { data: { user } } = await supabase.auth.getUser();
                 if(!user) return;
                 const { data: rest } = await supabase.from('restaurants').select('id').eq('user_id', user.id).single();
                 if (!rest) return;
                 const { data: ords } = await supabase.from('orders').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false });
                 if(ords) setOrders(ords);
             }
             fetchAgain();
          }
      })
      .subscribe();

    return () => { 
        mounted = false;
        supabase.removeChannel(channel); 
    };
  }, [isLocked]);

  const updateStatus = async (id: string, newStatus: string) => {
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
      await supabase.from('orders').update({ status: newStatus }).eq('id', id);
  };

  const deleteOrder = async (id: string) => {
      if(!confirm("¿Eliminar este pedido del historial?")) return;
      setOrders(orders.filter(o => o.id !== id));
      await supabase.from('orders').delete().eq('id', id);
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'pendiente': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><Clock size={12}/> Pendiente</span>;
          case 'en_proceso': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><ChefHat size={12}/> En Cocina</span>;
          case 'completado': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle size={12}/> Completado</span>;
          case 'cancelado': return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><XCircle size={12}/> Cancelado</span>;
          default: return null;
      }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar p-2 relative">
      
      {/* --- MODAL DE BLOQUEO (Solo visible si isLocked es true) --- */}
      {isLocked && (
        <div className="absolute inset-0 z-50 backdrop-blur-sm bg-white/60 flex items-center justify-center rounded-3xl overflow-hidden p-4 h-full">
            <div className="bg-white shadow-2xl p-8 rounded-3xl max-w-md w-full text-center border border-gray-100 animate-in zoom-in-95 duration-300">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-5 text-blue-600">
                    <Zap size={32} fill="currentColor" />
                </div>
                <h2 className="text-2xl font-bold mb-3 text-gray-900">Gestor de Pedidos</h2>
                <p className="text-gray-500 mb-8 text-base">
                    El panel de control en tiempo real, estados de cocina y métricas es exclusivo del <b>Plan Plus</b>.
                </p>
                <Link href="/dashboard/settings" className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 bg-blue-600 text-white hover:bg-blue-700">
                    Actualizar a Plus <Zap size={20} fill="currentColor"/>
                </Link>
                <p className="text-xs text-gray-400 mt-3">Tus pedidos seguirán llegando a WhatsApp con el Plan Light.</p>
            </div>
        </div>
      )}

      {/* --- TU CONTENIDO ORIGINAL (Con blur si está bloqueado) --- */}
      <div className={`${isLocked ? 'blur-sm pointer-events-none opacity-50 select-none overflow-hidden h-full' : ''}`}>
          
          {/* HEADER SUPERIOR */}
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
                    <p className="text-lg font-bold text-green-900">${orders.filter(o => o.status === 'completado').reduce((acc, curr) => acc + Number(curr.total), 0)}</p>
                </div>
            </div>
          </div>

          {/* CONTENEDOR DINÁMICO */}
          <div className={view === 'list' ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 align-start'}>
              
              {/* Si no hay pedidos y no está bloqueado */}
              {!isLocked && orders.length === 0 && (
                  <div className="col-span-full py-20 text-center text-gray-400">
                      <ShoppingBag size={48} className="mx-auto mb-4 opacity-20"/>
                      <p>No tienes pedidos activos.</p>
                  </div>
              )}

              {/* Si está bloqueado, mostramos placeholders para que el blur se vea bien */}
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

                    <div className={`flex gap-2 pt-2 border-t mt-2 ${view === 'grid' ? 'flex-col' : 'justify-end'}`}>
                        {order.status === 'pendiente' && (
                            <>
                                <button onClick={() => updateStatus(order.id, 'cancelado')} className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition w-full">Rechazar</button>
                                <button onClick={() => updateStatus(order.id, 'en_proceso')} className="bg-black text-white hover:bg-gray-800 px-6 py-2 rounded-lg text-sm font-bold transition shadow-lg flex items-center justify-center gap-2 w-full"><ChefHat size={16}/> Cocinar</button>
                            </>
                        )}
                        {order.status === 'en_proceso' && (
                            <button onClick={() => updateStatus(order.id, 'completado')} className="bg-green-600 text-white hover:bg-green-700 px-6 py-2 rounded-lg text-sm font-bold transition shadow-lg flex items-center justify-center gap-2 animate-pulse w-full"><Check size={16}/> Cobrar</button>
                        )}
                        {(order.status === 'completado' || order.status === 'cancelado') && (
                            <button onClick={() => deleteOrder(order.id)} className="text-gray-400 hover:text-red-500 p-2 transition w-full flex justify-center" title="Eliminar del historial"><Trash2 size={18}/></button>
                        )}
                        {order.customer_phone && (
                            <a href={`https://wa.me/${order.customer_phone}`} target="_blank" className="bg-green-100 text-green-700 px-3 py-2 rounded-lg hover:bg-green-200 transition flex items-center justify-center gap-2 font-bold text-xs w-full">
                                <MessageCircle size={16}/> Chat
                            </a>
                        )}
                    </div>
                </div>
              ))}
          </div>
      </div>
    </div>
  );
}