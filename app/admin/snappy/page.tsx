"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  ShieldCheck, Search, Loader2, Power, 
  MessageCircle, User, ArrowLeft, ExternalLink, Mail, Clock
} from "lucide-react";
import Link from "next/link";

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
      // 1. Cargamos la gente (profiles) y los locales (restaurants)
      const { data: profiles } = await supabase.from("profiles").select("*");
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

  const filtered = data.filter(d => 
    d.profile.first_name?.toLowerCase().includes(search.toLowerCase()) || 
    d.profile.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.restaurant?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="p-4 lg:p-10 max-w-7xl mx-auto min-h-screen bg-gray-50/50">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-white rounded-full border shadow-sm"><ArrowLeft size={20}/></Link>
          <h1 className="text-2xl font-black flex items-center gap-2"><ShieldCheck className="text-blue-600"/> Admin Snappy</h1>
        </div>
        <input 
          type="text" placeholder="Buscar local o dueño..." 
          className="bg-white p-3 px-5 rounded-2xl border outline-none text-sm w-80 shadow-sm"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b font-black text-[10px] uppercase text-gray-400">
              <tr>
                <th className="px-8 py-5">Dueño / Email</th>
                <th className="px-8 py-5">Menú / Link Snappy</th>
                <th className="px-8 py-5">WhatsApp</th>
                <th className="px-8 py-5 text-right">Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => {
                // --- LÓGICA DEL LINK REAL snappy.uno ---
                // Usamos el slug (ej: pizeriacool) o el ID si no tiene slug
                const userSlug = item.restaurant?.slug || item.restaurant?.id;
                const snappyLink = `https://snappy.uno/${userSlug}`;

                return (
                  <tr key={item.profile.id} className="hover:bg-blue-50/10 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                          <span className="font-black text-gray-900 capitalize">
                              {item.profile.first_name ? `${item.profile.first_name} ${item.profile.last_name || ''}` : "Desconocido"}
                          </span>
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Mail size={12}/> {item.profile.email || "Sin email"}
                          </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {item.isNew ? (
                          <span className="text-orange-500 font-bold text-[10px] bg-orange-50 px-2 py-1 rounded-full">Menú no iniciado</span>
                      ) : (
                          <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                  <span className="font-bold text-blue-600">{item.restaurant.name}</span>
                                  <span className="text-[9px] text-gray-300 italic">/{userSlug}</span>
                              </div>
                              {/* EL BOTÓN QUE AHORA MANDA A SNAPPY.UNO */}
                              <a href={snappyLink} target="_blank" className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:bg-black hover:text-white transition-all border shadow-sm border-gray-100">
                                  <ExternalLink size={16} />
                              </a>
                          </div>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      {item.profile.phone ? (
                          <a href={`https://wa.me/${item.profile.phone.replace(/\D/g,'')}`} target="_blank" className="text-green-600 font-black flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full w-fit text-[10px] border border-green-100 shadow-sm">
                              <MessageCircle size={14}/> {item.profile.phone}
                          </a>
                      ) : <span className="text-gray-300 italic">Sin teléfono</span>}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${item.restaurant?.subscription_plan === 'plus' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-400 border-gray-200'}`}>
                          {item.restaurant?.subscription_plan || 'light'}
                      </span>
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