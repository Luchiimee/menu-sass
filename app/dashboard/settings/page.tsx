'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner'; 
import { 
  Loader2, Save, User, Clock, CreditCard, Lock, Check, Zap, Tag, 
  CalendarDays, Mail, AlertTriangle, LogOut, Trash2, MessageCircle,
  QrCode, Smartphone, BarChart3, Bell, Globe, ChevronDown, ChevronUp, Layout, Store,ArrowRight,Phone, X
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

 const handleDeleteAccount = async () => {
    const confirm1 = confirm("⚠️ ¿ESTÁS SEGURO?\n\nAl eliminar tu cuenta se borrará tu menú, tus productos y se CANCELARÁ cualquier suscripción activa de forma permanente.");
    if (!confirm1) return;

    const confirm2 = confirm("ESTA ACCIÓN NO SE PUEDE DESHACER. ¿Eliminar definitivamente?");
    if (!confirm2) return;

    setLoading(true); // Usamos el loader para que no toque nada mientras borramos
    try {
        const response = await fetch('/api/user/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        if (response.ok) {
            toast.success("Cuenta eliminada con éxito");
            await supabase.auth.signOut();
            router.push('/login');
        } else {
            throw new Error("Error en el servidor");
        }
    } catch (error: any) { 
        toast.error("No se pudo eliminar la cuenta por completo. Contactate con soporte."); 
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
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, { redirectTo: `${window.location.origin}/dashboard/settings` });
      if (error) toast.error("Error");
      else toast.success("Email enviado");
  };

// --- ACTIVAR TRIAL 14 DÍAS (CORREGIDO PARA NO RESETEAR RUBRO) ---
const handleActivateTrial = async (planType: 'light' | 'plus') => {
  if (!validatePhone()) return;
  if (!userId) return;
  setProcessingPlan(planType);
  
  // 1. Detectamos si ya tiene un pago confirmado
  const isSubscribed = restaurant.subscription_status === 'active' || restaurant.subscription_status === 'authorized';
  const isChangingPlan = !!restaurant.subscription_plan;

  try {
    const autoSlug = `snappy-${Math.random().toString(36).substring(2, 7)}`;

    const { data, error } = await supabase
      .from('restaurants')
      .upsert({ 
        user_id: userId, 
        subscription_plan: planType,
        
        // --- LA LLAVE MAESTRA ---
        // Si ya está activo, NO lo volvemos a 'trialing'. Mantenemos su estado para que no se bloquee.
        subscription_status: isSubscribed ? restaurant.subscription_status : 'trialing',
        
        // Mantenemos la fecha de creación del trial original si ya existe
        trial_start_date: restaurant?.trial_start_date || new Date().toISOString(),
        
        name: restaurant?.name || 'Mi Restaurante',
        slug: restaurant?.slug || autoSlug,
        
        // Colores y Configuración
        template_id: 'classic',
        theme_color: '#d32f2f',
        bg_color: '#ffffff',
        text_color: '#ffffff',
        description_color: '#ffffff',
        promo_bg_color: '#ffebee',
        promo_text_color: '#d32f2f',
        card_name_color: '#000000',
        card_price_color: '#d32f2f',
        card_btn_bg: '#ffffff',
        card_btn_text: '#000000',
        card_color: '#ffffff',
        
        onboarding_completed: restaurant?.onboarding_completed || false 
      }, {
        onConflict: 'user_id' 
      })
      .select()
      .single();

    if (error) throw error;
    
    if (data) {
      setRestaurant(data);
      
      // Avisamos al Layout para que actualice la vista de inmediato
      window.dispatchEvent(new Event('profile-updated')); 
if (isChangingPlan) {
        // Calculamos la fecha para el mensaje
        const fechaCobro = getChargeDate();
        
        // Mensaje detallado para evitar reclamos a soporte
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm">Plan cambiado a {planType.toUpperCase()}</span>
            <span className="text-[10px] opacity-80 leading-tight">
              El nuevo monto se verá reflejado en tu próximo cobro el día {fechaCobro}.
            </span>
          </div>, 
          { duration: 5000, icon: '🚀' }
        );
      } else {
        // Si es la primera vez (usuario nuevo), mostramos el modal de bienvenida
        setShowPlanSuccessModal(true);
      }
    }
  } catch (error: any) { 
    console.error("Error al activar:", error.message);
    toast.error("No se pudo actualizar el plan. Intenta de nuevo."); 
  } finally { 
    setProcessingPlan(null); 
  }
};
  // --- MERCADO PAGO ---
  const handleGoToPayment = async (planType: 'light' | 'plus') => {
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
      } catch (error) { toast.error("Error"); } finally { setProcessingPlan(null); }
  };

  const getChargeDate = () => {
    const dateBase = restaurant.created_at ? new Date(restaurant.created_at) : new Date();
    const chargeDate = new Date(dateBase);
    chargeDate.setDate(dateBase.getDate() + 14);
    return chargeDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  };

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
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
            <p className="text-sm text-gray-500 font-medium italic">Los cambios se guardan automáticamente</p>
          </div>
      </div>

      {/* SECCIÓN PLANES */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
          
          {/* LIGHT */}
        <div className={`p-8 rounded-[2rem] border-2 flex flex-col transition-all bg-white relative ${restaurant.subscription_plan === 'light' ? 'border-black shadow-lg' : 'border-gray-100'}`}>
    
    {/* REEMPLAZO DESDE ACÁ: Este div organiza el título y el badge para que no se tapen */}
    <div className="flex justify-between items-start mb-6">
        <div>
            <h3 className="font-bold text-gray-400 text-[10px] uppercase tracking-widest text-left">Para empezar</h3>
            <p className="text-3xl font-black text-gray-900 mt-1">Light <span className="text-xl text-gray-400 font-bold">$7.400<small>/mes</small></span></p>
        </div>
        {restaurant.subscription_plan === 'light' && (
            <span className="bg-black text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shrink-0">
                Plan Activo
            </span>
        )}
    </div>
              <ul className="space-y-3 flex-1 mb-8">
                  <li className="flex gap-3 text-xs font-bold text-gray-600"><Check size={16} className="text-green-500 shrink-0"/> Hasta 15 Productos</li>
                  <li className="flex gap-3 text-xs font-bold text-gray-600"><Check size={16} className="text-green-500 shrink-0"/> Catálogo Digital Interactivo</li>
                  <li className="flex gap-3 text-xs font-bold text-gray-600"><Check size={16} className="text-green-500 shrink-0"/> Pedidos directos a WhatsApp</li>
                  <li className="flex gap-3 text-xs font-bold text-gray-600"><Check size={16} className="text-green-500 shrink-0"/> Mostrar Alias para Transferencias</li>
                  <li className="flex gap-3 text-xs font-bold text-gray-600"><Check size={16} className="text-green-500 shrink-0"/> Dominio Personalizable</li>
              </ul>

         {restaurant.subscription_plan === 'light' ? (
  <div className="space-y-3">
   {(restaurant.subscription_status === 'authorized' || restaurant.subscription_status === 'active') ? (
  <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex flex-col items-center gap-1 animate-in zoom-in-95">
    <div className="bg-green-500 text-white p-1 rounded-full">
      <Check size={14} strokeWidth={4} />
    </div>
    <p className="text-[10px] font-black text-green-700 uppercase tracking-tighter">Suscripción Activa</p>
    <p className="text-[9px] text-green-600/70 font-bold italic">Tu plan está al día</p>
  </div>
) : (
  <>
    <button 
      onClick={() => handleGoToPayment('light')} 
      disabled={processingPlan === 'light'}
      className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-black text-white hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
    >
      {processingPlan === 'light' ? <Loader2 className="animate-spin" size={16}/> : 
       (restaurant.subscription_status === 'trialing' ? 'Configurar Pago' : 'PAGAR')}
    </button>
    <p className="text-[10px] text-gray-400 text-center font-bold italic uppercase tracking-tighter">
      {restaurant.subscription_status === 'trialing' ? `Se debita el: ${getChargeDate()}` : 'Cobro inmediato'}
    </p>
  </>
)}
  </div>
) : (
  <button 
  onClick={() => handleActivateTrial('light')} 
  disabled={processingPlan !== null}
  className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-gray-100 text-gray-900 hover:bg-black hover:text-white transition-all disabled:opacity-50"
>
  {/* Si tiene plan dice "Cambiar Plan", si no tiene nada dice "Activar 14 días" */}
  {restaurant.subscription_plan ? 'Cambiar Plan' : 'Activar 14 días gratis'}
</button>
)}
          </div>

         
       {/* --- PLAN PLUS --- */}
<div className={`p-8 rounded-[2rem] border-2 flex flex-col transition-all bg-white relative shadow-2xl scale-100 xl:scale-105 z-10 border-blue-500`}>
    
    {/* ENCABEZADO CORREGIDO: Organiza Profesional, Plus y el Badge sin solaparse */}
    <div className="flex justify-between items-start mb-6">
        <div className="text-left">
            <h3 className="font-bold text-blue-500 text-[10px] uppercase tracking-widest">Profesional ✨</h3>
            <p className="text-4xl font-black text-gray-900 mt-1">Plus <span className="text-xl text-gray-400 font-bold">$15.900</span></p>
        </div>
        {restaurant.subscription_plan === 'plus' && (
            <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shrink-0">
                Plan Activo
            </span>
        )}
    </div>

    <ul className="space-y-3 flex-1 mb-8">
        <li className="flex gap-3 text-xs font-extrabold text-gray-700"><Zap size={16} className="text-blue-500 shrink-0"/> Productos Ilimitados</li>
        <li className="flex gap-3 text-xs font-bold text-gray-600"><Check size={16} className="text-blue-500 shrink-0"/> Todo lo del plan Light</li>
        <li className="flex gap-3 text-xs font-bold text-gray-600"><Check size={16} className="text-blue-500 shrink-0"/> Seguimiento de Pedido en Vivo ✨</li>
        <li className="flex gap-3 text-xs font-bold text-gray-600"><Check size={16} className="text-blue-500 shrink-0"/> QR Inteligente 🚀</li>
        <li className="flex gap-3 text-xs font-bold text-gray-600"><Check size={16} className="text-blue-500 shrink-0"/> Panel de Comandas (Cocina)</li>
        <li className="flex gap-3 text-xs font-bold text-gray-600"><Check size={16} className="text-blue-500 shrink-0"/> Acceso a todas las plantillas</li>
    </ul>

 {restaurant.subscription_plan === 'plus' ? (
  <div className="space-y-3">
    {/* Misma lógica: Si no es authorized, puede configurar o pagar */}
    {restaurant.subscription_status === 'authorized' ? (
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex flex-col items-center gap-1 animate-in zoom-in-95">
        <div className="bg-blue-500 text-white p-1 rounded-full">
          <Check size={14} strokeWidth={4} />
        </div>
        <p className="text-[10px] font-black text-blue-700 uppercase tracking-tighter">Suscripción Activa</p>
        <p className="text-[9px] text-blue-600/70 font-bold italic">Tu plan está al día</p>
      </div>
    ) : (
      <>
        <button 
          onClick={() => handleGoToPayment('plus')} 
          disabled={processingPlan === 'plus'}
          className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
        >
          {processingPlan === 'plus' ? <Loader2 className="animate-spin" size={16}/> : 
           (restaurant.subscription_status === 'trialing' ? 'Configurar Pago' : 'PAGAR')}
        </button>
        <p className="text-[10px] text-blue-400 text-center font-bold italic uppercase tracking-tighter">
          {restaurant.subscription_status === 'trialing' ? `Se debita el: ${getChargeDate()}` : 'Cobro inmediato'}
        </p>
      </>
    )}
  </div>
) : (
  <button 
  onClick={() => handleActivateTrial('plus')} 
  disabled={processingPlan !== null}
  className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
>
  {restaurant.subscription_plan ? 'Cambiar a este plan' : 'Activar 14 días gratis'}
</button>
)}
</div>
          {/* MAX */}
        <div className="p-8 rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col opacity-70">
    <div className="mb-6 text-center">
        <h3 className="font-bold text-purple-600 text-[10px] uppercase tracking-widest">Escalabilidad</h3>
        
        {/* Cambiamos <p> por <div> para evitar el error de hidratación */}
        <div className="text-3xl font-black text-gray-900 mt-1 flex items-center justify-center gap-2">
            Max 
            <div className="relative inline-flex items-center">
                {/* El precio con un blur de 6px que lo hace ilegible pero con estilo */}
                <span className="text-xl text-gray-400 font-bold select-none blur-[6px] tracking-tight">
                    $28.600
                </span>
                
                {/* Capa de brillo opcional para dar efecto de 'vidrio' por encima */}
                <div className="absolute inset-0 bg-white/10 rounded-md pointer-events-none border border-white/20"></div>
            </div>
        </div>
    </div>

    <ul className="space-y-3 flex-1 mb-8">
        <li className="flex gap-3 text-xs font-bold text-gray-500"><Check size={16} className="text-purple-400 shrink-0"/> Todo lo del plan Plus</li>
        <li className="flex gap-3 text-xs font-bold text-gray-500"><Layout size={16} className="text-purple-400 shrink-0"/> Panel Pro para Caja</li>
        <li className="flex gap-3 text-xs font-bold text-gray-500"><CreditCard size={16} className="text-purple-400 shrink-0"/> Integración Mercado Pago</li>
        <li className="flex gap-3 text-xs font-bold text-gray-500"><Store size={16} className="text-purple-400 shrink-0"/> Gestión de hasta 2 sucursales</li>
    </ul>
    
    <button disabled className="w-full py-3.5 rounded-2xl font-black text-xs bg-gray-200 text-gray-400 cursor-not-allowed uppercase">
        Muy Pronto
    </button>
</div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
    <h2 className="font-bold text-xl mb-6">Mis Datos</h2>
    <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Nombre</label>
                <input value={profile.first_name} onChange={(e) => updateProfile('first_name', e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 ring-black/5" />
            </div>
            <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Apellido</label>
                <input value={profile.last_name} onChange={(e) => updateProfile('last_name', e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 ring-black/5" />
            </div>
        </div>
        
      <div className="relative"> {/* Contenedor relativo para posicionar la flecha */}
            <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-widest">
              WhatsApp Personal
            </label>
            
            {/* --- TEXTO GUÍA + FLECHA (Solo visible en spotlight) --- */}
            {showHighlight && (
              <div className="absolute -top-14 left-0 z-[120] animate-in slide-in-from-bottom-2 duration-500">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 whitespace-nowrap">
                  <span className="text-[11px] font-black uppercase tracking-tighter italic">Ingresá tu WhatsApp aquí</span>
                  <ArrowRight size={16} className="rotate-90 animate-bounce" />
                </div>
                {/* Triangulito de la burbuja */}
                <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-blue-600 ml-6"></div>
              </div>
            )}

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
            
            {showHighlight && (
               <p className="absolute -bottom-10 left-0 text-[10px] font-bold text-blue-400 uppercase tracking-widest z-[110] animate-pulse">
                  Dato necesario para soporte y actualizaciones
               </p>
            )}
        </div>

        {/* --- NUEVO CAMPO: CORREO ELECTRÓNICO --- */}
        <div>
            <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Correo Electrónico</label>
            <input 
                value={profile.email} 
                disabled 
                className="w-full p-3 bg-gray-100 border-none rounded-xl text-sm font-bold text-gray-400 cursor-not-allowed outline-none" 
                title="El correo no se puede cambiar ya que es tu identificador de acceso"
            />
        </div>

       <div className="pt-2 flex flex-col gap-3">
    <button onClick={handlePasswordReset} className="w-full py-3 text-xs font-bold text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition tracking-widest uppercase">
        Cambiar Contraseña
    </button>
    
    <button onClick={handleLogout} className="md:hidden w-full py-3 text-xs font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2 tracking-widest uppercase">
        <LogOut size={16}/> Cerrar sesión
    </button>

    {/* --- CARTEL DE AVISO DE CANCELACIÓN --- */}
    <div className="mt-4 p-4 bg-red-50/50 border border-red-100 rounded-2xl text-left">
        <p className="text-[11px] font-bold text-red-800 leading-relaxed">
            <span className="flex items-center gap-1.5 mb-1 uppercase tracking-tighter">
                <AlertTriangle size={14} /> ¿Deseas cancelar tu plan?
            </span>
            Al eliminar tu cuenta, tu suscripción en <b>Mercado Pago se cancelará automáticamente</b> y todos tus datos se borrarán de forma permanente.
        </p>
    </div>

    <button 
        onClick={handleDeleteAccount} 
        className="w-full py-3 text-[10px] font-black text-red-400 hover:text-red-600 transition flex items-center justify-center gap-2 uppercase tracking-widest"
    >
        <Trash2 size={14}/> Eliminar mi cuenta definitivamente
    </button>
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
    {restaurant.always_open && (
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
    <div className={`grid grid-cols-1 xl:grid-cols-2 gap-6 transition-all duration-500 ${restaurant.always_open ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
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