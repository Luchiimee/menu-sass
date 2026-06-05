'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { 
    LayoutDashboard, Palette, ShoppingBag, Settings, LogOut, Store, 
    LayoutTemplate, UtensilsCrossed, AlertTriangle, BarChart3, ArrowRight,
    ChevronLeft, ChevronRight, Headset, ShieldCheck, Bell, Zap, X, Clock, Lock, CalendarCheck, HelpCircle, Phone
} from 'lucide-react';

import MobileNav from '@/components/MobileNav';
import OrderListener from '@/components/OrderListener';

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
    created_at: null,
  });

// --- CARGA DE DATOS ---
  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
const adminEmails = ['luchiimee2@gmail.com', 'snappyuno25@gmail.com', 'ginoroblabelleggia@gmail.com'];
setIsAdmin(adminEmails.includes(session.user.email?.toLowerCase() ?? ''));
      const [restRes, profileRes] = await Promise.all([
        supabase.from('restaurants').select('*').eq('user_id', session.user.id).maybeSingle(),
        fetch(`/api/profile?userId=${session.user.id}`).then(r => r.json()).catch(() => ({ profile: null }))
      ]);

      const metadata = session.user.user_metadata;
      const profile = profileRes.profile;
      const rest = restRes.data;

      // 🚀 MEJORA: Buscamos el teléfono en la tabla O en los metadatos de Google/Registro
      const phoneExists = profile?.phone || metadata.phone || metadata.whatsapp;

      // Seteamos el perfil mezclando los datos de la tabla con el teléfono encontrado
      setProfileData({
        ...profile,
        phone: phoneExists 
      });

      

      const displayName = profile?.first_name || metadata.full_name?.split(' ')[0] || rest?.name || "Mi Local";

      setRestaurant({
          ...(rest || {}), 
          name: displayName,
          plan: rest?.subscription_plan || null,
          status: rest?.subscription_status || 'trialing'
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error cargando datos del layout:", error);
    }
  };

  useEffect(() => {
    loadData();
    
    // Escuchamos actualizaciones de perfil para recargar los banners
    window.addEventListener('profile-updated', loadData);
    return () => { 
      window.removeEventListener('profile-updated', loadData); 
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace('/login');
  };

  // --- LÓGICA DE TIEMPOS (TRIAL) ---
  const getTrialDaysLeft = () => {
    if (!restaurant.created_at) return 14;
    const now = new Date();
    const created = new Date(restaurant.created_at);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, 14 - diffDays);
  };

  const daysLeft = getTrialDaysLeft();
  const hasActivePayment = restaurant.status === 'authorized' || restaurant.status === 'active';
  const isTrialExpired = daysLeft <= 0 && restaurant.status === 'trialing' && !hasActivePayment;
  const onPlanPage = pathname === '/dashboard/plan';
  const trialExpired = isTrialExpired && !onPlanPage && !isAdmin;
  const showTrialWarning = daysLeft <= 4 && daysLeft > 0 && restaurant.status === 'trialing' && !hasActivePayment && !onPlanPage && !isAdmin;
  const isPausedBlocked = restaurant.status === 'paused' && !onPlanPage && !isAdmin;
  const isCancelledBlocked = restaurant.status === 'cancelled' && !onPlanPage && !isAdmin;
  const isBlocked = trialExpired || isPausedBlocked || isCancelledBlocked;
  const missingPhone = !profileData?.phone;
  const noPlan = !restaurant.plan;

const menuItems = [
  { 
      name: 'Inicio', 
      href: '/dashboard', 
      icon: LayoutDashboard, 
      locked: isTrialExpired, 
      msg: "Tu prueba venció. Activá un plan para volver al inicio. 🚀" 
  },
  { 
      name: 'Personalizar', 
      href: '/dashboard/personalizar', 
      icon: Palette, 
      locked: noPlan || isTrialExpired, 
      msg: "Elegí un plan para empezar a diseñar tu menú. 🎨"
  },
  { 
      name: 'Plantillas', 
      href: '/dashboard/templates', 
      icon: LayoutTemplate, 
      locked: noPlan || isTrialExpired,
      msg: "Activá un plan para acceder a nuestras plantillas premium. 📐" 
  },
  { 
      name: 'Mis Productos', 
      href: '/dashboard/products', 
      icon: UtensilsCrossed, 
      locked: noPlan || isTrialExpired,
      msg: "Necesitás un plan activo para cargar tus productos. 🍕" 
  },
  { 
      name: 'Caja', 
      href: '/dashboard/analytics', 
      icon: BarChart3, 
      locked: restaurant.plan !== 'plus' || isTrialExpired, // 👈 Bloqueado si no es PLUS
      msg: "La sección de Caja es exclusiva del Plan PLUS. 💎" 
  }, 
  { 
      name: 'Pedidos', 
      href: '/dashboard/orders', 
      icon: ShoppingBag, 
      locked: (restaurant.plan === 'light' || noPlan) || isTrialExpired, // 👈 Bloqueado en Light
      msg: "La gestión de pedidos requiere Plan GO o PLUS. 🚀" 
  }, 
  { 
      name: 'Reservas', 
      href: '/dashboard/reservations', 
      icon: CalendarCheck, 
      locked: restaurant.plan !== 'plus' || isTrialExpired, // 👈 Bloqueado si no es PLUS
      msg: "La gestión de reservas requiere Plan PLUS. 💎" 
  },
  { name: 'SuperAdmin', href: '/admin/snappy', icon: ShieldCheck, locked: false },
  { name: 'Plan', href: '/dashboard/plan', icon: Zap, locked: false },
  { 
      name: 'Configuración', 
      href: '/dashboard/settings', 
      icon: Settings, 
      locked: isTrialExpired, 
      msg: "Tu prueba venció. Activá un plan para acceder a la configuración. ⚙️" 
  },
];
  // --- RENDERIZADO DE BANNERS ---
  const renderBanners = () => {
    if (isLoading) return null;

    return (
      <div className="flex flex-col w-full">
        {/* 1. BANNER DE TELÉFONO (Prioridad Alta) */}
        {missingPhone && (
          <div className="bg-amber-500 text-white px-4 py-2 flex justify-between items-center text-[10px] sm:text-xs font-black uppercase tracking-widest z-[60] border-b border-black/5">
            <div className="flex items-center gap-2">
              <Phone size={14} fill="currentColor" />
              <span>Falta tu WhatsApp para enviarte avisos de ventas</span>
            </div>
            <Link href="/dashboard/plan?requirePhone=true" className="bg-white text-amber-600 px-3 py-1 rounded-lg hover:bg-amber-50 transition shadow-sm">Cargar ahora</Link>
          </div>
        )}

        {/* 2. BANNER DE TRIAL EXPIRANDO */}
        {showTrialWarning && (
          <div className="bg-indigo-600 text-white px-4 py-2.5 flex justify-between items-center text-xs font-bold shadow-lg z-[50] border-b border-white/10">
            <div className="flex items-center gap-2">
              <Clock size={16}/>
              <span>¡Atención! Te quedan <span className="underline">{daysLeft} días</span> de prueba gratis.</span>
            </div>
            <Link href="/dashboard/plan" className="bg-white text-indigo-600 px-4 py-1.5 rounded-xl font-black uppercase text-[10px] hover:bg-indigo-50 transition shadow-sm">Configurar Pago 💳</Link>
          </div>
        )}

        {/* 3. BANNER DE PAGO FALLIDO */}
        {restaurant.status === 'paused' && !isAdmin && (
          <div className="bg-red-600 text-white px-4 py-2.5 flex justify-between items-center text-xs font-bold shadow-lg z-[50] border-b border-white/10">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16}/>
              <span>Tu pago falló y la suscripción está pausada. Actualizá tu tarjeta para continuar.</span>
            </div>
            <Link href="/dashboard/plan" className="bg-white text-red-600 px-4 py-1.5 rounded-xl font-black uppercase text-[10px] hover:bg-red-50 transition shadow-sm">Actualizar Tarjeta</Link>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      <OrderListener />
      
      <MobileNav 
        displayName={restaurant.name}
        displaySubtext={restaurant.plan ? `Plan ${restaurant.plan.toUpperCase()}` : 'Sin Plan'}
        logoUrl={restaurant.logo_url}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />

      <aside className={`hidden lg:flex ${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r flex-col h-full z-100 transition-all duration-300 relative`}>
        <div className={`p-6 border-b flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="bg-black text-white w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            {restaurant.logo_url ? <img src={restaurant.logo_url} alt="logo" className="w-full h-full object-cover" /> : <Store size={20} />}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
                <h2 className="font-bold text-sm leading-tight truncate w-32 capitalize text-gray-900">{restaurant.name}</h2>
                <p className={`text-[9px] font-black uppercase tracking-tighter mt-0.5 ${restaurant.plan === 'plus' ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {restaurant.plan ? `Plan ${restaurant.plan}` : 'Sin Activar'}
                </p>
            </div>
          )}
        </div>
  <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {menuItems
    // 🚀 FILTRO DE SEGURIDAD: Solo mostramos SuperAdmin si isAdmin es true
    .filter(item => item.name !== 'SuperAdmin' || isAdmin) 
    .map((item) => {
      const isActive = pathname === item.href;
            
           
            const isLockedByPlan = item.locked && (restaurant.plan !== 'plus' && item.name === 'Caja' || restaurant.plan !== 'plus' && item.name === 'Reservas' || (restaurant.plan === 'light' && item.name === 'Pedidos'));

            // 2. ¿Debería ver el candado? 
            // Lo ve si es un usuario normal con trial vencido O si es una sección bloqueada por su plan actual.
            const shouldShowLock = (item.locked && !isAdmin) || isLockedByPlan;

            return (
              <Link 
                key={item.name}
                href={(shouldShowLock && !isAdmin) ? '#' : item.href}
                onClick={(e) => { 
                  // Si está bloqueado (ya sea por Plan o por Trial para mortales), mostramos el modal.
                  if (shouldShowLock) {
                    // El Admin puede entrar igual si quiere forzar la vista, pero le mostramos el aviso.
                    if (!isAdmin) e.preventDefault(); 
                    
                    setUpgradeMsg(item.msg ?? "");
                    setShowUpgradeModal(true); 
                  }
                }}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-bold transition-all 
                  ${shouldShowLock ? 'opacity-60 grayscale' : isActive ? 'bg-black text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <div className="relative">
                  <item.icon size={18} /> 
                  {/* Candado rojo: se muestra si la sección no corresponde al plan o si el trial venció */}
                  {shouldShowLock && (
                    <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 border-2 border-white shadow-sm z-10">
                      <Lock size={8} fill="currentColor" />
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span>{item.name}</span>
                    {shouldShowLock && <Lock size={12} className="opacity-30" />}
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
        {renderBanners()}
        
        {/* BLOQUEO GLOBAL SI EL TRIAL EXPIRÓ */}
        <div className={`p-4 lg:p-10 max-w-7xl mx-auto w-full flex-1 relative transition-all duration-700 ${isBlocked ? 'blur-xl pointer-events-none opacity-40 select-none grayscale' : ''}`}>
          <Suspense fallback={<div>Cargando...</div>}>
            {children}
          </Suspense>
        </div>

        {/* BLOQUEO GLOBAL */}
        {isBlocked && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md animate-in fade-in">
            <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border-2 border-red-100 max-w-sm w-full text-center animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h2 className="text-2xl font-black mb-3 uppercase italic text-gray-900 leading-none tracking-tighter">
                {trialExpired ? "Prueba Vencida" : isPausedBlocked ? "Pago Fallido" : "Plan Cancelado"}
              </h2>
              <p className="text-gray-500 text-xs leading-relaxed mb-8 font-bold uppercase tracking-tight">
                {trialExpired && "Tu periodo de 14 días terminó. Para seguir gestionando tu local y recibir pedidos, debés configurar un medio de pago."}
                {isPausedBlocked && "Tu suscripción está pausada por falta de pago. Reintentá el cobro o actualizá tu tarjeta para continuar."}
                {isCancelledBlocked && "Tu plan está cancelado. Resuscribite para volver a usar Snappy."}
              </p>
              <Link href="/dashboard/plan" className="block w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
                {trialExpired ? "CONFIGURAR PAGO AHORA 💳" : isPausedBlocked ? "RESOLVER PAGO 💳" : "RESUSCRIBIRME 💳"}
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE UPGRADE SECCIONES BLOQUEADAS */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-indigo-50 max-w-sm w-full text-center animate-in zoom-in-95">
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm ${isTrialExpired ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600'}`}>
  {isTrialExpired ? <AlertTriangle size={40} /> : <Zap size={40} fill="currentColor" />}
</div>
            <h2 className="text-2xl font-black mb-3 uppercase italic text-gray-900 leading-none tracking-tighter">Sección Pro</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-8 font-medium">{upgradeMsg}</p>
            <div className="space-y-3">
              <Link href="/dashboard/plan" onClick={() => setShowUpgradeModal(false)} className="block w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest">ACTIVAR UN PLAN 🚀</Link>
              <button onClick={() => setShowUpgradeModal(false)} className="block w-full py-3 text-gray-400 font-bold uppercase text-[10px]">Más tarde</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}