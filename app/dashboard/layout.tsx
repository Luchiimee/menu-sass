'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { 
  LayoutDashboard, Palette, ShoppingBag, Settings, LogOut, Store, 
  LayoutTemplate, UtensilsCrossed, AlertTriangle, BarChart3, ArrowRight,
  ChevronLeft, ChevronRight, Headset, ShieldCheck, Bell, Zap
} from 'lucide-react';
import MobileNav from '@/components/MobileNav';
import TrialBanner from '@/components/TrialBanner';
import OrderListener from '@/components/OrderListener';
import PushNotificationManager from '@/components/PushNotificationManager'; 

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

  const [isLoading, setIsLoading] = useState(true);
  const [hasPhone, setHasPhone] = useState(true); 
  const [isCollapsed, setIsCollapsed] = useState(false); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileData, setProfileData] = useState<any>(null); // Tu estado centralizado
const [restaurant, setRestaurant] = useState<{
    id?: string,
    name: string,
    plan: string | null,
    status: string,
    logo_url: string | null,
    sale_type: string | null,
    onboarding_completed: boolean // <--- AGREGÁ ESTO
  }>({
    name: '',      
    plan: null,    
    status: 'active',
    logo_url: null,
    sale_type: null,
    onboarding_completed: false // <--- AGREGÁ ESTO
  });
    
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (!window.location.hash && !window.location.search.includes('code=')) {
            if (mounted) router.push('/login');
        }
        return;
      }

      try {
        const { data: rest } = await supabase
          .from('restaurants')
          
       .select('id, name, subscription_plan, subscription_status, logo_url, sale_type, onboarding_completed') 
          .eq('user_id', session.user.id)
          .maybeSingle();
        
   const { data: profile } = await supabase
  .from('profiles')
  .select('first_name, last_name, phone, created_at, payment_configured')
  .eq('id', session.user.id)
  .maybeSingle();

if (mounted) {
    const isSuperAdmin = session.user.email === 'luchiimee2@gmail.com';
    
    // --- NUEVA LÓGICA DE SINCRONIZACIÓN DE NOMBRE ---
    let firstName = profile?.first_name;
    let lastName = profile?.last_name;

    // Si la base de datos está vacía, sacamos los datos de Google/Sesión
    if (!firstName && session.user.user_metadata) {
        const meta = session.user.user_metadata;
        firstName = meta.first_name || meta.given_name || meta.full_name?.split(' ')[0] || meta.name || '';
        lastName = meta.last_name || meta.family_name || meta.full_name?.split(' ').slice(1).join(' ') || '';
        
        // Guardamos en la base de datos automáticamente para que Settings ya lo tenga
        await supabase.from('profiles').upsert({
            id: session.user.id,
            first_name: firstName,
            last_name: lastName
        });
    }

    setProfileData({ ...profile, first_name: firstName, last_name: lastName }); 
    setIsAdmin(isSuperAdmin);
    setHasPhone(!!(profile?.phone && profile.phone.trim() !== ""));

    // Definimos el nombre a mostrar en el sidebar
    let displayName = "Bienvenido";
    if (firstName) {
        const initial = lastName ? ` ${lastName[0]}.` : '';
        displayName = `${firstName}${initial}`;
    } else if (rest?.name) {
        displayName = rest.name;
    }

setRestaurant({
    id: rest?.id, 
    name: displayName, 
    plan: isSuperAdmin ? 'max' : (rest?.subscription_plan || null),
    status: isSuperAdmin ? 'active' : (rest?.subscription_status || 'active'),
    logo_url: rest?.logo_url || null,
    sale_type: rest?.sale_type || null,
    onboarding_completed: rest?.onboarding_completed || false
});      
            setIsLoading(false);
        }
      } catch (error) {
        console.error("Error layout:", error);
        if (mounted) setIsLoading(false);
      }
    };

    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
          window.location.replace('/login');
          router.refresh();
      }
    });
    
    const handleRefresh = () => {
  console.log("Recibido aviso de actualización, recargando...");
  loadData(); 
};

// Escuchamos el evento que mandamos desde Settings
window.addEventListener('profile-updated', handleRefresh);

