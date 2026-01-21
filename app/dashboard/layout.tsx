'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, Palette, ShoppingBag, Settings, LogOut, Store, LayoutTemplate, UtensilsCrossed 
} from 'lucide-react';
import MobileNav from '@/components/MobileNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams(); // Para detectar ?code=...
  
  const [restaurantName, setRestaurantName] = useState('Cargando...');
  const [loading, setLoading] = useState(true);

  // Carga datos del restaurante
  const loadRestaurantData = async (userId: string) => {
    try {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('name')
        .eq('user_id', userId)
        .single();
      
      if (rest) setRestaurantName(rest.name);
      else setRestaurantName("Mi Restaurante");
    } catch (error) {
      console.error("Error cargando restaurante:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // 1. VERIFICAR SI VENIMOS DE GOOGLE (AUTO-DETECCIÓN)
      // Google a veces manda ?code=... y a veces #access_token=...
      const hasCode = searchParams.has('code');
      const hasHash = window.location.hash.includes('access_token') || 
                      window.location.hash.includes('error');

      // Si hay rastros de Google, NO HACEMOS NADA y dejamos que Supabase trabaje.
      if (hasCode || hasHash) {
        console.log("Detectado retorno de Google. Esperando sesión...");
        return; 
      }

      // 2. SI NO ES GOOGLE, VERIFICAMOS SESIÓN NORMAL
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        console.log("Sesión encontrada.");
        if (mounted) await loadRestaurantData(session.user.id);
      } else {
        // 3. SI NO HAY SESIÓN Y NO ES GOOGLE -> LOGIN
        console.log("Sin sesión. Redirigiendo...");
        if (mounted) router.push('/login');
      }
    };

    initAuth();

    // 4. ESCUCHA DE EVENTOS (Aquí es donde entra Google finalmente)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Evento Supabase:", event);
      
      if (event === 'SIGNED_IN' && session) {
        if (mounted) await loadRestaurantData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        if (mounted) router.push('/login');
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
            {/* Spinner visual */}
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            <p className="text-sm font-medium text-gray-500">Conectando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      <aside className="hidden md:flex w-64 bg-white border-r flex-col h-full z-20 sticky top-0">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="bg-black text-white p-2 rounded-lg"><Store size={20} /></div>
          <div className="overflow-hidden">
            <h2 className="font-bold text-sm leading-tight truncate w-32">{restaurantName}</h2>
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