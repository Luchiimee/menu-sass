'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  BarChart3, 
  Palette, 
  User,
  Store,
  Zap
} from 'lucide-react';

interface MobileNavProps {
  displayName: string;
  displaySubtext: string;
}

export default function MobileNav({ displayName, displaySubtext }: MobileNavProps) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Pedidos', href: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Productos', href: '/dashboard/products', icon: UtensilsCrossed },
    { name: 'Diseño', href: '/dashboard/design', icon: Palette }, 
    { name: 'Métricas', href: '/dashboard/analytics', icon: BarChart3 },
  ];

  return (
    <>
      {/* --- HEADER SUPERIOR (FIXED) --- */}
      {/* CAMBIO CLAVE: Usamos 'fixed top-0' para que se pegue al techo sí o sí */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-40 flex items-center justify-between px-4 shadow-sm">
         
         <div className="flex items-center gap-3">
            <div className="bg-black text-white p-2 rounded-lg">
                <Store size={20} />
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-sm text-gray-900 leading-tight truncate w-32 sm:w-48">
                    {displayName || 'Cargando...'}
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    {displaySubtext}
                    {displaySubtext && displaySubtext.includes('Plus') && <Zap size={10} className="text-yellow-400 fill-current"/>}
                </span>
            </div>
         </div>

         {/* AQUÍ ESTÁ LA PERSONITA (Settings) */}
         <Link href="/dashboard/settings" className="p-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition active:scale-95 border border-gray-200">
            <User size={20} />
         </Link>
      </div>

      {/* --- BARRA INFERIOR (FIXED) --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 z-50 flex items-center justify-around pb-1 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] safe-area-bottom">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 active:scale-95 ${
                  isActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {isActive && <div className="absolute top-0 w-8 h-0.5 bg-black rounded-b-full"></div>}
              
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}