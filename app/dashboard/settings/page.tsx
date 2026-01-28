'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, Save, User, Clock, CreditCard, Lock, Check, Zap, Tag, CalendarDays, Mail, AlertTriangle, LogOut, Trash2, MessageCircle } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: ''
  });

  const [restaurant, setRestaurant] = useState<any>({
    id: null, 
    business_hours: {},
    subscription_plan: null,
    created_at: null,
    phone: ''
  });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (unsavedChanges) {
            e.preventDefault();
            e.returnValue = ''; 
            return '';
        }
    };
    if (unsavedChanges) {
        window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [unsavedChanges]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) return;
        
        const user = session.user;
        setUserId(user.id);

        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        const { data: restData } = await supabase
            .from('restaurants')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (profileData) {
            setProfile({ 
                first_name: profileData.first_name || '', 
                last_name: profileData.last_name || '', 
                phone: profileData.phone || restData?.phone || '', // Intenta sacar el cel de cualquiera de las dos
                email: user.email || '' 
            });
        }

        if (restData) {
            const defaultHours = restData.business_hours || {};
            setRestaurant({ 
                ...restData, 
                business_hours: defaultHours, 
                subscription_plan: restData.subscription_plan, 
                created_at: restData.created_at
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

  const handleLogout = async () => {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
  };

  const handleDeleteAccount = async () => {
      const confirm1 = confirm("⚠️ ¿ESTÁS SEGURO?\n\nAl eliminar tu cuenta se borrará tu menú, tus pedidos y todo tu historial de forma permanente.");
      if (!confirm1) return;

      const confirm2 = confirm("⛔️ ESTA ACCIÓN NO SE PUEDE DESHACER.\n\nSe cancelará tu acceso y se eliminarán tus datos.\n\n¿Confirmar eliminación definitiva?");
      if (!confirm2) return;

      setSaving(true);
      try {
          if (restaurant.id) {
              await supabase.from('restaurants').delete().eq('id', restaurant.id);
          }
          if (userId) {
              await supabase.from('profiles').delete().eq('id', userId);
          }
          
          await supabase.auth.signOut();
          router.push('/login');
          alert("Tu cuenta ha sido eliminada correctamente.");

      } catch (error: any) {
          alert("Error al eliminar: " + error.message);
          setSaving(false);
      }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sesión expirada.");

        // 1. Guardar en Profiles
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: user.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone
        });

        if (profileError) throw profileError;

        if (restaurant.id) {
            // 2. Guardar en Restaurants (Sincronizamos el teléfono aquí para el banner)
            const { error: restError } = await supabase.from('restaurants').update({
                business_hours: restaurant.business_hours,
                phone: profile.phone // Sincronización de teléfono
            }).eq('id', restaurant.id);
            
            if (restError) throw restError;

        } else {
            const randomSlug = `restaurante-${user.id.slice(0, 6)}-${Math.floor(Math.random() * 1000)}`;
            const { data: newRest, error: createError } = await supabase.from('restaurants').insert({
                user_id: user.id,
                name: 'Mi Restaurante',
                slug: randomSlug,
                business_hours: restaurant.business_hours,
                phone: profile.phone, // También al crear uno nuevo
                subscription_status: 'active'
            }).select().single();

            if (createError) throw createError;

            if (newRest) {
                setRestaurant((prev: any) => ({ ...prev, id: newRest.id }));
            }
        }

        setUnsavedChanges(false); 
        alert("¡Datos guardados correctamente!");
        window.location.reload(); 

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
      else alert(`Correo de recuperación enviado a ${profile.email}`);
  };

  const updateHour = (day: string, field: string, value: any) => {
      setUnsavedChanges(true); 
      setRestaurant((prev: any) => ({
          ...prev,
          business_hours: {
              ...prev.business_hours,
              [day]: { 
                  ...(prev.business_hours[day] || {}), 
                  [field]: value 
              }
          }
      }));
  };

  const handleActivateTrial = async (planType: 'light' | 'plus') => {
      setProcessingPlan(planType);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (restaurant.id) {
            const { error } = await supabase.from('restaurants').update({ subscription_plan: planType }).eq('id', restaurant.id);
            if (error) throw error;
        } else {
            const randomSlug = `restaurante-${user.id.slice(0, 6)}-${Math.floor(Math.random() * 1000)}`;
            const { error } = await supabase.from('restaurants').insert({ 
                  user_id: user.id, 
                  name: 'Mi Restaurante', 
                  slug: randomSlug, 
                  subscription_plan: planType, 
                  subscription_status: 'active', 
                  business_hours: restaurant.business_hours,
                  phone: profile.phone
            });
            if (error) throw error;
        }
        
        window.location.reload(); 
      } catch (error: any) {
        alert("Error al activar plan: " + error.message);
      } finally {
        setProcessingPlan(null);
      }
  };

  const handleGoToPayment = async (planType: 'light' | 'plus') => {
      setProcessingPlan(planType);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if(!user) return;

          const response = await fetch('/api/mercadopago/subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  planType: planType,
                  userId: user.id, 
                  email: profile.email
              })
          });
          const data = await response.json();
          if (data.url) window.location.href = data.url;
          else alert("Error al generar el pago.");
      } catch (error) {
          alert("Error de conexión.");
      } finally {
          setProcessingPlan(null);
      }
  };

  const getChargeDate = () => {
      const dateBase = restaurant.created_at ? new Date(restaurant.created_at) : new Date();
      const chargeDate = new Date(dateBase);
      chargeDate.setDate(dateBase.getDate() + 14);
      return chargeDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  };

  if (loading) {
      return (
          <div className="flex h-[80vh] w-full items-center justify-center">
              <Loader2 className="animate-spin text-gray-300" size={40} />
          </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 px-4 animate-in fade-in duration-500 pt-24 md:pt-0">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className={`
                px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg w-full md:w-auto text-sm md:text-base
                ${unsavedChanges ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse' : 'bg-black text-white hover:bg-gray-800'}
            `}
          >
              {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 
              {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* === COLUMNA IZQUIERDA === */}
        <div className="lg:col-span-4 space-y-6">
            
            <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <div className="bg-gray-100 p-2 rounded-lg text-gray-600"><User size={20}/></div>
                    Mis Datos
                </h2>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Nombre</label>
                            <input 
                                value={profile.first_name} 
                                onChange={(e) => { setProfile({...profile, first_name: e.target.value}); setUnsavedChanges(true); }} 
                                className="w-full p-3 border rounded-xl text-sm font-bold outline-none focus:border-black transition" 
                                placeholder="Tu Nombre"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Apellido</label>
                            <input 
                                value={profile.last_name} 
                                onChange={e => { setProfile({...profile, last_name: e.target.value}); setUnsavedChanges(true); }} 
                                className="w-full p-3 border rounded-xl text-sm font-bold outline-none focus:border-black transition" 
                                placeholder="Tu Apellido"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-400 mb-1 block uppercase">Correo Electrónico</label>
                        <div className="relative">
                            <input value={profile.email} disabled className="w-full p-3 border rounded-xl text-sm font-bold text-gray-500 bg-gray-50 outline-none pl-10 cursor-not-allowed" />
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-400 mb-1 block uppercase tracking-widest">WhatsApp Personal</label>
                        <input 
                            value={profile.phone} 
                            onChange={e => { setProfile({...profile, phone: e.target.value}); setUnsavedChanges(true); }} 
                            className="w-full p-3 border rounded-xl text-sm font-bold outline-none focus:border-black transition bg-amber-50/30 border-amber-100 focus:bg-white" 
                            placeholder="Ej: 11 1234 5678" type="tel"
                        />
                    </div>

                    <div className="pt-2 flex gap-2">
                         <button onClick={handlePasswordReset} className="flex-1 py-2 text-sm font-bold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Cambiar Pass</button>
                         <button onClick={handleLogout} className="md:hidden flex-1 py-2 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-1">
                            <LogOut size={16}/> Salir
                         </button>
                    </div>
                </div>
            </section>

            <div className="bg-white border border-dashed border-gray-300 p-6 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-yellow-100 p-2 rounded-lg text-yellow-600"><Tag size={20}/></div>
                    <div>
                        <p className="text-sm font-bold text-gray-700">¿Tienes un cupón?</p>
                        <p className="text-xs text-gray-400">Canjea tu código aquí.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input type="text" placeholder="CÓDIGO" className="bg-gray-50 border rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 ring-gray-200 uppercase w-full"/>
                    <button onClick={() => alert("Función de cupón próximamente")} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition">Aplicar</button>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm"><MessageCircle size={20}/></div>
                    <p className="text-sm font-bold text-blue-900">¿Necesitas algo?</p>
                </div>
                <p className="text-xs text-blue-800/80 leading-relaxed">Estamos haciendo la app para ti. Si quieres que cambiemos algo, comunícate con nosotros.</p>
                <a href="https://wa.me/5492324694045?text=Hola%20equipo" target="_blank" className="w-full bg-white text-blue-700 border border-blue-200 px-4 py-3 rounded-xl text-xs font-bold hover:bg-blue-100 transition text-center shadow-sm">Enviar Sugerencia</a>
            </div>

            <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg text-red-600 shadow-sm"><AlertTriangle size={20}/></div>
                    <div>
                        <p className="text-sm font-bold text-red-900">Zona de Peligro</p>
                        <p className="text-xs text-red-700/70">Acciones irreversibles.</p>
                    </div>
                </div>
                <button onClick={handleDeleteAccount} className="w-full bg-white border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold hover:bg-red-600 hover:text-white transition flex items-center justify-center gap-2 shadow-sm"><Trash2 size={16}/> Eliminar Cuenta</button>
            </div>
        </div>

        {/* === COLUMNA DERECHA === */}
        <div className="lg:col-span-8 space-y-6">
            <h2 className="font-bold text-xl flex items-center gap-2">
                <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><CreditCard size={24}/></div> Elige tu Plan
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* PLAN LIGHT */}
                <div className={`relative p-6 rounded-3xl border-2 flex flex-col transition-all ${restaurant.subscription_plan === 'light' ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900' : 'border-gray-200 bg-white'}`}>
                    {restaurant.subscription_plan === 'light' && <span className="absolute top-4 right-4 text-[10px] font-bold bg-black text-white px-2 py-1 rounded">TU PLAN</span>}
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-700">Light</h3>
                        <p className="text-3xl font-black mt-2 text-gray-900">$7.000<span className="text-xs font-medium text-gray-400">/mes</span></p>
                    </div>
                    <ul className="space-y-3 text-sm text-gray-500 flex-1 mb-6">
                          <li className="flex gap-2"><Check size={16} className="text-green-500"/> Menú Digital</li>
                          <li className="flex gap-2"><Check size={16} className="text-green-500"/> Pedidos WhatsApp</li>
                    </ul>
                    {restaurant.subscription_plan === 'light' ? (
                        <div className="space-y-3">
                            <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-xs font-bold text-center">Prueba Activa</div>
                            <button onClick={() => handleGoToPayment('light')} className="w-full py-3 rounded-xl font-bold text-sm bg-black text-white">Configurar Pago</button>
                        </div>
                    ) : (
                        <button onClick={() => handleActivateTrial('light')} className="w-full py-3 rounded-xl font-bold text-sm border-2 border-gray-900">Probar Gratis</button>
                    )}
                </div>

                {/* PLAN PLUS */}
                <div className={`relative p-6 rounded-3xl border-2 flex flex-col shadow-xl scale-105 z-10 transition-all ${restaurant.subscription_plan === 'plus' ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-blue-500 bg-white'}`}>
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-blue-600">Plus <Zap size={16} className="inline"/></h3>
                        <p className="text-4xl font-black mt-2 text-gray-900">$15.900<span className="text-xs font-medium text-gray-400">/mes</span></p>
                    </div>
                    <ul className="space-y-3 text-sm text-gray-600 flex-1 mb-6">
                          <li className="flex gap-2"><Check size={16} className="text-blue-500"/> Productos Ilimitados</li>
                          <li className="flex gap-2"><Check size={16} className="text-blue-500"/> Panel de Pedidos</li>
                    </ul>
                    {restaurant.subscription_plan === 'plus' ? (
                        <div className="space-y-3">
                            <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-xs font-bold text-center">Prueba Activa</div>
                            <button onClick={() => handleGoToPayment('plus')} className="w-full py-3 rounded-xl font-bold text-sm bg-blue-600 text-white">Configurar Pago</button>
                        </div>
                    ) : (
                        <button onClick={() => handleActivateTrial('plus')} className="w-full py-3 rounded-xl font-bold text-sm bg-blue-600 text-white">Probar Gratis</button>
                    )}
                </div>

                {/* PLAN MAX */}
                <div className="relative p-6 rounded-3xl border border-gray-200 bg-gray-50 flex flex-col opacity-90">
                    <h3 className="text-lg font-bold text-purple-600 uppercase text-xs tracking-widest">Muy Pronto</h3>
                    <p className="text-2xl font-black text-gray-400 mt-2">$28.600</p>
                </div>
            </div>

            <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mt-6">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <div className="bg-green-100 p-2 rounded-lg text-green-600"><Clock size={20}/></div> Horarios
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {DAYS.map((day) => {
                        const dayData = restaurant.business_hours?.[day.key] || {};
                        const isOpen = dayData.isOpen || false;
                        const isSplit = dayData.isSplit || false;
                        return (
                            <div key={day.key} className={`border rounded-xl p-4 ${isOpen ? 'bg-white border-green-200' : 'bg-gray-50'}`}>
                                <div className="flex items-center justify-between mb-3 font-bold text-gray-700 capitalize">
                                    {day.label}
                                    <input type="checkbox" checked={isOpen} onChange={(e) => updateHour(day.key, 'isOpen', e.target.checked)} className="w-5 h-5 accent-green-500"/>
                                </div>
                                {isOpen && (
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input type="time" value={dayData.open || '09:00'} onChange={(e) => updateHour(day.key, 'open', e.target.value)} className="flex-1 p-2 border rounded-lg text-sm text-center"/>
                                            <input type="time" value={dayData.close || '20:00'} onChange={(e) => updateHour(day.key, 'close', e.target.value)} className="flex-1 p-2 border rounded-lg text-sm text-center"/>
                                        </div>
                                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                            <input type="checkbox" checked={isSplit} onChange={(e) => updateHour(day.key, 'isSplit', e.target.checked)}/> Doble turno
                                        </label>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
      </div>
    </div>
  );
}