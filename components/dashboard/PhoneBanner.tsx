'use client'
import { Smartphone, ArrowRight, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function PhoneBanner({ hasPhone }: { hasPhone: boolean }) {
  const [isVisible, setIsVisible] = useState(true)
  if (hasPhone || !isVisible) return null

  return (
    <div className="bg-amber-500 text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between shadow-lg gap-2 sticky top-0 z-30 border-b border-amber-600">
      <div className="flex items-center gap-2">
        <Smartphone size={20} className="animate-bounce flex-shrink-0"/>
        <p className="font-bold text-sm text-center md:text-left">
          ¡Casi listo! Agregá tu WhatsApp para recibir soporte y activar tu descuento del 50%.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="bg-white text-amber-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase hover:bg-amber-50 transition whitespace-nowrap flex items-center gap-2">
          Completar ahora <ArrowRight size={14}/>
        </Link>
        <button onClick={() => setIsVisible(false)} className="text-white/70 hover:text-white">
          <X size={18}/>
        </button>
      </div>
    </div>
  )
}