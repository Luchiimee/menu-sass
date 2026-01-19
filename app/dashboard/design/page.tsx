'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Smartphone, Loader2, ImageIcon, Layout, Copy, Check, ExternalLink } from 'lucide-react';
// Importamos los datos de las plantillas para usar sus fotos por defecto
import { TEMPLATES_DATA } from '../templates/page'; 

export default function DesignPage() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [data, setData] = useState<any>({
    name: '', description: '', phone: '', theme_color: '#000000', slug: '', 
    logo_url: '', banner_url: '', logo_position: 'left', banner_opacity: 50,
    template_id: 'classic' // ID de la plantilla seleccionada
  });

  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) return;

      const { data: rest } = await supabase.from('restaurants').select('*').eq('user_id', user.id).single();
      if(rest) {
        setData(rest);
        const { data: prods } = await supabase.from('products').select('*').eq('restaurant_id', rest.id).limit(4).order('created_at', { ascending: true });
        if(prods) setProducts(prods);
      }
    };
    loadData();
  }, []);

  // --- LOGICA INTELIGENTE DE IMÁGENES ---
  // Si el usuario no tiene foto, buscamos la foto de la plantilla que eligió
  const activeTemplateMock = TEMPLATES_DATA.find(t => t.id === data.template_id)?.mock || TEMPLATES_DATA[2].mock;
  
  const displayBanner = data.banner_url || activeTemplateMock.banner;
  const displayLogo = data.logo_url || activeTemplateMock.logo;

  // ----------------------------------------

  const copyLink = () => {
    navigator.clipboard.writeText(`https://snappy.uno/${data.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, productId?: string) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const fileName = `${Math.random()}.${file.name.split('.').pop()}`;

    try {
      await supabase.storage.from('images').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);

      if (field === 'product_image' && productId) {
         setProducts(prev => prev.map(p => p.id === productId ? { ...p, image_url: publicUrl } : p));
      } else {
         setData({ ...data, [field]: publicUrl });
      }
    } catch (error) { alert('Error subiendo imagen'); } finally { setUploading(false); }
  };

  const handleSave = async () => {
    setLoading(true);
    await supabase.from('restaurants').update(data).eq('id', data.id);
    // Guardado simple de productos para el demo
    for (const prod of products) await supabase.from('products').update({ name: prod.name, price: prod.price, image_url: prod.image_url }).eq('id', prod.id);
    setLoading(false);
    alert("¡Guardado!");
  };

  if (!data.id) return <div className="p-10 text-center"><Loader2 className="animate-spin inline"/> Cargando...</div>;

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-100px)]">
      
      {/* --- EDITOR (Izquierda) --- */}
      <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border overflow-y-auto custom-scrollbar">
        <h1 className="text-xl font-bold mb-6">Personalizar Tienda</h1>

        <div className="space-y-8">
            {/* Link Section */}
            <section className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-2">
                <div className="flex-1 flex items-center bg-white border rounded-lg overflow-hidden">
                    <span className="bg-gray-100 text-gray-500 text-sm px-3 py-2 border-r">snappy.uno/</span>
                    <input value={data.slug} onChange={(e) => setData({...data, slug: e.target.value})} className="w-full p-2 outline-none font-bold text-gray-800"/>
                </div>
                <button onClick={copyLink} className="bg-blue-600 text-white p-2.5 rounded-lg">{copied ? <Check size={18}/> : <Copy size={18}/>}</button>
            </section>

            {/* Branding Uploads */}
            <section className="space-y-4 border-b pb-6">
                <h3 className="font-bold flex items-center gap-2"><Layout size={18}/> Diseño Base ({data.template_id})</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer relative">
                        <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'logo_url')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <img src={displayLogo} className="h-12 w-12 object-cover mx-auto rounded-full shadow" />
                    </div>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer relative overflow-hidden">
                        <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'banner_url')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <img src={displayBanner} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                        <div className="relative z-0 text-gray-800 font-bold text-xs">Cambiar Portada</div>
                    </div>
                </div>
                
                {/* Controles Visuales */}
                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold">Color Principal</label>
                        <input type="color" value={data.theme_color} onChange={(e) => setData({...data, theme_color: e.target.value})} className="w-8 h-8 rounded border-none"/>
                    </div>
                    <div>
                        <div className="flex justify-between mb-1"><label className="text-xs font-bold">Opacidad Portada</label><span className="text-xs">{data.banner_opacity}%</span></div>
                        <input type="range" min="0" max="90" value={data.banner_opacity} onChange={(e) => setData({...data, banner_opacity: parseInt(e.target.value)})} className="w-full h-2 bg-gray-200 rounded-lg accent-black"/>
                    </div>
                </div>
            </section>

            {/* Datos Básicos */}
            <section className="space-y-3">
                <input value={data.name} onChange={(e) => setData({...data, name: e.target.value})} placeholder="Nombre del Negocio" className="w-full p-2 border rounded-lg font-bold" />
                <textarea rows={2} value={data.description} onChange={(e) => setData({...data, description: e.target.value})} placeholder="Descripción..." className="w-full p-2 border rounded-lg text-sm" />
            </section>

            <button onClick={handleSave} disabled={loading || uploading} className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition shadow-lg sticky bottom-0 z-20">
                {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
        </div>
      </div>

      {/* --- PREVIEW LIVE (Derecha) --- */}
      <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-3xl border p-4 lg:p-10 relative">
        <div className="w-[340px] h-[700px] bg-white rounded-[40px] border-[10px] border-gray-900 shadow-2xl overflow-hidden relative z-10 flex flex-col">
            
            {/* Header (Común a todos, cambia estilo) */}
            <div className={`relative w-full flex-shrink-0 ${data.template_id === 'fresh' ? 'h-32' : 'h-40'} flex items-end p-4 text-white transition-all`}>
                <img src={displayBanner} className="absolute inset-0 w-full h-full object-cover z-0" />
                <div className="absolute inset-0 z-1" style={{ backgroundColor: data.theme_color, opacity: data.banner_opacity / 100 }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-2"></div>

                <div className={`relative z-10 w-full flex items-center gap-3 ${data.logo_position === 'center' ? 'flex-col text-center justify-end h-full pb-2' : data.logo_position === 'right' ? 'flex-row-reverse text-right' : 'flex-row'}`}>
                    <img src={displayLogo} className={`rounded-full border-2 border-white shadow-md object-cover ${data.template_id === 'fresh' ? 'w-16 h-16 translate-y-8' : 'w-14 h-14'}`} />
                    {data.template_id !== 'fresh' && (
                        <div>
                            <h2 className="font-bold text-lg leading-tight drop-shadow-md">{data.name || 'Tu Negocio'}</h2>
                            {data.logo_position !== 'center' && <p className="text-[10px] opacity-90 line-clamp-1">{data.description}</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* --- CONTENIDO SEGÚN PLANTILLA --- */}
            <div className={`flex-1 overflow-y-auto no-scrollbar p-3 ${data.template_id === 'urban' ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
                
                {data.template_id === 'fresh' && <div className="text-center mt-6 mb-4"><h2 className="font-bold text-gray-900 text-xl">{data.name}</h2><p className="text-xs text-gray-500">{data.description}</p></div>}

                <div className={data.template_id === 'fresh' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                    {products.map((p, i) => {
                        // FALLBACK DE PRODUCTO: Si no tiene foto, usamos una de la plantilla
                        const prodImg = p.image_url || Object.values(activeTemplateMock)[i + 2] || activeTemplateMock.prod1;
                        
                        // RENDERIZADO CONDICIONAL POR TIPO DE PLANTILLA
                        if (data.template_id === 'fresh') {
                            return (
                                <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden group">
                                    <img src={prodImg} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white">
                                        <p className="text-xs font-bold truncate">{p.name}</p>
                                        <p className="text-[10px]">${p.price}</p>
                                    </div>
                                </div>
                            );
                        } 
                        
                        if (data.template_id === 'urban') {
                            return (
                                <div key={p.id} className="bg-gray-800 p-3 rounded-xl border border-gray-700 flex gap-3 items-center">
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-white">{p.name}</div>
                                        <div className="text-[10px] text-gray-400 mt-1">${p.price}</div>
                                    </div>
                                    <img src={prodImg} className="w-16 h-16 rounded-lg object-cover" />
                                </div>
                            );
                        }

                        // Classic Default
                        return (
                            <div key={p.id} className="bg-white p-2.5 rounded-xl border flex gap-3 shadow-sm">
                                <img src={prodImg} className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
                                <div className="flex-1">
                                    <div className="font-bold text-sm text-gray-900">{p.name}</div>
                                    <div className="text-[10px] text-gray-500 line-clamp-1">{p.description}</div>
                                    <div className="font-bold text-gray-900 text-xs mt-1">${p.price}</div>
                                </div>
                                <div className="self-center bg-gray-100 p-1 rounded-full"><div className="w-4 h-4 bg-black text-white rounded-full flex items-center justify-center text-[10px]">+</div></div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
        </div>
      </div>
    </div>
  );
}