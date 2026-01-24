'use client';

// 1. ESTA LÍNEA ES OBLIGATORIA
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
// Usamos createBrowserClient para evitar errores de sesión
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, Layout, Copy, Check, ExternalLink, Plus, Image as ImageIcon, Trash2, Store, Phone, Bike, LayoutTemplate, Eye, X, Lock, Zap, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { TEMPLATES_DATA } from '../templates/page'; 

export default function DesignPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  
  // Lógica de bloqueo
  const [isLocked, setIsLocked] = useState(true);

  // Cliente Supabase en vivo
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [data, setData] = useState<any>({
    name: '', description: '', phone: '', delivery_cost: 0, theme_color: '#000000', slug: '', 
    logo_url: '', banner_url: '', logo_position: 'left', banner_opacity: 50,
    template_id: 'classic'
  });

  const [products, setProducts] = useState<any[]>([]);
  const [newProd, setNewProd] = useState({ name: '', price: '', description: '', image_url: '' });

  // Datos Fake para mostrar de fondo si está bloqueado
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

        const userId = session.user.id;

        // 1. Cargar datos del restaurante
        const { data: rest } = await supabase
            .from('restaurants')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if(rest && mounted) {
          setData({ ...rest, delivery_cost: rest.delivery_cost || 0 });
          
          // --- LÓGICA DE BLOQUEO CORREGIDA ---
          // Solo bloqueamos si NO tiene plan (es decir, usuario nuevo).
          // Si tiene Light O Plus, se desbloquea.
          if (!rest.subscription_plan) {
              setIsLocked(true);
          } else {
              setIsLocked(false);
          }

          // 3. Cargar Productos
          const { data: prods } = await supabase
            .from('products')
            .select('*')
            .eq('restaurant_id', rest.id)
            .order('created_at', { ascending: true });
            
          if(prods && mounted) setProducts(prods);
        } else {
           // Si no hay restaurante (usuario muy nuevo) -> BLOQUEADO
           if(mounted) {
               setData(mockData);
               setIsLocked(true);
           }
        }

      } catch (error) { 
        console.error("Error cargando:", error); 
        if(mounted) setIsLocked(true);
      } finally { 
        if(mounted) setLoading(false); 
      }
    };

    loadData();

    return () => { mounted = false; };
  }, []);

  // --- LÓGICA VISUAL ---
  const activeTemplateId = previewTemplateId || data.template_id;
  const activeTemplate = TEMPLATES_DATA.find(t => t.id === activeTemplateId) || TEMPLATES_DATA[0];
  const mockImages = activeTemplate?.mock || {};
  
  const displayBanner = data.banner_url || (mockImages as any).banner || '';
  const displayLogo = data.logo_url || (mockImages as any).logo || '';

  const displayProducts = products.length > 0 ? products : [
    { id: 'demo1', name: 'Producto Ejemplo 1', price: 1200, description: 'Descripción corta.', image_url: null },
    { id: 'demo2', name: 'Producto Ejemplo 2', price: 850, description: 'Otra descripción.', image_url: null },
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(`https://snappy.uno/${data.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
    try {
      await supabase.storage.from('images').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
      setData({ ...data, [field]: publicUrl });
    } catch (error) { alert('Error subiendo imagen'); } finally { setUploading(false); }
  };

  const handleNewProdImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const fileName = `prod_${Math.random()}.${file.name.split('.').pop()}`;
    try {
        await supabase.storage.from('images').upload(fileName, file);
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
        setNewProd({ ...newProd, image_url: publicUrl });
    } catch (error) { alert('Error imagen producto'); } finally { setUploading(false); }
  };

  const handleAddProduct = async () => {
    if (!newProd.name || !newProd.price) return alert("Nombre y precio obligatorios");
    try {
        let categoryId;
        const { data: cats } = await supabase.from('categories').select('id').eq('restaurant_id', data.id).limit(1);
        if (cats && cats.length > 0) categoryId = cats[0].id;
        else {
            const { data: newCat } = await supabase.from('categories').insert({ restaurant_id: data.id, name: 'General', sort_order: 1 }).select().single();
            if(newCat) categoryId = newCat.id;
        }
        if (!categoryId) throw new Error("No se pudo asignar categoría");

        await supabase.from('products').insert({
            restaurant_id: data.id, category_id: categoryId, name: newProd.name, description: newProd.description, price: Number(newProd.price), image_url: newProd.image_url
        });
        const { data: refreshed } = await supabase.from('products').select('*').eq('restaurant_id', data.id).order('created_at', { ascending: true });
        if (refreshed) { 
            setProducts(refreshed); 
            setNewProd({ name: '', price: '', description: '', image_url: '' }); 
        }
    } catch (error: any) { alert("Error: " + error.message); }
  };

  const handleDeleteQuick = async (id: string) => {
     if(!confirm("¿Borrar este producto?")) return;
     const { error } = await supabase.from('products').delete().eq('id', id);
     if (!error) setProducts(products.filter(p => p.id !== id));
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from('restaurants').update(data).eq('id', data.id);
    setLoading(false);
    if (error) alert("Error: " + error.message);
    else alert("¡Guardado!");
  };

  const PhoneMockup = ({ templateId }: { templateId: string }) => {
      const t = TEMPLATES_DATA.find(t => t.id === templateId) || TEMPLATES_DATA[0];
      const safeTemplateId = t?.id || 'classic';
      
      return (
        <div className="w-full h-full bg-white flex flex-col overflow-hidden relative">
             {/* ... (Tu código del Mockup igual que antes) ... */}
             {safeTemplateId === 'fresh' ? (
                 <div className="flex-shrink-0 bg-white z-10 pb-2">
                    <div className="relative w-full h-28 overflow-hidden z-0">
                         <img src={displayBanner} className="absolute inset-0 w-full h-full object-cover z-0" />
                         <div className="absolute inset-0 z-1" style={{ backgroundColor: data.theme_color, opacity: data.banner_opacity / 100 }}></div>
                    </div>
                    <div className="relative z-20 mx-auto -mt-10 w-20 h-20 rounded-full border-[3px] border-white shadow-md overflow-hidden bg-white">
                         <img src={displayLogo} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center px-4 mt-2">
                        <h2 className="font-bold text-sm text-gray-900 leading-tight truncate">{data.name || 'Tu Negocio'}</h2>
                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-tight">{data.description}</p>
                    </div>
                 </div>
             ) : (
                 <div className={`relative w-full flex-shrink-0 h-36 flex items-end p-4 text-white`}>
                    <img src={displayBanner} className="absolute inset-0 w-full h-full object-cover z-0" />
                    <div className="absolute inset-0 z-1" style={{ backgroundColor: data.theme_color, opacity: data.banner_opacity / 100 }}></div>
                    <div className={`relative z-10 w-full flex gap-3 
                        ${data.logo_position === 'center' ? 'flex-col items-center justify-end text-center pb-2' : 'flex-row items-end text-left'} 
                        ${data.logo_position === 'right' ? 'flex-row-reverse text-right' : ''}
                    `}>
                        <img src={displayLogo} className="w-14 h-14 rounded-full border-2 border-white shadow-md object-cover flex-shrink-0" />
                        <div className={`flex-1 min-w-0 flex flex-col justify-end mb-0.5 ${data.logo_position === 'center' ? 'w-full' : ''}`}>
                            <h2 className="font-bold text-sm leading-tight truncate">{data.name || 'Tu Negocio'}</h2>
                            <p className={`text-[10px] opacity-90 line-clamp-2 leading-tight mt-1 font-medium
                                ${data.logo_position === 'center' ? 'mx-auto' : ''}
                                ${data.logo_position === 'right' ? 'ml-auto' : ''}
                            `}>
                                {data.description}
                            </p>
                        </div>
                    </div>
                </div>
             )}
            
            <div className={`flex-1 overflow-y-auto no-scrollbar p-3 ${safeTemplateId === 'urban' ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
                 <div className={safeTemplateId === 'fresh' ? 'grid grid-cols-2 gap-2' : 'space-y-3'}>
                    {displayProducts.map((p, i) => {
                         const mockKey = `prod${i + 1}` as keyof typeof mockImages;
                         const fallbackImg = (mockImages as any)[mockKey] || (mockImages as any).prod1 || '';
                         const finalImg = p.image_url || fallbackImg; 

                         if (safeTemplateId === 'fresh') {
                            return (
                                <div key={i} className="relative aspect-square rounded-xl overflow-hidden shadow-sm bg-gray-200">
                                    <img src={finalImg} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white">
                                        <p className="text-xs font-bold truncate">{p.name}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-[10px]">${p.price}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                         }
                         if (safeTemplateId === 'classic') {
                             return (
                                <div key={i} className="bg-white border border-gray-100 p-2 rounded-lg flex gap-3 shadow-sm items-center">
                                    <img src={finalImg} className="w-12 h-12 rounded object-cover flex-shrink-0 bg-gray-100" />
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="text-xs font-bold text-gray-900 truncate">{p.name}</div>
                                        <div className="text-[9px] text-gray-500 line-clamp-1">{p.description}</div>
                                        <div className="text-[10px] font-bold text-gray-900 mt-1">${p.price}</div>
                                    </div>
                                    <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs shadow-sm flex-shrink-0">+</div>
                                </div>
                             );
                         }
                         if (safeTemplateId === 'urban') {
                            return (
                               <div key={i} className="bg-gray-800 border border-gray-700 p-2 rounded-lg flex gap-3 shadow-sm items-center">
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="text-xs font-bold text-white truncate">{p.name}</div>
                                        <div className="text-[9px] text-gray-400 line-clamp-1">{p.description}</div>
                                        <div className="text-[10px] font-bold text-white mt-1">${p.price}</div>
                                    </div>
                                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs shadow-sm flex-shrink-0">+</div>
                                    <img src={finalImg} className="w-12 h-12 rounded object-cover flex-shrink-0 bg-gray-700" />
                               </div>
                            );
                        }
                    })}
                 </div>
            </div>
        </div>
      );
  };

  if (loading) return <div className="p-10 text-center flex items-center justify-center h-[80vh]"><Loader2 className="animate-spin mr-2"/> Cargando editor...</div>;

  return (
    <div className="relative min-h-[85vh]">
      
      {/* ---------------------------------------------------- */}
      {/* 🔒 CAPA DE BLOQUEO (EFECTO VIDRIO) SOLO SI NO HAY PLAN */}
      {/* ---------------------------------------------------- */}
      {isLocked && (
        <div className="absolute inset-0 z-50 backdrop-blur-sm bg-white/50 flex items-center justify-center rounded-3xl overflow-hidden p-4">
            <div className="bg-white shadow-2xl p-8 rounded-3xl max-w-md w-full text-center border border-gray-100 animate-in zoom-in-95 duration-300">
                <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-black text-white">
                    <Store size={32} />
                </div>

                <h2 className="text-2xl font-bold mb-3 text-gray-900">
                    Bienvenido a Snappy
                </h2>
                
                <p className="text-gray-500 mb-8 text-base leading-relaxed">
                    Para comenzar a crear tu menú y subir productos, primero debes elegir un plan que se adapte a tu negocio.
                </p>

                <div className="space-y-3">
                    <Link 
                        href="/dashboard/settings" 
                        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 bg-black text-white hover:bg-gray-800"
                    >
                        Elegir un Plan <Zap size={20} fill="currentColor"/>
                    </Link>
                    
                    <p className="text-xs text-gray-400">14 días de prueba gratis en cualquier plan.</p>
                </div>
            </div>
        </div>
      )}

      {/* --- AQUÍ ESTÁ TU DISEÑO ORIGINAL (CON BLUR SI ESTÁ BLOQUEADO) --- */}
      <div className={`transition-all duration-500 ${isLocked ? 'blur-sm pointer-events-none opacity-60 select-none' : ''}`}>
          
          <div className="flex flex-col xl:flex-row gap-6 pb-24 xl:pb-0">
            
            {/* --- EDITOR --- */}
            <div className="flex-1 bg-white p-5 rounded-2xl shadow-sm border space-y-8 animate-in fade-in slide-in-from-bottom-4">
              
              <div className="flex items-center justify-between">
                  <div>
                      <span className="bg-black text-white text-xs px-2 py-1 rounded mb-2 inline-block">Editor</span>
                      <h1 className="text-xl font-bold">Personalizar Tienda</h1>
                  </div>
                  <a href={`/${data.slug}`} target="_blank" className="xl:hidden bg-gray-100 text-gray-700 p-2 rounded-lg text-xs font-bold flex items-center gap-1">
                      Ver Tienda <ExternalLink size={14}/>
                  </a>
              </div>

              {/* SELECTOR PLANTILLAS (SOLO MOBILE) */}
              <section className="bg-gray-50 p-4 rounded-xl border lg:hidden">
                  <h3 className="font-bold flex items-center gap-2 mb-3 text-sm uppercase text-gray-500"><LayoutTemplate size={16}/> Elegir Diseño</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {TEMPLATES_DATA.map((t) => (
                          <div key={t.id} className="flex items-center gap-2">
                              <button 
                                  onClick={() => setData({...data, template_id: t.id})}
                                  className={`flex-1 p-2 rounded-lg border text-center transition flex items-center justify-center gap-2 ${data.template_id === t.id ? 'bg-black text-white border-black ring-2 ring-black/20' : 'bg-white hover:bg-gray-100'}`}
                              >
                                  <span className="text-xs font-bold">{t.name}</span>
                                  {data.template_id === t.id && <Check size={14}/>}
                              </button>
                              <button onClick={() => setPreviewTemplateId(t.id)} className="p-2 bg-white border rounded-lg hover:bg-gray-100 text-gray-500"><Eye size={16} /></button>
                          </div>
                      ))}
                  </div>
              </section>

              {/* --- LINK / DOMINIO --- */}
              <section className="border rounded-xl overflow-hidden">
                  <div className="bg-yellow-50 px-4 py-3 flex items-start gap-2 border-b border-yellow-100">
                      <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0"/>
                     <p className="text-xs text-yellow-800">
    Este será el enlace de tu menú digital. Puedes personalizarlo para que sea fácil de recordar.
    Puedes poner el nombre de tu negocio
</p>
                  </div>
                  <div className="flex items-center bg-white p-1">
                      <div className="bg-gray-100 px-3 py-3 rounded-l-lg border-r text-gray-500 text-sm font-medium">snappy.uno/</div>
                      <input 
                          value={data.slug} 
                          onChange={(e) => setData({...data, slug: e.target.value})} 
                          className="flex-1 p-3 outline-none font-bold text-gray-800 bg-white" 
                          placeholder="nombre-de-tu-negocio"
                      />
                      <button onClick={copyLink} className="p-3 bg-white text-gray-500 hover:text-black border-l border-r"><Copy size={18}/></button>
                      <a href={`/${data.slug}`} target="_blank" className="p-3 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-black rounded-r-lg" title="Ir al link"><ExternalLink size={18}/></a>
                  </div>
              </section>

              {/* Identidad */}
              <section className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><Layout size={18}/> Identidad</h3>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center relative group hover:bg-gray-50 cursor-pointer">
                          <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'logo_url')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                          <img src={displayLogo} className="h-14 w-14 object-cover mx-auto rounded-full shadow-md" />
                          <p className="text-[10px] text-gray-400 mt-2 font-bold">Cambiar Logo</p>
                      </div>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center relative group overflow-hidden hover:bg-gray-50 cursor-pointer">
                          <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'banner_url')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                          <img src={displayBanner} className="absolute inset-0 w-full h-full object-cover opacity-40" />
                          <div className="relative z-0 flex items-center justify-center h-full"><p className="text-[10px] text-gray-600 font-bold bg-white/80 px-2 py-1 rounded">Cambiar Portada</p></div>
                      </div>
                  </div>
                  
                  <div className="space-y-3">
                      <input value={data.name} onChange={(e) => setData({...data, name: e.target.value})} className="w-full p-3 border rounded-xl font-bold outline-none" placeholder="Nombre del Negocio"/>
                      <textarea 
                          value={data.description || ''} 
                          onChange={(e) => setData({...data, description: e.target.value})} 
                          className="w-full p-3 border rounded-xl text-sm outline-none" 
                          rows={2} 
                          placeholder="Descripción breve..."
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                      {/* --- WHATSAPP --- */}
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Recibir Pedidos en:</label>
                          <div className="flex items-center border rounded-xl overflow-hidden bg-white">
                              <div className="bg-green-50 p-3 border-r text-green-600"><Phone size={16}/></div>
                              <input value={data.phone || ''} onChange={(e) => setData({...data, phone: e.target.value})} className="w-full p-3 text-sm outline-none font-bold" placeholder="WhatsApp (Ej: 11...)"/>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">A este número llegarán las alertas.</p>
                      </div>

                      {/* --- COSTO ENVÍO --- */}
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Costo de Envío:</label>
                          <div className="flex items-center border rounded-xl overflow-hidden bg-white">
                              <div className="bg-gray-50 p-3 border-r text-gray-400"><Bike size={16}/></div>
                              <input type="number" value={data.delivery_cost} onChange={(e) => setData({...data, delivery_cost: Number(e.target.value)})} className="w-full p-3 text-sm outline-none font-bold" placeholder="0"/>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">Se sumará al total del pedido.</p>
                      </div>
                  </div>

                  <div className="flex gap-4 items-center bg-gray-50 p-3 rounded-xl">
                      <input type="color" value={data.theme_color} onChange={(e) => setData({...data, theme_color: e.target.value})} className="w-10 h-10 rounded border cursor-pointer"/>
                      <div className="flex-1">
                            <label className="text-xs font-bold block mb-1 text-gray-500">Opacidad Portada</label>
                            <input type="range" min="0" max="90" value={data.banner_opacity} onChange={(e) => setData({...data, banner_opacity: parseInt(e.target.value)})} className="w-full h-1.5 bg-gray-300 rounded-lg accent-black cursor-pointer"/>
                      </div>
                  </div>
              </section>

              {/* Carga Rápida */}
              <section className="space-y-4 pt-4 border-t">
                  <h3 className="font-bold flex items-center gap-2"><Store size={18}/> Agregar Plato Rápido</h3>
                  
                  {products.length > 0 && (
                      <div className="space-y-2 mb-4 bg-white border border-gray-100 rounded-xl p-2">
                          {products.slice(0, 2).map(p => (
                              <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition">
                                  <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden border">
                                      {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover"/> : <ImageIcon size={16} className="m-auto mt-2 text-gray-400"/>}
                                  </div>
                                  <div className="flex-1">
                                      <div className="text-sm font-bold">{p.name}</div>
                                      <div className="text-xs text-gray-500">${p.price}</div>
                                  </div>
                                  {products.length <= 2 && (
                                      <button onClick={() => handleDeleteQuick(p.id)} className="text-red-500 p-2 hover:bg-red-50 rounded" title="Borrar">
                                          <Trash2 size={16}/>
                                      </button>
                                  )}
                              </div>
                          ))}
                      </div>
                  )}

                  {products.length < 2 ? (
                      <div className="bg-gray-50 border p-4 rounded-xl space-y-3 relative">
                          {uploading && <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center"><Loader2 className="animate-spin"/></div>}
                          <div className="flex gap-3">
                              <div className="w-16 h-16 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center relative cursor-pointer">
                                  <input type="file" accept="image/*" onChange={handleNewProdImage} className="absolute inset-0 opacity-0 cursor-pointer" />
                                  {newProd.image_url ? <img src={newProd.image_url} className="w-full h-full object-cover rounded-lg"/> : <ImageIcon size={20} className="text-gray-400"/>}
                              </div>
                              <div className="flex-1 space-y-2">
                                  <input value={newProd.name} onChange={(e) => setNewProd({...newProd, name: e.target.value})} placeholder="Nombre" className="w-full p-2 border rounded text-sm font-bold"/>
                                  <input type="number" value={newProd.price} onChange={(e) => setNewProd({...newProd, price: e.target.value})} placeholder="$ Precio" className="w-full p-2 border rounded text-sm"/>
                              </div>
                          </div>
                          
                          <textarea 
                              value={newProd.description} 
                              onChange={(e) => setNewProd({...newProd, description: e.target.value})} 
                              placeholder="Descripción del plato (Ej: Con papas y gaseosa...)" 
                              className="w-full p-2 border rounded text-sm outline-none resize-none"
                              rows={2}
                          />
                          <button onClick={handleAddProduct} disabled={loading || !newProd.name} className="w-full bg-black text-white py-3 rounded-lg text-sm font-bold flex justify-center gap-2 items-center">
                              <Plus size={14}/> Agregar
                          </button>
                      </div>
                  ) : (
                      <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                          <Check size={20} className="mx-auto text-green-600 mb-2"/>
                          <p className="text-sm font-bold text-green-800">Carga inicial completa</p>
                          <Link href="/dashboard/products" className="text-xs text-green-600 underline mt-1 block">Gestionar menú completo</Link>
                      </div>
                  )}
              </section>

              <button onClick={handleSave} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg sticky bottom-4 z-10">
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>

            {/* --- PREVIEW ESCRITORIO --- */}
            <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-100 rounded-3xl border p-10 relative h-[calc(100vh-120px)] sticky top-6">
              <div className="w-[320px] h-[650px] bg-white rounded-[40px] border-[8px] border-gray-900 shadow-2xl overflow-hidden relative z-10 flex flex-col">
                  <PhoneMockup templateId={data.template_id} />
              </div>
              <div className="absolute bottom-6 text-gray-400 text-xs font-medium">Vista Previa en Vivo</div>
            </div>

            {/* --- MODAL PREVIEW MÓVIL --- */}
            {previewTemplateId && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="relative w-full max-w-sm h-[80vh] bg-white rounded-3xl overflow-hidden shadow-2xl">
                        <button onClick={() => setPreviewTemplateId(null)} className="absolute top-4 right-4 z-20 bg-black text-white p-2 rounded-full shadow-lg"><X size={20} /></button>
                        <PhoneMockup templateId={previewTemplateId} />
                        <div className="absolute bottom-4 left-4 right-4 z-20">
                            <button onClick={() => { setData({...data, template_id: previewTemplateId}); setPreviewTemplateId(null); }} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-xl hover:bg-green-700 transition">Usar este Diseño</button>
                        </div>
                    </div>
                </div>
            )}

          </div>
      </div>
    </div>
  );
}