'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Layout, Copy, Check, ExternalLink, Plus, Image as ImageIcon, Trash2, Store, Phone, Bike, LayoutTemplate, Eye, X, Lock, Zap } from 'lucide-react';
import Link from 'next/link';
import { TEMPLATES_DATA } from '../templates/page'; 

export default function DesignPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  
  // ESTADO DE BLOQUEO
  // 'locked' significa que mostramos el vidrio borroso
  const [isLocked, setIsLocked] = useState(true); 
  const [lockReason, setLockReason] = useState<'new_user' | 'upgrade_needed'>('new_user');

  const [data, setData] = useState<any>({
    name: '', description: '', phone: '', delivery_cost: 0, theme_color: '#000000', slug: '', 
    logo_url: '', banner_url: '', logo_position: 'left', banner_opacity: 50,
    template_id: 'classic'
  });

  const [products, setProducts] = useState<any[]>([]);

  // Datos "Fake" para mostrar de fondo si el usuario es nuevo
  const mockData = {
      name: 'Tu Restaurante',
      description: 'Las mejores hamburguesas de la ciudad',
      theme_color: '#000000',
      banner_opacity: 50,
      logo_position: 'left'
  };

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data: rest } = await supabase
            .from('restaurants')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
        
        if(rest && mounted) {
          setData({ ...rest, delivery_cost: rest.delivery_cost || 0 });

          // LÓGICA DE BLOQUEO 🔒
          if (!rest.subscription_plan) {
              // Usuario Nuevo (Sin Plan) -> Bloqueado
              setIsLocked(true);
              setLockReason('new_user');
          } else if (rest.subscription_plan === 'light') {
              // Usuario Light -> Bloqueado (Personalización es Premium)
              setIsLocked(true);
              setLockReason('upgrade_needed');
          } else {
              // Usuario Plus -> Desbloqueado
              setIsLocked(false);
          }

          // Cargar productos
          const { data: prods } = await supabase
            .from('products')
            .select('*')
            .eq('restaurant_id', rest.id)
            .order('created_at', { ascending: true });
          if(prods && mounted) setProducts(prods);

        } else {
           // Si no hay restaurante creado todavía (usuario muy nuevo)
           if(mounted) {
               setData(mockData); // Usamos datos falsos para el fondo
               setIsLocked(true);
               setLockReason('new_user');
           }
        }

      } catch (error) { 
        console.error(error); 
      } finally { 
        if(mounted) setLoading(false); 
      }
    };

    loadData();
    return () => { mounted = false; };
  }, []);

  // --- RENDERS AUXILIARES (Mockup Teléfono, etc) ---
  const displayBanner = data.banner_url || '';
  const displayLogo = data.logo_url || '';
  const displayProducts = products.length > 0 ? products : [
    { id: 'd1', name: 'Hamburguesa Doble', price: 6500, description: 'Cheddar, panceta y salsa especial.' },
    { id: 'd2', name: 'Papas Fritas', price: 3200, description: 'Bastón con provenzal.' },
  ];

  const PhoneMockup = ({ templateId }: { templateId: string }) => {
      // (Tu código de PhoneMockup existente... Lo resumo para no hacer spam, pero ES EL MISMO de antes)
      // Asegúrate de pegar aquí tu componente PhoneMockup completo que ya tenías.
      // Para que funcione el ejemplo, pongo una versión simplificada, pero tú usa la tuya completa.
      return (
        <div className="w-full h-full bg-white flex flex-col overflow-hidden relative">
            <div className="h-32 bg-gray-200 w-full relative">
                {displayBanner && <img src={displayBanner} className="w-full h-full object-cover"/>}
                <div className="absolute inset-0" style={{backgroundColor: data.theme_color, opacity: data.banner_opacity/100}}></div>
            </div>
            <div className="p-4 space-y-3">
                 <div className="font-bold text-lg">{data.name || 'Tu Marca'}</div>
                 {displayProducts.map((p, i) => (
                     <div key={i} className="flex justify-between p-2 border rounded-lg">
                         <div>{p.name}</div>
                         <div className="font-bold">${p.price}</div>
                     </div>
                 ))}
            </div>
        </div>
      )
  };

  if (loading) return <div className="p-10 text-center flex items-center justify-center h-[80vh]"><Loader2 className="animate-spin mr-2"/> Cargando editor...</div>;

  return (
    <div className="relative flex flex-col xl:flex-row gap-6 pb-24 xl:pb-0 min-h-[80vh]">
      
      {/* ------------------------------------------------------- */}
      {/* 🔒 CAPA DE BLOQUEO (EFECTO VIDRIO) 🔒                   */}
      {/* ------------------------------------------------------- */}
      {isLocked && (
        <div className="absolute inset-0 z-50 backdrop-blur-sm bg-white/40 flex items-center justify-center rounded-3xl overflow-hidden p-4">
            <div className="bg-white/90 backdrop-blur-md border border-white/20 shadow-2xl p-8 rounded-3xl max-w-md w-full text-center relative animate-in zoom-in-95 duration-300">
                
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5 ${lockReason === 'new_user' ? 'bg-black text-white' : 'bg-blue-100 text-blue-600'}`}>
                    {lockReason === 'new_user' ? <Store size={32} /> : <Lock size={32} />}
                </div>

                <h2 className="text-2xl font-bold mb-3 text-gray-900">
                    {lockReason === 'new_user' ? '¡Bienvenido a Snappy!' : 'Personalización Avanzada'}
                </h2>
                
                <p className="text-gray-500 mb-8 text-base leading-relaxed">
                    {lockReason === 'new_user' 
                        ? 'Para comenzar a crear tu menú y subir productos, primero debes elegir un plan que se adapte a tu negocio.' 
                        : 'El diseño personalizado, colores y estilos son exclusivos del Plan Plus. Destácate de la competencia.'
                    }
                </p>

                <div className="space-y-3">
                    <Link 
                        href="/dashboard/settings" 
                        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 ${lockReason === 'new_user' ? 'bg-black text-white hover:bg-gray-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {lockReason === 'new_user' ? 'Elegir un Plan' : 'Actualizar a Plan Plus'} 
                        <Zap size={20} fill="currentColor"/>
                    </Link>
                    
                    {lockReason === 'new_user' && (
                        <p className="text-xs text-gray-400">Tienes 14 días de prueba gratis en cualquier plan.</p>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- CONTENIDO DEL EDITOR (SE VE DE FONDO) --- */}
      <div className={`flex-1 flex flex-col xl:flex-row gap-6 ${isLocked ? 'pointer-events-none select-none grayscale-[0.3]' : ''}`}>
          
          {/* EDITOR IZQUIERDA */}
          <div className="flex-1 bg-white p-5 rounded-2xl shadow-sm border space-y-8">
            <div className="flex items-center justify-between opacity-50">
                <div>
                    <span className="bg-black text-white text-xs px-2 py-1 rounded mb-2 inline-block">Editor</span>
                    <h1 className="text-xl font-bold">Personalizar Tienda</h1>
                </div>
            </div>

            {/* Simulación de controles para que se vea "lleno" el fondo */}
            <div className="space-y-6 opacity-60">
                <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    <div className="flex gap-4">
                        <div className="h-20 w-20 bg-gray-100 rounded-xl border-dashed border-2"></div>
                        <div className="h-20 flex-1 bg-gray-100 rounded-xl border-dashed border-2"></div>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="h-10 w-full bg-gray-100 rounded-xl border"></div>
                    <div className="h-20 w-full bg-gray-100 rounded-xl border"></div>
                </div>
                <div className="flex gap-4">
                     <div className="h-10 w-10 rounded bg-black"></div>
                     <div className="h-2 w-full bg-gray-200 rounded mt-4"></div>
                </div>
            </div>

            <button disabled className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg opacity-50">
                Guardar Cambios
            </button>
          </div>

          {/* PREVIEW DERECHA */}
          <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-100 rounded-3xl border p-10 relative h-[calc(100vh-120px)] sticky top-6">
            <div className="w-[320px] h-[650px] bg-white rounded-[40px] border-[8px] border-gray-900 shadow-2xl overflow-hidden relative z-10 flex flex-col opacity-80">
                {/* Aquí iría tu componente PhoneMockup real */}
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300 font-bold">
                    Vista Previa
                </div>
            </div>
          </div>

      </div>

    </div>
  );
}