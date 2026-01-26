'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { 
  LayoutDashboard, Palette, ShoppingBag, Settings, LogOut, Store, LayoutTemplate, UtensilsCrossed, AlertTriangle, BarChart3 
} from 'lucide-react';
import MobileNav from '@/components/MobileNav';
import TrialBanner from '@/components/TrialBanner';

function GoogleAuthHandler() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const hasCode = searchParams.has('code');
    const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
    if (hasCode || hasHash) console.log("Procesando login social...");
  }, [searchParams]);
  return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
   
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. ESTADO DE CARGA
  const [isLoading, setIsLoading] = useState(true);

  // 2. ESTADO DE DATOS
  const [restaurant, setRestaurant] = useState<{
    name: string,
    plan: string | null,
    status: string
  }>({
    name: '',      
    plan: null,    
    status: 'active'
  });
   
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      // Verificar sesión
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (!window.location.hash && !window.location.search.includes('code=')) {
            if (mounted) router.push('/login');
        }
        return;
      }

      try {
        // A. Consultar Restaurante (para el Plan)
        const { data: rest } = await supabase
          .from('restaurants')
          .select('name, subscription_plan, subscription_status') 
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        // B. Consultar Perfil (para el Nombre del Usuario) - LO NUEVO
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (mounted) {
            // --- LÓGICA DEL NOMBRE (Prioridad: Perfil > Google > Restaurante) ---
            let displayName = "Bienvenido";

            if (profile?.first_name) {
                // Si hay perfil: "Juan P."
                const initial = profile.last_name ? ` ${profile.last_name[0]}.` : '';
                displayName = `${profile.first_name}${initial}`;
            } else if (session.user.user_metadata?.full_name || session.user.user_metadata?.name) {
                // Si es Google: "Juan P."
                const fullName = session.user.user_metadata.full_name || session.user.user_metadata.name;
                const parts = fullName.split(' ');
                const firstName = parts[0];
                const initial = parts.length > 1 ? ` ${parts[1][0]}.` : '';
                displayName = `${firstName}${initial}`;
            } else if (rest?.name) {
                // Si no, nombre del restaurante
                displayName = rest.name;
            } else {
                // Si no, email
                displayName = session.user.email?.split('@')[0] || "Usuario";
            }

            // Guardamos el estado
            if (rest) {
                setRestaurant({
                    name: displayName, // Usamos el nombre del usuario calculado
                    plan: rest.subscription_plan,
                    status: rest.subscription_status || 'active'
                });
            } else {
                // Nuevo usuario absoluto
                setRestaurant({
                    name: displayName,
                    plan: null,
                    status: 'active'
                });
            }
        }
      } catch (error) {
        console.error("Error layout:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
          router.push('/login');
          router.refresh();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh(); 
    router.push('/login');
  };

  const menuItems = [
    { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Personalizar', href: '/dashboard/design', icon: Palette },
    { name: 'Plantillas', href: '/dashboard/templates', icon: LayoutTemplate },
    { name: 'Mis Productos', href: '/dashboard/products', icon: UtensilsCrossed },
    { name: 'Métricas', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Pedidos', href: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
  ];

  const getPlanLabel = () => {
      if (restaurant.plan === 'plus') return 'Plan Plus ⚡';
      if (restaurant.plan === 'light') return 'Plan Light';
      if (restaurant.plan === 'max') return 'Plan Max 👑';
      return 'Sin Plan Activo';
  };

  const getPlanColor = () => {
      if (restaurant.plan === 'plus') return 'text-blue-600';
      if (restaurant.plan === 'light') return 'text-black';
      if (restaurant.plan === 'max') return 'text-purple-600';
      return 'text-gray-400';
  };

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
            {isLoading ? (
                <div className="space-y-2 animate-pulse">
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    <div className="h-3 w-16 bg-gray-100 rounded"></div>
                </div>
            ) : (
                <>
                    <h2 className="font-bold text-sm leading-tight truncate w-32 capitalize">
                        {restaurant.name}
                    </h2>
                    <p className={`text-[10px] font-bold uppercase mt-0.5 ${getPlanColor()}`}>
                        {getPlanLabel()}
                    </p>
                </>
            )}
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
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition cursor-pointer">
              <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto relative bg-gray-50 pb-24 md:pb-0 flex flex-col"> 
        
        {/* Header Mobile - Ahora oculto porque usamos MobileNav */}
        
        {/* --- BANNER DE ALERTA --- */}
        {restaurant.plan && restaurant.status === 'paused' && (
          <div className="bg-red-600 text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between shadow-lg gap-2 sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="animate-pulse flex-shrink-0"/>
              <p className="font-bold text-sm text-center md:text-left">Hubo un problema con tu pago. Tu plan está pausado.</p>
            </div>
            <button onClick={() => router.push('/dashboard/settings')} className="bg-white text-red-600 px-4 py-1 rounded-full text-xs font-bold uppercase hover:bg-gray-100 transition whitespace-nowrap">
              Solucionar
            </button>
          </div>
        )}

        {/* Banner de Prueba */}
        {restaurant.plan && <TrialBanner />}

        <div className="p-4 md:p-10 max-w-7xl mx-auto w-full flex-1">
            {children}
        </div>
      </main>

      {/* Pasamos los datos al menú móvil para que no tire error */}
      <MobileNav displayName={restaurant.name} displaySubtext={getPlanLabel()} />
    </div>
  );
}