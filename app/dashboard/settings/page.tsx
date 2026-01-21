'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, User, Clock, CreditCard, Lock, Check, Zap, Star } from 'lucide-react';

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
    plan_id: 'free' // 'free' o 'pro'
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

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

        const { data: restData } = await supabase.from('restaurants').select('*').eq('user_id', user.id).single();
        if (restData) {
            const defaultHours = restData.business_hours || {};
            setRestaurant({ ...restData, business_hours: defaultHours });
        }

      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
        await supabase.from('profiles').upsert({
            id: userId,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone
        });

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

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24">
      
      <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Configuración</h1>
          <button onClick={handleSave} disabled={saving} className="bg-black text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg">
              {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Guardar
          </button>
      </div>

      {/* --- SECCIÓN 1: MIS DATOS --- */}
      <section className="bg-white p-6 rounded-2xl border shadow-sm">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><User size={20}/></div>
              Mis Datos Personales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Nombre</label>
                  <input value={profile.first_name} onChange={e => setProfile({...profile, first_name: e.target.value})} className="w-full p-3 border rounded-xl font-medium outline-none focus:ring-2 ring-black/10" placeholder="Tu Nombre"/>
              </div>
              <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Apellido</label>
                  <input value={profile.last_name} onChange={e => setProfile({...profile, last_name: e.target.value})} className="w-full p-3 border rounded-xl font-medium outline-none focus:ring-2 ring-black/10" placeholder="Tu Apellido"/>
              </div>
          </div>
          <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Teléfono Personal</label>
              <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full p-3 border rounded-xl font-medium outline-none focus:ring-2 ring-black/10" placeholder="Ej: 11 1234 5678" type="tel"/>
          </div>
          <div className="mb-6">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Correo Electrónico</label>
              <input value={profile.email} disabled className="w-full p-3 border rounded-xl bg-gray-100 text-gray-500 font-medium"/>
          </div>
          <div className="border-t pt-4">
              <button onClick={handlePasswordReset} className="text-sm font-bold text-blue-600 flex items-center gap-2 hover:underline"><Lock size={16}/> Cambiar Contraseña</button>
          </div>
      </section>

      {/* --- SECCIÓN 2: HORARIOS --- */}
      <section className="bg-white p-6 rounded-2xl border shadow-sm">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <div className="bg-green-100 p-2 rounded-lg text-green-600"><Clock size={20}/></div>
              Horarios de Atención
          </h2>
          <div className="space-y-4">
              {DAYS.map((day) => {
                  const dayData = restaurant.business_hours?.[day.key] || { isOpen: false, open: '09:00', close: '23:00' };
                  return (
                      <div key={day.key} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                          <div className="w-24 font-bold text-sm text-gray-700">{day.label}</div>
                          <div className="flex items-center gap-4 flex-1 justify-end">
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" className="sr-only peer" checked={dayData.isOpen} onChange={(e) => updateHour(day.key, 'isOpen', e.target.checked)}/>
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                              </label>
                              {dayData.isOpen ? (
                                  <div className="flex items-center gap-2">
                                      <input type="time" value={dayData.open} onChange={(e) => updateHour(day.key, 'open', e.target.value)} className="border rounded-lg p-1 text-sm bg-gray-50 outline-none"/>
                                      <span className="text-gray-400">-</span>
                                      <input type="time" value={dayData.close} onChange={(e) => updateHour(day.key, 'close', e.target.value)} className="border rounded-lg p-1 text-sm bg-gray-50 outline-none"/>
                                  </div>
                              ) : <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4">Cerrado</span>}
                          </div>
                      </div>
                  );
              })}
          </div>
      </section>

      {/* --- SECCIÓN 3: MI PLAN (CORREGIDO: 2 PLANES VISIBLES) --- */}
      <section className="bg-white p-6 rounded-2xl border shadow-sm">
          <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
              <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><CreditCard size={20}/></div>
              Planes Disponibles
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
              
              {/* PLAN 1: FREE (ACTUAL) */}
              <div className={`border-2 rounded-2xl p-6 relative flex flex-col ${restaurant.plan_id === 'free' ? 'border-gray-900 bg-gray-50' : 'border-gray-100'}`}>
                  {restaurant.plan_id === 'free' && <div className="absolute top-4 right-4 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded">PLAN ACTUAL</div>}
                  
                  <div className="mb-4">
                      <h3 className="font-black text-xl">Plan Inicial</h3>
                      <p className="text-3xl font-black mt-2">$0<span className="text-sm font-medium text-gray-500">/mes</span></p>
                  </div>
                  
                  <ul className="text-sm text-gray-600 space-y-3 flex-1">
                      <li className="flex gap-2"><Check size={16} className="text-green-600"/> Menú Digital Básico</li>
                      <li className="flex gap-2"><Check size={16} className="text-green-600"/> Pedidos por WhatsApp</li>
                      <li className="flex gap-2"><Check size={16} className="text-green-600"/> Hasta 20 Productos</li>
                  </ul>

                  <button disabled={restaurant.plan_id === 'free'} className={`w-full mt-6 py-3 rounded-xl font-bold text-sm transition ${restaurant.plan_id === 'free' ? 'bg-gray-200 text-gray-400' : 'bg-gray-900 text-white hover:bg-black'}`}>
                      {restaurant.plan_id === 'free' ? 'Plan Activo' : 'Elegir Plan'}
                  </button>
              </div>

              {/* PLAN 2: PRO (DESTACADO) */}
              <div className={`border-2 rounded-2xl p-6 relative flex flex-col ${restaurant.plan_id === 'pro' ? 'border-blue-600 bg-blue-50' : 'border-blue-100 bg-white shadow-lg'}`}>
                  {restaurant.plan_id === 'pro' && <div className="absolute top-4 right-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded">PLAN ACTUAL</div>}
                  
                  <div className="mb-4">
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded mb-2 inline-block">RECOMENDADO</span>
                      <h3 className="font-black text-xl flex items-center gap-2">Plan Pro <Zap size={18} className="text-yellow-500 fill-yellow-500"/></h3>
                      <p className="text-3xl font-black mt-2 text-blue-600">$5000<span className="text-sm font-medium text-gray-500 text-black">/mes</span></p>
                  </div>
                  
                  <ul className="text-sm text-gray-600 space-y-3 flex-1">
                      <li className="flex gap-2"><Check size={16} className="text-blue-600"/> <b>Productos Ilimitados</b></li>
                      <li className="flex gap-2"><Check size={16} className="text-blue-600"/> <b>Fotos en HD</b></li>
                      <li className="flex gap-2"><Check size={16} className="text-blue-600"/> Métricas de Ventas</li>
                      <li className="flex gap-2"><Check size={16} className="text-blue-600"/> Soporte Prioritario</li>
                  </ul>

                  <button 
                    disabled={restaurant.plan_id === 'pro'}
                    onClick={() => alert("Próximamente: Redirigiendo a Mercado Pago...")} // Aquí conectaremos MP luego
                    className={`w-full mt-6 py-3 rounded-xl font-bold text-sm transition ${restaurant.plan_id === 'pro' ? 'bg-blue-200 text-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
                  >
                      {restaurant.plan_id === 'pro' ? 'Plan Activo' : 'Mejorar Plan 🚀'}
                  </button>
              </div>

          </div>
      </section>

    </div>
  );
}