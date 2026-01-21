'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Palette, User } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();

  // MÁXIMO 5 ÍTEMS PARA QUE SE VEA BIEN
  const links = [
    { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { href: '/dashboard/orders', label: 'Pedidos', icon: ShoppingBag },
    { href: '/dashboard/products', label: 'Menú', icon: UtensilsCrossed }, 
    { href: '/dashboard/design', label: 'Diseño', icon: Palette }, // Aquí meteremos plantillas también
    { href: '/dashboard/settings', label: 'Perfil', icon: User }, // Antes Configuración
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-6 flex justify-between items-center z-50 md:hidden pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        
        return (
          <Link 
            key={link.href} 
            href={link.href}
            className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-black scale-105' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            {/* Opcional: Ocultar texto en pantallas muy pequeñas si queda apretado */}
            <span className="text-[10px] font-medium">{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}