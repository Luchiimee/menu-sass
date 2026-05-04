"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import {
  Loader2,
  Zap,
  User,
  Check,
  CreditCard,
  Clock,
  HelpCircle,
  FileText,
} from "lucide-react";

type Restaurant = {
  id: string | null;
  mp_preapproval_id: string | null;
  business_hours: any;
  subscription_plan: string | null;
  subscription_status: string;
  name?: string;
  slug?: string;
  created_at?: string;
};
// 🚀 REGLA DE ORO: Estos IDs deben coincidir con tus planes en el Dashboard de MP
const PLAN_IDS = {
  light: "3aa6c7cc41fb4bfab3e9967e1bcbaeb5",
  go: "979bc6ba5ebe4d5fa4d5b1c823586772",
  plus: "65dd4645b714425c814a482978375c74"
};

function PlanContent() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
  });
 const [restaurant, setRestaurant] = useState<Restaurant>({
  id: null,
  mp_preapproval_id: null,
  business_hours: {},
  subscription_plan: null,
  subscription_status: "trialing",
});
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        setUserId(session.user.id);

        const formatName = (str: string | any) => {
          if (!str) return '';
          return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        };

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        const { data: restData } = await supabase.from('restaurants').select('*').eq('user_id', session.user.id).maybeSingle();

        const metadata = session.user.user_metadata;
        
        setProfile({ 
          first_name: formatName(profileData?.first_name || metadata.first_name || metadata.full_name?.split(' ')[0] || ''), 
          last_name: formatName(profileData?.last_name || metadata.last_name || metadata.full_name?.split(' ').slice(1).join(' ') || ''), 
          phone: profileData?.phone || metadata.whatsapp || metadata.phone || '', 
          email: profileData?.email || session.user.email || '' 
        });

        if (restData) {
          setRestaurant({ 
            ...restData, 
            subscription_plan: restData.subscription_plan || null,
            subscription_status: restData.subscription_status || 'trialing',
          });
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };
    loadData();
  }, []);

  // --- LÓGICA DE NEGOCIO ---
  const getTrialStatus = () => {
    if (!restaurant?.created_at) return 0;
    const start = new Date(restaurant.created_at);
    const today = new Date();
    const diff = today.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const trialDay = getTrialStatus();
  
  const getChargeDate = () => {
    const dateBase = restaurant.created_at ? new Date(restaurant.created_at) : new Date();
    const chargeDate = new Date(dateBase);
    chargeDate.setDate(dateBase.getDate() + 14);
    return chargeDate.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  };

  const updateProfile = (field: string, value: string) => {
// Dentro de updateProfile...
    const newTimeout = setTimeout(async () => {
      if (!userId) return;

      const { error } = await supabase
        .from("profiles")
        .update({ [field]: value }) 
        .eq("id", userId); // 👈 Asegúrate de que userId sea el UUID del auth.uid()

      if (error) {
        console.error("Error actualizando perfil:", error);
        toast.error("Error al guardar");
      } else {
        toast.success("Dato actualizado");
        window.dispatchEvent(new Event("profile-updated"));
      }
    }, 1000);
    setSaveTimeout(newTimeout);
  };
const handleSelectPlan = async (planType: "light" | "go" | "plus") => {
    setProcessingPlan(planType);
    try {
      const tempSlug = `local-${userId?.substring(0, 5)}`;
      const { data: upserted, error } = await supabase
        .from("restaurants")
        .upsert({ 
          user_id: userId, 
          subscription_plan: planType,
          name: restaurant.name || "Mi Local", 
          slug: restaurant.slug || tempSlug,
          subscription_status: 'trialing' 
        }, { onConflict: 'user_id' })
        .select()   // ← agregar esto
        .single();  // ← y esto

      if (error) throw error;
      
      // ← Actualizar el estado completo incluyendo el id
     setRestaurant((prev: any) => ({
  ...prev,
  ...upserted,
  subscription_plan: planType
}));
      window.dispatchEvent(new Event("profile-updated"));
      toast.success(`Plan ${planType.toUpperCase()} seleccionado.`);
    } catch (err: any) {
      toast.error("No se pudo guardar el plan");
    } finally {
      setProcessingPlan(null);
    }
};
const handleRedirectToMP = async (planType: string) => {
    if (!profile.email || !restaurant.id) {
      toast.error("Faltan datos de perfil o restaurante.");
      return;
    }

    setProcessingPlan(planType);
    try {
     const response = await fetch("/api/mercadopago/create-link", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    email: profile.email,
    plan: planType,
    userId: userId
  })
});

      const data = await response.json();
