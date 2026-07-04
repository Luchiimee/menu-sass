'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  BarChart3,
  Palette,
  Store,
  Zap,
  Layout,
  Menu,
  X,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck, CalendarCheck,Lock
} from 'lucide-react';
import PushNotificationManager from '@/components/PushNotificationManager';

interface MobileNavProps {
  displayName: string;
  displaySubtext: string;
  logoUrl?: string | null;
  isAdmin?: boolean;
  onLogout: () => Promise<void>;
}
export default function MobileNav({ displayName, displaySubtext, logoUrl, isAdmin, onLogout }: MobileNavProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isPlus = displaySubtext?.includes('Plus') || isAdmin;

  const mainNavItems = [
    { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Pedidos', href: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Productos', href: '/dashboard/products', icon: UtensilsCrossed },
    { name: 'Caja', href: '/dashboard/analytics', icon: BarChart3 },
  ];

  const secondaryNavItems = [
    { 
        name: 'Mi Plan Snappy', 
        href: '/dashboard/plan', 
        icon: Zap,
        locked: false 
    },
    { 
        name: 'Reservas', 
        href: '/dashboard/reservations', 
        icon: CalendarCheck, 
        locked: !isPlus, // 🚀 Bloqueado si NO es plus
        msg: "La gestión de reservas requiere Plan Plus. 💎" 
    },
    { name: 'Personalizar Diseño', href: '/dashboard/personalizar', icon: Palette },
    { name: 'Galería de Plantillas', href: '/dashboard/templates', icon: Layout },
    { name: 'Ajustes y Cuenta', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <>
      {/* --- HEADER SUPERIOR --- */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-white border-b z-40 flex items-center justify-between px-4 shadow-sm">
         <div className="flex items-center gap-3">
            <div className="bg-black text-white w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoUrl ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" /> : <Store size={20} />}
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-sm text-gray-900 leading-tight truncate w-32 sm:w-48">{displayName || 'Cargando...'}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                    {displaySubtext}
                    {displaySubtext?.includes('Plus') && <Zap size={10} className="text-yellow-400 fill-current"/>}
                </span>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <PushNotificationManager mobile />
         </div>
      </div>

{/* --- MENÚ DESPLEGABLE "MÁS" REDISEÑADO (FULL SCREEN) --- */}
     {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] animate-in fade-in duration-200">
          {/* Fondo oscuro con blur */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          
          {/* Contenedor Pantalla Completa */}
          <div 
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
            className="absolute top-0 inset-x-0 bottom-0 bg-white shadow-2xl animate-in slide-in-from-bottom-5 duration-300 flex flex-col overflow-y-auto pb-24"
          >
            
            {/* CABECERA DE PERFIL + BOTÓN CERRAR */}
            <div className="p-6 pt-8 bg-slate-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-xl overflow-hidden border-2 border-white shadow-md">
                     {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" alt="logo" /> : <Store className="w-full h-full p-2 text-white" />}
                  </div>
                  <div className="text-left">
                     <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Hola, {displayName.split(' ')[0]}!</p>
                     <p className="text-sm font-black text-slate-900 uppercase italic flex items-center gap-1">
                       {displaySubtext} {displaySubtext?.includes('Plus') && <Zap size={14} className="text-fresco fill-current"/>}
                     </p>
                  </div>
                </div>

                {/* BOTÓN CERRAR (X) */}
                <button 
                   onClick={() => setIsMenuOpen(false)} 
                   className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 active:scale-90 transition-all"
                >
                   <X size={24} strokeWidth={2.5} />
                </button>
            </div>

            <div className="p-4 space-y-6">
              {/* SECCIÓN GESTIÓN */}
              <div>
                <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 text-left">Diseño y Visualización</p>
                <div className="space-y-1">
                 {secondaryNavItems.map((item: any) => (
  <Link 
    key={item.href} 
    href={item.locked ? '#' : item.href} 
    onClick={(e) => {
      if (item.locked) {
        e.preventDefault();
        alert(item.msg);
      } else {
        setIsMenuOpen(false);
      }
    }} 
    className={`flex items-center justify-between p-4 rounded-2xl transition-all ${item.locked ? 'opacity-50' : 'active:bg-slate-100'}`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-xl ${item.locked ? 'bg-gray-100 text-gray-400' : 'bg-slate-100 text-slate-600'}`}>
        <item.icon size={20} />
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-bold ${item.locked ? 'text-gray-400' : 'text-slate-800'}`}>{item.name}</span>
        {item.locked && <Lock size={12} className="text-gray-400" />}
      </div>
    </div>
    <ChevronRight size={18} className="text-slate-300" />
  </Link>
))}
                </div>
              </div>

              {/* SECCIÓN SISTEMA (Solo si es Admin) */}
              {isAdmin && (
                <div>
                  <p className="px-4 text-[10px] font-black text-fresco uppercase tracking-[0.2em] mb-2 text-left">Administración</p>
                  <Link href="/admin/snappy" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between p-4 rounded-2xl bg-[#F0FAF6] border border-[#E8F7F1] active:scale-95 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-fresco rounded-xl text-white shadow-lg shadow-surface"><ShieldCheck size={20} /></div>
                      <span className="font-black text-ink">Panel Snappy Admin</span>
                    </div>
                    <ChevronRight size={18} className="text-fresco" />
                  </Link>
                </div>
              )}

              {/* BOTÓN SALIR AL FINAL */}
              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={onLogout} 
                  className="w-full flex items-center gap-4 p-4 rounded-2xl font-black text-alert active:bg-alert/10 transition-colors"
                >
                    <div className="p-2 bg-alert/10 rounded-xl"><LogOut size={20} /></div>
                    Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] z-50 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href && !isMenuOpen;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 active:scale-90 relative ${isActive ? 'text-black' : 'text-slate-500'}`}
            >
              {isActive && <div className="absolute top-0 w-8 h-1 bg-black rounded-b-full animate-in slide-in-from-top-1"></div>}
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-black' : 'text-slate-600'} />
              <span className={`text-[9px] mt-1 font-black uppercase tracking-tighter ${isActive ? 'text-black' : 'text-slate-700 opacity-90'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* BOTÓN "MÁS" (Hamburguesa) */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 active:scale-90 relative ${isMenuOpen ? 'text-fresco' : 'text-slate-500'}`}
        >
          {isMenuOpen && <div className="absolute top-0 w-8 h-1 bg-fresco rounded-b-full animate-in slide-in-from-top-1"></div>}
          {isMenuOpen ? <X size={20} strokeWidth={3} /> : <Menu size={20} strokeWidth={2} className="text-slate-600" />}
          <span className={`text-[9px] mt-1 font-black uppercase tracking-tighter ${isMenuOpen ? 'text-fresco' : 'text-slate-700 opacity-90'}`}>
            Más
          </span>
        </button>
      </div>
    </>
  );
}