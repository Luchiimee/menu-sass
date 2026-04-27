'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { 
  LayoutDashboard, Palette, ShoppingBag, Settings, LogOut, Store, 
  LayoutTemplate, UtensilsCrossed, AlertTriangle, BarChart3, ArrowRight,
  ChevronLeft, ChevronRight, Headset, ShieldCheck, Bell, Zap, X, Clock, Lock, CalendarCheck
} from 'lucide-react';
import MobileNav from '@/components/MobileNav';
import TrialBanner from '@/components/TrialBanner';
import OrderListener from '@/components/OrderListener';
import PushNotificationManager from '@/components/PushNotificationManager'; 

function GoogleAuthHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasCode = searchParams.has('code');
    const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
    
    if (hasCode || hasHash) {
      // 1. Limpiamos la URL inmediatamente para que Chrome Android "se calme"
      // Usamos el pathname actual para no mover al usuario de donde está
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      
      // 2. Forzamos un refresh suave de los datos de sesión
      router.refresh();
      
      
    }
  }, [searchParams, router]);

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
  const [profileData, setProfileData] = useState<any>(null); 
  const isSuperAdmin = profileData?.email === 'luchiimee2@gmail.com' || isAdmin;
  const isUGCUser = profileData?.email === 'sabrinaidiartcm@gmail.com';
  const bypassBlock = isSuperAdmin || isUGCUser;
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
setIsAdmin(session.user.email === 'luchiimee2@gmail.com');
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
    // Si es Sabrina o Vos, le damos Plan Max para que nada esté bloqueado
    plan: (isSuperAdmin || isUGCUser) ? 'max' : (rest?.subscription_plan || null),
    status: (isSuperAdmin || isUGCUser) ? 'active' : (rest?.subscription_status || 'active'),
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
      setIsLoading(true); // <--- ESTO APAGA LOS BANNERS MIENTRAS RECARGA (Arregla el parpadeo)
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
      if (restaurant.plan === 'go') return 'Plan GO'; // <--- AGREGADO
      if (restaurant.plan === 'light') return 'Plan Light';
      if (restaurant.plan === 'max') return 'Plan Max';
      return 'Free';
  };

  const getPlanColor = () => {
      if (restaurant.plan === 'plus') return 'text-emerald-600'; // Plus es Esmeralda
      if (restaurant.plan === 'go') return 'text-blue-600';     // GO es Azul
      if (restaurant.plan === 'light') return 'text-black';
      if (restaurant.plan === 'max') return 'text-purple-600';
      return 'text-gray-400';
  };

  const supportMessage = encodeURIComponent(`Hola! Soy  ${restaurant.name}, necesito ayuda con mi panel.`);

  
 // --- LÓGICA DE TIEMPO BLINDADA (Reemplazo corregido) ---
// --- LÓGICA DE TIEMPO BLINDADA ---

  
  const needsRubro = restaurant.plan && !restaurant.onboarding_completed; 
  const needsPlan = !restaurant.plan;
  
  // Esta es la llave maestra: si el status es alguno de estos, la suscripción es válida
