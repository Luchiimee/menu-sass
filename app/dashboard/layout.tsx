'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { 
    LayoutDashboard, Palette, ShoppingBag, Settings, LogOut, Store, 
    LayoutTemplate, UtensilsCrossed, AlertTriangle, BarChart3, ArrowRight,
    ChevronLeft, ChevronRight, Headset, ShieldCheck, Bell, Zap, X, Clock, Lock, CalendarCheck,HelpCircle
} from 'lucide-react';
import MobileNav from '@/components/MobileNav';

import OrderListener from '@/components/OrderListener';
import PushNotificationManager from '@/components/PushNotificationManager'; 

function GoogleAuthHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const hasCode = searchParams.has('code');
    const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');
    if (hasCode || hasHash) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
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
  const [profileData, setProfileData] = useState<any>(null); 
  const [isCollapsed, setIsCollapsed] = useState(false); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState("");

  // 1. MODIFICADO: Agregamos created_at al estado inicial
  const [restaurant, setRestaurant] = useState<any>({
    name: 'Cargando...',      
    plan: null,    
    status: 'trialing', 
    logo_url: null,
    onboarding_completed: true,
    created_at: null, // <--- Nuevo
  });

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [restRes, profileRes] = await Promise.all([
        supabase.from('restaurants').select('*').eq('user_id', session.user.id).maybeSingle(),
        supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      ]);

      const rest = restRes.data;
      const profile = profileRes.data;

      if (mounted) {
        setProfileData(profile);
        setIsAdmin(session.user.email === 'luchiimee2@gmail.com');

        const displayName = 
          profile?.first_name || 
          session.user.user_metadata.full_name?.split(' ')[0] || 
          rest?.name || 
          "Mi Local";

        setRestaurant({
            ...(rest || {}), 
            name: displayName,
            plan: rest?.plan_id || null,
            status: rest?.subscription_status || 'trialing'
        });
        
        setIsLoading(false);
      }
    };

    loadData();
    window.addEventListener('profile-updated', loadData);
    return () => { 
      mounted = false; 
      window.removeEventListener('profile-updated', loadData); 
    };
  }, []);

  // --- LÓGICA DE BLOQUEO ESTRICTA (Tus configuraciones originales) ---
  const plan = restaurant.plan;
  const isPlus = plan === 'plus';
  const isGo = plan === 'go';
  const isLight = plan === 'light';
  const isTrial = restaurant.status === 'trialing';
  const isSuperAdmin = profileData?.email === 'luchiimee2@gmail.com' || isAdmin;
  const bypassBlock = isSuperAdmin;

  const menuItems = [
    { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard, locked: false },
    { name: 'Personalizar', href: '/dashboard/personalizar', icon: Palette, locked: !plan && !isTrial, msg: "Elegí un plan para empezar. 🎨" },
    { name: 'Plantillas', href: '/dashboard/templates', icon: LayoutTemplate, locked: !plan && !isTrial, msg: "Elegí un plan para usar plantillas. 📐" },
    { name: 'Mis Productos', href: '/dashboard/products', icon: UtensilsCrossed, locked: !plan && !isTrial, msg: "Elegí un plan para cargar productos. 🍕" },
    { name: 'Caja', href: '/dashboard/analytics', icon: BarChart3, locked: !isPlus, msg: "La sección de Caja es exclusiva del Plan PLUS. 💎" }, 
    { name: 'Pedidos', href: '/dashboard/orders', icon: ShoppingBag, locked: isLight || (!plan && !isTrial), msg: "La gestión de pedidos requiere Plan GO o PLUS. 🚀" }, 
    { name: 'Reservas', href: '/dashboard/reservations', icon: CalendarCheck, locked: !isPlus, msg: "La gestión de reservas requiere Plan PLUS. 💎" },
    { name: 'Plan', href: '/dashboard/plan', icon: Zap, locked: false },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings, locked: false },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace('/login');
  };

  const getPlanLabel = () => {
      if (restaurant.plan === 'plus') return 'Plan Plus';
      if (restaurant.plan === 'go') return 'Plan GO';
      if (restaurant.plan === 'light') return 'Plan Light';
      if (restaurant.status === 'trialing') return 'Prueba Gratis';
      return 'Free';
  };

  const getPlanColor = () => {
      if (restaurant.plan === 'plus') return 'text-emerald-600';
      if (restaurant.plan === 'go') return 'text-blue-600';
      if (restaurant.plan === 'light') return 'text-gray-900';
      return 'text-gray-400';
  };
