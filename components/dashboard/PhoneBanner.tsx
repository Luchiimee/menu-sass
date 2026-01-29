'use client'
import { Smartphone, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function PhoneBanner({ hasPhone }: { hasPhone: boolean }) {
  // Si en la base de datos ya hay un teléfono, el banner desaparece solo
  if (hasPhone) return null

  return (
    <div className="bg-slate-900 text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between shadow-lg gap-2 sticky top-0 z-30 border-b border-white/10">
      <div className="flex items-center gap-2">
        <Smartphone size={20} className="text-blue-400 animate-pulse flex-shrink-0"/>
        <p className="font-bold text-sm text-center md:text-left text-slate-200">
          Tu perfil está incompleto. Registrá tu WhatsApp para recibir soporte técnico y notificaciones de pedidos.
        </p>
      </div>
      <Link href="/dashboard/settings" className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase hover:bg-blue-500 transition whitespace-nowrap flex items-center gap-2 tracking-widest">
        Registrar Teléfono <ArrowRight size={14}/>
      </Link>
    </div>
  )
}