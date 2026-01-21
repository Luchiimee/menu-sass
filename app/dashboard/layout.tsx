'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, Palette, ShoppingBag, Settings, LogOut, Store, LayoutTemplate, UtensilsCrossed 
} from 'lucide-react';
import MobileNav from '@/components/MobileNav';

// --- COMPONENTE 1: EL "ESPÍA" DE GOOGLE (Aislado) ---
// Este componente es el único que usa useSearchParams. 
// Al separarlo, evitamos que el resto del layout se trabe o rompa el build.
function GoogleAuthHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Si la URL tiene ?code= o #access_token, dejamos que Supabase trabaje
    const hasCode = searchParams.has('code');
    const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
    
    // Aquí no hacemos nada visual, solo es lógica para no redirigir antes de tiempo
    if (hasCode || hasHash) {
       console.log("Procesando login social...");
    }
  }, [searchParams]);

  return null; // Este componente es invisible, no renderiza nada.
}

// --- COMPONENTE 2: EL LAYOUT PRINCIPAL (Rápido) ---
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [restaurantName, setRestaurantName] = useState('Cargando...');
  
  // Lógica de carga de datos (RÁPIDA Y LIMPIA)
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      // 1. Verificar sesión rápido
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Si no hay sesión, y NO estamos en medio de un login de Google, chau.
        if (!window.location.hash && !window.location.search.includes('code=')) {
            if (mounted) router.push('/login');
        }
        return;
      }

      // 2. Cargar nombre del restaurante
      try {
        const { data: rest } = await supabase
          .from('restaurants')
          .select('name')
          .eq('user_id', session.user.id)
          .single();
        
        if (mounted) {
            setRestaurantName(rest?.name || "Mi Restaurante");
        }
      } catch (error) {
        if (mounted) setRestaurantName("Mi Restaurante");
      }
    };

    loadData();

    // Suscripción a cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
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
      
      {/* AQUÍ ESTÁ EL TRUCO: 
         Ponemos el AuthHandler dentro de Suspense, pero el resto de la App NO.
         Así el menú carga instantáneo y Vercel no se queja.
      */}
      <Suspense fallback={null}>
         <GoogleAuthHandler />
      </Suspense>

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