const isSubscriptionValid = restaurant.status === 'active' || 
                               restaurant.status === 'authorized' || 
                               restaurant.status === 'past_due' || 
                               restaurant.status === 'paused'
                               bypassBlock; // <--- Si es VIP, la suscripción es válida

  const trialDuration = 14;
  let daysRemaining = 14;
  let isExpired = false;
  let showWarning = false;

  if (!isLoading && profileData?.created_at) {
    const createdAt = new Date(profileData.created_at);
    const today = new Date();
    const diffInMs = today.getTime() - createdAt.getTime();
    const daysUsed = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    daysRemaining = trialDuration - daysUsed;
    
    const paymentConfigured = profileData?.payment_configured || false;

    // Solo mostramos advertencias si NO tiene una suscripción válida Y no es VIP
    isExpired = daysRemaining <= 0 && !paymentConfigured && !isSubscriptionValid;
    showWarning = daysRemaining <= 4 && daysRemaining > 0 && !paymentConfigured && !isSubscriptionValid;
  }
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
    
    
    window.location.replace('/login'); 
  }
};
const plan = restaurant.plan;
  const isLight = plan === 'light';
  const isGo = plan === 'go';
  const hasNoPlan = !plan;

 const menuItems = [
    { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
    { 
      name: 'Personalizar', 
      href: '/dashboard/personalizar', 
      icon: Palette,
      locked: hasNoPlan,
      msg: "Elegí un plan primero para empezar a diseñar tu marca. 🎨" 
    },
    { 
      name: 'Plantillas', 
      href: '/dashboard/templates', 
      icon: LayoutTemplate,
      locked: hasNoPlan,
      msg: "Seleccioná un plan para elegir la estructura de tu menú. 📐"
    },
    { 
      name: 'Mis Productos', 
      href: '/dashboard/products', 
      icon: UtensilsCrossed,
      locked: hasNoPlan,
      msg: "Para cargar tus productos, primero activá tu prueba gratuita. 🍕"
    },
    // 📊 CAJA: Ahora siempre visible, pero bloqueada para Light y GO
    { 
      name: 'Caja', 
      href: '/dashboard/analytics', 
      icon: BarChart3, 
      locked: hasNoPlan || isLight || isGo, 
      msg: isGo ? "La sección de Caja y Reportes es exclusiva del Plan Plus. 💎" : "Elegí un plan para empezar."
    }, 
    { 
      name: 'Pedidos', 
      href: '/dashboard/orders', 
      icon: ShoppingBag, 
      locked: hasNoPlan || isLight, 
      msg: hasNoPlan ? "Elegí un plan para gestionar pedidos." : "La gestión de pedidos requiere Plan GO. 🚀"
    }, 
    // Alrededor de la línea 275
    { 
      name: 'Reservas', 
      href: '/dashboard/reservations', 
      icon: CalendarCheck, 
      locked: true, // 🚀 Forzamos el bloqueo total
      msg: "¡Próximamente! Estamos terminando de poner a punto el sistema de reservas para tu local. ⏳" 
    },
    
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
  ];
  if (isAdmin) {
    menuItems.push({ name: 'Admin Snappy', href: '/admin/snappy', icon: ShieldCheck });
  }
  return (
  <div className="flex flex-col lg:flex-row h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden pb-[env(safe-area-inset-bottom)]">
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
            // Si el item está bloqueado por el plan
            const isLocked = item.locked; 

            return (
              <Link 
                key={item.href} 
                href={isLocked ? '#' : item.href} // Si está bloqueado, el link no hace nada
                onClick={(e) => {
                  if (isLocked) {
                    e.preventDefault();
                    
                    alert(item.msg);
                  }
                }}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg text-xs font-bold transition-all 
                  ${isLocked ? 'opacity-50 cursor-not-allowed text-gray-400' : isActive ? 'bg-black text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 hover:text-black'}`}
                title={isCollapsed ? item.name : ''}
              >
                <div className="relative">
                  <item.icon size={18} /> 
                  {isLocked && (
                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm text-black">
                      <Lock size={8} />
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span>{item.name}</span>
                    {isLocked && <Lock size={12} className="opacity-60" />}
                  </div>
                )}
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
<main className="flex-1 overflow-y-auto relative bg-gray-50 w-full min-w-0 flex flex-col pt-[calc(64px+env(safe-area-inset-top))] lg:pt-0">
    {/* Div espaciadora: Le da aire al contenido en móviles y mantiene el fondo blanco arriba */}
   

    {/* --- FASE 1: PAST_DUE (Mercado Pago re-intentando cobro) --- */}
    {restaurant.plan && restaurant.status === 'past_due' && (
      <div className="bg-orange-500 text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between shadow-lg gap-2 sticky top-0 z-[60] animate-in slide-in-from-top-2">
        <div className="flex items-center gap-3 text-left">
          <AlertTriangle size={20} className="animate-pulse flex-shrink-0"/>
          <div>
        <p className="font-bold text-sm leading-none">Problema con el cobro automático</p>
        <p className="text-[10px] opacity-90 uppercase font-black tracking-wider mt-1">
          El sistema hará un nuevo intento pronto. Asegurate de tener fondos disponibles.
        </p>
      </div>
    </div>
    <button 
      onClick={() => router.push('/dashboard/settings')} 
      className="bg-white text-orange-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition shadow-sm active:scale-95"
    >
      Actualizar Pago
    </button>
  </div>
)}

{/* --- FASE 2: PAUSED (Último aviso - 3 días de gracia antes de Cancelar) --- */}
{restaurant.plan && restaurant.status === 'paused' && (
  <div className="bg-red-600 text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between shadow-lg gap-2 sticky top-0 z-[60] animate-in slide-in-from-top-2 border-b-2 border-white/20">
    <div className="flex items-center gap-3 text-left">
      <div className="bg-white/20 p-2 rounded-lg animate-bounce hidden sm:block">
        <Clock size={20} className="text-white"/>
      </div>
      <div>
        <p className="font-black text-sm uppercase italic leading-none">¡Plan Pausado por falta de pago!</p>
        <p className="text-[10px] font-bold opacity-90 uppercase tracking-tight mt-1">
          Tenés 3 días para regularizar tu situación antes de la baja definitiva de tu cuenta.
        </p>
      </div>
    </div>
    <button 
      onClick={() => router.push('/dashboard/settings')} 
      className="bg-white text-red-600 px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-tighter hover:bg-gray-100 transition shadow-xl active:scale-95"
    >
      SOLUCIONAR AHORA
    </button>
  </div>
)}
        {/* --- BANNER DE TELÉFONO PERSONAL (GLOBAL) --- */}
        {!isLoading && !hasPhone && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between shadow-sm relative z-20 animate-in slide-in-from-top-full">
            <div className="flex items-center gap-3 text-amber-800 text-left">
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
         {/* --- BANNER DE ADVERTENCIA DE TRIAL --- */}
{showWarning && !isSubscriptionValid && (
  <div className="bg-orange-600 text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between shadow-lg gap-2 sticky top-0 z-[50] animate-in slide-in-from-top-2">
    <div className="flex items-center gap-3 text-left">
      <AlertTriangle size={20} className="animate-pulse flex-shrink-0" />
      <div>
        <p className="font-bold text-sm">¡Tu prueba gratuita termina en {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}!</p>
        <p className="text-xs opacity-90">Configurá tu método de pago ahora para no perder acceso a tu panel.</p>
      </div>
    </div>
    <Link 
      href="/dashboard/settings" 
      className="bg-white text-orange-600 px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-gray-100 transition whitespace-nowrap shadow-sm"
    >
      Configurar Pago
    </Link>
  </div>
)}
        {restaurant.plan && <TrialBanner />}

        {/* CONTENEDOR PRINCIPAL CON LÓGICA DE BLOQUEO LOCALIZADO */}
        <div className="p-4 lg:p-10 max-w-7xl mx-auto w-full flex-1 pb-24 lg:pb-10 relative">
          
        
{(() => {
    // 1. LÓGICA DE BLOQUEO GLOBAL
    const isCancelled = restaurant.status === 'cancelled';
    const isSettingsPage = pathname === '/dashboard/settings';
    const isDashboardPage = pathname === '/dashboard';
    const isTemplatesPage = pathname === '/dashboard/templates';
    
    // Si está cancelado, bloqueamos todo menos settings
    const showSuspendedModal = isCancelled && !isSettingsPage;

    // LÓGICA DE ONBOARDING ESTRICTA
    // Si no tiene plan: bloqueamos TODO excepto Inicio y Settings.
    // Si tiene plan pero falta rubro: bloqueamos todo excepto Templates (donde elige rubro).
    const showOnboardingBlock = !isLoading && 
        ((needsPlan && !isDashboardPage && !isSettingsPage) || 
         (needsRubro && !isTemplatesPage && !isSettingsPage)) && 
        !isSubscriptionValid && !bypassBlock;

    const isAnyBlocked = showSuspendedModal || showOnboardingBlock;

    return (
      <>
        {/* EL CONTENIDO: Se desenfoca si hay cualquier bloqueo activo */}
        <div className={`h-full transition-all duration-700 ${isAnyBlocked ? 'blur-md pointer-events-none opacity-40 select-none grayscale' : ''}`}>
          {children}
        </div>

        {/* MODAL DE PANEL SUSPENDIDO (Por falta de pago) */}
        {showSuspendedModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border border-red-100 text-center w-full max-w-[320px] animate-in zoom-in-95 duration-500 relative">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Lock size={32} />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">Panel Suspendido</h3>
              <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-widest leading-relaxed text-center">
                Tu suscripción está vencida. Por favor, regularizá tu pago para seguir gestionando tu local.
              </p>
              <Link href="/dashboard/settings" className="mt-8 block w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-red-200 active:scale-95 transition-all text-center no-underline">
                PAGAR
              </Link>
            </div>
          </div>
        )}

        {/* MODAL DE ONBOARDING (Sidebar libre + Centrado que te sigue) */}
        {showOnboardingBlock && !showSuspendedModal && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center p-6 bg-black/5 backdrop-blur-[2px] pointer-events-none">
            <div className="bg-white p-10 rounded-[40px] shadow-2xl border-2 border-gray-50 max-w-md text-center animate-in zoom-in-95 duration-300 pointer-events-auto">
                
                {needsPlan ? (
                    /* --- CASO A: NO ELIGIÓ PLAN TODAVÍA --- */
                    <>
                        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Zap size={40} fill="currentColor" />
                        </div>
                        <h2 className="text-2xl font-black mb-4 uppercase italic">Activá tu Prueba</h2>
                        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                            Para acceder a esta sección y configurar tu local, primero debés <b>elegir un plan</b>. 
                            <br/><span className="text-blue-600 font-bold">¡Tenés 14 días gratis!</span>
                        </p>
                        <Link href="/dashboard" className="block w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-800 transition text-center no-underline">
                             VER PLANES DISPONIBLES
                        </Link>
                    </>
                ) : (
                    /* --- CASO B: TIENE PLAN PERO NO ELIGIÓ RUBRO --- */
                    <>
                        <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Store size={40} />
                        </div>
                        <h2 className="text-2xl font-black mb-4 uppercase italic">Configurá tu Rubro</h2>
                        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                            ¡Plan activado! 🚀 <br/> 
                            Ahora necesitamos saber qué vendés para adaptar tu catálogo y habilitar tus productos.
                        </p>
                        <Link href="/dashboard/templates" className="block w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-800 transition text-center no-underline">
                            ELEGIR MI RUBRO
                        </Link>
                    </>
                )}
            </div>
          </div>
        )}
      </>
    );
})()}
        </div>
      </main>
     <MobileNav 
  displayName={restaurant.name} 
  displaySubtext={getPlanLabel()} 
  logoUrl={restaurant.logo_url}
  isAdmin={isAdmin} // <--- Enviamos el logo aquí
  onLogout={handleLogout}
/>
    </div>
  );
  
}
