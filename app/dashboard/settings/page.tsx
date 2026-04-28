'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner'; 
import { 
  Loader2, Save, User, Clock, CreditCard, Lock, Check, Zap, Tag, 
  CalendarDays, Mail, AlertTriangle, LogOut, Trash2, MessageCircle,
  QrCode, Smartphone, BarChart3, Bell, Globe, ChevronDown, ChevronUp, Layout, Store,ArrowRight,Phone, X,HelpCircle
} from 'lucide-react';

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

function SettingsContent() {
  const router = useRouter(); 
  const searchParams = useSearchParams();
  const focusPhone = searchParams.get('focus') === 'phone';
  const [showHighlight, setShowHighlight] = useState(focusPhone);

  // --- VALIDADOR AMIGABLE ---
const validatePhone = () => {
    if (!profile.phone || profile.phone.trim().length < 8) {
      if (!showHighlight) {
        setShowHighlight(true);
        toast.error("WhatsApp requerido");
      }
      
      // --- FIX DE SCROLL (Targeting Interno) ---
      setTimeout(() => {
        const input = document.getElementById('phone-input');
        if (input) {
          // 'center' hace que el input quede en medio de la pantalla
          // Es mucho más fiable que calcular coordenadas en layouts complejos
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Esperamos a que termine el scroll para dar el foco
          setTimeout(() => input.focus(), 500);
        }
      }, 100); // Pequeño delay para que React renderice el highlight primero
      
      return false;
    }
    return true;
  };
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showHours, setShowHours] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showPlanSuccessModal, setShowPlanSuccessModal] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [profile, setProfile] = useState({ first_name: '', last_name: '', phone: '', email: '' });
  const [restaurant, setRestaurant] = useState<any>({ id: null, business_hours: {}, subscription_plan: null, created_at: null });

 useEffect(() => {
   const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        
        const user = session.user;
        setUserId(user.id);

        // 1. Traemos lo que hay en la DB
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        // 2. Sacamos los datos de Google como "respaldo"
        const meta = user.user_metadata || {};
        const firstNameMeta = meta.first_name || meta.given_name || meta.full_name?.split(' ')[0] || meta.name || '';
        const lastNameMeta = meta.last_name || meta.family_name || meta.full_name?.split(' ').slice(1).join(' ') || '';

        // 3. PRIORIDAD: Si está en la DB se usa eso, si no, se usa lo de Google
        const finalFirstName = profileData?.first_name || firstNameMeta;
        const finalLastName = profileData?.last_name || lastNameMeta;

        setProfile({ 
            first_name: finalFirstName, 
            last_name: finalLastName, 
            phone: profileData?.phone || '',
            email: user.email || '' 
        });
if (profileData?.phone && profileData.phone.trim().length >= 8 && focusPhone) {
            setShowHighlight(false);
            router.replace('/dashboard/settings');
        }

        // 4. Si la DB estaba vacía pero Google tenía el nombre, lo guardamos ahora mismo
        if (profileData && (!profileData.first_name || !profileData.last_name) && finalFirstName) {
            await supabase.from('profiles').update({
                first_name: finalFirstName,
                last_name: finalLastName
            }).eq('id', user.id);
        }

        // 5. Cargar datos del restaurante (Igual que antes)
        const { data: restData } = await supabase
            .from('restaurants')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (restData) {
            setRestaurant({ ...restData, business_hours: restData.business_hours || {} });
        }

      } catch (error) { 
          console.error("Error cargando datos:", error); 
      } finally { 
          setTimeout(() => setLoading(false), 300); 
      }
    };
    loadData();
  }, []);
