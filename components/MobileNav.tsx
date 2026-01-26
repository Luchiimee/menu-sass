'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Store, 
  Zap 
} from 'lucide-react';

// 👇 Definimos qué datos va a recibir el componente (Esto arregla el error rojo)
interface MobileNavProps {
  displayName: string;
  displaySubtext: string;
}

export default function MobileNav({ displayName, displaySubtext }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* --- BARRA SUPERIOR (Visible solo en celular) --- */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-20">
         
         {/* INFO DEL USUARIO / RESTAURANTE */}
         <div className="flex items-center gap-3">
            <div className="bg-black text-white p-2 rounded-lg">
                <Store size={20} />
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-sm text-gray-900 leading-tight truncate w-40">
                    {displayName}
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    {displaySubtext}
                    {displaySubtext.includes('Plus') && <Zap size={10} className="text-yellow-400 fill-current"/>}
                </span>
            </div>
         </div>

         {/* BOTÓN HAMBURGUESA */}
         <button onClick={() => setIsOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Menu size={24} />
         </button>
      </div>

      {/* --- MENÚ DESPLEGABLE (OVERLAY) --- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden animate-in fade-in">
            <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-2xl p-4 flex flex-col animate-in slide-in-from-right">
                
                <div className="flex justify-end mb-6">
                    <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500">
                        <X size={20}/>
                    </button>
                </div>

                <nav className="space-y-1 flex-1">
                    <p className="px-2 text-xs font-semibold text-gray-400 uppercase mb-2">Principal</p>
                    
                    <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition">
                        <LayoutDashboard size={18} /> Inicio
                    </Link>
                    <Link href="/dashboard/orders" onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition">
                        <ShoppingBag size={18} /> Pedidos
                    </Link>
                    <Link href="/dashboard/products" onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition">
                        <UtensilsCrossed size={18} /> Productos
                    </Link>

                    <p className="px-2 text-xs font-semibold text-gray-400 uppercase mb-2 mt-6">Gestión</p>

                    <Link href="/dashboard/analytics" onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition">
                        <BarChart3 size={18} /> Caja y Métricas
                    </Link>
                    <Link href="/dashboard/settings" onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition">
                        <Settings size={18} /> Configuración
                    </Link>
                </nav>

                <div className="border-t pt-4">
                    <form action="/auth/signout" method="post">
                        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition">
                            <LogOut size={18} /> Cerrar sesión
                        </button>
                    </form>
                </div>

            </div>
        </div>
      )}
    </>
  );
}