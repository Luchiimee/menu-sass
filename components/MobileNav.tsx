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
  ChevronRight
} from 'lucide-react';
import PushNotificationManager from '@/components/PushNotificationManager';

interface MobileNavProps {
  displayName: string;
  displaySubtext: string;
  logoUrl?: string | null;
}

export default function MobileNav({ displayName, displaySubtext, logoUrl }: MobileNavProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mainNavItems = [
    { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Pedidos', href: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Productos', href: '/dashboard/products', icon: UtensilsCrossed },
    { name: 'Caja', href: '/dashboard/analytics', icon: BarChart3 },
  ];

  const secondaryNavItems = [
    { name: 'Personalizar Diseño', href: '/dashboard/personalizar', icon: Palette },
    { name: 'Galería de Plantillas', href: '/dashboard/templates', icon: Layout },
    { name: 'Ajustes y Cuenta', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <>
      {/* --- HEADER SUPERIOR --- */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-40 flex items-center justify-between px-4 shadow-sm">
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

      {/* --- MENÚ DESPLEGABLE "MÁS" --- */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          
          <div className="absolute bottom-20 left-4 right-4 bg-white rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 overflow-hidden">
            
            {/* INFO DEL PLAN (Encabezado del Menú) */}
            <div className="bg-slate-50 -mx-6 -mt-6 p-6 mb-6 border-b border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tu Suscripción</p>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900 uppercase italic flex items-center gap-2">
                        {displaySubtext || 'Plan Free'} {displaySubtext?.includes('Plus') && <Zap size={14} className="text-blue-600 fill-current"/>}
                    </span>
                    <Link href="/dashboard/settings" onClick={() => setIsMenuOpen(false)} className="text-[10px] font-bold text-blue-600 underline">Gestionar</Link>
                </div>
            </div>

            <div className="space-y-1">
              {secondaryNavItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center justify-between p-4 rounded-2xl font-bold text-sm transition-all ${pathname === item.href ? 'bg-indigo-50 text-indigo-700' : 'text-slate-800 active:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <item.icon size={20} className={pathname === item.href ? 'text-indigo-600' : 'text-slate-400'} /> 
                    {item.name}
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </Link>
              ))}
              
              <div className="h-px bg-slate-100 my-4" />
              
              <Link 
                href="/login" 
                className="flex items-center gap-4 p-4 rounded-2xl font-bold text-sm text-red-600 active:bg-red-50"
              >
                <LogOut size={20} /> Cerrar Sesión
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* --- BARRA INFERIOR (CONTRASTE MEJORADO) --- */}
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
          className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 active:scale-90 relative ${isMenuOpen ? 'text-indigo-600' : 'text-slate-500'}`}
        >
          {isMenuOpen && <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full animate-in slide-in-from-top-1"></div>}
          {isMenuOpen ? <X size={20} strokeWidth={3} /> : <Menu size={20} strokeWidth={2} className="text-slate-600" />}
          <span className={`text-[9px] mt-1 font-black uppercase tracking-tighter ${isMenuOpen ? 'text-indigo-600' : 'text-slate-700 opacity-90'}`}>
            Más
          </span>
        </button>
      </div>
    </>
  );
}