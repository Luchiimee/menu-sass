'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, User, Clock, CreditCard, Lock, Check, Zap, ExternalLink, Star, Tag } from 'lucide-react';

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
    subscription_plan: 'light' // 'light', 'plus', 'max'
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // --- CORRECCIÓN DEL ERROR AQUÍ ---
        // Antes buscábamos { user }, ahora obtenemos { session } y de ahí sacamos el user.
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) return; // Si no hay sesión, cortamos.
        
        const user = session.user;
        setUserId(user.id);

        // 1. Carga Perfil (Datos Personales)
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) {
            setProfile({ 
                first_name: profileData.first_name || '', 
                last_name: profileData.last_name || '', 
                phone: profileData.phone || '',
                email: user.email || ''
            });
        } else {
            // Si no existe perfil aun, pre-llenamos el email
            setProfile(prev => ({ ...prev, email: user.email || '' }));
        }

        // 2. Carga Restaurante y Plan
        const { data: restData } = await supabase.from('restaurants').select('*').eq('user_id', user.id).single();
        if (restData) {
            const defaultHours = restData.business_hours || {};
            setRestaurant({ ...restData, business_hours: defaultHours, subscription_plan: restData.subscription_plan || 'light' });
        }

      } catch (error) { console.error("Error cargando datos:", error); } finally { setLoading(false); }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
        // Guardar Datos Personales
        await supabase.from('profiles').upsert({
            id: userId,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone
        });

        // Guardar Horarios del Restaurante
        await supabase.from('restaurants').update({
            business_hours: restaurant.business_hours
        }).eq('id', restaurant.id);

        alert("¡Configuración guardada correctamente!");
    } catch (error) { alert("Error al guardar"); } finally { setSaving(false); }
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

 const handleSubscribe = async (planType: 'light' | 'plus') => {
      if (planType === 'light') return; // El light es gratis
      
      setSaving(true); // Usamos el estado de carga para mostrar que está pensando

      try {
          // 1. Llamamos a NUESTRA propia API que creamos recién
          const response = await fetch('/api/mercadopago/subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  planType: planType,
                  userId: userId, // Le mandamos quién es el usuario
                  email: profile.email
              })
          });

          const data = await response.json();

          if (data.url) {
              // 2. Si todo salió bien, redirigimos a Mercado Pago
              window.location.href = data.url;
          } else {
              alert("Hubo un error al generar el pago.");
          }

      } catch (error) {
          console.error(error);
          alert("Error de conexión.");
      } finally {
          setSaving(false);
      }
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
                <div className={`relative p-6 rounded-3xl border-2 flex flex-col ${restaurant.subscription_plan === 'light' ? 'border-gray-900 bg-gray-50' : 'border-gray-100 bg-white'}`}>
                    {restaurant.subscription_plan === 'light' && <span className="absolute top-4 right-4 text-[10px] font-bold bg-black text-white px-2 py-1 rounded">ACTUAL</span>}
                    
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

                    <button 
                        disabled={restaurant.subscription_plan === 'light'}
                        onClick={() => handleSubscribe('light')}
                        className={`w-full py-3 rounded-xl font-bold text-sm ${restaurant.subscription_plan === 'light' ? 'bg-gray-200 text-gray-500' : 'border-2 border-gray-900 text-gray-900 hover:bg-gray-50'}`}
                    >
                        {restaurant.subscription_plan === 'light' ? 'Plan Actual' : 'Elegir Light'}
                    </button>
                </div>

                {/* --- PLAN PLUS ($13.900) - DESTACADO --- */}
                <div className={`relative p-6 rounded-3xl border-2 flex flex-col shadow-xl scale-105 z-10 ${restaurant.subscription_plan === 'plus' ? 'border-blue-500 bg-blue-50' : 'border-blue-500 bg-white'}`}>
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm tracking-wide">MÁS ELEGIDO</div>
                    
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

                    <button 
                        onClick={() => handleSubscribe('plus')}
                        disabled={restaurant.subscription_plan === 'plus'}
                        className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition flex items-center justify-center gap-2 ${restaurant.subscription_plan === 'plus' ? 'bg-blue-200 text-blue-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {restaurant.subscription_plan === 'plus' ? 'Plan Activo ✅' : <>Quiero ser Plus <ExternalLink size={14}/></>}
                    </button>
                </div>

                {/* --- PLAN MAX ($25.200) - BLUR --- */}
                <div className="relative p-6 rounded-3xl border border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
                    <div className="absolute inset-0 backdrop-blur-[4px] bg-white/40 z-10 flex flex-col items-center justify-center text-center p-4">
                        <div className="bg-black text-white p-3 rounded-full mb-2 shadow-lg"><Star size={24} className="animate-pulse fill-yellow-400 text-yellow-400"/></div>
                        <h3 className="font-bold text-gray-900">PRÓXIMAMENTE</h3>
                        <p className="text-xs text-gray-500 mt-1 font-medium">Automatización Total</p>
                    </div>

                    <div className="mb-4 opacity-50 filter blur-[2px]">
                        <h3 className="text-lg font-bold text-purple-600">Max</h3>
                        <p className="text-3xl font-black mt-2 text-gray-900">$25.200</p>
                    </div>
                    
                    <ul className="space-y-3 text-sm text-gray-400 flex-1 mb-6 opacity-50 filter blur-[2px]">
                         <li className="flex gap-2"><Check size={16}/> Cobros con MP</li>
                         <li className="flex gap-2"><Check size={16}/> Pagos Automáticos</li>
                         <li className="flex gap-2"><Check size={16}/> Estadísticas Pro</li>
                         <li className="flex gap-2"><Check size={16}/> API WhatsApp</li>
                    </ul>

                    <button disabled className="w-full py-3 rounded-xl font-bold text-sm bg-gray-200 text-gray-400 opacity-50">
                        Muy Pronto
                    </button>
                </div>
            </div>

            {/* --- CUPÓN DE DESCUENTO --- */}
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