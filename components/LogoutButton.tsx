'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Esto limpia todo y te manda al login de una
    router.push('/login')
    router.refresh() 
  }

  return (
    <button 
      onClick={handleLogout}
      className="flex items-center gap-3 w-full p-4 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest justify-center mt-auto"
    >
      <LogOut size={16} /> Cerrar Sesión
    </button>
  )
}
