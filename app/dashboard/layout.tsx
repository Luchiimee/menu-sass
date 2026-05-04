'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { 
    LayoutDashboard, Palette, ShoppingBag, Settings, LogOut, Store, 
    LayoutTemplate, UtensilsCrossed, AlertTriangle, BarChart3, ArrowRight,
    ChevronLeft, ChevronRight, Headset, ShieldCheck, Bell, Zap, X, Clock, Lock, CalendarCheck, HelpCircle
} from 'lucide-react';

// --- COMPONENTES ---
import MobileNav from '@/components/MobileNav';
import OrderListener from '@/components/OrderListener';

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

  const [restaurant, setRestaurant] = useState<any>({
    name: 'Cargando...',      
    plan: null,    
    status: 'trialing', 
    logo_url: null,
    onboarding_completed: true,
    created_at: null,
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

  const menuItems = [
    { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard, locked: false },
    { name: 'Personalizar', href: '/dashboard/personalizar', icon: Palette, locked: !restaurant.plan && restaurant.status !== 'trialing', msg: "Elegí un plan para empezar. 🎨" },
    { name: 'Plantillas', href: '/dashboard/templates', icon: LayoutTemplate, locked: !restaurant.plan && restaurant.status !== 'trialing', msg: "Elegí un plan para usar plantillas. 📐" },
    { name: 'Mis Productos', href: '/dashboard/products', icon: UtensilsCrossed, locked: !restaurant.plan && restaurant.status !== 'trialing', msg: "Elegí un plan para cargar productos. 🍕" },
    { name: 'Caja', href: '/dashboard/analytics', icon: BarChart3, locked: restaurant.plan !== 'plus', msg: "La sección de Caja es exclusiva del Plan PLUS. 💎" }, 
    { name: 'Pedidos', href: '/dashboard/orders', icon: ShoppingBag, locked: restaurant.plan === 'light' || (!restaurant.plan && restaurant.status !== 'trialing'), msg: "La gestión de pedidos requiere Plan GO o PLUS. 🚀" }, 
    { name: 'Reservas', href: '/dashboard/reservations', icon: CalendarCheck, locked: restaurant.plan !== 'plus', msg: "La gestión de reservas requiere Plan PLUS. 💎" },
    { name: 'Plan', href: '/dashboard/plan', icon: Zap, locked: false },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings, locked: false },
  ];

  const renderGlobalBanner = () => {
    if (isLoading || !restaurant.created_at) return null;
    if (restaurant.status === 'authorized' || restaurant.status === 'active') return null;

    const now = new Date();
    const created = new Date(restaurant.created_at);
    const diffDays = Math.ceil(Math.abs(now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    const daysLeft = 14 - diffDays;

    if (daysLeft <= 4 && daysLeft > 0 && restaurant.status === 'trialing') {
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
      
      {/* 📱 MENU MOBILE (Agregado aquí) */}
      <MobileNav 
        displayName={restaurant.name}
        displaySubtext={getPlanLabel()}
        logoUrl={restaurant.logo_url}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />

      {/* SIDEBAR DESKTOP */}
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
                href={item.locked && !isAdmin ? '#' : item.href}
                onClick={(e) => { 
                  if (item.locked && !isAdmin) { 
                    e.preventDefault(); 
                    setUpgradeMsg(item.msg ?? "");
                    setShowUpgradeModal(true); 
                  } 
                }}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-bold transition-all 
                  ${item.locked && !isAdmin ? 'opacity-60 grayscale' : isActive ? 'bg-black text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <div className="relative">
                  <item.icon size={18} /> 
                  {item.locked && !isAdmin && (
                    <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 border-2 border-white shadow-sm z-10"><Lock size={8} fill="currentColor" /></div>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span>{item.name}</span>
                    {item.locked && !isAdmin && <Lock size={12} className="opacity-30" />}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <a href="https://wa.me/5492324313123" target="_blank" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-green-600 transition-all group border-t border-gray-50 mt-4">
          <HelpCircle size={18} />
          <span className="text-[10px] font-black uppercase italic tracking-tighter">Soporte</span>
        </a>

        <div className="p-4 border-t mt-auto">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full text-red-600 hover:bg-red-50 rounded-lg text-[11px] font-bold">
              <LogOut size={18} /> {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-gray-50 flex flex-col pt-[calc(64px+env(safe-area-inset-top))] lg:pt-0">
        {renderGlobalBanner()}
        <div className="p-4 lg:p-10 max-w-7xl mx-auto w-full flex-1 relative">
          <Suspense fallback={<div>Cargando...</div>}>
            {children}
          </Suspense>
        </div>
      </main>

      {/* MODAL DE UPGRADE */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-indigo-50 max-w-sm w-full text-center animate-in zoom-in-95 duration-300 relative">
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm"><Zap size={40} fill="currentColor" /></div>
            <h2 className="text-2xl font-black mb-3 uppercase italic text-gray-900 leading-none tracking-tighter">Sección Pro</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-8 font-medium">{upgradeMsg}</p>
            <div className="space-y-3">
              <Link href="/dashboard/plan" onClick={() => setShowUpgradeModal(false)} className="block w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest">MEJORAR MI PLAN 🚀</Link>
              <button onClick={() => setShowUpgradeModal(false)} className="block w-full py-3 text-gray-400 font-bold uppercase text-[10px]">Más tarde</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}