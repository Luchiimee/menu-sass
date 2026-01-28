'use client'

import { Smartphone, Clock, ArrowRight, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface BannerProps {
  userPhone: string | null
  daysLeft: number
}

export default function DashboardBanner({ userPhone, daysLeft }: BannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  // 1. Prioridad: Si no hay teléfono (Típico de Login con Google)
  if (!userPhone || userPhone.trim() === '') {
    return (
      <div className="bg-amber-500 text-white p-3 shadow-lg relative animate-in slide-in-from-top duration-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 px-8">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="animate-bounce" />
            <p className="text-sm font-bold tracking-tight">
              ¡Casi listo! Agregá tu WhatsApp para recibir soporte y activar tu descuento.
            </p>
          </div>
          <Link 
            href="/dashboard/settings" 
            className="bg-white text-amber-600 text-[10px] font-black px-4 py-1.5 rounded-full hover:bg-amber-50 transition-all flex items-center gap-2 uppercase tracking-widest"
          >
            Completar Perfil <ArrowRight size={14} />
          </Link>
        </div>
        <button onClick={() => setIsVisible(false)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 opacity-50 hover:opacity-100">
          <X size={16} />
        </button>
      </div>
    )
  }

  // 2. Prioridad: Si el trial está por vencer (faltan 4 días o menos)
  if (daysLeft <= 4 && daysLeft > 0) {
    return (
      <div className="bg-rose-600 text-white p-3 shadow-lg relative">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 px-8 text-center">
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <p className="text-sm font-bold tracking-tight">
              Tu prueba gratuita vence en <span className="underline">{daysLeft} días</span>. ¡No pierdas tu acceso!
            </p>
          </div>
          <Link 
            href="/dashboard/billing" 
            className="bg-white text-rose-600 text-[10px] font-black px-4 py-1.5 rounded-full hover:bg-rose-50 transition-all uppercase tracking-widest"
          >
            Activar Plan <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  return null
}