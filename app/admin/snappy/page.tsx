"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  ShieldCheck, Search, Loader2, MessageCircle, ArrowLeft, 
  ExternalLink, Mail, LayoutGrid, PieChart, Users, Globe, 
  Clock, Link2, DollarSign, CheckCircle2, AlertCircle, Zap
} from "lucide-react";
import Link from "next/link";

// 💰 PRECIOS REALES
const PRECIO_PLUS = 27000;
const PRECIO_LIGHT = 1000;
const PRECIO_GO = 16900;

// 🚫 EXCLUIR ADMINS
const EMAILS_EXCLUIDOS = [
  'luchiimee@gmail.com',
  'luchiimee2@gmail.com',
  'snappyuno25@gmail.com',
  'tamarabenitez990@gmail.com'
];

export default function AdminSnappyPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

 
 // --- 📊 LÓGICA DE MÉTRICAS FILTRADAS ---
  const realData = data.filter(d => !EMAILS_EXCLUIDOS.includes(d.profile.email?.toLowerCase().trim()));
  
  // 1. Guardamos la LISTA completa de usuarios activos (SIN .length) 🚀
  const plusActivos = realData.filter(d => d.restaurant?.subscription_plan === 'plus' && d.restaurant?.subscription_status === 'authorized');
  const goActivos = realData.filter(d => d.restaurant?.subscription_plan === 'go' && d.restaurant?.subscription_status === 'authorized');
  const lightActivos = realData.filter(d => d.restaurant?.subscription_plan === 'light' && d.restaurant?.subscription_status === 'authorized');

  // 2. Variables para los números de las tarjetas (ACÁ SÍ usamos .length)
  const plusTotal = realData.filter(d => d.restaurant?.subscription_plan === 'plus').length;
  const goTotal = realData.filter(d => d.restaurant?.subscription_plan === 'go').length;
  const lightTotal = realData.filter(d => d.restaurant?.subscription_plan === 'light').length;
  const pendingCount = realData.filter(d => !d.restaurant).length;
  const enPruebaCount = realData.filter(d => d.restaurant?.subscription_status === 'trialing').length;

  // 3. Cálculo de ganancia usando el largo de las listas del paso 1
  const gananciaReal = (plusActivos.length * PRECIO_PLUS) + (goActivos.length * PRECIO_GO) + (lightActivos.length * PRECIO_LIGHT);
  const totalUsuariosReales = realData.length;

  const filtered = data.filter(d => 
    d.profile.first_name?.toLowerCase().includes(search.toLowerCase()) || 
    d.profile.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.restaurant?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50/50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="p-4 lg:p-10 max-w-7xl mx-auto min-h-screen bg-gray-50/50 font-sans text-left">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2.5 bg-white rounded-xl border shadow-sm hover:bg-gray-50"><ArrowLeft size={20}/></Link>
          <div>
            <h1 className="text-2xl font-black italic"><ShieldCheck className="inline text-blue-600 mr-2"/> SUPERADMIN</h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Finanzas y Usuarios Reales</p>
          </div>
        </div>
        <input type="text" placeholder="Buscar..." className="w-full md:w-80 bg-white p-4 rounded-2xl border outline-none text-sm shadow-sm" onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* 📊 GRID DE 5 TARJETAS (Ganancia + 4 Estados) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <div className="bg-black p-5 rounded-[2rem] shadow-xl text-center flex flex-col items-center justify-center">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg mb-2"><DollarSign size={20}/></div>
            <span className="text-2xl font-black text-white">${gananciaReal.toLocaleString()}</span>
            <span className="text-[8px] font-black uppercase text-gray-500 italic leading-none">Ganancia Real (Suscritos)</span>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm text-center">
            <PieChart size={20} className="mx-auto text-blue-600 mb-2"/>
            <span className="text-2xl font-black block">{plusTotal}</span>
            <span className="text-[9px] font-black uppercase text-gray-400">Planes Plus</span>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm text-center">
            <Zap size={20} className="mx-auto text-purple-600 mb-2"/>
            <span className="text-2xl font-black block">{goTotal}</span>
            <span className="text-[9px] font-black uppercase text-gray-400">Planes Go</span>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm text-center">
            <LayoutGrid size={20} className="mx-auto text-emerald-600 mb-2"/>
            <span className="text-2xl font-black block">{lightTotal}</span>
            <span className="text-[9px] font-black uppercase text-gray-400">Planes Light</span>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm text-center">
            <Clock size={20} className="mx-auto text-orange-500 mb-2"/>
            <span className="text-2xl font-black block">{pendingCount}</span>
            <span className="text-[9px] font-black uppercase text-gray-400">Sin Local</span>
        </div>
      </div>

<div className="bg-emerald-50/50 border border-emerald-100 rounded-[2rem] p-8 mb-10 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2 italic">
              <CheckCircle2 size={16} strokeWidth={3}/> Auditoría de Cobro Mensual
            </h2>
            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase">
              Solo Status: Authorized
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
              {[...plusActivos, ...goActivos, ...lightActivos].map((u, i) => (
                  <div key={i} className="bg-white px-4 py-3 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-3 hover:scale-105 transition-transform">
                      <div className="relative">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute inset-0"/>
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative"/>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-800 leading-none mb-1">{u.profile.first_name || 'Usuario'}</span>
                        <span className="text-[9px] font-bold text-gray-400 leading-none">{u.profile.email}</span>
                      </div>
                      <div className="ml-2 px-2 py-1 bg-emerald-50 rounded-lg text-[9px] font-black text-emerald-600 uppercase tracking-tighter">
                        {u.restaurant?.subscription_plan}
                      </div>
                  </div>
              ))}

              {[...plusActivos, ...goActivos, ...lightActivos].length === 0 && (
                  <div className="flex items-center gap-3 text-gray-400 italic py-2">
                    <AlertCircle size={16}/>
                    <span className="text-xs font-medium">No se detectan suscripciones autorizadas en este momento.</span>
                  </div>
              )}
          </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 border-b font-black text-[10px] uppercase text-gray-400 tracking-widest">
              <tr>
                <th className="px-8 py-6">Estado / Dueño</th>
                <th className="px-8 py-6 text-center">Links Snappy</th>
                <th className="px-8 py-6 text-right">Local y Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => {
                const menuSlug = item.restaurant?.slug;
                const bioSlug = item.bio?.slug; 
                const isDuplicate = menuSlug && bioSlug && menuSlug === bioSlug;
                const status = item.restaurant?.subscription_status;

             return (
  <tr key={item.profile.id} className="hover:bg-blue-50/5 transition-colors group">
    <td className="px-8 py-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-1">
            {/* 🚀 Debug más visible (oscuro) */}
            <span className="text-[8px] text-gray-500 font-bold bg-gray-100 px-1 rounded">DB: {status || 'null'}</span>
            
            {status === 'authorized' ? (
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1">
                  <CheckCircle2 size={10}/> Suscripto
                </span>
            ) : status === 'trialing' ? (
                <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1">
                  <Clock size={10}/> En Prueba
                </span>
            ) : (
                <span className="bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1">
                  <AlertCircle size={10}/> Sin Plan
                </span>
            )}
        </div>
                        <span className="font-black text-gray-900 text-base tracking-tight">{item.profile.first_name} {item.profile.last_name}</span>
                        <span className="text-[11px] text-gray-400 font-medium">{item.profile.email}</span>
                        {item.profile.phone && <a href={`https://wa.me/${item.profile.phone.replace(/\D/g,'')}`} target="_blank" className="text-green-600 font-black text-[11px] flex items-center gap-1 hover:underline"><MessageCircle size={12}/> {item.profile.phone}</a>}
                      </div>
                    </td>

                    <td className="px-8 py-6">
                        <div className={`flex flex-col gap-2 w-56 mx-auto transition-all ${isDuplicate ? 'ring-2 ring-red-500 rounded-2xl p-3 bg-red-50' : ''}`}>
                          {isDuplicate && <span className="text-[8px] font-black text-red-600 uppercase text-center animate-pulse">⚠️ Link Duplicado</span>}
                          <div className={`flex items-center justify-between p-2 px-3 rounded-xl border transition-all ${menuSlug ? 'bg-gray-50 border-gray-100' : 'border-dashed opacity-40'}`}>
                            <div className="flex items-center gap-2"><Globe size={14} className={menuSlug ? "text-blue-500" : "text-gray-300"}/><span className="text-[10px] font-bold text-gray-700 truncate w-24">{menuSlug ? `/${menuSlug}` : 'Menú N/A'}</span></div>
                            {menuSlug && <a href={`https://snappy.uno/${menuSlug}`} target="_blank" className="p-1 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all"><ExternalLink size={12} /></a>}
                          </div>
                          <div className={`flex items-center justify-between p-2 px-3 rounded-xl border transition-all ${bioSlug ? 'bg-gray-50 border-gray-100' : 'border-dashed opacity-40'}`}>
                            <div className="flex items-center gap-2"><Link2 size={14} className={bioSlug ? "text-purple-500" : "text-gray-300"}/><span className="text-[10px] font-bold text-gray-700 truncate w-24">{bioSlug ? `/${bioSlug}` : 'Bio N/A'}</span></div>
                            {bioSlug && <a href={`https://snappy.uno/${bioSlug}`} target="_blank" className="p-1 text-purple-600 hover:bg-purple-600 hover:text-white rounded-lg transition-all"><ExternalLink size={12} /></a>}
                          </div>
                        </div>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-black text-gray-900 text-xs uppercase tracking-tighter truncate w-32">{item.restaurant?.name || "---"}</span>
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border ${
                          item.restaurant?.subscription_plan === 'plus' ? 'bg-blue-600 text-white' : 
                          item.restaurant?.subscription_plan === 'go' ? 'bg-purple-600 text-white' : 'bg-white text-gray-400 border-gray-200'
                        }`}>
                          {item.restaurant?.subscription_plan || (item.restaurant ? 'light' : '---')}
                        </span>
                      </div>
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