'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, CheckCircle, Clock, DollarSign } from 'lucide-react';

// Definimos la forma de nuestros datos
interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  message_copy: string;
  items?: any[]; // Para el futuro detalle
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // ID HARCODED PARA EL MVP (El de Burger Demo)
  // En el futuro, esto vendrá del Login del usuario real
  const DEMO_RESTAURANT_ID = 'SU_UUID_REAL_AQUI'; // <--- ¡OJO! REEMPLAZAR SI ES NECESARIO

  // 1. Función para cargar pedidos
  const fetchOrders = async () => {
    setLoading(true);
    // Buscamos pedidos ordenados por fecha (más nuevo arriba)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error cargando pedidos:', error);
    else setOrders(data || []);
    setLoading(false);
  };

  // Cargar al iniciar
  useEffect(() => {
    fetchOrders();
    
    // Opcional: Auto-refrescar cada 30 segundos
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // 2. Acción: Confirmar Pedido
  const confirmOrder = async (id: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', id);

    if (!error) {
      // Actualizamos la UI localmente para que sea rápido
      setOrders(orders.map(o => o.id === id ? { ...o, status: 'confirmed' } : o));
    }
  };

  // 3. Acción: Eliminar/Cancelar Pedido
  const deleteOrder = async (id: string) => {
    if(!confirm("¿Seguro que quiere eliminar este pedido?")) return;

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (!error) {
      setOrders(orders.filter(o => o.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Panel de Comandas</h1>
          <button 
            onClick={fetchOrders}
            className="text-sm text-blue-600 hover:underline"
          >
            Refrescar datos
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Cargando pedidos...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No hay pedidos pendientes hoy 😴</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${
                  order.status === 'confirmed' ? 'border-green-500' : 'border-yellow-400'
                }`}
              >
                {/* Cabecera de la Tarjeta */}
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    order.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status === 'confirmed' ? 'CONFIRMADO' : 'NUEVO / WHATSAPP'}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>

                {/* Detalles (Texto copiado de WhatsApp) */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-4 bg-gray-50 p-2 rounded border border-gray-100">
                    {order.message_copy?.replace('Hola! Quiero pedir:', '').trim()}
                  </p>
                </div>

                {/* Total y Acciones */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex items-center text-lg font-bold text-gray-900">
                    <DollarSign size={16} />
                    {order.total_amount}
                  </div>

                  <div className="flex gap-2">
                    {order.status !== 'confirmed' && (
                      <button 
                        onClick={() => confirmOrder(order.id)}
                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                        title="Confirmar Venta"
                      >
                        <CheckCircle size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteOrder(order.id)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                      title="Eliminar Pedido"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}