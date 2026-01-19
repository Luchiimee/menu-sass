'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  Palette, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  Store,
  LayoutTemplate
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState('Cargando...');

  // Verificar sesión y cargar nombre del local
  useEffect(() => {
    async function getData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Buscar el nombre del restaurante para ponerlo en el Sidebar
      const { data: rest } = await supabase
        .from('restaurants')
        .select('name')
        .eq('user_id', user.id)
        .single();
      
      if (rest) setRestaurantName(rest.name);
    }
    getData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Menú de Navegación
  const menuItems = [
    { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Personalizar', href: '/dashboard/design', icon: Palette },
    { name: 'Plantillas', href: '/dashboard/templates', icon: LayoutTemplate },
    { name: 'Pedidos', href: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      
      {/* --- SIDEBAR IZQUIERDO --- */}
      <aside className="w-64 bg-white border-r flex flex-col fixed md:relative h-full z-20 shadow-xl md:shadow-none">
        
        {/* Logo / Nombre Local */}
        <div className="p-6 border-b flex items-center gap-3">
          <div className="bg-black text-white p-2 rounded-lg">
            <Store size={20} />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight truncate w-32">{restaurantName}</h2>
            <p className="text-xs text-green-600 font-medium">Plan Free</p>
          </div>
        </div>

        {/* Links de Navegación */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-black text-white shadow-md' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar (Logout) */}
        <div className="p-4 border-t">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* --- CONTENIDO PRINCIPAL (Aquí se carga cada página) --- */}
      <main className="flex-1 overflow-y-auto relative bg-gray-50">
        {/* Header Móvil (Solo visible en celular) */}
        <div className="md:hidden bg-white p-4 border-b flex items-center justify-between sticky top-0 z-10">
            <span className="font-bold">Menú</span>
            {/* Aquí iría un botón hamburguesa para abrir el sidebar en móvil */}
        </div>

        {/* El contenido de la página (children) se inyecta aquí */}
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

    </div>
  );
}