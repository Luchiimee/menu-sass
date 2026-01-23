'use client';

// Agrego esto para asegurar datos frescos
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
// 👇 CAMBIO 1: Cliente seguro para evitar errores de sesión
import { createBrowserClient } from '@supabase/ssr';
import { Check, Loader2, ArrowRight, Zap } from 'lucide-react'; 
import Link from 'next/link';

// DATOS DE LAS PLANTILLAS (INTACTO)
export const TEMPLATES_DATA = [
  {
    id: 'urban',
    name: 'Urbano Dark',
    description: 'Impacto visual fuerte. Fondo oscuro y productos en lista grande.',
    config: { theme_color: '#000000', logo_position: 'left', banner_opacity: 80, template_id: 'urban' },
    mock: {
      banner: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=400&q=80',
      logo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=100&q=80',
      prod1: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&q=80',
      prod2: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=150&q=80',
      prod3: '',
      prod4: '',
    }
  },
  {
    id: 'fresh',
    name: 'Sushi Visual',
    description: 'Diseño tipo Instagram. Grilla de fotos ideal para platos estéticos.',
    config: { theme_color: '#ea580c', logo_position: 'center', banner_opacity: 0, template_id: 'fresh' },
    mock: {
      banner: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=400&q=80',
      logo: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=100&q=80',
      prod1: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=150&q=80',
      prod2: 'https://images.unsplash.com/photo-1617196019294-dc359a3e7503?auto=format&fit=crop&w=150&q=80',
      prod3: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=150&q=80',
      prod4: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=150&q=80',
    }
  },
  {
    id: 'classic',
    name: 'Classic Delivery',
    description: 'La vieja confiable. Lista simple, carga rápida y clara.',
    config: { theme_color: '#dc2626', logo_position: 'left', banner_opacity: 60, template_id: 'classic' },
    mock: {
      banner: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
      logo: 'https://images.unsplash.com/photo-1595854341625-f33ee104313d?auto=format&fit=crop&w=100&q=80',
      prod1: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=150&q=80',
      prod2: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=150&q=80',
      prod3: '',
      prod4: '',
    }
  }
];