useEffect(() => {
    // Solo actuamos si se pide el foco Y ya terminó de cargar el esqueleto (loading es false)
    if (focusPhone && !loading) { 
      const timer = setTimeout(() => {
        const input = document.getElementById('phone-input');
        if (input) {
          // Bajamos suavemente
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Damos foco al input para que se vea el cursor
          setTimeout(() => input.focus(), 600);
        }
      }, 400); // 400ms es el tiempo ideal después de que desaparece el Loader

      return () => clearTimeout(timer);
    }
  }, [focusPhone, loading]);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

 // --- FUNCIÓN: CANCELAR SUSCRIPCIÓN (NUEVA) ---
  const handleCancelSubscription = async () => {
    const confirmCancel = confirm(
      "⚠️ ¿CANCELAR SUSCRIPCIÓN?\n\n" +
      "Dejarás de pagar mensualmente. Tu menú y productos se guardarán por 6 meses por si decides volver.\n\n" +
      "¿Confirmar cancelación?"
    );

    if (!confirmCancel) return;

    setLoading(true);
    try {
        const response = await fetch('/api/mercadopago/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, mpPreapprovalId: restaurant.mp_preapproval_id })
        });

        if (response.ok) {
            toast.success("Suscripción cancelada correctamente.");
            window.location.reload();
        }
    } catch (error) {
        toast.error("Error al cancelar. Contactate con soporte.");
    } finally {
        setLoading(false);
    }
  };

  // --- FUNCIÓN: ELIMINAR CUENTA (RESTAURADA) ---
  const handleDeleteAccount = async () => {
    const confirm1 = confirm("⚠️ ¿ESTÁS SEGURO?\n\nAl eliminar tu cuenta se borrará tu menú y se CANCELARÁ cualquier suscripción activa de forma permanente.");
    if (!confirm1) return;

    const confirm2 = confirm("ESTA ACCIÓN NO SE PUEDE DESHACER. ¿Eliminar definitivamente?");
    if (!confirm2) return;

    setLoading(true);
    try {
        const response = await fetch('/api/user/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        if (response.ok) {
            toast.success("Cuenta eliminada");
            await supabase.auth.signOut();
            router.push('/login');
        } else {
            throw new Error("Error en el servidor");
        }
    } catch (error) { 
        toast.error("No se pudo eliminar la cuenta por completo."); 
    } finally {
        setLoading(false);
    }
  };


  // --- AUTO-GUARDADO DE PERFIL (CON REFRESH) ---