const renderGlobalBanner = () => {
  
    if (isLoading || !restaurant.created_at) return null;
    
    if (restaurant.status === 'authorized' || restaurant.status === 'active') return null;

    const now = new Date();
    const created = new Date(restaurant.created_at);
    
    // --- LÓGICA DE DÍAS ---
    const diffDays = Math.ceil(Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    const daysLeft = 14 - diffDays;

    // Cálculo de gracia: 3 días desde que el estado pasó a 'suspended'
    const suspendedAt = new Date(restaurant.updated_at || restaurant.created_at);
    const graceDiff = Math.floor(Math.abs(now.getTime() - suspendedAt.getTime()) / (1000 * 60 * 60 * 24));
    const graceDaysLeft = 3 - graceDiff;

    // 🔴 BLOQUEO TOTAL (MODAL)
    const isExpired = daysLeft <= 0 && restaurant.status === 'trialing';
    const isCancelled = restaurant.status === 'cancelled';
    const gracePeriodExpired = restaurant.status === 'suspended' && graceDaysLeft <= 0;
    
    const shouldBlock = (isExpired || isCancelled || gracePeriodExpired) && pathname !== '/dashboard/plan';

    if (shouldBlock) {
      return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-6">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border-2 border-red-50 animate-in zoom-in-95 duration-300">
             {/* ... (Contenido del modal de bloqueo que ya tenías) ... */}
             <h2 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900">Panel Suspendido</h2>
             <p className="text-[11px] text-gray-400 font-bold mt-4 uppercase">Tu acceso ha sido restringido por falta de pago o fin del periodo de prueba.</p>
             <Link href="/dashboard/plan" className="block w-full py-5 bg-black text-white rounded-2xl font-black uppercase mt-8">Actualizar Pago 💳</Link>
          </div>
        </div>
      );
    }

    // 🟠 NIVEL 2: PERIODO DE GRACIA (Snappy te da 3 días extras después de los fallos de MP)
    if (restaurant.status === 'suspended' && graceDaysLeft > 0) {
      return (
        <div className="bg-orange-500 text-white px-4 py-3 flex justify-between items-center text-xs sm:text-sm font-bold shadow-lg z-[60] animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18}/>
            <span>Mercado Pago no pudo cobrar. Tenés <b>{graceDaysLeft} días de gracia</b> antes del bloqueo.</span>
          </div>
          <Link href="/dashboard/plan" className="bg-white text-orange-600 px-4 py-1.5 rounded-xl font-black uppercase text-[10px]">Arreglar Pago</Link>
        </div>
      );
    }

    // 🟡 NIVEL 1: REINTENTOS DE MERCADO PAGO (Aviso suave)
    if (restaurant.status === 'past_due') {
      return (
        <div className="bg-amber-400 text-black px-4 py-3 flex justify-between items-center text-xs sm:text-sm font-bold shadow-lg z-[60]">
          <div className="flex items-center gap-2">
            <Clock size={18}/>
            <span>Estamos reintentando el cobro de tu plan. Por favor, verificá los fondos de tu tarjeta.</span>
          </div>
          <Link href="/dashboard/plan" className="bg-black text-white px-4 py-1.5 rounded-xl font-black uppercase text-[10px]">Ver mi tarjeta</Link>
        </div>
      );
    }

    // 🕒 BANNER DE AVISO (Solo si NO está bloqueado y quedan 4 días o menos)
    if (daysLeft <= 4 && daysLeft > 0) {
      return (
        <div className="bg-indigo-600 text-white px-4 py-2.5 flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm font-bold shadow-lg z-[60] border-b border-white/10">
          <div className="flex items-center gap-2 mb-2 sm:mb-0">
            <Clock size={16}/>
            <span>¡Atención! Te quedan <span className="underline">{daysLeft} días</span> de prueba gratis.</span>
          </div>
          <Link href="/dashboard/plan" className="bg-white text-indigo-600 px-4 py-1.5 rounded-xl font-black uppercase text-[10px] hover:bg-indigo-50 transition shadow-sm">Configurar Pago 💳</Link>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      <OrderListener />
      
      {/* SIDEBAR */}
      <aside className={`hidden lg:flex ${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r flex-col h-full z-20 transition-all duration-300 relative`}>
        <div className={`p-6 border-b flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="bg-black text-white w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            {restaurant.logo_url ? <img src={restaurant.logo_url} alt="logo" className="w-full h-full object-cover" /> : <Store size={20} />}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
                <h2 className="font-bold text-sm leading-tight truncate w-32 capitalize text-gray-900">{restaurant.name}</h2>
                <p className={`text-[10px] font-black uppercase tracking-tighter mt-0.5 ${getPlanColor()}`}>{getPlanLabel()} {restaurant.plan === 'plus' && '⚡'}</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name}
                href={item.locked && !bypassBlock ? '#' : item.href}
                onClick={(e) => { 
                  if (item.locked && !bypassBlock) { 
                    e.preventDefault(); 
                    setUpgradeMsg(item.msg ?? "");
                    setShowUpgradeModal(true); 
                  } 
                }}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-bold transition-all 
                  ${item.locked ? 'opacity-60 grayscale' : isActive ? 'bg-black text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <div className="relative">
                  <item.icon size={18} /> 
                  {item.locked && (
                    <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 border-2 border-white shadow-sm z-10"><Lock size={8} fill="currentColor" /></div>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span>{item.name}</span>
                    {item.locked && <Lock size={12} className="opacity-30" />}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
<a
  href="https://wa.me/5492324313123?text=Hola%20Necesito%20soporte%20con%20mi%20cuenta%20de%20Snappy"
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-green-600 transition-all group border-t border-gray-50 mt-4"
>
  <HelpCircle size={18} className="group-hover:rotate-12 transition-transform" />
  <span className="text-[10px] font-black uppercase italic tracking-tighter">
    Contactar con soporte
  </span>
</a>
        <div className="p-4 border-t mt-auto">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full text-red-600 hover:bg-red-50 rounded-lg text-[11px] font-bold">
              <LogOut size={18} /> {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-gray-50 flex flex-col pt-[calc(64px+env(safe-area-inset-top))] lg:pt-0">
        
        {/* 3. MODIFICADO: Agregamos el llamado a la función del banner aquí */}
        {renderGlobalBanner()}

        <div className="p-4 lg:p-10 max-w-7xl mx-auto w-full flex-1 relative">
          {children}
        </div>
      </main>

      {/* MODAL DE UPGRADE (Tus configuraciones originales) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-indigo-50 max-w-sm w-full text-center animate-in zoom-in-95 duration-300 relative">
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm"><Zap size={40} fill="currentColor" /></div>
            <h2 className="text-2xl font-black mb-3 uppercase italic text-gray-900 leading-none tracking-tighter">Sección Pro</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-8 font-medium">{upgradeMsg}</p>
            <div className="space-y-3">
              <Link href="/dashboard/plan" onClick={() => setShowUpgradeModal(false)} className="block w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-800 transition shadow-xl active:scale-95">MEJORAR MI PLAN 🚀</Link>
              <button onClick={() => setShowUpgradeModal(false)} className="block w-full py-3 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-gray-600 transition">Quizás más tarde</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}