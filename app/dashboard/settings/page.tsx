'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner'; 
import { 
  Loader2, Save, User, Clock, CreditCard, Lock, Check, Zap, Tag, 
  CalendarDays, Mail, AlertTriangle, LogOut, Trash2, MessageCircle,
  QrCode, Smartphone, BarChart3, Bell, Globe, ChevronDown, ChevronUp, Layout, Store
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

export default function SettingsPage() {
  const router = useRouter(); 
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showHours, setShowHours] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

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

        // 1. Intentamos traer datos de la tabla 'profiles'
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (profileData) {
            // Si ya existe en la DB, usamos eso
            setProfile({ 
                first_name: profileData.first_name || '', 
                last_name: profileData.last_name || '', 
                phone: profileData.phone || '',
                email: user.email || '' 
            });
        } else {
            // 2. Si NO existe en la DB (primer ingreso), rescatamos de Metadata (Gmail o Registro Manual)
            const meta = user.user_metadata || {};
            let firstName = meta.first_name || '';
            let lastName = meta.last_name || '';
            let phone = meta.phone || '';

            // Si se registró con Google, el nombre viene en 'full_name'
            if (meta.full_name && !firstName) {
                const parts = meta.full_name.split(' ');
                firstName = parts[0];
                lastName = parts.slice(1).join(' ');
            } else if (meta.name && !firstName) {
                firstName = meta.name;
            }

            const newProfile = { 
                first_name: firstName, 
                last_name: lastName, 
                email: user.email || '',
                phone: phone 
            };

            setProfile(newProfile);
            
            // 3. Guardado automático inicial para que ya quede creado en la DB
            await supabase.from('profiles').upsert({
                id: user.id,
                first_name: firstName,
                last_name: lastName,
                phone: phone
            });
        }

        // 4. Cargar datos del restaurante
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    const confirm1 = confirm("⚠️ ¿ESTÁS SEGURO?\n\nAl eliminar tu cuenta se borrarán tus datos de forma permanente.");
    if (!confirm1) return;
    try {
        if (restaurant.id) await supabase.from('restaurants').delete().eq('id', restaurant.id);
        if (userId) await supabase.from('profiles').delete().eq('id', userId);
        await supabase.auth.signOut();
        router.push('/login');
    } catch (error: any) { toast.error("Error al eliminar"); }
  };

  // --- AUTO-GUARDADO DE PERFIL (CON DELAY) ---
  const saveProfileData = async (newData: any) => {
    if (!userId) return;
    const { error } = await supabase.from('profiles').upsert({ id: userId, ...newData });
    if (!error) toast.success('Perfil actualizado', { position: 'bottom-right', duration: 1000 });
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

  // --- ACTIVAR TRIAL 14 DÍAS ---
 const handleActivateTrial = async (planType: 'light' | 'plus') => {
  if (!userId) {
    toast.error("No se encontró la sesión de usuario.");
    return;
  }

  setProcessingPlan(planType);
  
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .upsert({ 
        ...(restaurant?.id ? { id: restaurant.id } : {}),
        user_id: userId, 
        subscription_plan: planType,
        subscription_status: 'trialing',
        trial_start_date: new Date().toISOString(),
        name: restaurant?.name || 'Mi Restaurante' 
      }, {
        onConflict: 'user_id' 
      })
      .select()
      .single();

    if (error) throw error;
    if (data) setRestaurant(data);

    toast.success(`¡Plan ${planType.toUpperCase()} activado! 14 días gratis.`);
    
  } catch (error: any) { 
    console.error("Error al activar:", error.message);
    toast.error("Error al activar el plan"); 
  } finally { 
    setProcessingPlan(null); 
  }
};
  // --- MERCADO PAGO ---
  const handleGoToPayment = async (planType: 'light' | 'plus') => {
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
                  <button onClick={() => handleGoToPayment('light')} className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-black text-white hover:bg-gray-800 transition-all">Configurar Pago</button>
                  <p className="text-[10px] text-gray-400 text-center font-bold italic uppercase tracking-tighter">Primer cobro: {getChargeDate()}</p>
                </div>
              ) : (
                <button onClick={() => handleActivateTrial('light')} className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-gray-100 text-gray-900 hover:bg-black hover:text-white transition-all">Activar 14 días gratis</button>
              )}
          </div>

          {/* PLUS */}
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
            <button onClick={() => handleGoToPayment('plus')} className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all">
                Configurar Pago
            </button>
            <p className="text-[10px] text-blue-400 text-center font-bold italic uppercase tracking-tighter">
                Primer cobro: {getChargeDate()}
            </p>
        </div>
    ) : (
        <button onClick={() => handleActivateTrial('plus')} className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all">
            Activar 14 días gratis
        </button>
    )}
</div>
          {/* MAX */}
          <div className="p-8 rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col opacity-70">
              <div className="mb-6 text-center">
                  <h3 className="font-bold text-purple-600 text-[10px] uppercase tracking-widest">Escalabilidad</h3>
                  <p className="text-3xl font-black text-gray-900 mt-1">Max <span className="text-xl text-gray-400 font-bold">$28.600</span></p>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                  <li className="flex gap-3 text-xs font-bold text-gray-500"><Check size={16} className="text-purple-400 shrink-0"/> Todo lo del plan Plus</li>
                  <li className="flex gap-3 text-xs font-bold text-gray-500"><Layout size={16} className="text-purple-400 shrink-0"/> Panel Pro para Caja</li>
                  <li className="flex gap-3 text-xs font-bold text-gray-500"><CreditCard size={16} className="text-purple-400 shrink-0"/> Integración Mercado Pago</li>
                  <li className="flex gap-3 text-xs font-bold text-gray-500"><Store size={16} className="text-purple-400 shrink-0"/> Gestión de hasta 2 sucursales</li>
              </ul>
              <button disabled className="w-full py-3.5 rounded-2xl font-black text-xs bg-gray-200 text-gray-400 cursor-not-allowed uppercase">Muy Pronto</button>
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
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">WhatsApp Personal</label>
                        <input value={profile.phone} onChange={(e) => updateProfile('phone', e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 ring-black/5" />
                    </div>
                    <div className="pt-2 flex flex-col gap-3">
                         <button onClick={handlePasswordReset} className="w-full py-3 text-xs font-bold text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition tracking-widest uppercase">Cambiar Contraseña</button>
                         <button onClick={handleLogout} className="md:hidden w-full py-3 text-xs font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2 tracking-widest uppercase">
                            <LogOut size={16}/> Cerrar sesión
                         </button>
                         <button onClick={handleDeleteAccount} className="w-full py-3 text-[10px] font-black text-red-400/50 hover:text-red-600 transition flex items-center justify-center gap-2 uppercase tracking-widest">
                            <Trash2 size={14}/> Eliminar mi cuenta
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
                  <div className="p-8 pt-0 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
    </div>
  );
}