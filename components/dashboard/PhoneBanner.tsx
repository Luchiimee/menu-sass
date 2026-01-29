'use client'
import { UserCheck, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function PhoneBanner({ hasPhone }: { hasPhone: boolean }) {
  // Si el perfil ya tiene el teléfono, el banner no se muestra
  if (hasPhone) return null

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-sm sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <UserCheck size={18} className="flex-shrink-0"/>
        <p className="font-bold text-xs">
          Faltan completar datos en tu cuenta.
        </p>
      </div>
      <Link href="/dashboard/settings" className="bg-white text-amber-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-amber-50 transition flex items-center gap-2">
        Completar <ArrowRight size={12}/>
      </Link>
    </div>
  )
}