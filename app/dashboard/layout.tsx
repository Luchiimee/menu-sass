'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, Palette, ShoppingBag, Settings, LogOut, Store, LayoutTemplate, UtensilsCrossed, AlertTriangle 
} from 'lucide-react';
import MobileNav from '@/components/MobileNav';

// --- COMPONENTE 1: MANEJO DE LOGIN SOCIAL (Invisible) ---
function GoogleAuthHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasCode = searchParams.has('code');
    const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
    
    if (hasCode || hasHash) {
       console.log("Procesando login social...");
    }
  }, [searchParams]);

  return null;
}

// --- COMPONENTE 2: EL LAYOUT PRINCIPAL ---
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // 1. Estado ampliado para guardar Nombre, Plan y Estado de Pago
  const [restaurant, setRestaurant] = useState({
    name: 'Cargando...',
    plan: 'light',   // 'light' | 'plus' | 'max'
    status: 'active' // 'active' | 'paused' | 'cancelled'
  });
  
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      // A. Verificar sesión
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (!window.location.hash && !window.location.search.includes('code=')) {
            if (mounted) router.push('/login');
        }
        return;
      }

      // B. Cargar datos del restaurante (Nombre + Plan + Estado)
      try {
        const { data: rest } = await supabase
          .from('restaurants')
          .select('name, subscription_plan, subscription_status') // <--- Traemos todo esto
          .eq('user_id', session.user.id)
          .single();
        
        if (mounted && rest) {
            setRestaurant({
                name: rest.name || "Mi Restaurante",
                plan: rest.subscription_plan || 'light',
                status: rest.subscription_status || 'active'
            });
        }
      } catch (error) {
        if (mounted) setRestaurant(prev => ({ ...prev, name: "Mi Restaurante" }));
      }
    };

    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/login');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

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
      
      <Suspense fallback={null}>
         <GoogleAuthHandler />
      </Suspense>

      {/* --- SIDEBAR (PC) --- */}
      <aside className="hidden md:flex w-64 bg-white border-r flex-col h-full z-20 sticky top-0">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="bg-black text-white p-2 rounded-lg"><Store size={20} /></div>
          <div className="overflow-hidden">
            <h2 className="font-bold text-sm leading-tight truncate w-32">
                {restaurant.name}
            </h2>
            {/* Etiqueta del Plan Dinámica */}
            <p className={`text-xs font-bold uppercase ${restaurant.plan === 'plus' ? 'text-blue-600' : 'text-gray-400'}`}>
                {restaurant.plan === 'plus' ? 'Plan Plus ⚡' : 'Plan Free'}
            </p>
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

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto relative bg-gray-50 pb-24 md:pb-0"> 
        
        {/* Header Mobile */}
        <div className="md:hidden bg-white p-4 border-b flex items-center justify-between sticky top-0 z-10 shadow-sm">
            <span className="font-bold text-lg">Snappy</span>
            <div className={`text-xs px-2 py-1 rounded font-bold ${restaurant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {restaurant.status === 'active' ? 'En Línea' : 'Pausado'}
            </div>
        </div>

        {/* --- BANNER DE ALERTA DE PAGO (Aquí está la magia) --- */}
        {restaurant.status === 'paused' && (
          <div className="bg-red-600 text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between shadow-lg gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="animate-pulse flex-shrink-0"/>
              <p className="font-bold text-sm text-center md:text-left">Hubo un problema con tu pago. Tu plan Plus está pausado.</p>
            </div>
            <button onClick={() => router.push('/dashboard/settings')} className="bg-white text-red-600 px-4 py-1 rounded-full text-xs font-bold uppercase hover:bg-gray-100 transition whitespace-nowrap">
              Solucionar Ahora
            </button>
          </div>
        )}

        <div className="p-4 md:p-10 max-w-7xl mx-auto">
            {children}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}