export default function TemplatesPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  // --- NUEVOS ESTADOS ---
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [plan, setPlan] = useState('free'); 

  // 👇 CLIENTE SUPABASE
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const loadCurrent = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session?.user) {
            // Traemos template_id Y subscription_plan
            const { data } = await supabase
                .from('restaurants')
                .select('template_id, subscription_plan')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            if(data) {
                setActiveTemplate(data.template_id);
                
                // 👇 CAMBIO 2: Si tiene CUALQUIER plan (no es null), lo marcamos como 'paid'
                // Esto permite que el plan Light también cambie plantillas
                if (data.subscription_plan) {
                    setPlan('paid');
                } else {
                    setPlan('free');
                }
            }
        }
    };
    loadCurrent();
  }, []);

  const handleSelect = async (template: typeof TEMPLATES_DATA[0]) => {
    // --- BLOQUEO DE SEGURIDAD ---
    // Si sigue en 'free' (sin plan), muestra el modal
    if (plan === 'free') {
        setShowUpgradeModal(true); 
        return;
    }

    setLoadingId(template.id);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('restaurants').update(template.config).eq('user_id', user.id);
      
      setActiveTemplate(template.id);
      setToast(true);
      setTimeout(() => setToast(false), 4000);
    }
    setLoadingId(null);
  };

  return (
    <div className="relative pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Galería de Diseños</h1>
        <p className="text-gray-500 mt-2">Cada plantilla tiene una estructura única pensada para tu rubro.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {TEMPLATES_DATA.map((t) => (
          <div 
            key={t.id} 
            className={`
              relative bg-white rounded-3xl overflow-hidden border-2 transition-all duration-300 flex flex-col
              ${activeTemplate === t.id ? 'border-black ring-4 ring-black/10 scale-[1.02]' : 'border-gray-100 hover:border-gray-300 hover:shadow-xl'}
            `}
          >
            {/* --- VISUALIZACIÓN DINÁMICA (MOCKUP) --- */}
            <div className={`h-[400px] relative overflow-hidden border-b bg-gray-50 group`}>
                
                {/* 1. HEADER */}
                <div className={`relative w-full overflow-hidden ${t.id === 'fresh' ? 'h-24' : 'h-32'}`}>
                   <img src={t.mock.banner} className="w-full h-full object-cover" alt="banner" />
                   <div className="absolute inset-0" style={{ backgroundColor: t.config.theme_color, opacity: t.config.banner_opacity / 100 }} />
                   
                   <div className={`absolute bottom-2 w-full px-4 flex items-end gap-3 ${t.config.logo_position === 'center' ? 'justify-center flex-col items-center text-center bottom-1' : ''}`}>
                      <img src={t.mock.logo} className={`rounded-full border-2 border-white shadow-md object-cover z-10 ${t.id === 'fresh' ? 'w-14 h-14 translate-y-5' : 'w-10 h-10'}`} alt="logo" />
                      
                      {t.id !== 'fresh' && (
                        <div className="text-white z-10 drop-shadow-md pb-1">
                            <div className="h-3 w-24 bg-white/90 rounded mb-1"></div>
                            {t.config.logo_position !== 'center' && <div className="h-2 w-16 bg-white/70 rounded"></div>}
                        </div>
                      )}
                   </div>
                </div>

                {/* 2. CONTENIDO */}
                <div className={`p-4 h-full overflow-hidden ${t.id === 'urban' ? 'bg-gray-900' : 'bg-white'}`}>
                    
                   {/* ESTILO 1: URBANO */}
                   {t.id === 'urban' && (
                     <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-xl border border-gray-700">
                           <div className="flex-1 space-y-2">
                              <div className="h-3 w-3/4 bg-gray-600 rounded"></div>
                              <div className="h-2 w-1/2 bg-gray-700 rounded"></div>
                           </div>
                           <img src={t.mock.prod1} className="w-16 h-16 rounded-lg object-cover" />
                        </div>
                        <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-xl border border-gray-700">
                           <div className="flex-1 space-y-2">
                              <div className="h-3 w-2/3 bg-gray-600 rounded"></div>
                              <div className="h-2 w-1/2 bg-gray-700 rounded"></div>
                           </div>
                           <img src={t.mock.prod2} className="w-16 h-16 rounded-lg object-cover" />
                        </div>
                     </div>
                   )}

                   {/* ESTILO 2: FRESH */}
                   {t.id === 'fresh' && (
                     <div className="pt-6">
                        <div className="text-center mb-4 space-y-1">
                           <div className="h-3 w-24 bg-gray-800 rounded mx-auto"></div>
                           <div className="h-2 w-16 bg-gray-400 rounded mx-auto"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="aspect-square rounded-xl overflow-hidden relative">
                              <img src={t.mock.prod1} className="w-full h-full object-cover" />
                           </div>
                           <div className="aspect-square rounded-xl overflow-hidden relative">
                              <img src={t.mock.prod2} className="w-full h-full object-cover" />
                           </div>
                           <div className="aspect-square rounded-xl overflow-hidden relative">
                              {t.mock.prod3 && <img src={t.mock.prod3} className="w-full h-full object-cover" />}
                           </div>
                           <div className="aspect-square rounded-xl overflow-hidden relative">
                              {t.mock.prod4 && <img src={t.mock.prod4} className="w-full h-full object-cover" />}
                           </div>
                        </div>
                     </div>
                   )}

                   {/* ESTILO 3: CLASSIC */}
                   {t.id === 'classic' && (
                     <div className="space-y-3">
                        <div className="flex gap-3 bg-white border p-2 rounded-lg shadow-sm items-center">
                           <img src={t.mock.prod1} className="w-12 h-12 rounded-md object-cover" />
                           <div className="flex-1 space-y-1">
                              <div className="h-2 w-3/4 bg-gray-800 rounded"></div>
                              <div className="h-2 w-1/4 bg-red-100 rounded"></div>
                           </div>
                           <div className="h-6 w-6 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px]">+</div>
                        </div>
                        <div className="flex gap-3 bg-white border p-2 rounded-lg shadow-sm items-center">
                           <img src={t.mock.prod2} className="w-12 h-12 rounded-md object-cover" />
                           <div className="flex-1 space-y-1">
                              <div className="h-2 w-2/3 bg-gray-800 rounded"></div>
                              <div className="h-2 w-1/3 bg-gray-200 rounded"></div>
                           </div>
                           <div className="h-6 w-6 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px]">+</div>
                        </div>
                     </div>
                   )}

                </div>

                {/* Badge Activo */}
                {activeTemplate === t.id && (
                  <div className="absolute top-3 right-3 bg-black text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 z-20">
                    <Check size={12} /> Seleccionado
                  </div>
                )}
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg">{t.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{t.description}</p>
              </div>
              <button onClick={() => handleSelect(t)} disabled={loadingId !== null} className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTemplate === t.id ? 'bg-green-50 text-green-700 cursor-default' : 'bg-black text-white hover:bg-gray-800'}`}>
                {loadingId === t.id ? <Loader2 className="animate-spin" size={16} /> : activeTemplate === t.id ? 'Diseño Actual' : 'Usar Plantilla'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-5 fade-in">
           <div className="flex items-center gap-3">
              <div className="bg-green-500 text-black p-1 rounded-full"><Check size={14} strokeWidth={3}/></div>
              <div className="text-sm"><span className="font-bold">¡Guardado!</span> Ahora edítalo.</div>
           </div>
           <Link href="/dashboard/design" className="flex items-center gap-2 text-sm font-bold hover:text-green-400 transition whitespace-nowrap">Ir a Personalizar <ArrowRight size={16}/></Link>
        </div>
      )}

      {/* EL POPUP DE BLOQUEO (MODAL) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center relative shadow-2xl animate-in fade-in zoom-in duration-300">
              <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                 <Zap size={32} fill="currentColor" />
              </div>
              <h3 className="text-2xl font-bold mb-2">¡Esta plantilla es Premium!</h3>
              <p className="text-gray-500 mb-6">Para usar diseños profesionales y cambiar la imagen de tu negocio, necesitas activar un Plan (Light o Plus).</p>
              <div className="flex gap-3 flex-col">
                 <Link href="/dashboard/settings" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">
                    Ver Planes y Precios
                 </Link>
                 <button onClick={() => setShowUpgradeModal(false)} className="text-gray-500 font-medium hover:underline">Quizás más tarde</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}