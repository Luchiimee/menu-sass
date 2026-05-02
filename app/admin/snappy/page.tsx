"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  ShieldCheck, Search, Loader2, MessageCircle, ArrowLeft, 
  ExternalLink, Mail, LayoutGrid, PieChart, Users, Globe, 
  Clock, Link2, DollarSign, CheckCircle2, AlertCircle, Zap, Trash2, 
  TrendingUp, UserPlus
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// 💰 PRECIOS ACTUALIZADOS (Mayo 2026)
const PRECIO_PLUS = 27000;
const PRECIO_GO = 16900;
const PRECIO_LIGHT = 10000;

const EMAILS_EXCLUIDOS = [
  'luchiimee@gmail.com', 'luchiimee2@gmail.com', 
  'snappyuno25@gmail.com', 'tamarabenitez990@gmail.com'
];

export default function AdminSnappyPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from("profiles").select("*");
      const { data: rests } = await supabase.from("restaurants").select("*");
      const { data: bios } = await supabase.from("snappylinks").select("*");

      const merged = (profiles || []).map(p => {
        const r = (rests || []).find(res => res.user_id === p.id);
        const b = r ? (bios || []).find(bio => bio.restaurant_id === r.id) : null;
        return { profile: p, restaurant: r || null, bio: b || null };
      });
      setData(merged);
    } catch (e) { console.error("Error:", e); } finally { setLoading(false); }
  };

  const handleDeleteGhost = async (userId: string, email: string) => {
    if (!window.confirm(`¿Borrar permanentemente a ${email}? Se eliminará la cuenta y todo su contenido.`)) return;
    setDeletingId(userId);
    try {
        const res = await fetch('/api/admin/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        if (res.ok) {
            toast.success("Usuario barrido");
            setData(prev => prev.filter(item => item.profile.id !== userId));
        } else throw new Error();
    } catch (e) { toast.error("Error al borrar"); } finally { setDeletingId(null); }
  };

  // --- 📊 MOTOR DE MÉTRICAS ---
  const realData = data.filter(d => !EMAILS_EXCLUIDOS.includes(d.profile.email?.toLowerCase().trim()));
  
  // Suscriptores Pagando
  const suscriptores = realData.filter(d => d.restaurant?.subscription_status === 'authorized');
  const mrr = suscriptores.reduce((acc, curr) => {
    const plan = curr.restaurant?.subscription_plan;
    if (plan === 'plus') return acc + PRECIO_PLUS;
    if (plan === 'go') return acc + PRECIO_GO;
    if (plan === 'light') return acc + PRECIO_LIGHT;
    return acc;
  }, 0);

  // Conversión
  const conversionRate = realData.length > 0 ? ((suscriptores.length / realData.length) * 100).toFixed(1) : 0;
  
  // Fantasmas (Sin alias + 30 días)
  const ghostUsers = realData.filter(d => {
    const diffDays = Math.floor((new Date().getTime() - new Date(d.profile.created_at).getTime()) / (1000 * 3600 * 24));
    return !d.restaurant?.slug && diffDays >= 30;
  });

  const filtered = data.filter(d => 
    d.profile.first_name?.toLowerCase().includes(search.toLowerCase()) || 
    d.profile.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.restaurant?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="p-4 lg:p-10 max-w-7xl mx-auto min-h-screen bg-gray-50/50 font-sans text-left">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-white rounded-xl border shadow-sm"><ArrowLeft size={20}/></Link>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter">SNAPPY ADMIN</h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Business Intelligence</p>
          </div>
        </div>
        <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
            <input type="text" placeholder="Buscar cliente..." className="w-full bg-white p-4 pl-12 rounded-2xl border-none shadow-sm text-sm outline-none ring-2 ring-transparent focus:ring-blue-500/20 transition-all" onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* 📊 NUEVAS MÉTRICAS ESTRATÉGICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-black p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 text-white/5"><DollarSign size={100}/></div>
            <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Ingreso Mensual (MRR)</p>
            <span className="text-3xl font-black text-white">${mrr.toLocaleString()}</span>
            <div className="mt-2 flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                <TrendingUp size={12}/> Facturación Real
            </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Tasa de Conversión</p>
            <span className="text-3xl font-black text-gray-900">{conversionRate}%</span>
            <p className="text-[10px] text-blue-600 font-bold mt-2">Usuarios que pagan</p>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Candidatos a Limpieza</p>
            <span className="text-3xl font-black text-red-500">{ghostUsers.length}</span>
            <p className="text-[10px] text-gray-400 font-bold mt-2">Fantasmas (30d+ inactivos)</p>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-[10px] font-black uppercase mb-1">Total Usuarios Reales</p>
            <span className="text-3xl font-black text-gray-900">{realData.length}</span>
            <p className="text-[10px] text-gray-400 font-bold mt-2">Excluyendo admins</p>
        </div>
      </div>

      {/* 💳 AUDITORÍA DE COBRO (LOS QUE PAGAN) */}
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2.5rem] p-8 mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[12px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2 italic">
              <CheckCircle2 size={18} strokeWidth={3}/> Suscriptores Activos ({suscriptores.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suscriptores.map((u, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between group hover:scale-[1.02] transition-all">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-black text-xs uppercase">
                              {u.profile.first_name?.charAt(0) || 'U'}
                          </div>
                          <div className="flex flex-col">
                              <span className="text-[11px] font-black text-gray-800 leading-none mb-1">{u.profile.first_name}</span>
                              <span className="text-[9px] font-medium text-gray-400">{u.profile.email}</span>
                          </div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${u.restaurant?.subscription_plan === 'plus' ? 'bg-blue-600 text-white' : u.restaurant?.subscription_plan === 'go' ? 'bg-purple-600 text-white' : 'bg-black text-white'}`}>
                          {u.restaurant?.subscription_plan}
                      </span>
                  </div>
              ))}
              {suscriptores.length === 0 && <p className="text-xs text-emerald-600 italic">No hay cobros activos detectados todavía.</p>}
          </div>
      </div>

      {/* TABLA DE GESTIÓN TOTAL */}
      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b font-black text-[10px] uppercase text-gray-400 tracking-widest">
              <tr>
                <th className="px-8 py-6">Estado / Cliente</th>
                <th className="px-8 py-6 text-center">Configuración</th>
                <th className="px-8 py-6 text-center">Plan</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => {
                const diffDays = Math.floor((new Date().getTime() - new Date(item.profile.created_at).getTime()) / (1000 * 3600 * 24));
                const isGhost = !item.restaurant?.slug && diffDays >= 30;
                const status = item.restaurant?.subscription_status;

              return (
                <tr key={item.profile.id} className={`hover:bg-blue-50/5 transition-colors ${isGhost ? 'bg-red-50/30' : ''}`}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${status === 'authorized' ? 'bg-emerald-500 animate-pulse' : isGhost ? 'bg-red-500' : 'bg-blue-500'}`}/>
                        <div className="flex flex-col">
                            <span className="font-black text-gray-900 text-sm">{item.profile.first_name} {item.profile.last_name}</span>
                            <span className="text-[10px] text-gray-400">{item.profile.email}</span>
                        </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                      <div className="inline-flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${item.restaurant?.slug ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-300'}`} title="Menú"><Globe size={14}/></div>
                        <div className={`p-2 rounded-lg ${item.bio?.slug ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-300'}`} title="Bio"><Link2 size={14}/></div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{diffDays}d inactivo</span>
                      </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                        status === 'authorized' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.restaurant?.subscription_plan || 'light'}
                      </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {!EMAILS_EXCLUIDOS.includes(item.profile.email) && (
                        <button 
                            disabled={deletingId === item.profile.id}
                            onClick={() => handleDeleteGhost(item.profile.id, item.profile.email)}
                            className={`p-2.5 rounded-xl transition-all ${isGhost ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'text-gray-300 hover:text-red-500'}`}
                        >
                            {deletingId === item.profile.id ? <Loader2 className="animate-spin" size={16}/> : <Trash2 size={16} />}
                        </button>
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}