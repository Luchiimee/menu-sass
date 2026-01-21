'use client';

import { useState, useEffect, Suspense } from 'react'; // <--- Importamos Suspense
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, Palette, ShoppingBag, Settings, LogOut, Store, LayoutTemplate, UtensilsCrossed, Loader2 
} from 'lucide-react';
import MobileNav from '@/components/MobileNav';

// 1. COMPONENTE INTERNO: Aquí va toda tu lógica actual (que usa useSearchParams)
function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams(); // <--- El culpable del error vive aquí, seguro dentro del Suspense
  
  const [restaurantName, setRestaurantName] = useState('Cargando...');
  
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // Si hay parámetros de URL de Supabase (hash o code), esperamos que Auth lo maneje
      const hasCode = searchParams.has('code');
      const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
      if (hasCode || hasHash) return; 

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        if (mounted) loadRestaurantData(session.user.id);
      } else {
        if (mounted) router.push('/login');
      }
    };

    const loadRestaurantData = async (userId: string) => {
      try {
        const { data: rest } = await supabase
          .from('restaurants')
          .select('name')
          .eq('user_id', userId)
          .single();
        
        if (mounted) {
            setRestaurantName(rest?.name || "Mi Restaurante");
        }
      } catch (error) {
        console.error("Error nombre restaurante:", error);
        if (mounted) setRestaurantName("Mi Restaurante");
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        loadRestaurantData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Personalizar', href: '/dashboard/design', icon: Palette },
    { name: 'Plantillas', href: '/dashboard/templates', icon: LayoutTemplate },
    { name: 'Mis Productos', href: '/dashboard/products', icon: UtensilsCrossed },
    { name: 'Pedidos', href: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      <aside className="hidden md:flex w-64 bg-white border-r flex-col h-full z-20 sticky top-0">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="bg-black text-white p-2 rounded-lg"><Store size={20} /></div>
          <div className="overflow-hidden">
            <h2 className="font-bold text-sm leading-tight truncate w-32">
                {restaurantName === 'Cargando...' ? 'Mi Restaurante' : restaurantName}
            </h2>
            <p className="text-xs text-green-600 font-medium">Plan Free</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-black text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 hover:text-black'}`}>
                <item.icon size={18} /> {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t mt-auto">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition"><LogOut size={18} /> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-gray-50 pb-24 md:pb-0"> 
        <div className="md:hidden bg-white p-4 border-b flex items-center justify-between sticky top-0 z-10 shadow-sm">
            <span className="font-bold text-lg">Snappy</span>
            <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold">En Línea</div>
        </div>
        <div className="p-4 md:p-10 max-w-7xl mx-auto">{children}</div>
      </main>

      <MobileNav />
    </div>
  );
}

// 2. COMPONENTE PRINCIPAL: Envuelve todo en Suspense para calmar a Next.js
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-400">
         <Loader2 className="animate-spin mr-2"/> Cargando panel...
      </div>
    }>
       <DashboardContent>{children}</DashboardContent>
    </Suspense>
  );
}