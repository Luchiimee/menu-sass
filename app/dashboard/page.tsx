'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, ShoppingBag, Eye, TrendingUp } from 'lucide-react';

export default function DashboardHome() {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, views: 0 });

  useEffect(() => {
    // Aquí cargaríamos datos reales. Por ahora simulamos ceros o buscamos en DB.
    async function loadStats() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Ejemplo: Contar pedidos reales
      const { count } = await supabase
        .from('orders') // Asegúrese de que esta tabla exista y tenga RLS configurado
        .select('*', { count: 'exact', head: true }); // head: true solo cuenta, no trae datos
      
      setStats({ orders: count || 0, revenue: 0, views: 0 });
    }
    loadStats();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Resumen de hoy</h1>
      
      {/* TARJETAS DE ESTADÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-700 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Ventas Totales</p>
            <h3 className="text-2xl font-bold text-gray-900">${stats.revenue}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Pedidos Nuevos</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.orders}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
            <Eye size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Visitas al Menú</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.views}</h3>
          </div>
        </div>

      </div>

      {/* SECCIÓN DE BIENVENIDA O CONSEJOS */}
      <div className="bg-black text-white p-8 rounded-3xl flex items-center justify-between overflow-hidden relative">
        <div className="relative z-10 max-w-lg">
          <h2 className="text-xl font-bold mb-2">¡Tu negocio está online! 🚀</h2>
          <p className="text-gray-300 text-sm mb-4">
            Comparte tu enlace personalizado en Instagram y WhatsApp para empezar a recibir pedidos.
          </p>
          <button className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 transition">
            Copiar mi enlace
          </button>
        </div>
        <TrendingUp className="text-gray-800 absolute -right-6 -bottom-6 w-48 h-48 opacity-50" />
      </div>
    </div>
  );
}