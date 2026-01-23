'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, User, Clock, CreditCard, Lock, Check, Zap, ExternalLink, Star, Tag, AlertTriangle, CalendarDays } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null); // Para saber qué botón está cargando
  const [userId, setUserId] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: ''
  });

  const [restaurant, setRestaurant] = useState<any>({
    id: '',
    business_hours: {},
    subscription_plan: null, // null | 'light' | 'plus' | 'max'
    created_at: null
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) return;
        
        const user = session.user;
        setUserId(user.id);

        // 1. Carga Perfil
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) {
            setProfile({ 
                first_name: profileData.first_name || '', 
                last_name: profileData.last_name || '', 
                phone: profileData.phone || '',
                email: user.email || ''
            });
        } else {
            setProfile(prev => ({ ...prev, email: user.email || '' }));
        }

        // 2. Carga Restaurante y Plan
        const { data: restData } = await supabase.from('restaurants').select('*').eq('user_id', user.id).single();
        if (restData) {
            const defaultHours = restData.business_hours || {};
            setRestaurant({ 
                ...restData, 
                business_hours: defaultHours, 
                subscription_plan: restData.subscription_plan, // Respetamos lo que venga de la base
                created_at: restData.created_at
            });
        }

      } catch (error) { console.error("Error cargando datos:", error); } finally { setLoading(false); }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: userId,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone,
            updated_at: new Date()
        });
        if (profileError) throw profileError;

        const { error: restError } = await supabase.from('restaurants').update({
            business_hours: restaurant.business_hours
        }).eq('id', restaurant.id);
        if (restError) throw restError;

        alert("¡Configuración guardada correctamente!");
    } catch (error: any) { 
        console.error(error);
        alert("Error al guardar: " + error.message); 
    } finally { setSaving(false); }
  };

  const handlePasswordReset = async () => {
      if(!profile.email) return;
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
          redirectTo: `${window.location.origin}/dashboard/settings`,
      });
      if (error) alert("Error: " + error.message);
      else alert(`Correo enviado a ${profile.email}`);
  };

  const updateHour = (day: string, field: string, value: any) => {
      setRestaurant((prev: any) => ({
          ...prev,
          business_hours: {
              ...prev.business_hours,
              [day]: { ...prev.business_hours[day], [field]: value }
          }
      }));
  };

  // --- PASO 1: ACTIVAR PRUEBA (SOLO DB) ---
  const handleActivateTrial = async (planType: 'light' | 'plus') => {
      setProcessingPlan(planType);
      try {
        // Guardamos el plan en la base de datos
        const { error } = await supabase
            .from('restaurants')
            .update({ subscription_plan: planType })
            .eq('id', restaurant.id);
        
        if (error) throw error;

        // Actualizamos estado local
        setRestaurant((prev: any) => ({ ...prev, subscription_plan: planType }));
        alert(`¡Has activado la prueba del Plan ${planType === 'light' ? 'Light' : 'Plus'}! Ahora configura tu pago.`);

      } catch (error) {
        alert("Error al activar plan");
      } finally {
        setProcessingPlan(null);
      }
  };

  // --- PASO 2: IR A PAGAR (MERCADO PAGO) ---
  const handleGoToPayment = async (planType: 'light' | 'plus') => {
      setProcessingPlan(planType);
      try {
          const response = await fetch('/api/mercadopago/subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  planType: planType,
                  userId: userId, 
                  email: profile.email
              })
          });

          const data = await response.json();

          if (data.url) {
              window.location.href = data.url;
          } else {
              alert("Hubo un error al generar el pago.");
          }
      } catch (error) {
          console.error(error);
          alert("Error de conexión.");
      } finally {
          setProcessingPlan(null);
      }
  };

  // Calculamos fecha de cobro (14 días después del registro)
  const getChargeDate = () => {
      if (!restaurant.created_at) return "14 días";
      const created = new Date(restaurant.created_at);
      const chargeDate = new Date(created);
      chargeDate.setDate(created.getDate() + 14);
      return chargeDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 px-4">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <button onClick={handleSave} disabled={saving} className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition shadow-lg w-full md:w-auto">
              {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Guardar Cambios
          </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA (DATOS) */}
        <div className="xl:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <div className="bg-gray-100 p-2 rounded-lg text-gray-600"><User size={20}/></div>
                    Mis Datos
                </h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Nombre</label>
                            <input value={profile.first_name} onChange={e => setProfile({...profile, first_name: e.target.value})} className="w-full p-3 border rounded-xl text-sm font-bold outline-none focus:border-black" placeholder="Nombre"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Apellido</label>
                            <input value={profile.last_name} onChange={e => setProfile({...profile, last_name: e.target.value})} className="w-full p-3 border rounded-xl text-sm font-bold outline-none focus:border-black" placeholder="Apellido"/>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">WhatsApp Personal</label>
                        <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full p-3 border rounded-xl text-sm font-bold outline-none focus:border-black" placeholder="Ej: 11 1234 5678" type="tel"/>
                    </div>
                    <div className="pt-2">
                         <button onClick={handlePasswordReset} className="w-full py-2 text-sm font-bold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Cambiar Contraseña</button>
                    </div>
                </div>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <div className="bg-green-100 p-2 rounded-lg text-green-600"><Clock size={20}/></div>
                    Horarios
                </h2>
                <div className="space-y-3">
                    {DAYS.map((day) => {
                        const dayData = restaurant.business_hours?.[day.key] || { isOpen: false, open: '19:00', close: '23:30' };
                        return (
                            <div key={day.key} className="flex items-center justify-between text-sm">
                                <div className="font-bold text-gray-700 w-20">{day.label}</div>
                                <label className="relative inline-flex items-center cursor-pointer mr-2">
                                    <input type="checkbox" className="sr-only peer" checked={dayData.isOpen} onChange={(e) => updateHour(day.key, 'isOpen', e.target.checked)}/>
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                </label>
                                {dayData.isOpen ? (
                                    <div className="flex gap-1">
                                        <input type="time" value={dayData.open} onChange={(e) => updateHour(day.key, 'open', e.target.value)} className="w-16 p-1 border rounded bg-gray-50 text-xs outline-none text-center"/>
                                        <input type="time" value={dayData.close} onChange={(e) => updateHour(day.key, 'close', e.target.value)} className="w-16 p-1 border rounded bg-gray-50 text-xs outline-none text-center"/>
                                    </div>
                                ) : <span className="text-xs text-gray-300 font-bold uppercase w-32 text-center">Cerrado</span>}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>

        {/* COLUMNA DERECHA (PLANES) */}
        <div className="xl:col-span-8">
            <h2 className="font-bold text-xl flex items-center gap-2 mb-6">
                <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><CreditCard size={24}/></div> 
                Elige tu Plan
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                
                {/* --- PLAN LIGHT ($6.400) --- */}
                <div className={`relative p-6 rounded-3xl border-2 flex flex-col transition-all ${restaurant.subscription_plan === 'light' ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    {restaurant.subscription_plan === 'light' && <span className="absolute top-4 right-4 text-[10px] font-bold bg-black text-white px-2 py-1 rounded">TU PLAN</span>}
                    
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-700">Light</h3>
                        <p className="text-3xl font-black mt-2 text-gray-900">$6.400<span className="text-xs font-medium text-gray-400">/mes</span></p>
                    </div>
                    
                    <ul className="space-y-3 text-sm text-gray-500 flex-1 mb-6">
                         <li className="flex gap-2"><Check size={16} className="text-green-500"/> Menú Digital</li>
                         <li className="flex gap-2"><Check size={16} className="text-green-500"/> Pedidos WhatsApp</li>
                         <li className="flex gap-2"><Check size={16} className="text-green-500"/> Hasta 15 Productos</li>
                         <li className="flex gap-2 opacity-50"><Lock size={16}/> Sin Panel de Pedidos</li>
                    </ul>

                    {/* BOTONERA LIGHT */}
                    {restaurant.subscription_plan === 'light' ? (
                        <div className="space-y-3">
                            <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1">
                                <Check size={14}/> Prueba Activa
                            </div>
                            <button 
                                onClick={() => handleGoToPayment('light')}
                                disabled={processingPlan === 'light'}
                                className="w-full py-3 rounded-xl font-bold text-sm bg-black text-white hover:bg-gray-800 shadow-lg flex items-center justify-center gap-2"
                            >
                                {processingPlan === 'light' ? <Loader2 className="animate-spin" size={18}/> : 'Configurar Pago'}
                            </button>
                            <p className="text-[10px] text-gray-400 text-center leading-tight">
                                <CalendarDays size={10} className="inline mr-1"/>
                                El cobro de $6.400 se realizará el <b>{getChargeDate()}</b>
                            </p>
                        </div>
                    ) : (
                        <button 
                            onClick={() => handleActivateTrial('light')}
                            disabled={processingPlan === 'light'}
                            className="w-full py-3 rounded-xl font-bold text-sm border-2 border-gray-900 text-gray-900 hover:bg-gray-50"
                        >
                            {processingPlan === 'light' ? <Loader2 className="animate-spin" size={18}/> : 'Comenzar Prueba Gratis'}
                        </button>
                    )}
                </div>

                {/* --- PLAN PLUS ($13.900) --- */}
                <div className={`relative p-6 rounded-3xl border-2 flex flex-col shadow-xl scale-105 z-10 transition-all ${restaurant.subscription_plan === 'plus' ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-blue-500 bg-white'}`}>
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm tracking-wide">RECOMENDADO</div>
                    
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-blue-600 flex items-center gap-2">Plus <Zap size={16} className="fill-current"/></h3>
                        <p className="text-4xl font-black mt-2 text-gray-900">$13.900<span className="text-xs font-medium text-gray-400">/mes</span></p>
                    </div>
                    
                    <ul className="space-y-3 text-sm text-gray-600 flex-1 mb-6 font-medium">
                         <li className="flex gap-2"><Check size={16} className="text-blue-500"/> <b>Productos Ilimitados</b></li>
                         <li className="flex gap-2"><Check size={16} className="text-blue-500"/> <b>Panel de Pedidos</b></li>
                         <li className="flex gap-2"><Check size={16} className="text-blue-500"/> Aviso WhatsApp 1-Clic</li>
                         <li className="flex gap-2"><Check size={16} className="text-blue-500"/> Métricas de Caja</li>
                    </ul>

                    {/* BOTONERA PLUS */}
                    {restaurant.subscription_plan === 'plus' ? (
                        <div className="space-y-3">
                            <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1">
                                <Check size={14}/> Prueba Activa
                            </div>
                            <button 
                                onClick={() => handleGoToPayment('plus')}
                                disabled={processingPlan === 'plus'}
                                className="w-full py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2"
                            >
                                {processingPlan === 'plus' ? <Loader2 className="animate-spin" size={18}/> : 'Configurar Pago'}
                            </button>
                            <p className="text-[10px] text-blue-400 text-center leading-tight">
                                <CalendarDays size={10} className="inline mr-1"/>
                                El cobro de $13.900 se realizará el <b>{getChargeDate()}</b>
                            </p>
                        </div>
                    ) : (
                        <button 
                            onClick={() => handleActivateTrial('plus')}
                            disabled={processingPlan === 'plus'}
                            className="w-full py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                        >
                            {processingPlan === 'plus' ? <Loader2 className="animate-spin" size={18}/> : 'Comenzar Prueba Gratis'}
                        </button>
                    )}
                </div>

                {/* --- PLAN MAX (PROXIMAMENTE) --- */}
                <div className="relative p-6 rounded-3xl border border-gray-200 bg-gray-50 flex flex-col overflow-hidden opacity-80">
                    <div className="absolute inset-0 backdrop-blur-[2px] bg-white/40 z-10 flex flex-col items-center justify-center text-center p-4">
                        <div className="bg-black text-white p-3 rounded-full mb-2 shadow-lg"><Star size={24} className="animate-pulse fill-yellow-400 text-yellow-400"/></div>
                        <h3 className="font-bold text-gray-900">PRÓXIMAMENTE</h3>
                    </div>

                    <div className="mb-4 opacity-50 filter blur-[1px]">
                        <h3 className="text-lg font-bold text-purple-600">Max</h3>
                        <p className="text-3xl font-black mt-2 text-gray-900">$25.200</p>
                    </div>
                    
                    <ul className="space-y-3 text-sm text-gray-400 flex-1 mb-6 opacity-50 filter blur-[1px]">
                         <li className="flex gap-2"><Check size={16}/> Cobros con MP</li>
                         <li className="flex gap-2"><Check size={16}/> Pagos Automáticos</li>
                         <li className="flex gap-2"><Check size={16}/> Estadísticas Pro</li>
                    </ul>

                    <button disabled className="w-full py-3 rounded-xl font-bold text-sm bg-gray-200 text-gray-400 opacity-50">
                        Muy Pronto
                    </button>
                </div>
            </div>

            {/* --- CUPÓN --- */}
            <div className="bg-white border border-dashed border-gray-300 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="bg-yellow-100 p-2 rounded-lg text-yellow-600"><Tag size={20}/></div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">¿Tienes un cupón?</p>
                        <p className="text-xs text-gray-400">Si tienes un código promocional, ingrésalo aquí.</p>
                    </div>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                    <input type="text" placeholder="CÓDIGO" className="bg-gray-50 border rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 ring-gray-200 uppercase w-full md:w-40"/>
                    <button onClick={() => alert("Función de cupón próximamente")} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition">
                        Aplicar
                    </button>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
}