const saveProfileData = async (newData: any) => {
    if (!userId) return;
    const { error } = await supabase.from('profiles').upsert({ id: userId, ...newData });
    
    if (!error) {
      toast.success('Perfil actualizado');
      
      // --- LIMPIEZA DE URL Y FOCO ---
      // Si el usuario puso un teléfono válido y el highlight estaba activo, limpiamos la URL
      if (newData.phone && newData.phone.length >= 8 && showHighlight) {
        setShowHighlight(false);
        router.replace('/dashboard/settings'); // Esto quita el ?focus=phone sin recargar
      }

      window.dispatchEvent(new Event('profile-updated')); 
    }
  };
  const updateProfile = (field: string, value: string) => {
    const newData = { ...profile, [field]: value };
    setProfile(newData);
    if (saveTimeout) clearTimeout(saveTimeout);
    const newTimeout = setTimeout(() => saveProfileData(newData), 1000);
    setSaveTimeout(newTimeout);
  };

  // --- AUTO-GUARDADO DE HORARIOS ---
  const saveHours = async (newHours: any) => {
    if (!restaurant.id) return;
    const { error } = await supabase.from('restaurants').update({ business_hours: newHours }).eq('id', restaurant.id);
    if (!error) toast.success('Horario guardado', { position: 'bottom-right', duration: 1000 });
  };

  const updateHour = (day: string, field: string, value: any) => {
      const updatedHours = {
          ...restaurant.business_hours,
          [day]: { ...(restaurant.business_hours[day] || {}), [field]: value }
      };
      setRestaurant((prev: any) => ({ ...prev, business_hours: updatedHours }));
      saveHours(updatedHours);
  };

 const handlePasswordReset = async () => {
      if (!profile.email) return toast.error("No hay un correo asociado");

      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, { 
          // 🚀 LE MANDAMOS EL PARÁMETRO 'next' HACIA NUESTRA NUEVA PÁGINA
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings/new-password` 
      });
      
      if (error) {
          toast.error("Error al enviar el correo");
      } else {
          toast.success("¡Correo enviado! Revisá tu bandeja de entrada.");
      }
  };
// --- ACTIVAR TRIAL 14 DÍAS (CORREGIDO PARA NO RESETEAR RUBRO) ---
// --- ACTIVAR TRIAL (ACTUALIZADO CON PLAN GO) ---
const handleActivateTrial = async (planType: 'light' | 'go' | 'plus') => {
  if (!validatePhone()) return;
  if (!userId) return;
  setProcessingPlan(planType);
  
  const isSubscribed = restaurant.subscription_status === 'active' || restaurant.subscription_status === 'authorized';
  const isChangingPlan = !!restaurant.subscription_plan;

  try {
    const autoSlug = `snappy-${Math.random().toString(36).substring(2, 7)}`;

    const { data, error } = await supabase
      .from('restaurants')
      .upsert({ 
        user_id: userId, 
        subscription_plan: planType,
        subscription_status: isSubscribed ? restaurant.subscription_status : 'trialing',
        trial_start_date: restaurant?.trial_start_date || new Date().toISOString(),
        name: restaurant?.name || 'Mi Restaurante',
        slug: restaurant?.slug || autoSlug,
        onboarding_completed: restaurant?.onboarding_completed || false 
      }, { onConflict: 'user_id' })
      .select().single();

    if (error) throw error;
    
    if (data) {
      setRestaurant(data);
      window.dispatchEvent(new Event('profile-updated')); 
      if (isChangingPlan) {
        const fechaCobro = getChargeDate();
        toast.success(`Plan cambiado a ${planType.toUpperCase()}. Próximo cobro: ${fechaCobro}`, { duration: 5000 });
      } else {
        setShowPlanSuccessModal(true);
      }
    }
  } catch (error: any) { 
    toast.error("Error al actualizar el plan."); 
  } finally { 
    setProcessingPlan(null); 
  }
};

// --- MERCADO PAGO (ACTUALIZADO CON PLAN GO) ---
const handleGoToPayment = async (planType: 'light' | 'go' | 'plus') => {
  if (!validatePhone()) return;
  setProcessingPlan(planType);
  try {
    const response = await fetch('/api/mercadopago/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType, userId, email: profile.email })
    });
    const data = await response.json();
    if (data.url) window.location.href = data.url;
  } catch (error) { toast.error("Error en el pago"); } finally { setProcessingPlan(null); }
};

  const getChargeDate = () => {
    const dateBase = restaurant.created_at ? new Date(restaurant.created_at) : new Date();
    const chargeDate = new Date(dateBase);
    chargeDate.setDate(dateBase.getDate() + 14);
    return chargeDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  };
const renderPlanButton = (plan: 'light' | 'go' | 'plus') => {
    const isActive = restaurant.subscription_plan === plan;
    const isAuthorized = restaurant.subscription_status === 'authorized' || restaurant.subscription_status === 'active';
    const isCancelled = restaurant.subscription_status === 'cancelled'; // <--- DETECTAMOS CANCELACIÓN
    const colorClass = plan === 'light' ? 'bg-black' : plan === 'go' ? 'bg-blue-600' : 'bg-emerald-600';

    if (isActive) {
      // SI EL PLAN ESTÁ CANCELADO PERO ES EL QUE TIENE ELEGIDO
      if (isCancelled) {
        return (
          <button 
            onClick={() => handleGoToPayment(plan)} 
            className="w-full py-3 rounded-2xl font-black text-[10px] uppercase bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg animate-pulse"
          >
            Reactivar Plan ⚡
          </button>
        );
      }

      if (isAuthorized) {
        return (
          <div className={`${plan === 'light' ? 'bg-green-50' : 'bg-blue-50'} p-3 rounded-2xl flex items-center justify-center gap-2 border border-current opacity-70`}>
            <Check size={14} className="text-green-600" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Suscripción al día</span>
          </div>
        );
      }
      
      return (
        <button onClick={() => handleGoToPayment(plan)} disabled={processingPlan === plan} className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase text-white ${colorClass} hover:opacity-90 transition-all`}>
          {processingPlan === plan ? <Loader2 className="animate-spin mx-auto" size={16}/> : (restaurant.subscription_status === 'trialing' ? 'Configurar Pago' : 'PAGAR')}
        </button>
      );
    }

    return (
      <button onClick={() => handleActivateTrial(plan)} disabled={processingPlan !== null} className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase border-2 border-gray-100 hover:border-black transition-all`}>
        {restaurant.subscription_plan ? 'Cambiar a este plan' : 'Activar 14 días gratis'}
      </button>
    );
  };
  const getTrialStatus = () => {
    if (!restaurant.created_at || restaurant.subscription_status === 'active' || restaurant.subscription_status === 'authorized') return null;
    
    const start = new Date(restaurant.created_at);
    const today = new Date();
    const diff = today.getTime() - start.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1; // +1 para que el primer día sea "Día 1"
    
    return days > 14 ? 14 : days;
};

const trialDay = getTrialStatus();
const isTrialing = restaurant.subscription_status === 'trialing' || !restaurant.subscription_plan;

  if (loading) return <div className="flex h-[80vh] w-full items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={40} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 px-4 pt-24 md:pt-10 animate-in fade-in duration-500">
      {/* --- CAPA SPOTLIGHT (Solo sombra y botón de cerrar) --- */}
      {showHighlight && (
        <div 
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm animate-in fade-in duration-500 cursor-pointer"
          onClick={() => setShowHighlight(false)}
        >
          {/* Botón de cerrar flotante */}
          <div className="absolute top-10 right-10 flex flex-col items-center gap-2 text-white/50 hover:text-white transition-all">
             <X size={40} strokeWidth={1} />
             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Cerrar</span>
          </div>
        </div>
      )}
     {/* HEADER ACTUALIZADO */}
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div className="text-left">
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-sm text-gray-500 font-medium italic">Los cambios se guardan automáticamente</p>
        {isTrialing && trialDay !== null && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-tighter border border-indigo-100">
                <Clock size={10} /> Día {trialDay} de 14 gratis
            </span>
        )}
      </div>
    </div>
</div>

   {/* SECCIÓN PLANES (ACORDEÓN PERFECTO + TOOLTIPS) */}
{/* SECCIÓN PLANES (ACORDEÓN INDEPENDIENTE + FIX DE ALTURA) */}
<section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
    
    {/* --- PLAN LIGHT --- */}
    <div className={`p-6 rounded-[2.5rem] border-2 flex flex-col transition-all bg-white relative ${restaurant.subscription_plan === 'light' ? 'border-black shadow-lg' : 'border-gray-100'}`}>
        <div className="flex justify-between items-start mb-4 text-left">
            <div>
                <h3 className="font-bold text-gray-400 text-[9px] uppercase tracking-widest leading-none">Para empezar</h3>
                <p className="text-2xl font-black text-gray-900 mt-1">Light <span className="text-xs text-gray-400 font-bold">$10.000</span></p>
            </div>
            {restaurant.subscription_plan === 'light' && <span className="bg-black text-white text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Activo</span>}
        </div>

        <ul className="space-y-2 mb-4">
            <li className="flex gap-2 text-[10px] font-bold text-gray-600"><Check size={12} className="text-green-500 shrink-0"/> 15 Productos</li>
            <li className="flex items-start gap-2 text-[10px] font-bold text-gray-600 group relative cursor-help">
              <Check size={12} className="text-green-500 shrink-0 mt-0.5"/> 
              <div className="flex items-center gap-1">
                <span>Snapplink (2 links)</span>
                <HelpCircle size={10} className="text-gray-300" />
                <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-gray-900 text-white text-[9px] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-medium">
                  Un solo link para tu bio con botones directos a tu <b>Menú y WhatsApp</b>.
                </div>
              </div>
            </li>

            {expandedPlan === 'light' && (
                <div className="pt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-green-500 shrink-0"/> Código QR propio</li>
                    <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-green-500 shrink-0"/> Horarios de Atención</li>
                    <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-green-500 shrink-0"/> Pedidos a WhatsApp</li>
                </div>
            )}
        </ul>

        <button 
            onClick={() => setExpandedPlan(expandedPlan === 'light' ? null : 'light')}
            className="mb-4 text-[9px] font-black uppercase text-gray-400 hover:text-black transition-colors flex items-center justify-center gap-1"
        >
            {expandedPlan === 'light' ? '- Ver menos' : '+ Ver detalles'}
        </button>
        {renderPlanButton('light')}
    </div>

    {/* --- PLAN GO --- */}
    <div className={`p-6 rounded-[2.5rem] border-2 flex flex-col transition-all bg-white relative ${restaurant.subscription_plan === 'go' ? 'border-blue-500 shadow-lg' : 'border-blue-50'}`}>
        <div className="flex justify-between items-start mb-4 text-left">
            <div>
                <h3 className="font-bold text-blue-500 text-[9px] uppercase tracking-widest leading-none">Más Potencia</h3>
                <p className="text-2xl font-black text-gray-900 mt-1">GO <span className="text-xs text-gray-400 font-bold">$16.900</span></p>
            </div>
            {restaurant.subscription_plan === 'go' && <span className="bg-blue-600 text-white text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Activo</span>}
        </div>

        <ul className="space-y-2 flex-1 mb-4">
            <li className="flex gap-2 text-[10px] font-bold text-gray-700"><Zap size={12} className="text-blue-500 shrink-0"/> 60 Productos</li>
            
            <li className="flex items-start gap-2 text-[10px] font-bold text-gray-700 group relative cursor-help">
              <Check size={12} className="text-blue-500 shrink-0 mt-0.5"/> 
              <div className="flex items-center gap-1">
                <span>Imágenes o Videos 🎥</span>
                <HelpCircle size={10} className="text-gray-300" />
                <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-gray-900 text-white text-[9px] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-medium border border-white/10">
                  Subí <b>videos cortos</b> de tus platos para vender más.
                </div>
              </div>
            </li>

            {expandedPlan === 'go' && (
                <div className="pt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-blue-500 shrink-0"/> Snapplink (4 links)</li>
                    <li className="flex items-start gap-2 text-[10px] font-medium text-gray-500 group relative cursor-help">
                        <Check size={12} className="text-blue-500 shrink-0 mt-0.5"/>
                        <div className="flex items-center gap-1">
                          <span>Descuentos por monto</span>
                          <HelpCircle size={10} className="text-gray-300"/>
                        </div>
                        <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-gray-900 text-white text-[9px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-2xl">
                            Ej: "Envío gratis si superan $20.000". Automático para el cliente.
                        </div>
                    </li>
                    <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-blue-500 shrink-0"/> Seguimiento en Vivo</li>
                    <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-blue-500 shrink-0"/> Gestión de Cupones</li>
                </div>
            )}
        </ul>

        <button 
            onClick={() => setExpandedPlan(expandedPlan === 'go' ? null : 'go')}
            className="mb-4 text-[9px] font-black uppercase text-gray-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1"
        >
            {expandedPlan === 'go' ? '- Ver menos' : '+ Ver detalles'}
        </button>
        {renderPlanButton('go')}
    </div>

    {/* --- PLAN PLUS --- */}
    <div className={`p-6 rounded-[2.5rem] border-2 flex flex-col transition-all bg-white relative ${restaurant.subscription_plan === 'plus' ? 'border-emerald-500 shadow-lg' : 'border-emerald-50'}`}>
        <div className="flex justify-between items-start mb-4 text-left">
            <div>
                <h3 className="font-bold text-emerald-600 text-[9px] uppercase tracking-widest leading-none">Profesional ✨</h3>
                <p className="text-2xl font-black text-gray-900 mt-1">Plus <span className="text-xs text-gray-400 font-bold">$27.000</span></p>
            </div>
            {restaurant.subscription_plan === 'plus' && <span className="bg-emerald-600 text-white text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Activo</span>}
        </div>

        <ul className="space-y-2 mb-4">
            <li className="flex gap-2 text-[10px] font-bold text-gray-700"><Zap size={12} className="text-emerald-500 shrink-0"/> Productos Ilimitados</li>
            <li className="flex gap-2 text-[10px] font-bold text-gray-700"><Check size={12} className="text-emerald-500 shrink-0"/> Panel Pro y Caja</li>
            
            {expandedPlan === 'plus' && (
                <div className="pt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <li className="flex items-start gap-2 text-[10px] font-medium text-gray-500 group relative cursor-help">
                      <Check size={12} className="text-emerald-500 shrink-0 mt-0.5"/> 
                      <div className="flex items-center gap-1">
                        <span>Snapplink Ilimitado</span>
                        <HelpCircle size={10} className="text-gray-300" />
                        <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-gray-900 text-white text-[9px] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-medium">
                          Sin límites: Redes, Web, Reservas y más.
                        </div>
                      </div>
                    </li>
                    <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-emerald-500 shrink-0"/> 2 Sucursales (PRÓX.)</li>
                    <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-emerald-500 shrink-0"/> Tickets y Comandas</li>
                    <li className="flex gap-2 text-[10px] font-medium text-gray-500"><Check size={12} className="text-emerald-500 shrink-0"/> Gestión de Mesas</li>
                </div>
            )}
        </ul>

        <button 
            onClick={() => setExpandedPlan(expandedPlan === 'plus' ? null : 'plus')}
            className="mb-4 text-[9px] font-black uppercase text-gray-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1"
        >
            {expandedPlan === 'plus' ? '- Ver menos' : '+ Ver detalles'}
        </button>
        {renderPlanButton('plus')}
    </div>

    {/* --- PLAN MAX (FIXED PARA QUE NO SE ESTIRE) --- */}
    <div className="p-6 rounded-[2.5rem] border-2 border-dashed border-gray-100 bg-gray-50/50 flex flex-col relative overflow-hidden transition hover:shadow-2xl">
        <div className="absolute top-3 -right-8 bg-gray-100 text-gray-400 text-[7px] font-black px-10 py-1 rotate-45 uppercase tracking-widest border-b border-gray-200">
            Próximamente
        </div>

        <div className="flex justify-between items-start mb-4 text-left">
            <div>
                <h3 className="font-bold text-purple-600 text-[9px] uppercase tracking-widest leading-none">Escalabilidad</h3>
                <div className="text-2xl font-black text-gray-900 mt-1 flex items-center gap-2">
                    Max 
                    <span className="text-sm text-gray-300 font-bold blur-[5px] select-none">$28.600</span>
                </div>
            </div>
        </div>

        <ul className="space-y-2 mb-4">
            <li className="flex gap-2 text-[10px] font-bold text-gray-500"><Check size={12} className="text-purple-400 shrink-0"/> 4 Sucursales</li>
            <li className="flex items-start gap-2 text-[10px] font-bold text-gray-500 group relative cursor-help">
              <Check size={12} className="text-purple-400 shrink-0 mt-0.5"/> 
              <div className="flex items-center gap-1">
                <span>Billeteras Virtuales</span>
                <HelpCircle size={10} className="text-gray-300" />
                <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-gray-900 text-white text-[9px] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-medium">
                  Cobra directo con <b>Mercado Pago y Ualá</b>.
                </div>
              </div>
            </li>

            {expandedPlan === 'max' && (
                <div className="pt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <li className="flex items-start gap-2 text-[10px] font-medium text-gray-400 group relative cursor-help">
                      <Check size={12} className="text-purple-300 shrink-0 mt-0.5"/> 
                      <div className="flex items-center gap-1">
                        <span>Envíos por Rango</span>
                        <HelpCircle size={10} className="text-gray-300" />
                        <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-gray-900 text-white text-[9px] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-medium">
                          Costo de envío exacto por radio (km).
                        </div>
                      </div>
                    </li>
                    <li className="flex gap-2 text-[10px] font-medium text-gray-400"><Check size={12} className="text-purple-300 shrink-0"/> Snapplink Premium</li>
                    <li className="flex gap-2 text-[10px] font-medium text-gray-400"><Check size={12} className="text-purple-300 shrink-0"/> Soporte VIP 24/7</li>
                </div>
            )}
        </ul>

        <button 
            onClick={() => setExpandedPlan(expandedPlan === 'max' ? null : 'max')}
            className="mb-4 text-[9px] font-black uppercase text-gray-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-1"
        >
            {expandedPlan === 'max' ? '- Ver menos' : '+ Ver detalles'}
        </button>
        <button disabled className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-black uppercase text-[9px] tracking-widest border border-gray-200">Próximamente</button>
    </div>
</section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
         <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
    <h2 className="font-bold text-xl mb-6">Mis Datos</h2>
    <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
            <div className="text-left">
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Nombre</label>
                <input value={profile.first_name} onChange={(e) => updateProfile('first_name', e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 ring-black/5" />
            </div>
            <div className="text-left">
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Apellido</label>
                <input value={profile.last_name} onChange={(e) => updateProfile('last_name', e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 ring-black/5" />
            </div>
        </div>
        
        <div className="text-left">
            <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-widest">WhatsApp Personal</label>
            <input 
                id="phone-input"
                value={profile.phone} 
                onChange={(e) => updateProfile('phone', e.target.value)} 
                placeholder="Ej: 11 1234 5678"
                className={`w-full p-4 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none transition-all duration-500 ${
                  showHighlight 
                  ? 'relative z-[110] ring-4 ring-blue-500 scale-[1.05] bg-white shadow-2xl' 
                  : 'focus:ring-2 ring-black/5'
                }`} 
            />
        </div>

        <div className="text-left">
            <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Correo de Acceso</label>
            <input value={profile.email} disabled className="w-full p-3 bg-gray-100 border-none rounded-xl text-sm font-bold text-gray-400 cursor-not-allowed outline-none" />
        </div>

        <div className="pt-4 flex flex-col gap-3">
            <button onClick={handlePasswordReset} className="w-full py-3 text-[10px] font-black text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition tracking-widest uppercase">
                Cambiar Contraseña
            </button>
            
            <button onClick={handleLogout} className="md:hidden w-full py-3 text-[10px] font-black text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2 tracking-widest uppercase">
                <LogOut size={16}/> Cerrar sesión
            </button>

            {/* --- ZONA 1: CANCELAR SUSCRIPCIÓN (AMBER) --- */}
        {restaurant.subscription_plan && (
                <div className={`mt-4 p-5 border rounded-[1.5rem] text-left animate-in fade-in slide-in-from-top-2 duration-500 ${restaurant.subscription_status === 'cancelled' ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-100'}`}>
                    <div className={`flex items-center gap-2 mb-2 ${restaurant.subscription_status === 'cancelled' ? 'text-orange-700' : 'text-amber-800'}`}>
                        {restaurant.subscription_status === 'cancelled' ? <AlertTriangle size={16} /> : <Clock size={16} />}
                        <span className="text-[11px] font-black uppercase tracking-tighter">
                            {restaurant.subscription_status === 'cancelled' ? 'Suscripción en proceso de baja' : 'Gestionar Suscripción'}
                        </span>
                    </div>
                    
                    <p className={`text-[10px] font-bold leading-relaxed mb-4 ${restaurant.subscription_status === 'cancelled' ? 'text-orange-800' : 'text-amber-700'}`}>
                        {restaurant.subscription_status === 'cancelled' 
                            ? `Ya solicitaste la cancelación. Tu menú seguirá online hasta el ${getChargeDate()}. Después de esa fecha, el link público se pausará automáticamente.`
                            : `Si cancelas hoy, tu menú seguirá activo hasta el ${getChargeDate()}. Guardaremos tus productos y configuración por 6 meses por si decides volver.`
                        }
                    </p>

                    {restaurant.subscription_status === 'cancelled' ? (
                        <button 
                            onClick={() => handleGoToPayment(restaurant.subscription_plan)}
                            className="w-full py-3 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-orange-700 transition shadow-md active:scale-95"
                        >
                            Reactivar mi suscripción ahora
                        </button>
                    ) : (
                        <button 
                            onClick={handleCancelSubscription}
                            className="w-full py-3 bg-white border border-amber-200 text-amber-700 rounded-xl text-[10px] font-black uppercase hover:bg-amber-100 transition shadow-sm active:scale-95"
                        >
                            Cancelar suscripción solamente
                        </button>
                    )}
                </div>
            )}

            {/* --- ZONA 2: ELIMINAR CUENTA (RED) --- */}
            <div className="mt-4 p-5 bg-red-50 border border-red-100 rounded-[1.5rem] text-left">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                    <Trash2 size={16} />
                    <span className="text-[11px] font-black uppercase tracking-tighter text-red-600">Eliminar Cuenta</span>
                </div>
                <p className="text-[10px] text-red-700 font-bold leading-relaxed mb-4">
                    Esta es una acción final. Se cancelará tu plan y se <b>borrarán todos tus datos de forma inmediata</b> (menú, link, productos y estadísticas). No podrás recuperar la información.
                </p>
                <button 
                    onClick={handleDeleteAccount} 
                    className="w-full py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-red-700 transition active:scale-95"
                >
                    Eliminar mi cuenta definitivamente
                </button>
            </div>
        </div>
    </div>
