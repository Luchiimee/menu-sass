"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import { Loader2, User, Check, CreditCard, Clock, FileText, X, RefreshCw } from "lucide-react";
import PaymentForm from "@/components/PaymentForm";

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

const PLANS = [
  {
    id: 'light' as const,
    name: 'Light',
    tagline: 'Para empezar',
    price: 15000,
    accent: 'border-gray-500',
    badge: null,
    features: [
      { text: '15 Productos', included: true },
      { text: 'Código QR propio', included: true },
      { text: 'Horarios de atención', included: true },
      { text: 'Pedidos a WhatsApp', included: true },
      { text: 'Snapplink (2 links)', included: true },
      { text: 'Imágenes y Videos', included: false },
      { text: 'Descuentos y Cupones', included: false },
      { text: 'Panel Pro y Caja', included: false },
    ],
  },
  {
    id: 'go' as const,
    name: 'GO',
    tagline: 'Más potencia',
    price: 22000,
    accent: 'border-blue-500',
    badge: 'POPULAR',
    features: [
      { text: '60 Productos', included: true },
      { text: 'Imágenes y Videos 🎥', included: true },
      { text: 'Snapplink (4 links)', included: true },
      { text: 'Descuentos y Cupones', included: true },
      { text: 'Seguimiento en Vivo', included: true },
      { text: 'Productos ilimitados', included: false },
      { text: 'Panel Pro y Caja', included: false },
      { text: 'Gestión de Reservas', included: false },
    ],
  },
  {
    id: 'plus' as const,
    name: 'Plus',
    tagline: 'Profesional ✨',
    price: 35000,
    accent: 'border-emerald-500',
    badge: null,
    features: [
      { text: 'Productos Ilimitados', included: true },
      { text: 'Panel Pro y Caja', included: true },
      { text: 'Snapplink Ilimitado', included: true },
      { text: 'Gestión de Reservas', included: true },
      { text: 'Tickets y Comandas', included: true },
      { text: 'Gestión de Mesas', included: true },
      { text: 'Soporte prioritario', included: true },
      { text: 'Todo lo anterior ✓', included: true },
    ],
  },
];

const prices: Record<string, number> = { light: 15000, go: 22000, plus: 35000 };

