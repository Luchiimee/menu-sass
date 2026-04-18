"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  ShieldCheck, Search, Loader2, MessageCircle, ArrowLeft, 
  ExternalLink, Mail, LayoutGrid, PieChart, Users, Globe, 
  Clock, Link2 
} from "lucide-react";
import Link from "next/link";

export default function AdminSnappyPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); // 🚀 Corregido: antes tenía una llave mal }

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from("profiles").select("*");
      // Traemos todo de restaurants, incluyendo slug (menú) y bio_slug (snappylinks)
      const { data: rests } = await supabase.from("restaurants").select("*");

      const merged = (profiles || []).map(p => {
        const r = (rests || []).find(res => res.user_id === p.id);
        return {
          profile: p,
          restaurant: r || null,
          isNew: !r 
        };
      });

      setData(merged);
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  };

  // --- GRÁFICOS / STATS ---
  const stats = {
    total: data.length,
    plus: data.filter(d => d.restaurant?.subscription_plan === 'plus').length,
    light: data.filter(d => d.restaurant?.subscription_plan !== 'plus' && !d.isNew).length,
    pending: data.filter(d => d.isNew).length
  };

  const filtered = data.filter(d => 
    d.profile.first_name?.toLowerCase().includes(search.toLowerCase()) || 
    d.profile.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.restaurant?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-50/50">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-gray-500 font-black animate-pulse uppercase text-[10px] tracking-widest">Cargando SuperAdmin...</p>
    </div>
  );

  return (
    <div className="p-4 lg:p-10 max-w-7xl mx-auto min-h-screen bg-gray-50/50 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2.5 bg-white rounded-xl border shadow-sm hover:bg-gray-50 transition-all">
            <ArrowLeft size={20} className="text-gray-600"/>
          </Link>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2 tracking-tighter italic">
              <ShieldCheck className="text-blue-600" size={28}/> ADMIN SNAPPY
            </h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Control de Usuarios y Accesos</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" placeholder="Buscar local o dueño..." 
            className="w-full bg-white p-4 pl-12 rounded-2xl border border-gray-200 outline-none text-sm shadow-sm focus:ring-2 ring-blue-500/10 transition-all"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TARJETAS DE PLANES (Tus gráficos) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Usuarios', val: stats.total, icon: Users, color: 'text-gray-600', bg: 'bg-gray-100' },
          { label: 'Plus', val: stats.plus, icon: PieChart, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Light', val: stats.light, icon: LayoutGrid, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pendientes', val: stats.pending, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className={`p-3 rounded-2xl ${s.bg} ${s.color} mb-2`}><s.icon size={20}/></div>
            <span className="text-2xl font-black tracking-tighter">{s.val}</span>
            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b font-black text-[10px] uppercase text-gray-400 tracking-widest">
                <th className="px-8 py-6 italic">Usuario / Local</th>
                <th className="px-8 py-6 text-center italic">Snappy Links</th>
                <th className="px-8 py-6 text-right italic">Plan Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => {
                const menuSlug = item.restaurant?.slug;
                const bioSlug = item.restaurant?.bio_slug; // 🚀 Tomamos la info real de SnappyLinks
                
                const menuLink = `https://snappy.uno/${menuSlug}`;
                const bioLink = `https://snappy.uno/${bioSlug}`;

                return (
                  <tr key={item.profile.id} className="hover:bg-blue-50/5 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-gray-900 text-base tracking-tight capitalize">
                          {item.profile.first_name ? `${item.profile.first_name} ${item.profile.last_name || ''}` : "Sin Nombre"}
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium">{item.profile.email}</span>
                        {item.restaurant?.name && <span className="text-[10px] text-blue-600 font-black uppercase mt-1 italic">{item.restaurant.name}</span>}
                      </div>
                    </td>

                    <td className="px-8 py-6">
                      {item.isNew ? (
                        <div className="flex justify-center italic text-gray-300 text-[10px] font-bold">Menú no iniciado</div>
                      ) : (
                        <div className="flex flex-col gap-2 w-56 mx-auto">
                          {/* BOTÓN MENÚ */}
                          <div className="flex items-center justify-between p-2 px-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-white transition-all group/link">
                            <div className="flex items-center gap-2">
                              <Globe size={14} className="text-blue-500"/>
                              <span className="text-[10px] font-black uppercase text-gray-500 italic">Menú:</span>
                              <span className="text-[10px] font-bold text-gray-900">{menuSlug}</span>
                            </div>
                            <a href={menuLink} target="_blank" className="p-1.5 bg-white rounded-lg text-blue-600 shadow-sm border border-gray-100 hover:bg-blue-600 hover:text-white transition-all">
                              <ExternalLink size={12} />
                            </a>
                          </div>
                          
                          {/* BOTÓN BIO (SnappyLinks) */}
                          <div className="flex items-center justify-between p-2 px-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-white transition-all group/link">
                            <div className="flex items-center gap-2">
                              <Link2 size={14} className="text-purple-500"/>
                              <span className="text-[10px] font-black uppercase text-gray-500 italic">Bio:</span>
                              <span className="text-[10px] font-bold text-gray-900">{bioSlug || '---'}</span>
                            </div>
                            {bioSlug && (
                              <a href={bioLink} target="_blank" className="p-1.5 bg-white rounded-lg text-purple-600 shadow-sm border border-gray-100 hover:bg-purple-600 hover:text-white transition-all">
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-8 py-6 text-right">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border shadow-sm ${
                        item.restaurant?.subscription_plan === 'plus' 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white text-gray-400 border-gray-200'
                      }`}>
                        {item.restaurant?.subscription_plan || 'light'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-gray-50 border-t flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
           <span>Total Usuarios: {filtered.length}</span>
           <span>Snappy Uno Admin © 2026</span>
        </div>
      </div>
    </div>
  );
}