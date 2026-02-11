'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { 
  Users, Store, CreditCard, ArrowLeft, Loader2, 
  Search, Mail, Phone, ExternalLink, MessageCircle,
  Zap, Crown, Rocket
} from 'lucide-react'

const ADMIN_EMAIL = 'luchiimee2@gmail.com'

export default function SuperAdmin() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ 
    totalUsers: 0, 
    light: 0, 
    plus: 0, 
    max: 0,
    totalLinks: 0 
  })
  const [dataList, setDataList] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== ADMIN_EMAIL) {
      router.push('/dashboard')
      return
    }
    fetchData()
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // Traemos perfiles y restaurantes para cruzar la info
      const { data: profiles } = await supabase.from('profiles').select('*')
      const { data: restaurants } = await supabase.from('restaurants').select('*')

      // Cruzamos los datos: a cada perfil le pegamos su restaurante (plan y slug)
      const combined = profiles?.map(profile => {
        const rest = restaurants?.find(r => r.user_id === profile.id)
        return {
          ...profile,
          plan: rest?.subscription_plan || 'ninguno',
          status: rest?.subscription_status || 'inactivo',
          slug: rest?.slug || null
        }
      }) || []

      setDataList(combined)

      setStats({
        totalUsers: combined.length,
        light: combined.filter(u => u.plan === 'light').length,
        plus: combined.filter(u => u.plan === 'plus').length,
        max: combined.filter(u => u.plan === 'max').length,
        totalLinks: combined.filter(u => u.slug).length
      })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = dataList.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-black" size={40} />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-12 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition mb-4">
              <ArrowLeft size={16} /> Volver al Dashboard
            </button>
            <h1 className="text-4xl font-black tracking-tight">Panel de Control <span className="text-green-600">Snappy</span></h1>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-2xl w-full md:w-80 outline-none focus:border-black transition shadow-sm font-medium"
            />
          </div>
        </div>

        {/* Métricas con diseño de botones/tarjetas */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
          <StatCard label="Usuarios" val={stats.totalUsers} icon={<Users size={20}/>} color="bg-blue-500" />
          <StatCard label="Links" val={stats.totalLinks} icon={<ExternalLink size={20}/>} color="bg-gray-800" />
          <StatCard label="Plan Light" val={stats.light} icon={<Zap size={20}/>} color="bg-orange-400" />
          <StatCard label="Plan Plus" val={stats.plus} icon={<Rocket size={20}/>} color="bg-violet-500" />
          <StatCard label="Plan Max" val={stats.max} icon={<Crown size={20}/>} color="bg-yellow-500" />
        </div>

        {/* Tabla de Usuarios */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-5">Usuario / Link</th>
                  <th className="px-8 py-5">Suscripción</th>
                  <th className="px-8 py-5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <p className="font-bold text-gray-900">{user.first_name} {user.last_name}</p>
                        {user.slug ? (
                          <a href={`https://snappy.uno/${user.slug}`} target="_blank" className="text-xs text-blue-500 font-bold flex items-center gap-1 hover:underline">
                            snappy.uno/{user.slug} <ExternalLink size={10}/>
                          </a>
                        ) : <span className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter italic">Sin menú creado</span>}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase w-fit ${
                          user.plan === 'plus' ? 'bg-violet-100 text-violet-600' : 
                          user.plan === 'light' ? 'bg-orange-100 text-orange-600' : 
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {user.plan}
                        </span>
                        <p className="text-[10px] text-gray-400 font-bold">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex gap-2">
                        {user.phone && (
                          <a 
                            href={`https://wa.me/${user.phone.replace(/\s+/g, '')}`} 
                            target="_blank"
                            className="bg-green-500 text-white p-2.5 rounded-xl hover:scale-110 transition shadow-lg shadow-green-200 flex items-center gap-2 text-xs font-bold"
                          >
                            <MessageCircle size={18} fill="white" /> WhatsApp
                          </a>
                        )}
                        <div className="bg-gray-100 text-gray-500 p-2.5 rounded-xl text-xs font-bold">
                           ID: {user.id.substring(0,5)}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, val, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4">
      <div className={`w-10 h-10 ${color} text-white rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <h3 className="text-2xl font-black">{val}</h3>
      </div>
    </div>
  )
}