'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner'; 
import { 
  Loader2, Clock, Lock, Check, Mail, AlertTriangle, 
  LogOut, Trash2, ChevronDown, ChevronUp, X 
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
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showHours, setShowHours] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailUpdateLoading, setEmailUpdateLoading] = useState(false);
  const [profile, setProfile] = useState({ email: '' });
  const [restaurant, setRestaurant] = useState<any>({ id: null, business_hours: {}, subscription_plan: null });

 useEffect(() => {
    let mounted = true;

    const loadData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            
            setUserId(session.user.id);
            // ✅ Siempre usamos el mail que viene directamente del user de la sesión
            setProfile({ email: session.user.email || '' });

            const { data: restData } = await supabase
                .from('restaurants')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            if (mounted && restData) {
                setRestaurant({ ...restData, business_hours: restData.business_hours || {} });
            }
        } catch (error) { 
            console.error("Error:", error); 
        } finally { 
            if (mounted) setLoading(false); 
        }
    };

    loadData();

    // 🔥 LA CLAVE: Escuchar cambios en la sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
            loadData(); // Recarga los datos cuando Supabase confirma el cambio
        }
    });

    return () => { 
        mounted = false; 
        subscription.unsubscribe();
    };
}, []);
  // --- FUNCIONES DE CUENTA ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handlePasswordReset = async () => {
      if (!profile.email) return toast.error("No hay un correo asociado");
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, { 
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings/new-password` 
      });
      if (error) toast.error("Error al enviar el correo");
      else toast.success("¡Correo enviado! Revisá tu bandeja de entrada.");
  };

  const [isPending, setIsPending] = useState(false);

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === profile.email) return toast.error("Ingresá un email nuevo.");
    
    setEmailUpdateLoading(true);
    // Supabase envía el mail automáticamente al ejecutar esto
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    
    if (error) {
        toast.error(`Error: ${error.message}`);
    } else {
        // Mensaje corregido: Solo confirmar en el nuevo
        toast.success("Confirmá el link que enviamos a tu nuevo correo ✉️");
        setIsPending(true); // Activamos el estado de pendiente
        setIsEditingEmail(false);
    }
    setEmailUpdateLoading(false);
};

// Nueva función para reenviar
const handleResendEmail = () => {
    handleUpdateEmail(); // Simplemente volvemos a disparar la función
    toast.info("Link reenviado. Revisá el SPAM por las dudas.");
};

 const handleDeleteAccount = async () => {
    const confirm1 = confirm("⚠️ ¿ESTÁS SEGURO?\n\nSe borrará tu menú y se cancelará tu suscripción permanentemente.");
    if (!confirm1) return;
    
    const confirm2 = confirm("ESTA ACCIÓN ES IRREVERSIBLE.\n\n¿Realmente deseás eliminar absolutamente todos tus datos?");
    if (!confirm2) return;

    setLoading(true);
    try {
        const response = await fetch('/api/user/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        if (response.ok) {
            toast.success("Cuenta eliminada con éxito.");
            // Forzamos el cierre de sesión local y redirigimos
            await supabase.auth.signOut();
            router.push('/login');
        } else {
            throw new Error("Fallo en el servidor");
        }
    } catch (err) {
        toast.error("Hubo un error al intentar eliminar la cuenta.");
    } finally {
        setLoading(false);
    }
};
// --- FUNCIONES DE SUSCRIPCIÓN (Mercado Pago) ---
  const handleTogglePause = async () => {
    if (!restaurant.mp_preapproval_id) return;
    const isPausing = restaurant.subscription_status !== 'paused';
    
    const confirmMsg = isPausing 
      ? "⏸️ ¿PAUSAR COBROS?\n\nTu menú se ocultará y no se realizarán cobros hasta que lo reactives." 
      : "▶️ ¿REANUDAR COBROS?\n\nSe reactivará la visibilidad de tu menú y los cobros mensuales.";

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/mercadopago/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          mpPreapprovalId: restaurant.mp_preapproval_id, 
          pause: isPausing 
        })
      });

      if (res.ok) {
        toast.success(`Suscripción ${isPausing ? 'pausada' : 'reanudada'}`);
        window.location.reload();
      } else throw new Error();
    } catch (err) {
      toast.error("Error al procesar la solicitud");
      setLoading(false);
    }
  };

const handleCancelSubscription = async () => {
    if (!restaurant.mp_preapproval_id) return;
    
    const confirmMsg = "⚠️ ¿CANCELAR SUSCRIPCIÓN?\n\nTu tarjeta se desvinculará y no habrá nuevos cobros. Seguirás teniendo acceso al panel hasta que termine tu periodo actual.";
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
        // 1. Primero limpiamos el ID en Supabase para que el dashboard sepa que NO hay tarjeta
        const { error: dbError } = await supabase
            .from('restaurants')
            .update({ 
                mp_preapproval_id: null,
                // Mantenemos el status para que no se bloquee el acceso hoy
            })
            .eq('user_id', userId);

        if (dbError) throw dbError;

        // 2. Avisamos a la API para que Mercado Pago cancele el débito automático
        await fetch('/api/mercadopago/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, mpPreapprovalId: restaurant.mp_preapproval_id })
        });

        toast.success("Tarjeta desvinculada. Acceso activo hasta el vencimiento.");
        window.location.reload();

    } catch (err) {
        console.error("Error al cancelar:", err);
        toast.error("Error al procesar la cancelación");
    } finally {
        setLoading(false);
    }
};
  // --- FUNCIONES DE CAJA ---
  const handleCashCloseHour = async (value: string) => {
    setRestaurant((prev: any) => ({ ...prev, cash_close_hour: value }));
    const { error } = await supabase
      .from('restaurants')
      .update({ cash_close_hour: value })
      .eq('id', restaurant.id);
    if (!error) toast.success('Horario de caja guardado', { position: 'bottom-right', duration: 1000 });
  };

  const handleAutoCloseToggle = async () => {
    const newValue = !restaurant.cash_auto_close_enabled;
    setRestaurant((prev: any) => ({ ...prev, cash_auto_close_enabled: newValue }));
    const { error } = await supabase
      .from('restaurants')
      .update({ cash_auto_close_enabled: newValue })
      .eq('id', restaurant.id);
    if (!error) toast.success(
      newValue ? 'Cierre automático activado' : 'Cierre automático desactivado',
      { position: 'bottom-right', duration: 1000 }
    );
  };

  // --- FUNCIONES DE HORARIOS ---
  const updateHour = async (day: string, field: string, value: any) => {
      const updatedHours = {
          ...restaurant.business_hours,
          [day]: { ...(restaurant.business_hours[day] || {}), [field]: value }
      };
      setRestaurant((prev: any) => ({ ...prev, business_hours: updatedHours }));
      
      const { error } = await supabase.from('restaurants').update({ business_hours: updatedHours }).eq('id', restaurant.id);
      if (!error) toast.success('Horario guardado', { position: 'bottom-right', duration: 1000 });
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={40} /></div>;

// 🚀 Los horarios se bloquean si NO es Plan Light y el modo "Apertura Manual" está activo
const areHoursDisabled = restaurant.subscription_plan !== 'light' && restaurant.always_open;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 px-4 pt-24 md:pt-10 animate-in fade-in duration-500">
      
      <header className="text-left">
          <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Configuración del Local</h1>
          <p className="text-sm text-gray-500 font-medium italic">Gestioná los horarios de apertura y la seguridad de tu cuenta.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* --- COLUMNA IZQUIERDA: SEGURIDAD Y CUENTA --- */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
                <Lock size={20} className="text-blue-600" /> Seguridad
            </h2>
            
            <div className="space-y-6">
           <div className="text-left">
    <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-widest">Email de Acceso</label>
    
    {!isEditingEmail ? (
        <div className="space-y-3">
            {/* CARD DE INFORMACIÓN DEL CORREO */}
            <div className="p-4 bg-gray-50 rounded-[1.5rem] border border-gray-100 flex flex-col gap-3 relative overflow-hidden group">
                <div className="flex items-start gap-3 pr-2">
                    <div className="bg-white p-2 rounded-xl shadow-sm text-blue-600 shrink-0">
                        <Mail size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        {/* break-all asegura que el mail se vea completo aunque sea larguísimo */}
                        <span className="text-sm font-bold text-gray-800 break-all leading-tight">
                            {profile.email}
                        </span>
                        <div className="mt-2 flex items-center gap-2">
                            {isPending ? (
                                <span className="text-[7px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-md font-black animate-pulse uppercase tracking-tighter">
                                    Pendiente de Verificación
                                </span>
                            ) : (
                                <span className="text-[7px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter flex items-center gap-1">
                                    <Check size={8} /> Correo Activo
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* BOTÓN DE CAMBIO - POSICIONADO PARA NO ESTORBAR AL MAIL */}
                <div className="pt-2 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={() => setIsEditingEmail(true)} 
                        className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-tighter transition-all active:scale-95"
                    >
                        Cambiar Correo
                    </button>
                </div>
            </div>

            {/* AVISO DE REENVÍO (SOLO SI ESTÁ PENDIENTE) */}
            {isPending && (
                <div className="p-4 bg-amber-50/50 rounded-[1.5rem] border border-dashed border-amber-200 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[9px] text-amber-800 font-bold leading-tight uppercase tracking-tighter mb-3">
                        Revisá tu casilla nueva para confirmar el cambio y activar el nuevo acceso.
                    </p>
                    <button 
                        onClick={handleResendEmail}
                        className="text-[9px] font-black text-blue-600 uppercase underline decoration-2 underline-offset-4 hover:text-blue-800"
                    >
                        Reenviar link de confirmación
                    </button>
                </div>
            )}
        </div>
    ) : (
        <div className="space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-2">
                <input 
                    type="email" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)} 
                    placeholder="Nuevo correo electrónico" 
                    className="w-full p-4 bg-white border-2 border-blue-500 rounded-2xl text-sm font-bold outline-none shadow-lg shadow-blue-50" 
                />
                <div className="flex gap-2">
                    <button 
                        onClick={handleUpdateEmail} 
                        disabled={emailUpdateLoading} 
                        className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                    >
                        {emailUpdateLoading ? <Loader2 className="animate-spin mx-auto" size={14}/> : 'Confirmar nuevo email'}
                    </button>
                    <button 
                        onClick={() => setIsEditingEmail(false)} 
                        className="p-4 bg-gray-100 text-gray-400 rounded-2xl hover:text-red-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    )}
</div>

                <hr className="border-gray-50" />
{/* GESTIÓN DE SUSCRIPCIÓN (Solo si hay suscripción activa o pausada) */}
                {restaurant.mp_preapproval_id && (
                  <div className="space-y-3 pt-2">
                    <hr className="border-gray-50 mb-4" />
                    <label className="text-[9px] font-black text-gray-400 mb-1 block uppercase tracking-widest">Suscripción Snappy</label>
                    
                    <button 
                      onClick={handleTogglePause} 
                      className={`w-full py-3 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all ${
                        restaurant.subscription_status === 'paused'
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      }`}
                    >
                      {restaurant.subscription_status === 'paused' ? '▶️ Reanudar mi Plan' : '⏸️ Pausar mi Plan'}
                    </button>

                    <button 
                      onClick={handleCancelSubscription} 
                      className="w-full py-3 text-[10px] font-black text-red-400 bg-white border border-red-50 rounded-xl hover:bg-red-50 transition tracking-widest uppercase"
                    >
                      ❌ Cancelar Suscripción
                    </button>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                    <button onClick={handlePasswordReset} className="w-full py-3 text-[10px] font-black text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition tracking-widest uppercase">
                        Restablecer Contraseña
                    </button>
                    <button onClick={handleLogout} className="w-full py-3 text-[10px] font-black text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2 uppercase">
                        <LogOut size={16}/> Cerrar sesión
                    </button>
                </div>

                <div className="pt-4 border-t border-gray-50">
                    <button onClick={handleDeleteAccount} className="w-full py-3 text-[10px] font-black text-red-400 hover:text-red-600 transition tracking-widest uppercase flex items-center justify-center gap-2">
                        <Trash2 size={14} /> Eliminar Cuenta
                    </button>
                </div>
            </div>
          </section>
        </div>

        {/* --- COLUMNA DERECHA: HORARIOS + CAJA --- */}
        <div className="lg:col-span-8 space-y-6">
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => setShowHours(!showHours)} className="w-full p-8 flex justify-between items-center hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-3 rounded-2xl text-green-600"><Clock size={24}/></div>
                      <div className="text-left">
                        <h2 className="font-bold text-xl text-gray-900">Horarios de Atención</h2>
                        <p className="text-xs text-gray-400 font-medium italic">Los cambios se guardan automáticamente</p>
                      </div>
                    </div>
                    {showHours ? <ChevronUp className="text-gray-400"/> : <ChevronDown className="text-gray-400"/>}
                </button>
                
                {showHours && (
                  <div className="p-8 pt-0 animate-in slide-in-from-top-4 duration-300 relative">
                    {/* BLOQUEO SI ESTÁ EN MODO SIEMPRE ABIERTO */}
                    {restaurant.subscription_plan !== 'light' && restaurant.always_open && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-[2.5rem]">
                        <div className="bg-gray-900 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-white/10 mx-6">
                          <div className="bg-amber-500 p-2 rounded-xl text-black"><AlertTriangle size={20} /></div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-black uppercase italic">Horarios Desactivados</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Desactivá el modo "Siempre Abierto" <br/>en el Inicio para editar.</span>
                          </div>
                        </div>
                      </div>
                    )}

              
<div className={`grid grid-cols-1 xl:grid-cols-2 gap-6 transition-all duration-500 ${areHoursDisabled ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                        {DAYS.map((day) => {
                            const dayData = restaurant.business_hours?.[day.key] || {};
                            const { isOpen, isSplit, open, close, open2, close2 } = dayData;
                            return (
                                <div key={day.key} className={`border-2 rounded-[2rem] p-6 transition-all ${isOpen ? 'border-green-100 bg-white' : 'border-gray-50 bg-gray-50/50'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="font-black text-gray-800 capitalize text-lg">{day.label}</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
  type="checkbox" 
  className="sr-only peer" 
  checked={isOpen || false} 
  disabled={areHoursDisabled} // 🚀 BLOQUEO AQUÍ
  onChange={(e) => updateHour(day.key, 'isOpen', e.target.checked)} 
/>
                                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                        </label>
                                    </div>
                                    {isOpen ? (
                                       <div className="mt-6 space-y-4">
    {/* PRIMER TURNO */}
    <div className="flex items-center gap-2">
        <input 
            type="time" 
            value={open || '09:00'} 
            disabled={areHoursDisabled} 
            onChange={(e) => updateHour(day.key, 'open', e.target.value)} 
            className={`flex-1 p-3 bg-gray-50 rounded-xl text-sm font-black text-center ${areHoursDisabled ? 'opacity-40' : ''}`} 
        />
        <span className="font-bold text-gray-300">a</span>
        <input 
            type="time" 
            value={close || '23:00'} // 🚀 CORREGIDO: antes decía open
            disabled={areHoursDisabled} 
            onChange={(e) => updateHour(day.key, 'close', e.target.value)} // 🚀 CORREGIDO: antes decía open
            className={`flex-1 p-3 bg-gray-50 rounded-xl text-sm font-black text-center ${areHoursDisabled ? 'opacity-40' : ''}`} 
        />
    </div>

    {/* SEGUNDO TURNO (SI ESTÁ ACTIVO) */}
    {isSplit && (
        <div className="flex items-center gap-2 animate-in slide-in-from-top-1 border-t border-dashed pt-4">
            <input 
                type="time" 
                value={open2 || '17:00'} // 🚀 CORREGIDO: antes decía open
                disabled={areHoursDisabled} 
                onChange={(e) => updateHour(day.key, 'open2', e.target.value)} // 🚀 CORREGIDO: antes decía open
                className={`flex-1 p-3 bg-gray-50 rounded-xl text-sm font-black text-center ${areHoursDisabled ? 'opacity-40' : ''}`} 
            />
            <span className="font-bold text-gray-300">a</span>
            <input 
                type="time" 
                value={close2 || '23:00'} // 🚀 CORREGIDO: antes decía open
                disabled={areHoursDisabled} 
                onChange={(e) => updateHour(day.key, 'close2', e.target.value)} // 🚀 CORREGIDO: antes decía open
                className={`flex-1 p-3 bg-gray-50 rounded-xl text-sm font-black text-center ${areHoursDisabled ? 'opacity-40' : ''}`} 
            />
        </div>
    )}

    {/* CHECKBOX DOBLE TURNO */}
    <label className="flex items-center gap-2 cursor-pointer pt-2 group">
        <input 
            type="checkbox" 
            checked={isSplit || false} 
            disabled={areHoursDisabled} 
            onChange={(e) => updateHour(day.key, 'isSplit', e.target.checked)} 
            className="w-4 h-4 rounded border-gray-300 text-black" 
        />
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Doble Turno</span>
    </label>
</div>
                                    ) : <p className="text-[10px] text-center text-gray-300 py-4 font-bold uppercase tracking-widest italic">Cerrado</p>}
                                </div>
                            );
                        })}
                    </div>
                  </div>
                )}
            </section>

            {/* --- SECCIÓN: HORARIO DE CIERRE DE CAJA --- */}
            {restaurant.subscription_plan !== 'light' && (
              <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl text-gray-900">Horario de Cierre de Caja</h2>
                    <p className="text-xs text-gray-400 font-medium italic">
                      Define cuándo termina tu "día de caja" (independiente del horario del menú)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Hora de cierre
                    </label>
                    <input
                      type="time"
                      value={restaurant.cash_close_hour?.slice(0, 5) ?? '00:00'}
                      onChange={(e) => handleCashCloseHour(e.target.value)}
                      className="w-full p-4 bg-gray-50 rounded-2xl text-lg font-black text-gray-900 text-center border-2 border-transparent focus:border-amber-400 outline-none transition-colors"
                    />
                  </div>
                  <div className="flex-1 bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Ejemplo</p>
                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                      Si el cierre es <strong>03:00</strong>, el resumen del "20 de julio" incluye ventas
                      desde las 03:00 del 20 hasta las 03:00 del 21. Útil para negocios nocturnos.
                    </p>
                  </div>
                </div>

                {/* Toggle cierre automático */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-2">
                  <div>
                    <p className="font-black text-sm text-gray-900">Cierre automático</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                      {restaurant.cash_auto_close_enabled
                        ? 'La caja se cierra sola a la hora configurada'
                        : 'Solo cierre manual — el botón "Cerrar Caja" del panel'}
                    </p>
                  </div>
                  <button
                    onClick={handleAutoCloseToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      restaurant.cash_auto_close_enabled ? 'bg-amber-500' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      restaurant.cash_auto_close_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                  El cambio de horario aplica desde el próximo turno de caja
                </p>
              </section>
            )}
        </div>
      </div>
      {loading && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="text-center space-y-4">
                <Loader2 className="animate-spin text-white mx-auto" size={60} strokeWidth={1} />
                <div className="space-y-1">
                    <h3 className="text-white font-black uppercase italic tracking-tighter text-xl">Eliminando Cuenta</h3>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Desvinculando Mercado Pago y limpiando datos...</p>
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