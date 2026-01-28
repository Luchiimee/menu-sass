import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { Users, Crown, Smartphone, DollarSign, TrendingUp } from 'lucide-react'

export default async function SuperAdminPage() {
  const cookieStore = await cookies()

  // Solo necesitamos el cliente admin aquí para los datos
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: locals, error } = await supabaseAdmin
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !locals) return <div>Error.</div>

  const totalUsers = locals.length
  const planMax = locals.filter(l => l.subscription_plan === 'max').length
  const planPlus = locals.filter(l => l.subscription_plan === 'plus').length
  const planLight = locals.filter(l => l.subscription_plan === 'light').length
  const sinTelefono = locals.filter(l => !l.phone || l.phone.trim() === '').length

  const precios = { light: 5000, plus: 12000, max: 25000 }
  const totalMRR = (planLight * precios.light) + (planPlus * precios.plus) + (planMax * precios.max)

  return (
    <div className="p-8">
      {/* Título y Cabecera */}
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Locales Registrados</h1>
        <p className="text-slate-500 font-medium">Gestión de restaurantes y estados de cuenta.</p>
      </div>

      {/* MÉTRICAS DE DINERO Y USUARIOS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2rem] shadow-xl border border-slate-700 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-white/5 group-hover:scale-110 transition-transform">
            <DollarSign size={120} />
          </div>
          <div className="flex items-center gap-2 mb-4 text-emerald-400">
            <TrendingUp size={18}/> <span className="font-black text-[10px] uppercase tracking-widest text-emerald-400">Ingresos Est.</span>
          </div>
          <div className="text-4xl font-black text-white">${totalMRR.toLocaleString('es-AR')}</div>
        </div>

        <MetricCard title="Plan Max" count={planMax} color="text-orange-500" icon={<Crown size={20}/>} />
        <MetricCard title="Plan Plus" count={planPlus} color="text-purple-600" icon={<Crown size={20}/>} />
        <MetricCard title="Plan Light" count={planLight} color="text-emerald-600" icon={<Crown size={20}/>} />
        <MetricCard title="Sin Tel" count={sinTelefono} color="text-rose-500" icon={<Smartphone size={20}/>} />
      </div>

      {/* TABLA DE GESTIÓN */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        {/* ... (Todo el código de tu tabla que ya tenías) ... */}
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                {/* Aquí va el <thead> y <tbody> de tu tabla de locales */}
                <thead className="text-slate-400 text-[10px] uppercase tracking-[0.15em] font-black border-b border-slate-100">
                    <tr className="border-b border-slate-100">
                        <th className="p-6">Información del Local</th>
                        <th className="p-6">Contacto</th>
                        <th className="p-6">Suscripción</th>
                        <th className="p-6 text-center">Estado Trial</th>
                        <th className="p-6 text-right">Alta</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {locals.map((local) => {
                        const createdDate = new Date(local.created_at)
                        const diffDays = Math.ceil(Math.abs(new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
                        const remainingDays = 14 - diffDays
                        return (
                            <tr key={local.id} className="hover:bg-slate-50/80 transition-all group">
                                <td className="p-6 text-slate-800 font-black">{local.name || 'Sin nombre'}</td>
                                <td className="p-6 text-sm font-bold text-slate-600">{local.phone || 'N/A'}</td>
                                <td className="p-6">
                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-wider">
                                        {local.subscription_plan}
                                    </span>
                                </td>
                                <td className="p-6 text-center font-black">{remainingDays} días</td>
                                <td className="p-6 text-right text-xs text-slate-400 font-bold">{createdDate.toLocaleDateString()}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, count, color, icon }: any) {
    return (
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
        <div className={`flex items-center gap-3 mb-3 ${color} opacity-80 uppercase font-black text-[10px]`}>
          {icon} {title}
        </div>
        <div className="text-4xl font-black text-slate-800">{count}</div>
      </div>
    )
}