return () => {
  mounted = false;
  subscription.unsubscribe();
  // Limpiamos el escuchador cuando se cierra el componente
  window.removeEventListener('profile-updated', handleRefresh);
}; 

  }, [router]);
useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handleBackButton = (event: PopStateEvent) => {
      window.history.pushState(null, '', window.location.href);
      if (pathname !== '/dashboard') {
        router.push('/dashboard');
      }
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [pathname, router]);
  // --- FUNCIONES AUXILIARES ---
  const getPlanLabel = () => {
      if (restaurant.plan === 'plus') return 'Plan Plus';
      if (restaurant.plan === 'light') return 'Plan Light';
      if (restaurant.plan === 'max') return 'Plan Max';
      return 'Free';
  };

  const getPlanColor = () => {
      if (restaurant.plan === 'plus') return 'text-blue-600';
      if (restaurant.plan === 'light') return 'text-black';
      if (restaurant.plan === 'max') return 'text-purple-600';
      return 'text-gray-400';
  };

  const supportMessage = encodeURIComponent(`Hola! Soy  ${restaurant.name}, necesito ayuda con mi panel.`);

  // --- LÓGICA DE TIEMPO (Cambiamos 'profile' por 'profileData' para corregir el error) ---
 // --- LÓGICA DE TIEMPO BLINDADA (Reemplazo corregido) ---
  const trialDuration = 14;
  let daysRemaining = 14;
  let isExpired = false;
  let showWarning = false;
const needsRubro = restaurant.plan && !restaurant.onboarding_completed; 
  // Solo calculamos si ya terminó de cargar y tenemos los datos del perfil
  if (!isLoading && profileData?.created_at) {
    const createdAt = new Date(profileData.created_at);
    const today = new Date();
    
    // Calculamos días usados reales
    const diffInMs = today.getTime() - createdAt.getTime();
    const daysUsed = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    daysRemaining = trialDuration - daysUsed;
    const paymentConfigured = profileData?.payment_configured || false;

    // Definimos estados de bloqueo y aviso
    isExpired = daysRemaining <= 0 && !paymentConfigured;
    showWarning = daysRemaining <= 4 && daysRemaining > 0 && !paymentConfigured;

    console.log(`Días usados: ${daysUsed} | Quedan: ${daysRemaining} | Bloqueado: ${isExpired}`);
  }

  const bypassBlock = isAdmin;

 // Reemplaza tu handleLogout actual por este:
