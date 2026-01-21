'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ShoppingBag, Clock, CheckCircle, XCircle, Calendar, Bike, Store, MapPin, CreditCard, Banknote, Trash2, ChefHat, Check, User, MessageCircle, LayoutGrid, List } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado inicial 'list', pero luego comprobaremos si hay algo guardado
  const [view, setView] = useState('list');

  // --- NUEVO: EFECTO PARA RECUPERAR LA VISTA GUARDADA ---
  useEffect(() => {
    // Solo se ejecuta en el cliente
    const savedView = localStorage.getItem('ordersView');
    if (savedView) {
        setView(savedView);
    }
  }, []);

  // --- FUNCIÓN PARA CAMBIAR Y GUARDAR VISTA ---
  const changeView = (newView: string) => {
      setView(newView);
      localStorage.setItem('ordersView', newView); // Guardamos en memoria del navegador
  };

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: rest } = await supabase.from('restaurants').select('id').eq('user_id', user.id).single();
      
      const { data: ords } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', rest?.id)
        .order('created_at', { ascending: false });

      setOrders(ords || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    loadOrders();
    const channel = supabase.channel('orders_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
    <div className="max-w-6xl mx-auto h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar p-2">
      
      {/* HEADER SUPERIOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        
        {/* Título y Contador */}
        <h1 className="text-2xl font-bold flex items-center gap-2">
            Pedidos <span className="bg-black text-white text-sm px-2 py-0.5 rounded-full">{orders.length}</span>
        </h1>

        {/* CONTROLES (Métrica + Botones de Vista) */}
        <div className="flex items-center gap-3">
            
            {/* BOTONES PARA CAMBIAR VISTA (CON GUARDADO) */}
            <div className="bg-gray-100 p-1 rounded-lg flex items-center">
                <button 
                    onClick={() => changeView('list')} 
                    className={`p-2 rounded-md transition ${view === 'list' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Vista Lista"
                >
                    <List size={20} />
                </button>
                <button 
                    onClick={() => changeView('grid')} 
                    className={`p-2 rounded-md transition ${view === 'grid' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Vista Cuadros"
                >
                    <LayoutGrid size={20} />
                </button>
            </div>

            {/* Caja de Ventas */}
            <div className="bg-green-50 border border-green-200 px-4 py-2 rounded-xl text-right">
                <p className="text-[10px] text-green-600 font-bold uppercase">Ventas Hoy</p>
                <p className="text-lg font-bold text-green-900">${orders.filter(o => o.status === 'completado').reduce((acc, curr) => acc + Number(curr.total), 0)}</p>
            </div>
        </div>
      </div>

      {/* CONTENEDOR DINÁMICO */}
      <div className={view === 'list' ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 align-start'}>
          
          {orders.map((order) => (
            <div key={order.id} className={`bg-white border rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between ${order.status === 'cancelado' ? 'opacity-60 grayscale' : ''}`}>
                
                {/* CABECERA DE LA TARJETA */}
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

                    {/* LISTA DE PRODUCTOS */}
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

                {/* ACCIONES (BOTONES) */}
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
  );
}