</section>
        </div>

        <div className="lg:col-span-8">
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => setShowHours(!showHours)} className="w-full p-8 flex justify-between items-center bg-white hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-3 rounded-2xl text-green-600"><Clock size={24}/></div>
                      <div className="text-left"><h2 className="font-bold text-xl text-gray-900">Horarios de Atención</h2><p className="text-xs text-gray-400 font-medium italic">Se guarda automáticamente</p></div>
                    </div>
                    {showHours ? <ChevronUp className="text-gray-400"/> : <ChevronDown className="text-gray-400"/>}
                </button>
                
              {showHours && (
  /* Agregamos 'relative' al contenedor para que el cartel de bloqueo se ubique bien */
  <div className="p-8 pt-0 animate-in slide-in-from-top-4 duration-300 relative">
    
    {/* --- LÓGICA DE BLOQUEO VISUAL --- */}
    {restaurant.subscription_plan !== 'light' && restaurant.always_open && (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-[2.5rem] p-6">
        <div className="bg-gray-900 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-white/10">
          <div className="bg-amber-500 p-2 rounded-xl text-black">
            <AlertTriangle size={20} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-black uppercase tracking-tight italic">Horarios Bloqueados</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase leading-tight">
              Desactiva el modo "Siempre Abierto" <br/> en el inicio para poder editar.
            </span>
          </div>
        </div>
      </div>
    )}

    {/* Agregamos la lógica para que el grid se vea gris y no sea clickeable si always_open es true */}
   <div className={`grid grid-cols-1 xl:grid-cols-2 gap-6 transition-all duration-500 ${restaurant.subscription_plan !== 'light' && restaurant.always_open ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
        {DAYS.map((day) => {
            const dayData = restaurant.business_hours?.[day.key] || {};
            const { isOpen, isSplit, open, close, open2, close2 } = dayData;
            return (
                <div key={day.key} className={`border-2 rounded-[2rem] p-6 transition-all duration-300 ${isOpen ? 'border-green-100 bg-white' : 'border-gray-50 bg-gray-50/50'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className="font-black text-gray-800 capitalize text-lg">{day.label}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={isOpen || false} onChange={(e) => updateHour(day.key, 'isOpen', e.target.checked)} />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                    </div>
                    {isOpen ? (
                        <div className="mt-6 space-y-4 animate-in zoom-in-95">
                            <div className="flex flex-wrap items-center gap-2">
                                <input type="time" value={open || '09:00'} onChange={(e) => updateHour(day.key, 'open', e.target.value)} className="flex-1 min-w-[100px] p-3 bg-gray-50 border-none rounded-xl text-sm font-black text-center" />
                                <span className="font-bold text-gray-300">a</span>
                                <input type="time" value={close || '23:00'} onChange={(e) => updateHour(day.key, 'close', e.target.value)} className="flex-1 min-w-[100px] p-3 bg-gray-50 border-none rounded-xl text-sm font-black text-center" />
                            </div>
                            {isSplit && (
                                <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-1 border-t border-dashed pt-4">
                                    <input type="time" value={open2 || '17:00'} onChange={(e) => updateHour(day.key, 'open2', e.target.value)} className="flex-1 min-w-[100px] p-3 bg-gray-50 border-none rounded-xl text-sm font-black text-center" />
                                    <span className="font-bold text-gray-300">a</span>
                                    <input type="time" value={close2 || '23:00'} onChange={(e) => updateHour(day.key, 'close2', e.target.value)} className="flex-1 min-w-[100px] p-3 bg-gray-50 border-none rounded-xl text-sm font-black text-center" />
                                </div>
                            )}
                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" checked={isSplit || false} onChange={(e) => updateHour(day.key, 'isSplit', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Doble Turno</span>
                                </label>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[10px] text-center text-gray-300 py-4 font-bold uppercase tracking-widest italic">Cerrado</p>
                    )}
                </div>
            );
        })}
    </div>
  </div>
)}
            </section>
        </div>
      </div>
      {/* --- MODAL DE PLAN ACTIVADO EXITOSAMENTE --- */}
{showPlanSuccessModal && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
      {/* Decoración de fondo */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-100 rounded-full opacity-50 blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3 shadow-lg">
          <Zap size={40} fill="currentColor" />
        </div>
        
        <h3 className="text-3xl font-black text-gray-900 mb-2 leading-tight uppercase italic tracking-tighter">
          ¡Plan Activado!
        </h3>
        
        <p className="text-gray-500 text-sm mb-8 font-medium leading-relaxed">
          ¡Genial! Tu prueba de <span className="text-emerald-600 font-bold">14 días gratis</span> ya está activa. 🚀 <br/><br/>
          Ahora, para terminar la configuración, elegí el rubro de tu negocio.
        </p>

      <button 
  onClick={() => {
    window.dispatchEvent(new Event('profile-updated')); 
    // Si ya completó el onboarding antes, lo mandamos a la galería directo (sin pantalla blanca)
    // Si es nuevo, lo mandamos a elegir rubro
    router.push('/dashboard/templates');
  }}
  className="w-full bg-black text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
>
  {restaurant?.onboarding_completed ? 'Ir a mis plantillas' : 'Elegir mi rubro'} <ArrowRight size={18} />
</button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={40} /></div>}>
      <SettingsContent />
    </Suspense>
  );
}