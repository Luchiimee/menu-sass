"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  Search, Loader2, ArrowLeft, 
  Globe, DollarSign, Trash2, TrendingUp, 
  AlertTriangle, Ghost, Clock, CreditCard, Phone
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ADMIN_EMAILS } from "@/lib/access";

// 💰 PRECIOS ACTUALIZADOS (Mayo 2026)
const PRECIO_PLUS = 27000;
const PRECIO_GO = 16900;
const PRECIO_LIGHT = 10000;

// Cuentas admin excluidas de las métricas de MRR/suscriptores (no son clientes reales)
const EMAILS_EXCLUIDOS = ADMIN_EMAILS;

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
        
        const diffDays = Math.floor((new Date().getTime() - new Date(p.created_at).getTime()) / (1000 * 3600 * 24));
        let statusTag = { text: "Activo", color: "bg-emerald-50 text-emerald-700", icon: Clock };
        let abandonmentReason = "";

        if (r?.subscription_status === 'authorized') {
          statusTag = { text: "Pagando", color: "bg-emerald-500 text-white", icon: CreditCard };
        } else if (r?.subscription_status === 'cancelled' || r?.subscription_status === 'paused') {
          statusTag = { text: "Pago Cortado", color: "bg-orange-100 text-orange-700", icon: AlertTriangle };
          abandonmentReason = "Dejó de pagar";
        } else if (diffDays >= 14 && r?.subscription_status === 'trialing') {
          statusTag = { text: "Trial Vencido", color: "bg-red-100 text-red-700", icon: Clock };
          abandonmentReason = "No configuró pago";
        } else if (!r?.slug || r?.slug.includes('mi-local')) {
          if (diffDays >= 2) {
            statusTag = { text: "Abandono Inicial", color: "bg-gray-200 text-gray-600", icon: Ghost };
            abandonmentReason = "Link por defecto";
          }
        }

        return { profile: p, restaurant: r || null, bio: b || null, statusTag, abandonmentReason, diffDays };
      });
      setData(merged);
    } catch (e) { console.error("Error:", e); } finally { setLoading(false); }
  };

  const handleDeleteGhost = async (userId: string, email: string) => {
    if (!window.confirm(`¿Borrar a ${email}?`)) return;
    setDeletingId(userId);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (res.ok) {
        toast.success("Usuario borrado");
        setData(prev => prev.filter(item => item.profile.id !== userId));
      } else {
        const err = await res.json();
        toast.error(`Error: ${err.error || 'No se pudo borrar'}`);
      }
    } catch (e) {
      toast.error("Error de red al intentar borrar");
    } finally {
      setDeletingId(null);
    }
  };

  const realData = data.filter(d => !EMAILS_EXCLUIDOS.includes(d.profile.email?.toLowerCase().trim()));
  const suscriptores = realData.filter(d => d.restaurant?.subscription_status === 'authorized');
  const mrr = suscriptores.reduce((acc, curr) => {
    const plan = curr.restaurant?.subscription_plan;
    if (plan === 'plus') return acc + PRECIO_PLUS;
    if (plan === 'go') return acc + PRECIO_GO;
    if (plan === 'light') return acc + PRECIO_LIGHT;
    return acc;
  }, 0);

  const conversionRate = realData.length > 0 ? ((suscriptores.length / realData.length) * 100).toFixed(1) : "0";
  const ghostUsers = realData.filter(d => d.statusTag.text === "Abandono Inicial" || d.statusTag.text === "Trial Vencido");

  const filtered = data.filter(d => 
    d.profile.first_name?.toLowerCase().includes(search.toLowerCase()) || 
    d.profile.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.restaurant?.slug?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.profile.created_at).getTime() - new Date(a.profile.created_at).getTime());

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-fresco" size={40} />
    </div>
  );

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto min-h-screen bg-gray-50/50 font-sans text-left">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 bg-white rounded-xl border shadow-sm hover:bg-gray-50 transition-all">
            <ArrowLeft size={18}/>
          </Link>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter text-gray-900 leading-none">
              SNAPPY <span className="text-fresco">COMMAND</span>
            </h1>
            <p className="text-[8px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">BI & Analytics</p>
          </div>
        </div>
        <div className="relative w-full lg:w-[350px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
          <input
            type="text"
            placeholder="Email o slug..."
            className="w-full bg-white p-3 pl-12 rounded-2xl shadow-sm text-xs outline-none border border-gray-100"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 text-left">
        <div className="bg-zinc-900 p-4 rounded-3xl shadow-lg relative overflow-hidden text-white border border-white/5">
          <p className="text-gray-400 text-[9px] font-black uppercase mb-1 tracking-widest">MRR Total</p>
          <span className="text-xl font-black italic tracking-tighter">${mrr.toLocaleString()}</span>
          <div className="mt-2 text-emerald-400 text-[8px] font-black uppercase flex items-center gap-1">
            <TrendingUp size={10}/> Estimado
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-zinc-900">
          <p className="text-gray-400 text-[9px] font-black uppercase mb-1 tracking-widest">Pagando</p>
          <span className="text-xl font-black text-emerald-600 italic tracking-tighter">{suscriptores.length} Clientes</span>
          <p className="text-[8px] text-gray-400 font-bold mt-2 uppercase flex items-center gap-1">
            <DollarSign size={10}/> Suma: ${mrr.toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-zinc-900">
          <p className="text-gray-400 text-[9px] font-black uppercase mb-1 tracking-widest">Conversión</p>
          <span className="text-xl font-black text-fresco italic tracking-tighter">{conversionRate}%</span>
          <p className="text-[8px] text-gray-400 font-bold mt-2 uppercase">Trial a Pago</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-zinc-900">
          <p className="text-gray-400 text-[9px] font-black uppercase mb-1 tracking-widest">Inactivos</p>
          <span className="text-xl font-black text-red-500 italic tracking-tighter">{ghostUsers.length}</span>
          <p className="text-[8px] text-gray-400 font-bold mt-2 uppercase">A Limpiar</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-zinc-900">
          <p className="text-gray-400 text-[9px] font-black uppercase mb-1 tracking-widest">Reales</p>
          <span className="text-xl font-black text-gray-900 italic tracking-tighter">{realData.length}</span>
          <p className="text-[8px] text-gray-400 font-bold mt-2 uppercase">Total Usuarios</p>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto text-left">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b font-black text-[10px] uppercase text-gray-400 tracking-widest">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-4 py-4">Teléfono</th>
                <th className="px-4 py-4">Enlace</th>
                <th className="px-4 py-4 text-center">Pago</th>
                <th className="px-4 py-4 text-center">Plan</th>
                <th className="px-4 py-4">Situación</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => {
                const TagIcon = item.statusTag.icon;
                const currentPlan = item.restaurant?.subscription_plan;
                const isPaying = item.restaurant?.subscription_status === 'authorized';
                const isExcluido = EMAILS_EXCLUIDOS.includes(item.profile.email?.toLowerCase().trim());
                const isDeleting = deletingId === item.profile.id;

                return (
                  <tr key={item.profile.id} className="hover:bg-[#F0FAF6]/10 transition-all">
                    
                    {/* CLIENTE */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-gray-900 text-xs uppercase italic">
                          {item.profile.first_name || 'Nuevo'}
                        </span>
                        <span className="text-[10px] text-gray-400 truncate w-36">{item.profile.email}</span>
                        <span className="text-[8px] font-bold text-fresco uppercase">{item.diffDays} días</span>
                      </div>
                    </td>

                    {/* TELÉFONO */}
                    <td className="px-4 py-4">
                      {item.profile.phone ? (
                        <a
                          href={`https://wa.me/${item.profile.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          className="flex items-center gap-1 text-[10px] font-bold text-green-600 hover:underline"
                        >
                          <Phone size={11}/> {item.profile.phone}
                        </a>
                      ) : (
                        <span className="text-[9px] text-gray-300 font-bold uppercase">Sin tel.</span>
                      )}
                    </td>

                    {/* ENLACE */}
                    <td className="px-4 py-4">
                      {item.restaurant?.slug ? (
                        <a
                          href={`https://snappy.uno/${item.restaurant.slug}`}
                          target="_blank"
                          className="flex items-center gap-1 text-[10px] font-bold text-gray-800 hover:text-fresco truncate underline decoration-gray-100"
                        >
                          <Globe size={12} className="text-fresco"/> /{item.restaurant.slug}
                        </a>
                      ) : (
                        <span className="text-[9px] text-gray-300 font-bold uppercase">Sin Menú</span>
                      )}
                    </td>

                    {/* PAGO */}
                    <td className="px-4 py-4 text-center">
                      {isPaying ? (
                        <span className="text-[11px] font-black text-emerald-700 italic">
                          ${(currentPlan === 'plus' ? PRECIO_PLUS : currentPlan === 'go' ? PRECIO_GO : PRECIO_LIGHT).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-200 font-black">$0</span>
                      )}
                    </td>

                    {/* PLAN */}
                    <td className="px-4 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase italic ${
                        currentPlan === 'plus' ? 'bg-fresco text-white' : 
                        currentPlan === 'go' ? 'bg-brasa text-white' : 
                        'bg-zinc-100 text-zinc-500'
                      }`}>
                        {currentPlan || 'Light'}
                      </span>
                    </td>

                    {/* SITUACIÓN */}
                    <td className="px-4 py-4 text-left">
                      <div className="flex flex-col gap-1">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit ${item.statusTag.color}`}>
                          <TagIcon size={12} strokeWidth={3}/>
                          <span className="text-[9px] font-black uppercase">{item.statusTag.text}</span>
                        </div>
                        {item.abandonmentReason && (
                          <p className="text-[8px] font-medium text-red-400 italic">❌ {item.abandonmentReason}</p>
                        )}
                      </div>
                    </td>

                    {/* ACCIÓN */}
                    <td className="px-6 py-4 text-right">
                      {!isExcluido && (
                        <button
                          onClick={() => handleDeleteGhost(item.profile.id, item.profile.email)}
                          disabled={isDeleting}
                          className="p-2 bg-gray-50 text-gray-300 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
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