function PlanContent() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState({ first_name: "", last_name: "", phone: "", email: "" });
  const [restaurant, setRestaurant] = useState<Restaurant>({
    id: null, mp_preapproval_id: null, business_hours: {},
    subscription_plan: null, subscription_status: "trialing",
  });
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'subscribe' | 'update-card'>('subscribe');
  const searchParams = useSearchParams();

  useEffect(() => {
    const needPhone = searchParams.get('requirePhone');
    if (needPhone === 'true') {
      toast.warning("¡Casi listo!", { description: "Por favor, completá tu WhatsApp para recibir avisos de pedidos.", duration: 5000 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [searchParams]);

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
          email: profileData?.email || session.user.email || '',
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

  const getTrialStatus = () => {
    if (!restaurant?.created_at) return 0;
    const diff = new Date().getTime() - new Date(restaurant.created_at).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const trialDay = getTrialStatus();

  const getChargeDate = () => {
    const base = restaurant.created_at ? new Date(restaurant.created_at) : new Date();
    const chargeDate = new Date(base);
    chargeDate.setDate(base.getDate() + 14);
    return chargeDate.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  };

  const updateProfile = (field: string, value: string) => {
    setTimeout(async () => {
      if (!userId) return;
      const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", userId);
      if (error) toast.error("Error al guardar");
      else { toast.success("Dato actualizado"); window.dispatchEvent(new Event("profile-updated")); }
    }, 1000);
  };

  const handleChangePlan = async (planId: 'light' | 'go' | 'plus') => {
    if (planId === restaurant.subscription_plan) return;
    setProcessingPlan(planId);
    try {
      const hasActiveSub = restaurant.mp_preapproval_id &&
        (restaurant.subscription_status === 'active' || restaurant.subscription_status === 'authorized');

      if (hasActiveSub) {
        const res = await fetch('/api/subscriptions/change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, plan: planId, email: profile.email }),
        });
        if (!res.ok) throw new Error('Error al cambiar plan');

        const data = await res.json();
        const isUpgrade = prices[planId] > prices[restaurant.subscription_plan as string];

        if (isUpgrade && data.proratedAmount > 0) {
          toast.success(`Plan cambiado a ${planId.toUpperCase()}. Se cobró $${data.proratedAmount.toLocaleString('es-AR')} por los ${data.daysRemaining} días restantes del ciclo actual.`, { duration: 6000 });
        } else if (!isUpgrade) {
          toast.success(`Plan cambiado a ${planId.toUpperCase()}. El nuevo precio aplica desde tu próximo ciclo.`);
        } else {
          toast.success(`Plan cambiado a ${planId.toUpperCase()}.`);
        }
      } else {
        await supabase.from('restaurants').update({ subscription_plan: planId }).eq('user_id', userId);
        toast.success(`Plan ${planId.toUpperCase()} seleccionado.`);
      }

      setRestaurant(prev => ({ ...prev, subscription_plan: planId }));
      window.dispatchEvent(new Event("profile-updated"));
    } catch {
      toast.error("No se pudo cambiar el plan");
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleOpenPaymentModal = (planId: string) => {
    if (!profile.email) { toast.error("Falta el email de tu perfil."); return; }
    setPaymentPlan(planId);
    setPaymentMode('subscribe');
    setShowPaymentModal(true);
  };

  const handleOpenUpdateCard = () => {
    setPaymentPlan(restaurant.subscription_plan || 'light');
    setPaymentMode('update-card');
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPaymentPlan(null);
    if (paymentMode === 'subscribe') {
      setRestaurant(prev => ({ ...prev, subscription_status: 'active' }));
    } else {
      setRestaurant(prev => ({ ...prev, subscription_status: 'active' }));
    }
    window.dispatchEvent(new Event("profile-updated"));
  };

  const handleCancelPlan = async () => {
    if (!window.confirm("¿Estás seguro de cancelar la suscripción? Seguirás teniendo acceso hasta que termine tu periodo actual.")) return;
    setProcessingPlan(restaurant.subscription_plan);
    try {
      const response = await fetch("/api/mercadopago/subscription/cancel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        setRestaurant(prev => ({ ...prev, subscription_status: 'cancelled', mp_preapproval_id: null }));
        toast.success("Suscripción cancelada.");
        window.dispatchEvent(new Event("profile-updated"));
      } else throw new Error();
    } catch { toast.error("Error al cancelar la suscripción."); }
    finally { setProcessingPlan(null); }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={40} /></div>;

  const isActive = restaurant.subscription_status === 'authorized' || restaurant.subscription_status === 'active';
  const isCancelled = restaurant.subscription_status === 'cancelled';
  const isPaused = restaurant.subscription_status === 'paused';
  const isTrialing = restaurant.subscription_status === 'trialing';

  return (
    <>
      {showPaymentModal && paymentPlan && (
        <PaymentForm
          plan={paymentPlan}
          userId={userId!}
          userEmail={profile.email}
          mode={paymentMode}
          mpPreapprovalId={restaurant.mp_preapproval_id ?? undefined}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-6 pb-24 px-4 pt-24 md:pt-10 animate-in fade-in duration-500">

        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter leading-none">Mi Plan Snappy</h1>
            <p className="text-xs text-gray-400 font-bold mt-2 uppercase tracking-widest">Gestión de suscripción y facturación</p>
          </div>
          {trialDay < 14 && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-tighter border border-indigo-100">
              <Clock size={12} /> Día {trialDay} de 14 gratis
            </span>
          )}
        </header>

        {/* MIS DATOS + ESTADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <User size={18} className="text-blue-600" />
              <h2 className="font-bold text-lg text-gray-900 uppercase italic tracking-tighter">Mis Datos</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-gray-400 mb-1 block uppercase">Nombre</label>
                  <input value={profile.first_name} onChange={(e) => updateProfile("first_name", e.target.value)} className="w-full p-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-black/5" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 mb-1 block uppercase">Apellido</label>
                  <input value={profile.last_name} onChange={(e) => updateProfile("last_name", e.target.value)} className="w-full p-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-black/5" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-400 mb-1 block uppercase tracking-widest">WhatsApp de Aviso</label>
                <input
                  value={profile.phone}
                  onChange={(e) => updateProfile("phone", e.target.value)}
                  placeholder="Ej: +54911..."
                  className={`w-full p-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none transition-all duration-500 ${searchParams.get('requirePhone') === 'true' && !profile.phone ? 'ring-2 ring-amber-500 animate-pulse bg-amber-50' : 'focus:ring-2 ring-black/5'}`}
                />
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <CreditCard size={20} className="text-gray-900" />
                  <h2 className="font-bold text-lg text-gray-900 uppercase italic tracking-tighter">Estado de Suscripción</h2>
                </div>
                <span className="bg-gray-100 text-gray-500 text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter">
                  Desde {restaurant?.created_at ? new Date(restaurant.created_at).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }) : '...'}
                </span>
              </div>

              {restaurant?.subscription_plan ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xl font-black text-gray-900 uppercase italic tracking-tighter flex items-center gap-2">
                      Plan {restaurant.subscription_plan}
                      {isActive && <Check size={16} className="text-emerald-500" />}
                    </p>
                    {isTrialing && <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wide mt-1">Periodo de prueba: <span className="font-black">{14 - trialDay} días restantes</span></p>}
                    {isCancelled && (
                      <div className="mt-2 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-[10px] text-amber-700 font-black uppercase">Cancelada. Re-suscribite antes del <span className="underline">{getChargeDate()}</span>.</p>
                      </div>
                    )}
                    {isPaused && (
                      <div className="mt-2 p-3 bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-[10px] text-red-700 font-black uppercase">Pago fallido. Actualizá tu tarjeta para reactivar.</p>
                      </div>
                    )}
                    {isActive && <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wide mt-1">Próximo cobro: <span className="text-gray-900">{getChargeDate()}</span></p>}
                  </div>

                  <div className="flex flex-col gap-2">
                    {isActive && (
                      <button onClick={handleOpenUpdateCard} className="w-full py-2.5 text-[9px] font-black uppercase italic tracking-tighter rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5">
                        <RefreshCw size={11} /> Cambiar Tarjeta
                      </button>
                    )}
                    {isPaused && (
                      <button onClick={handleOpenUpdateCard} className="w-full py-2.5 text-[9px] font-black uppercase italic tracking-tighter rounded-xl bg-black text-white flex items-center justify-center gap-1.5">
                        <CreditCard size={11} /> Actualizar Tarjeta
                      </button>
                    )}
                    {(isCancelled || isPaused) && (
                      <button onClick={() => handleOpenPaymentModal(restaurant.subscription_plan!)} className="w-full py-2.5 text-[9px] font-black uppercase italic tracking-tighter rounded-xl bg-black text-white">
                        Re-activar Suscripción 💳
                      </button>
                    )}
                    {isActive && (
                      <button onClick={handleCancelPlan} className="w-full py-2.5 text-[9px] font-black uppercase italic tracking-tighter rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        Cancelar Plan
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 border-2 border-dashed border-gray-50 rounded-[2rem] text-center">
                  <p className="text-[10px] font-black text-indigo-500 uppercase italic">Elegí un plan para comenzar tus 14 días gratis</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* PLANES */}
        <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 md:p-8">
          <div className="mb-6 border-b border-gray-100 pb-6">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cambiar Plan</p>
            <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mt-1">Planes Disponibles</h2>
            <p className="text-[11px] text-gray-400 font-bold mt-1">Podés subir o bajar de plan en cualquier momento. El cambio aplica desde el próximo ciclo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = restaurant.subscription_plan === plan.id;
              const needsPayment = isCurrent && (isTrialing || isCancelled);

              const borderColor = isCurrent
                ? plan.id === 'light' ? 'border-gray-900' : plan.id === 'go' ? 'border-blue-500' : 'border-emerald-500'
                : 'border-gray-100';

              return (
                <div key={plan.id} className={`rounded-[1.5rem] p-6 border-2 flex flex-col relative bg-white ${borderColor}`}>
                  {isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      Plan Actual
                    </span>
                  )}
                  {plan.badge && !isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      {plan.badge}
                    </span>
                  )}

                  <div className="mb-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{plan.tagline}</p>
                    <h3 className="text-2xl font-black text-gray-900 italic tracking-tighter mt-0.5">{plan.name}</h3>
                    <p className="text-3xl font-black text-gray-900 mt-3">
                      ${plan.price.toLocaleString('es-AR')}
                      <span className="text-sm text-gray-400 font-bold"> /mes</span>
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className={`flex items-center gap-2 text-[11px] font-bold ${f.included ? 'text-gray-700' : 'text-gray-300'}`}>
                        {f.included
                          ? <Check size={12} className="text-emerald-500 shrink-0" />
                          : <X size={12} className="text-gray-300 shrink-0" />
                        }
                        {f.text}
                      </li>
                    ))}
                  </ul>

                  {isCurrent && isActive && (
                    <div className="w-full py-3 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border border-gray-100">
                      Plan Activo ✓
                    </div>
                  )}
                  {isCurrent && needsPayment && (
                    <button onClick={() => handleOpenPaymentModal(plan.id)} className="w-full py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 transition-colors">
                      Configurar Pago 💳
                    </button>
                  )}
                  {!isCurrent && (
                    <button
                      onClick={() => {
                        if (!restaurant.subscription_plan) { handleOpenPaymentModal(plan.id); }
                        else if (isActive || isTrialing) { handleChangePlan(plan.id); }
                        else { handleOpenPaymentModal(plan.id); }
                      }}
                      disabled={processingPlan !== null}
                      className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 hover:border-gray-900 hover:text-gray-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {processingPlan === plan.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : `Cambiar a ${plan.name}`
                      }
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* MAX — Coming soon */}
          <div className="mt-4 border-2 border-dashed border-gray-100 bg-gray-50/50 rounded-[1.5rem] p-6 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest">Próximamente</p>
              <h3 className="text-xl font-black text-gray-400 italic tracking-tighter mt-0.5">Max <span className="text-sm text-gray-300 font-bold blur-sm">$XX.XXX</span></h3>
              <p className="text-[10px] text-gray-400 font-bold mt-1">4 sucursales · Billeteras virtuales · Escalabilidad total</p>
            </div>
            <span className="text-[9px] font-black text-gray-400 uppercase border border-gray-200 px-3 py-1.5 rounded-full">En desarrollo</span>
          </div>

          <p className="text-center text-[9px] text-gray-300 font-bold uppercase tracking-widest mt-6">
            ✓ 14 días gratis en todos los planes · Sin permanencia · Facturación en ARS
          </p>
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
    </>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={null}>
      <PlanContent />
    </Suspense>
  );
}
