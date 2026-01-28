'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { DollarSign, Smartphone, Crown, PieChart as PieIcon, TrendingUp } from 'lucide-react'
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid 
} from 'recharts'

export default function MetricsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchData() {
      const { data: locals } = await supabase.from('restaurants').select('*')
      if (locals) {
        const stats = [
          { name: 'Plan Light', value: locals.filter(l => l.subscription_plan === 'light').length, color: '#10b981' },
          { name: 'Plan Plus', value: locals.filter(l => l.subscription_plan === 'plus').length, color: '#8b5cf6' },
          { name: 'Plan Max', value: locals.filter(l => l.subscription_plan === 'max').length, color: '#f59e0b' },
        ]
        const revenue = [
          { name: 'Sem 1', money: 20000 },
          { name: 'Sem 2', money: 45000 },
          { name: 'Sem 3', money: 38000 },
          { name: 'Sem 4', money: (locals.length * 8500) },
        ]
        setData({ locals, stats, revenue })
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return <div className="p-10 font-bold">Cargando métricas...</div>

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Métricas <span className="text-blue-600">Pro</span></h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Estado real de la plataforma</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200">
           <span className="text-slate-400 font-bold text-xs uppercase tracking-widest mr-2">Locales Activos:</span>
           <span className="text-xl font-black text-slate-800">{data.locals.length}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* GRÁFICO 1 */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
            <PieIcon size={16} className="text-purple-500" /> Distribución de Suscripciones
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.stats} innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value">
                  {data.stats.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '20px', border: 'none', fontWeight: 'bold'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2 */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" /> Crecimiento Estimado
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" hide />
                <Tooltip />
                <Area type="monotone" dataKey="money" stroke="#3b82f6" strokeWidth={5} fillOpacity={0.1} fill="#3b82f6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CARDS INFERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-white shadow-lg">
            <DollarSign className="mb-4 opacity-50" size={32} />
            <p className="font-black text-3xl">$125.400</p>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Facturación Total</p>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200">
            <Smartphone className="text-rose-500 mb-4" size={32} />
            <p className="font-black text-3xl text-slate-800">{data.locals.filter((l:any) => !l.phone).length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-slate-400">Leads sin Teléfono</p>
         </div>
         <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
            <Crown className="text-amber-400 mb-4" size={32} />
            <p className="font-black text-3xl">{data.locals.filter((l:any) => l.subscription_plan === 'max').length}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-50">Clientes VIP (Max)</p>
         </div>
      </div>
    </div>
  )
}