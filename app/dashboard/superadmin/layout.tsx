import { Layout, Users, BarChart3, LogOut } from 'lucide-react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Seguridad: Solo vos entrás acá
  if (!session || session.user.email !== 'luchiimee2@gmail.com') {
    redirect('/dashboard')
  }

  return (
    <div className="fixed inset-0 z-[100] flex h-screen bg-[#F1F5F9] font-sans">
      
      {/* --- SIDEBAR EXCLUSIVO SNAPPY HQ --- */}
      <aside className="w-64 bg-slate-900 h-full flex flex-col text-white shadow-2xl shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Layout size={24} />
            </div>
            <span className="font-black text-xl tracking-tighter italic">SNAPPY<span className="text-blue-500 underline">HQ</span></span>
          </div>

          <nav className="space-y-3">
            <Link href="/dashboard/superadmin" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all font-bold text-sm text-slate-300">
              <Users size={18} /> Locales
            </Link>
            <Link href="/dashboard/superadmin/metrics" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all font-bold text-sm text-slate-300">
              <BarChart3 size={18} /> Métricas
            </Link>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/5">
          {/* 🚀 BOTÓN DE CIERRE DE SESIÓN REAL */}
          <LogoutButton />
        </div>
      </aside>

      {/* --- CONTENIDO DINÁMICO --- */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}