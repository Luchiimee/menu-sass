'use client'
import { Clock, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TrialBanner({ createdAt }: { createdAt: string | null }) {
  const router = useRouter()
  if (!createdAt) return null

  // Cálculo de días restantes
  const createdDate = new Date(createdAt)
  const today = new Date()
  const diffTime = today.getTime() - createdDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const remainingDays = 14 - diffDays

  // Si ya pasaron los 14 días, no mostramos este banner (se encargará el de 'paused')
  if (remainingDays <= 0) return null

  // Solo mostramos el aviso si quedan 4 días o menos
  if (remainingDays > 4) return null

  return (
    <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between shadow-md sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <Clock size={16} className="animate-pulse" />
        <p className="text-xs font-bold">
          Te quedan <span className="underline">{remainingDays} días</span> de prueba gratis. 
          <span className="hidden md:inline"> ¡Configura tu pago para no perder el acceso!</span>
        </p>
      </div>
      <button 
        onClick={() => router.push('/dashboard/settings')}
        className="bg-white text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-50 transition flex items-center gap-1 shadow-sm"
      >
        <CreditCard size={12} /> Configurar
      </button>
    </div>
  )
}