if (response.ok && data.url) {
  window.location.href = data.url;
} else {
  console.error("MP FULL ERROR:", data);
  throw new Error(data.error || "Error en la API de pagos");
}
    } catch (error: any) {
      console.error("Error MP:", error);
      toast.error(error.message);
      setProcessingPlan(null);
    }
};

const renderPlanButton = (planId: any) => {
    const isThisPlanSelected = restaurant.subscription_plan === planId;
   const isPaid = restaurant.subscription_status === "active";
    
    // Si el plan es el actual y ya está pagado/autorizado
    if (isThisPlanSelected && isPaid) {
      return (
        <div className="bg-emerald-50 p-3 rounded-2xl flex items-center justify-center gap-2 border border-emerald-200 w-full">
          <Check size={14} className="text-emerald-600" />
          <span className="text-[10px] font-black uppercase text-emerald-700 tracking-tighter">Plan Activo</span>
        </div>
      );
    }

    // Si el plan está seleccionado en DB pero falta configurar el pago en MP
    if (isThisPlanSelected && !isPaid) {
      return (
      // Dentro de renderPlanButton, en la sección de !isPaid:
<button
  onClick={() => {
    console.log("💳 Iniciando pago para:", planId); // Debug para ver qué mandamos
    handleRedirectToMP(planId);
  }}
  disabled={processingPlan !== null}
  className="w-full py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors"
>
  {processingPlan === planId ? <Loader2 className="animate-spin" size={14} /> : "Configurar Pago 💳"}
</button>
      );
    }

    // Botón por defecto para seleccionar otro plan
    return (
      <button
        onClick={() => handleSelectPlan(planId)}
        disabled={processingPlan !== null}
        className="w-full py-3 border border-gray-200 text-gray-900 rounded-xl text-[10px] font-black uppercase hover:bg-gray-50 transition-colors"
      >
        {processingPlan === planId ? <Loader2 className="animate-spin mx-auto" size={14} /> : "Cambiar a este plan"}
      </button>
    );
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={40} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 px-4 pt-24 md:pt-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div className="text-left">
          <h1 className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter leading-none">Mi Plan Snappy</h1>
          <p className="text-xs text-gray-400 font-bold mt-2 uppercase tracking-widest">Gestión de suscripción y facturación</p>
        </div>
        {trialDay < 14 && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-tighter border border-indigo-100 shadow-sm">
            <Clock size={12} /> Día {trialDay} de 14 gratis
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MIS DATOS - RESTAURADO */}
        <section className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <User size={18} className="text-blue-600" />
            <h2 className="font-bold text-lg text-gray-900 uppercase italic tracking-tighter">Mis Datos</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-left">
                <label className="text-[9px] font-black text-gray-400 mb-1 block uppercase">Nombre</label>
                <input value={profile.first_name} onChange={(e) => updateProfile("first_name", e.target.value)} className="w-full p-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-black/5" />
              </div>
              <div className="text-left">
                <label className="text-[9px] font-black text-gray-400 mb-1 block uppercase">Apellido</label>
                <input value={profile.last_name} onChange={(e) => updateProfile("last_name", e.target.value)} className="w-full p-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-black/5" />
              </div>
            </div>
            <div className="text-left">
              <label className="text-[9px] font-black text-gray-400 mb-1 block uppercase tracking-widest">WhatsApp de Aviso</label>
              <input value={profile.phone} onChange={(e) => updateProfile("phone", e.target.value)} className="w-full p-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-black/5" />
            </div>
          </div>
        </section>

        {/* ESTADO DE CUENTA */}
        <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-gray-900" />
                <h2 className="font-bold text-lg text-gray-900 uppercase italic tracking-tighter">Estado de Suscripción</h2>
              </div>
              <span className="bg-gray-100 text-gray-500 text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter">
                Miembro desde {restaurant?.created_at ? new Date(restaurant.created_at).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }) : '...'}
              </span>
            </div>

            {restaurant?.subscription_plan ? (
              <div className="space-y-6">
                <div className="text-left">
                  <p className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Plan {restaurant.subscription_plan}</p>
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mt-1">
                    Próximo pago: <span className="text-gray-900">{getChargeDate()}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toast.info("Función en mantenimiento")} className="w-full py-2.5 text-[9px] font-black uppercase italic tracking-tighter rounded-xl bg-gray-900 text-white">Gestionar</button>
                </div>
              </div>
            ) : (
              <div className="py-12 border-2 border-dashed border-gray-50 rounded-[2rem] text-center">
                <p className="text-[10px] font-black text-gray-300 uppercase italic">Seleccioná un plan para activar tu menú</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* PLANES DISPONIBLES */}
      <section className="pt-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Planes Disponibles</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {/* LIGHT */}
          <div className={`p-6 rounded-[2rem] border-2 flex flex-col transition-all bg-white relative ${restaurant.subscription_plan === "light" ? "border-black shadow-lg" : "border-gray-100"}`}>
            <div className="flex justify-between items-start mb-4 text-left">
              <div>
                <h3 className="font-bold text-gray-400 text-[9px] uppercase tracking-widest leading-none">Para empezar</h3>
                <p className="text-2xl font-black text-gray-900 mt-1">Light <span className="text-xs text-gray-400 font-bold">$10.000</span></p>
              </div>
              {restaurant.subscription_plan === "light" && restaurant.subscription_status === 'active' && (
                <span className="bg-black text-white text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Activo</span>
              )}
            </div>
            <ul className="space-y-2 mb-4 text-left">
              <li className="flex gap-2 text-[10px] font-bold text-gray-600"><Check size={12} className="text-green-500 shrink-0" /> 15 Productos</li>
              <li className="flex items-start gap-2 text-[10px] font-bold text-gray-600"><Check size={12} className="text-green-500 shrink-0 mt-0.5" /> Snapplink (2 links) <HelpCircle size={10} className="text-gray-300 ml-1" /></li>
              {expandedPlan === "light" && (
                <div className="pt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-green-500 shrink-0" /> Código QR propio</li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-green-500 shrink-0" /> Horarios de Atención</li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-green-500 shrink-0" /> Pedidos a WhatsApp</li>
                </div>
              )}
            </ul>
            <button onClick={() => setExpandedPlan(expandedPlan === "light" ? null : "light")} className="mb-4 text-[9px] font-black uppercase text-gray-400 hover:text-black flex items-center justify-center gap-1">
              {expandedPlan === "light" ? "- Ver menos" : "+ Ver detalles"}
            </button>
            {renderPlanButton("light")}
          </div>

          {/* GO */}
          <div className={`p-6 rounded-[2rem] border-2 flex flex-col transition-all bg-white relative ${restaurant.subscription_plan === "go" ? "border-blue-500 shadow-lg" : "border-blue-50"}`}>
            <div className="flex justify-between items-start mb-4 text-left">
              <div>
                <h3 className="font-bold text-blue-500 text-[9px] uppercase tracking-widest leading-none">Más Potencia</h3>
                <p className="text-2xl font-black text-gray-900 mt-1">GO <span className="text-xs text-gray-400 font-bold">$16.900</span></p>
              </div>
              {restaurant.subscription_plan === "go" && restaurant.subscription_status === 'active' && (
                <span className="bg-blue-600 text-white text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Activo</span>
              )}
            </div>
            <ul className="space-y-2 mb-4 text-left">
              <li className="flex gap-2 text-[10px] font-bold text-gray-700"><Zap size={12} className="text-blue-500 shrink-0" /> 60 Productos</li>
              <li className="flex items-start gap-2 text-[10px] font-bold text-gray-700"><Check size={12} className="text-blue-500 shrink-0 mt-0.5" /> Imágenes o Videos 🎥</li>
              {expandedPlan === "go" && (
                <div className="pt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-blue-500 shrink-0" /> Snapplink (4 links)</li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-blue-500 shrink-0" /> Descuentos por monto</li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-blue-500 shrink-0" /> Seguimiento en Vivo</li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-blue-500 shrink-0" /> Gestión de Cupones</li>
                </div>
              )}
            </ul>
            <button onClick={() => setExpandedPlan(expandedPlan === "go" ? null : "go")} className="mb-4 text-[9px] font-black uppercase text-gray-400 hover:text-blue-500 flex items-center justify-center gap-1">
              {expandedPlan === "go" ? "- Ver menos" : "+ Ver detalles"}
            </button>
            {renderPlanButton("go")}
          </div>

          {/* PLUS */}
          <div className={`p-6 rounded-[2rem] border-2 flex flex-col transition-all bg-white relative ${restaurant.subscription_plan === "plus" ? "border-emerald-500 shadow-lg" : "border-emerald-50"}`}>
            <div className="flex justify-between items-start mb-4 text-left">
              <div>
                <h3 className="font-bold text-emerald-600 text-[9px] uppercase tracking-widest leading-none">Profesional ✨</h3>
                <p className="text-2xl font-black text-gray-900 mt-1">Plus <span className="text-xs text-gray-400 font-bold">$27.000</span></p>
              </div>
              {restaurant.subscription_plan === "plus" && restaurant.subscription_status === 'active' && (
                <span className="bg-emerald-600 text-white text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Activo</span>
              )}
            </div>
            <ul className="space-y-2 mb-4 text-left">
              <li className="flex gap-2 text-[10px] font-bold text-gray-700"><Zap size={12} className="text-emerald-500 shrink-0" /> Productos Ilimitados</li>
              <li className="flex gap-2 text-[10px] font-bold text-gray-700"><Check size={12} className="text-emerald-500 shrink-0" /> Panel Pro y Caja</li>
              {expandedPlan === "plus" && (
                <div className="pt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-emerald-500 shrink-0" /> Snapplink Ilimitado</li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-emerald-500 shrink-0" /> Gestión de Reservas</li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-emerald-500 shrink-0" /> Tickets y Comandas</li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-emerald-500 shrink-0" /> Gestión de Mesas</li>
                </div>
              )}
            </ul>
            <button onClick={() => setExpandedPlan(expandedPlan === "plus" ? null : "plus")} className="mb-4 text-[9px] font-black uppercase text-gray-400 hover:text-emerald-600 flex items-center justify-center gap-1">
              {expandedPlan === "plus" ? "- Ver menos" : "+ Ver detalles"}
            </button>
            {renderPlanButton("plus")}
          </div>

          {/* MAX */}
          <div className="p-6 rounded-[2rem] border-2 border-dashed border-gray-100 bg-gray-50/50 flex flex-col relative overflow-hidden transition h-full">
            <div className="absolute top-3 -right-8 bg-gray-100 text-gray-400 text-[7px] font-black px-10 py-1 rotate-45 uppercase tracking-widest">Próximamente</div>
            <div className="text-left mb-4">
              <h3 className="font-bold text-purple-600 text-[9px] uppercase tracking-widest leading-none">Escalabilidad</h3>
              <div className="text-2xl font-black text-gray-900 mt-1 flex items-center gap-2">Max <span className="text-sm text-gray-300 font-bold blur-[5px]">$28.600</span></div>
            </div>
            <ul className="space-y-2 mb-4 text-left text-gray-400 italic">
              <li className="flex gap-2 text-[10px] font-bold"><Check size={12} className="shrink-0" /> 4 Sucursales</li>
              <li className="flex gap-2 text-[10px] font-bold"><Check size={12} className="shrink-0" /> Billeteras Virtuales</li>
            </ul>
            <button disabled className="mt-auto w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-black uppercase text-[9px] tracking-widest border border-gray-200">Próximamente</button>
          </div>
        </div>
      </section>

      {/* HISTORIAL */}
      <section className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <FileText size={18} className="text-gray-400" />
          <h2 className="font-bold text-lg text-gray-900 uppercase italic tracking-tighter">Historial de Facturación</h2>
        </div>
        <div className="py-10 text-center border-2 border-dashed border-gray-50 rounded-2xl">
          <p className="text-[10px] font-black text-gray-300 uppercase italic">No se registran facturas anteriores</p>
        </div>
      </section>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={null}>
      <PlanContent />
    </Suspense>
  );
}