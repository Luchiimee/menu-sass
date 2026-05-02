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
  X,
  HelpCircle,
  ArrowRight,
  Lock,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

function PlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [restaurant, setRestaurant] = useState<any>({
    business_hours: {},
    subscription_plan: null,
    subscription_status: "trialing",
  });
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [mpInstance, setMpInstance] = useState<any>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  // --- FUNCIÓN: PAUSAR / REANUDAR SUSCRIPCIÓN ---
  const handleTogglePause = async () => {
    const isPausing =
      restaurant?.subscription_status === "authorized" ||
      restaurant?.subscription_status === "active";
    const actionLabel = isPausing ? "PAUSAR" : "REANUDAR";

    const confirmAction = confirm(
      `⚠️ ¿${actionLabel} COBROS?\n\n` +
        (isPausing
          ? "Tu menú se ocultará del público y no se realizarán nuevos cobros hasta que lo reactives."
          : "Se volverán a activar los cobros mensuales y tu menú estará online inmediatamente.") +
        `\n\n¿Confirmar?`,
    );

    if (!confirmAction) return;

    setLoading(true);
    try {
      const response = await fetch("/api/mercadopago/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mpPreapprovalId: restaurant.mp_preapproval_id,
          pause: isPausing, // Mandamos true para pausar, false para reanudar
        }),
      });

      if (response.ok) {
        toast.success(
          `Suscripción ${isPausing ? "pausada" : "reanudada"} correctamente.`,
        );
        window.location.reload();
      } else {
        throw new Error();
      }
    } catch (error) {
      toast.error("No se pudo procesar el cambio. Contactate con soporte.");
    } finally {
      setLoading(false);
    }
  };
  // --- CARGA DE DATOS (IGUAL A SETTINGS) ---
  useEffect(() => {
    const loadData = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        setUserId(session.user.id);

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();

        // 🚀 Si hay perfil lo usamos, si no, usamos los datos de la sesión (Google)
        if (profileData) {
            setProfile({ 
                first_name: profileData.first_name || session.user.user_metadata.full_name?.split(' ')[0] || '', 
                last_name: profileData.last_name || '', 
                phone: profileData.phone || '', 
                email: profileData.email || session.user.email || '' 
            });
        }
    } finally {
        setTimeout(() => setLoading(false), 300);
    }
};
    loadData();

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      const mp = new window.MercadoPago(
        process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY,
        { locale: "es-AR" },
      );
      setMpInstance(mp);
    };
    document.body.appendChild(script);
  }, []);

  // --- LÓGICA DE PRUEBA Y PRECIOS ---
  const getTrialStatus = () => {
    if (!restaurant?.created_at) return 0;
    const start = new Date(restaurant.created_at);
    const today = new Date();
    const diff = today.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const trialDay = getTrialStatus();
  const trialExpired = trialDay >= 14;
  const isTrialing =
    restaurant?.subscription_status === "trialing" ||
    !restaurant?.subscription_plan;

  const getChargeDate = () => {
    const dateBase = restaurant.created_at
      ? new Date(restaurant.created_at)
      : new Date();
    const chargeDate = new Date(dateBase);
    chargeDate.setDate(dateBase.getDate() + 14);
    return chargeDate.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
    });
  };
  const updateProfile = (field: string, value: string) => {
    const newData = { ...profile, [field]: value };
    setProfile(newData);

    if (saveTimeout) clearTimeout(saveTimeout);

    const newTimeout = setTimeout(async () => {
      // Usamos update en lugar de upsert para mayor seguridad
      await supabase.from("profiles").update(newData).eq("id", userId);
      toast.success("Perfil actualizado");
      // Esto avisa al Sidebar que tiene que refrescar el nombre
      window.dispatchEvent(new Event("profile-updated"));
    }, 1000);
    setSaveTimeout(newTimeout);
  };

  // 1. Esta función SOLO guarda la elección del plan en Supabase
  const handleSelectPlan = async (planType: "light" | "go" | "plus") => {
    setProcessingPlan(planType);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({ subscription_plan: planType })
        .eq("user_id", userId);

      if (error) throw error;

      // Actualizamos localmente para que cambien los botones
      setRestaurant({ ...restaurant, subscription_plan: planType });
      window.dispatchEvent(new Event("profile-updated"));

      toast.success(`Plan ${planType.toUpperCase()} seleccionado con éxito`);
    } catch (err) {
      toast.error("No se pudo cambiar el plan");
    } finally {
      setProcessingPlan(null);
    }
  };

  // 2. Esta función SOLO abre el modal de Mercado Pago
  const handleOpenPaymentForm = (planType: string) => {
    setShowCardForm(true);
    setTimeout(() => mountCardBrick(planType), 100);
  };

  const mountCardBrick = async (planType: string) => {
    if (!mpInstance) return;
    const bricksBuilder = mpInstance.bricks();
    const settings = {
      initialization: {
        amount:
          planType === "light" ? 10000 : planType === "go" ? 16900 : 27000,
        payer: { email: profile.email },
      },
      callbacks: {
        onReady: () => setProcessingPlan(null),
        onSubmit: (formData: any) => {
          return new Promise(async (resolve, reject) => {
            const res = await fetch("/api/mercadopago/subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: formData.token,
                payment_method_id: formData.payment_method_id,
                planType,
                userId,
                email: profile.email,
              }),
            });
            if (res.ok) {
              toast.success("Pago configurado con éxito");
              window.location.reload();
              resolve(null);
            } else {
              toast.error("Error al procesar");
              reject();
            }
          });
        },
      },
    };
    // @ts-ignore
    window.cardBrickController = await bricksBuilder.create(
      "cardPayment",
      "cardPaymentBrick_container",
      settings,
    );
  };

  const renderPlanButton = (planId: "light" | "go" | "plus") => {
    const isThisPlanSelected = restaurant.subscription_plan === planId;
    const isPaid =
      restaurant.subscription_status === "authorized" ||
      restaurant.subscription_status === "active";
    const colorClass =
      planId === "light"
        ? "bg-black"
        : planId === "go"
          ? "bg-blue-600"
          : "bg-emerald-600";

    // CASO 1: YA PAGÓ ESTE PLAN
    if (isThisPlanSelected && isPaid) {
      return (
        <div className="bg-emerald-50 p-3 rounded-2xl flex items-center justify-center gap-2 border border-emerald-200 w-full">
          <Check size={14} className="text-emerald-600" />
          <span className="text-[10px] font-black uppercase text-emerald-700 tracking-tighter">
            Plan Activo
          </span>
        </div>
      );
    }

    // CASO 2: PLAN SELECCIONADO PERO FALTA CONFIGURAR PAGO
    if (isThisPlanSelected && !isPaid) {
      return (
        <div className="flex flex-col gap-2 w-full">
          {/* Etiqueta de estado */}
          <div className="bg-emerald-100 p-2.5 rounded-xl border border-emerald-200 text-center">
            <span className="text-[9px] font-black uppercase text-emerald-700">
              Plan Seleccionado
            </span>
          </div>
          {/* Botón de acción real */}
          <button
            onClick={() => handleOpenPaymentForm(planId)}
            className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase text-white ${colorClass} hover:opacity-90 transition-all shadow-lg active:scale-95`}
          >
            Configurar Pago 💳
          </button>
        </div>
      );
    }

    // CASO 3: OTROS PLANES (O primera vez sin plan)
    return (
      <button
        onClick={() => handleSelectPlan(planId)}
        disabled={processingPlan !== null}
        className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase text-white bg-gray-800 hover:bg-black transition-all shadow-lg active:scale-95`}
      >
        {processingPlan === planId ? (
          <Loader2 className="animate-spin mx-auto" size={16} />
        ) : restaurant.subscription_plan ? (
          "Cambiar a este plan"
        ) : (
          "Activar Plan"
        )}
      </button>
    );
  };
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={40} />
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 px-4 pt-24 md:pt-10 animate-in fade-in duration-500">
      {/* HEADER COMPACTO CON CONTADOR */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div className="text-left">
          <h1 className="text-2xl font-black text-gray-900 italic uppercase tracking-tighter leading-none">
            Mi Plan Snappy
          </h1>
          <p className="text-xs text-gray-400 font-bold mt-2 uppercase tracking-widest">
            Gestión de suscripción y facturación
          </p>
        </div>
        {isTrialing && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-tighter border border-indigo-100 shadow-sm">
            <Clock size={12} /> Día {trialDay} de 14 gratis
          </span>
        )}
      </header>

      {/* SECCIÓN SUPERIOR: DATOS Y PAGO (SMALLER) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD: MIS DATOS (Compacto) */}
        <section className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <User size={18} className="text-blue-600" />
            <h2 className="font-bold text-lg text-gray-900 uppercase italic tracking-tighter">
              Mis Datos
            </h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-left">
                <label className="text-[9px] font-black text-gray-400 mb-1 block uppercase">
                  Nombre
                </label>
                <input
                  value={profile.first_name}
                  onChange={(e) => updateProfile("first_name", e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-black/5"
                />
              </div>
              <div className="text-left">
                <label className="text-[9px] font-black text-gray-400 mb-1 block uppercase">
                  Apellido
                </label>
                <input
                  value={profile.last_name}
                  onChange={(e) => updateProfile("last_name", e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-black/5"
                />
              </div>
            </div>
            <div className="text-left">
              <label className="text-[9px] font-black text-gray-400 mb-1 block uppercase tracking-widest">
                WhatsApp de Aviso
              </label>
              <input
                value={profile.phone}
                onChange={(e) => updateProfile("phone", e.target.value)}
                className="w-full p-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 ring-black/5"
              />
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <CreditCard size={18} className="text-emerald-600" />
              <h2 className="font-bold text-lg text-gray-900 uppercase italic tracking-tighter">
                Método de Pago
              </h2>
            </div>

            {restaurant?.subscription_status === "authorized" ||
            restaurant?.subscription_status === "active" ||
            restaurant?.subscription_status === "paused" ? (
              <div className="space-y-3">
                <div
                  className={`p-3 border rounded-xl flex items-center justify-between ${restaurant.subscription_status === "paused" ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100"}`}
                >
                  <div className="flex items-center gap-2">
                    {restaurant.subscription_status === "paused" ? (
                      <Clock className="text-amber-600" size={16} />
                    ) : (
                      <Check className="text-emerald-600" size={16} />
                    )}
                    <span
                      className={`text-[9px] font-black uppercase ${restaurant.subscription_status === "paused" ? "text-amber-800" : "text-emerald-800"}`}
                    >
                      {restaurant.subscription_status === "paused"
                        ? "Cobros Pausados"
                        : "Tarjeta Vinculada"}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleOpenPaymentForm(restaurant.subscription_plan)
                    }
                    className="text-[9px] font-black uppercase text-gray-400 hover:text-black"
                  >
                    Cambiar
                  </button>
                </div>

                {/* BOTÓN DINÁMICO DE PAUSA/REANUDAR */}
                <button
                  onClick={handleTogglePause}
                  className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                    restaurant.subscription_status === "paused"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700"
                      : "bg-gray-50 text-gray-500 hover:bg-amber-50 hover:text-amber-600 border border-transparent hover:border-amber-100"
                  }`}
                >
                  {restaurant.subscription_status === "paused"
                    ? "▶️ Reanudar Cobros y Menú"
                    : "⏸️ Pausar Cobros Temporalmente"}
                </button>
              </div>
            ) : (
              <div className="p-4 border-2 border-dashed border-gray-100 rounded-2xl text-center">
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-3">
                  Sin tarjeta cargada
                </p>
                <button
                  onClick={() =>
                    handleOpenPaymentForm(
                      restaurant?.subscription_plan || "light",
                    )
                  }
                  className="text-[9px] font-black uppercase text-blue-600 hover:underline"
                >
                  Vincular Ahora
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* SECCIÓN PLANES (MISMAS CARDS Y LOGICA QUE SETTINGS) */}
      <section className="pt-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">
            Planes Disponibles
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {/* PLAN LIGHT (Exactamente de Settings) */}
          <div
            className={`p-6 rounded-[2rem] border-2 flex flex-col transition-all bg-white relative ${restaurant.subscription_plan === "light" ? "border-black shadow-lg" : "border-gray-100"}`}
          >
            <div className="flex justify-between items-start mb-4 text-left">
              <div>
                <h3 className="font-bold text-gray-400 text-[9px] uppercase tracking-widest leading-none">
                  Para empezar
                </h3>
                <p className="text-2xl font-black text-gray-900 mt-1">
                  Light{" "}
                  <span className="text-xs text-gray-400 font-bold">
                    $10.000
                  </span>
                </p>
              </div>
              {restaurant.subscription_plan === "light" && (
                <span className="bg-black text-white text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                  Activo
                </span>
              )}
            </div>
            <ul className="space-y-2 mb-4 text-left">
              <li className="flex gap-2 text-[10px] font-bold text-gray-600">
                <Check size={12} className="text-green-500 shrink-0" /> 15
                Productos
              </li>
              <li className="flex items-start gap-2 text-[10px] font-bold text-gray-600 group relative cursor-help">
                <Check size={12} className="text-green-500 shrink-0 mt-0.5" />
                <div className="flex items-center gap-1">
                  <span>Snapplink (2 links)</span>
                  <HelpCircle size={10} className="text-gray-300" />
                </div>
              </li>
              {expandedPlan === "light" && (
                <div className="pt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500">
                    <Check size={12} className="text-green-500 shrink-0" />{" "}
                    Código QR propio
                  </li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500">
                    <Check size={12} className="text-green-500 shrink-0" />{" "}
                    Horarios de Atención
                  </li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500">
                    <Check size={12} className="text-green-500 shrink-0" />{" "}
                    Pedidos a WhatsApp
                  </li>
                </div>
              )}
            </ul>
            <button
              onClick={() =>
                setExpandedPlan(expandedPlan === "light" ? null : "light")
              }
              className="mb-4 text-[9px] font-black uppercase text-gray-400 hover:text-black flex items-center justify-center gap-1"
            >
              {expandedPlan === "light" ? "- Ver menos" : "+ Ver detalles"}
            </button>
            {renderPlanButton("light")}
          </div>

          {/* PLAN GO (Exactamente de Settings) */}
          <div
            className={`p-6 rounded-[2rem] border-2 flex flex-col transition-all bg-white relative ${restaurant.subscription_plan === "go" ? "border-blue-500 shadow-lg" : "border-blue-50"}`}
          >
            <div className="flex justify-between items-start mb-4 text-left">
              <div>
                <h3 className="font-bold text-blue-500 text-[9px] uppercase tracking-widest leading-none">
                  Más Potencia
                </h3>
                <p className="text-2xl font-black text-gray-900 mt-1">
                  GO{" "}
                  <span className="text-xs text-gray-400 font-bold">
                    $16.900
                  </span>
                </p>
              </div>
              {restaurant.subscription_plan === "go" && (
                <span className="bg-blue-600 text-white text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                  Activo
                </span>
              )}
            </div>
            <ul className="space-y-2 mb-4 text-left">
              <li className="flex gap-2 text-[10px] font-bold text-gray-700">
                <Zap size={12} className="text-blue-500 shrink-0" /> 60
                Productos
              </li>
              <li className="flex items-start gap-2 text-[10px] font-bold text-gray-700 group relative cursor-help">
                <Check size={12} className="text-blue-500 shrink-0 mt-0.5" />
                <span>Imágenes o Videos 🎥</span>
              </li>
              {expandedPlan === "go" && (
                <div className="pt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500">
                    <Check size={12} className="text-blue-500 shrink-0" />{" "}
                    Snapplink (4 links)
                  </li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500">
                    <Check size={12} className="text-blue-500 shrink-0" />{" "}
                    Descuentos por monto
                  </li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500">
                    <Check size={12} className="text-blue-500 shrink-0" />{" "}
                    Seguimiento en Vivo
                  </li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500">
                    <Check size={12} className="text-blue-500 shrink-0" />{" "}
                    Gestión de Cupones
                  </li>
                </div>
              )}
            </ul>
            <button
              onClick={() =>
                setExpandedPlan(expandedPlan === "go" ? null : "go")
              }
              className="mb-4 text-[9px] font-black uppercase text-gray-400 hover:text-blue-500 flex items-center justify-center gap-1"
            >
              {expandedPlan === "go" ? "- Ver menos" : "+ Ver detalles"}
            </button>
            {renderPlanButton("go")}
          </div>

          {/* PLAN PLUS (Exactamente de Settings) */}
          <div
            className={`p-6 rounded-[2rem] border-2 flex flex-col transition-all bg-white relative ${restaurant.subscription_plan === "plus" ? "border-emerald-500 shadow-lg" : "border-emerald-50"}`}
          >
            <div className="flex justify-between items-start mb-4 text-left">
              <div>
                <h3 className="font-bold text-emerald-600 text-[9px] uppercase tracking-widest leading-none">
                  Profesional ✨
                </h3>
                <p className="text-2xl font-black text-gray-900 mt-1">
                  Plus{" "}
                  <span className="text-xs text-gray-400 font-bold">
                    $27.000
                  </span>
                </p>
              </div>
              {restaurant.subscription_plan === "plus" && (
                <span className="bg-emerald-600 text-white text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">
                  Activo
                </span>
              )}
            </div>
            <ul className="space-y-2 mb-4 text-left">
              <li className="flex gap-2 text-[10px] font-bold text-gray-700">
                <Zap size={12} className="text-emerald-500 shrink-0" />{" "}
                Productos Ilimitados
              </li>
              <li className="flex gap-2 text-[10px] font-bold text-gray-700">
                <Check size={12} className="text-emerald-500 shrink-0" /> Panel
                Pro y Caja
              </li>
              {expandedPlan === "plus" && (
                <div className="pt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500">
                    <Check size={12} className="text-emerald-500 shrink-0" />{" "}
                    Snapplink Ilimitado
                  </li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500">
                    <Check size={12} className="text-emerald-500 shrink-0" /> 2
                    Sucursales (PRÓX.)
                  </li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500">
                    <Check size={12} className="text-emerald-500 shrink-0" />{" "}
                    Gestión de Reservas
                  </li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500">
                    <Check size={12} className="text-emerald-500 shrink-0" />{" "}
                    Tickets y Comandas
                  </li>
                  <li className="flex gap-2 text-[10px] font-medium text-gray-500">
                    <Check size={12} className="text-emerald-500 shrink-0" />{" "}
                    Gestión de Mesas
                  </li>
                </div>
              )}
            </ul>
            <button
              onClick={() =>
                setExpandedPlan(expandedPlan === "plus" ? null : "plus")
              }
              className="mb-4 text-[9px] font-black uppercase text-gray-400 hover:text-emerald-600 flex items-center justify-center gap-1"
            >
              {expandedPlan === "plus" ? "- Ver menos" : "+ Ver detalles"}
            </button>
            {renderPlanButton("plus")}
          </div>

          {/* PLAN MAX */}
          <div className="p-6 rounded-[2rem] border-2 border-dashed border-gray-100 bg-gray-50/50 flex flex-col relative overflow-hidden transition hover:shadow-2xl h-full">
            <div className="absolute top-3 -right-8 bg-gray-100 text-gray-400 text-[7px] font-black px-10 py-1 rotate-45 uppercase tracking-widest border-b border-gray-200">
              Próximamente
            </div>
            <div className="text-left mb-4">
              <h3 className="font-bold text-purple-600 text-[9px] uppercase tracking-widest leading-none">
                Escalabilidad
              </h3>
              <div className="text-2xl font-black text-gray-900 mt-1 flex items-center gap-2">
                Max{" "}
                <span className="text-sm text-gray-300 font-bold blur-[5px]">
                  $28.600
                </span>
              </div>
            </div>
            <ul className="space-y-2 mb-4 text-left">
              <li className="flex gap-2 text-[10px] font-bold text-gray-500">
                <Check size={12} className="text-purple-400 shrink-0" /> 4
                Sucursales
              </li>
              <li className="flex gap-2 text-[10px] font-bold text-gray-500">
                <Check size={12} className="text-purple-400 shrink-0" />{" "}
                Billeteras Virtuales
              </li>
            </ul>
            <button
              disabled
              className="mt-auto w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-black uppercase text-[9px] tracking-widest border border-gray-200"
            >
              Próximamente
            </button>
          </div>
        </div>
      </section>

      {/* MODAL DE HISTORIAL (Compacto al final) */}
      <section className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <FileText size={18} className="text-gray-400" />
          <h2 className="font-bold text-lg text-gray-900 uppercase italic tracking-tighter">
            Historial de Facturación
          </h2>
        </div>
        <div className="py-10 text-center border-2 border-dashed border-gray-50 rounded-2xl">
          <p className="text-[10px] font-black text-gray-300 uppercase italic">
            No se registran facturas anteriores
          </p>
        </div>
      </section>

      {/* MODAL DEL BRICK (IDEM SETTINGS) */}
      {showCardForm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => {
                setShowCardForm(false);
                setProcessingPlan(null);
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-black"
            >
              <X size={24} />
            </button>
            <div className="text-left mb-6">
              <h3 className="text-xl font-black uppercase italic tracking-tighter">
                Vincular Tarjeta
              </h3>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                Pago seguro vía Mercado Pago
              </p>
            </div>
            <div id="cardPaymentBrick_container"></div>
          </div>
        </div>
      )}
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