const handleLogout = async () => {
  setIsLoading(true); // Ponemos el estado de carga para que el usuario espere
  try {
    // 1. Buscamos la sesión activa antes de borrar nada
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if ('serviceWorker' in navigator && userId) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // 2. DISPARO DE BORRADO (Imitamos el clic manual que ya te funciona)
        // Usamos 'keepalive' para que la señal viaje aunque la App se esté cerrando
        fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true, 
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            userId: userId
          }),
        });

        // 3. Desvinculamos el navegador (importante para que la campana vuelva a rojo)
        await subscription.unsubscribe();
        console.log("Notificaciones apagadas antes de salir");
      }
    }
  } catch (err) {
    console.error("Error en el proceso de salida:", err);
  } finally {
    // 4. EL SECRETO: Esperamos 1.5 segundos. 
    // Este tiempo es vital para que el iPhone termine de mandar la señal de internet.
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 5. SALIDA FINAL
    await supabase.auth.signOut();
    
    // 6. BLINDAJE: Usamos replace para que NO se pueda volver atrás con el botón del celu
    window.location.replace('/login'); 
  }
};
const menuItems = [
  { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Personalizar', href: '/dashboard/personalizar', icon: Palette },
  { name: 'Plantillas', href: '/dashboard/templates', icon: LayoutTemplate },
  { name: 'Mis Productos', href: '/dashboard/products', icon: UtensilsCrossed },
  { name: 'Caja', href: '/dashboard/analytics', icon: BarChart3 }, // Siempre visible
  { name: 'Pedidos', href: '/dashboard/orders', icon: ShoppingBag }, // Siempre visible
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
];

  if (isAdmin) {
    menuItems.push({ name: 'Admin Snappy', href: '/admin/snappy', icon: ShieldCheck });
  }
  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <OrderListener />

      <Suspense fallback={null}>
         <GoogleAuthHandler />
      </Suspense>

      {/* --- SIDEBAR (PC) --- */}
      <aside className={`hidden lg:flex ${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r flex-col h-full z-20 flex-shrink-0 transition-all duration-300 relative`}>
        
        {/* BOTÓN COLAPSAR */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 bg-white border shadow-md rounded-full p-1 z-30 hover:bg-gray-50 transition"
        >
          {isCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
        </button>

        <div className={`p-6 border-b flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="bg-black text-white w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <Store size={20} />
            )}
          </div>
          
          {!isCollapsed && (
            <div className="overflow-hidden">
                <h2 className="font-bold text-sm leading-tight truncate w-32 capitalize">
                    {restaurant.name}
                </h2>
                <p className={`text-[10px] font-bold uppercase mt-0.5 ${getPlanColor()}`}>
                    {getPlanLabel()} {restaurant.plan === 'plus' && '⚡'}
                </p>
            </div>
          )}
        </div>
        
       <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-black text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 hover:text-black'}`}
                title={isCollapsed ? item.name : ''}
              >
                <item.icon size={18} /> 
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t mt-auto space-y-2">
          {/* CARD DE AYUDA */}
          {!isCollapsed && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-2">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Headset size={16} />
                    <span className="text-[11px] font-black uppercase tracking-tighter">¿Necesitas ayuda?</span>
                </div>
                <p className="text-[10px] text-blue-700 font-medium mb-3">Comunicate con nosotros para asistencia rápida.</p>
                <a 
                    href={`https://wa.me/2324313123?text=${supportMessage}`} 
                    target="_blank"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold hover:bg-blue-700 transition shadow-sm no-underline"
                >
                    Contactar soporte
                </a>
            </div>
          )}
<div className="p-2 border-t mt-auto space-y-1">
          {/* CONTENEDOR DE NOTIFICACIONES */}
          <div className={`relative flex items-center justify-center ${isCollapsed ? 'h-10 w-full' : 'px-3 py-1'}`}>
            
            {isCollapsed ? (
              /* MODO COLAPSADO: Dibujamos la UI y ocultamos la lógica encima */
              <div className="relative w-10 h-10 flex items-center justify-center">
                {/* 1. La cara visible (La campanita que sí se ve) */}
                <div className="absolute inset-0 bg-green-50 rounded-lg flex items-center justify-center text-green-600 shadow-sm border border-green-100">
                  <Bell size={20} />
                </div>
                
                {/* 2. El componente real (Invisible pero clickeable) */}
                <div className="absolute inset-0 opacity-0 z-10 cursor-pointer [&_*]:w-full [&_*]:h-full">
                  <PushNotificationManager />
                </div>
              </div>
            ) : (
              /* MODO EXPANDIDO: Tu componente normal */
              <PushNotificationManager />
            )}
          </div>

          {/* BOTÓN CERRAR SESIÓN */}
          <button 
            onClick={handleLogout} 
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 w-full text-red-600 hover:bg-red-50 rounded-lg text-[11px] font-bold transition cursor-pointer`}
          >
              <LogOut size={18} /> 
              {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
       
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto relative bg-gray-50 w-full min-w-0 flex flex-col"> 
        {/* Alerta de Pagos */}
        {/* Alerta de Pagos */}
        {restaurant.plan && restaurant.status === 'paused' && (
          <div className="bg-red-600 text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between shadow-lg gap-2 sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="animate-pulse flex-shrink-0"/>
              <p className="font-bold text-sm text-center md:text-left">Tu plan está pausado por falta de pago.</p>
            </div>
            <button onClick={() => router.push('/dashboard/settings')} className="bg-white text-red-600 px-4 py-1 rounded-full text-xs font-bold uppercase hover:bg-gray-100 transition whitespace-nowrap">
              Solucionar
            </button>
          </div>
        )}

        {/* --- BANNER DE TELÉFONO PERSONAL (GLOBAL) --- */}
        {!isLoading && !hasPhone && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-20 animate-in slide-in-from-top-full">
            <div className="flex items-center gap-3 text-amber-800">
              <div className="bg-amber-100 p-2 rounded-lg hidden sm:block">
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm">Falta tu teléfono de contacto</p>
                <p className="text-[10px] sm:text-xs text-amber-700 opacity-80">Completa tu perfil en configuración para una mejor asistencia.</p>
              </div>
            </div>
            <Link 
              href="/dashboard/settings" 
              className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-amber-700 transition flex items-center gap-1 whitespace-nowrap"
            >
              Completar <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {restaurant.plan && <TrialBanner />}

      <div className="p-4 lg:p-10 max-w-7xl mx-auto w-full flex-1 pb-24 lg:pb-10">
    
{/* AVISO PERIODO DE PRUEBA (Optimizado para todas las medidas) */}
{showWarning && !bypassBlock && (
  <div className="mt-20 lg:mt-0 mb-8 bg-gradient-to-r from-orange-500 to-amber-600 text-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-4 gap-3 relative z-30">
    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
      <div className="bg-white/20 p-1.5 rounded-lg shrink-0">
        <Zap size={16} className="text-white fill-current sm:w-5 sm:h-5" />
      </div>
      <div className="text-left min-w-0">
        <p className="font-black text-[9px] sm:text-xs uppercase tracking-widest leading-none mb-1 truncate">
          Atención: Prueba
        </p>
        <p className="text-[11px] sm:text-sm opacity-95 leading-tight truncate">
          Te quedan <b>{daysRemaining} días</b>
        </p>
      </div>
    </div>
    
    <Link 
      href="/dashboard/settings" 
      className="shrink-0 bg-white text-orange-600 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[10px] font-black uppercase hover:bg-orange-50 transition shadow-sm whitespace-nowrap"
    >
      Configurar
    </Link>
  </div>
)}



{/* 1. BLOQUEO SOLO SI TIENE PLAN PERO NO RUBRO: Obligatorio ir a Plantillas */}
    {needsRubro && pathname !== '/dashboard/templates' && pathname !== '/dashboard/settings' ? (
      <div className="fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border-2 border-indigo-50 max-w-md">
              <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Store size={40} />
              </div>
              <span className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.3em] mb-2 block">Paso Final</span>
              <h2 className="text-3xl font-black mb-4 uppercase italic">Configurá tu Rubro</h2>
              <p className="text-gray-500 mb-8 font-medium">¡Ya tenés tu plan activo! Tu prueba de 14 días comenzó. Ahora elegí tu rubro para activar las herramientas de venta.</p>
              <Link href="/dashboard/templates" className="block w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-indigo-700 transition shadow-xl shadow-indigo-100">
                  Elegir Rubro Ahora <ArrowRight size={18} className="inline ml-2" />
              </Link>
          </div>
      </div>
    ) 
    // 2. BLOQUEO SI EL TRIAL EXPIRÓ (Lo mantenemos para cuando pasen los 14 días)
    : isExpired && !bypassBlock && pathname !== '/dashboard/settings' ? (
        <div className="fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
             <div className="bg-white p-10 rounded-[40px] shadow-2xl border-2 border-red-50 max-w-md">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle size={40} />
                </div>
                <h2 className="text-3xl font-black mb-4 uppercase italic">Servicio Pausado</h2>
                <p className="text-gray-500 mb-8 font-medium">Tu prueba de 14 días ha finalizado. Selecciona un plan para continuar.</p>
                <Link href="/dashboard/settings" className="block w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-gray-800 transition shadow-xl">Configurar Pago <ArrowRight size={18} className="inline ml-2" /></Link>
             </div>
        </div>
    ) : (
      /* SI NO HAY BLOQUEOS, MUESTRA EL CONTENIDO NORMAL (INICIO) */
      children
    )}
</div>
      </main>

     <MobileNav 
  displayName={restaurant.name} 
  displaySubtext={getPlanLabel()} 
  logoUrl={restaurant.logo_url} // <--- Enviamos el logo aquí
/>
    </div>
  );
  
}
