'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Loader2, Layout, Copy, Check, ExternalLink, Plus, Image as ImageIcon, ArrowRight, Trash2, Store } from 'lucide-react';
import Link from 'next/link';
import { TEMPLATES_DATA } from '../templates/page'; 

export default function DesignPage() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [data, setData] = useState<any>({
    name: '', description: '', phone: '', theme_color: '#000000', slug: '', 
    logo_url: '', banner_url: '', logo_position: 'left', banner_opacity: 50,
    template_id: 'classic'
  });

  const [products, setProducts] = useState<any[]>([]);
  const [newProd, setNewProd] = useState({ name: '', price: '', description: '', image_url: '' });

  // 1. CARGA INICIAL
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;

        const { data: rest } = await supabase.from('restaurants').select('*').eq('user_id', user.id).single();
        
        if(rest) {
          setData(rest);
          const { data: prods } = await supabase
              .from('products')
              .select('*')
              .eq('restaurant_id', rest.id)
              .order('created_at', { ascending: true });
          
          if(prods) setProducts(prods);
        }
      } catch (error) {
        console.error("Error cargando datos", error);
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
  }, []);

  // --- MOCKUPS ---
  const activeTemplate = TEMPLATES_DATA.find(t => t.id === data.template_id) || TEMPLATES_DATA[2];
  const mockImages = activeTemplate.mock;
  const displayBanner = data.banner_url || mockImages.banner;
  const displayLogo = data.logo_url || mockImages.logo;

  // Para el celular mostramos TODOS los productos reales
  const displayProducts = products.length > 0 ? products : [
    { id: 'demo1', name: 'Producto Ejemplo 1', price: 1200, description: 'Descripción corta.', image_url: null },
    { id: 'demo2', name: 'Producto Ejemplo 2', price: 850, description: 'Otra descripción.', image_url: null },
    { id: 'demo3', name: 'Producto Ejemplo 3', price: 1500, description: 'Plato especial.', image_url: null },
    { id: 'demo4', name: 'Producto Ejemplo 4', price: 900, description: 'Postre.', image_url: null },
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
    if (!data.id) return alert("Error: No se identificó el restaurante. Recarga la página.");
    
    setLoading(true);

    try {
        let categoryId;
        const { data: cats } = await supabase.from('categories').select('id').eq('restaurant_id', data.id).limit(1);
        
        if (cats && cats.length > 0) {
            categoryId = cats[0].id;
        } else {
            const { data: newCat, error: catError } = await supabase.from('categories').insert({ restaurant_id: data.id, name: 'General', sort_order: 1 }).select().single();
            if (catError) throw new Error("Error creando categoría: " + catError.message);
            categoryId = newCat.id;
        }

        const { error: prodError } = await supabase.from('products').insert({
            restaurant_id: data.id,
            category_id: categoryId,
            name: newProd.name,
            description: newProd.description,
            price: Number(newProd.price),
            image_url: newProd.image_url
        });

        if (prodError) throw prodError;

        const { data: refreshedProducts } = await supabase
            .from('products')
            .select('*')
            .eq('restaurant_id', data.id)
            .order('created_at', { ascending: true });

        if (refreshedProducts) {
            setProducts(refreshedProducts);
            setNewProd({ name: '', price: '', description: '', image_url: '' }); 
        }

    } catch (error: any) {
        console.error(error);
        alert("Error al guardar: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteQuick = async (id: string) => {
     if(!confirm("¿Borrar este producto?")) return;
     const { error } = await supabase.from('products').delete().eq('id', id);
     if (!error) {
         setProducts(products.filter(p => p.id !== id));
     } else {
         alert("No se pudo borrar: " + error.message);
     }
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from('restaurants').update(data).eq('id', data.id);
    setLoading(false);
    if (error) alert("Error al guardar diseño: " + error.message);
    else alert("¡Diseño guardado correctamente!");
  };

  if (initialLoading) return <div className="p-10 text-center flex items-center justify-center h-full"><Loader2 className="animate-spin mr-2"/> Cargando editor...</div>;

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-100px)]">
      
      {/* --- PANEL IZQUIERDO (Editor) --- */}
      <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3 mb-6">
            <span className="bg-black text-white text-xs px-2 py-1 rounded">Editor</span>
            <h1 className="text-xl font-bold">{activeTemplate.name}</h1>
        </div>

        <div className="space-y-8">
            
            {/* Link */}
            <section className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-2">
                <div className="flex-1 flex items-center bg-white border rounded-lg overflow-hidden">
                    <span className="bg-gray-100 text-gray-500 text-sm px-3 py-2 border-r">snappy.uno/</span>
                    <input value={data.slug} onChange={(e) => setData({...data, slug: e.target.value})} className="w-full p-2 outline-none font-bold text-gray-800"/>
                </div>
                <button onClick={copyLink} className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 transition" title="Copiar Link">
                    {copied ? <Check size={18}/> : <Copy size={18}/>}
                </button>
                <a href={`/${data.slug}`} target="_blank" className="bg-white border text-gray-600 p-2.5 rounded-lg hover:bg-gray-50 transition" title="Ver mi menú">
                    <ExternalLink size={18}/>
                </a>
            </section>

            {/* Identidad */}
            <section className="space-y-4 border-b pb-6">
                <h3 className="font-bold flex items-center gap-2"><Layout size={18}/> Identidad Visual</h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer relative group">
                        <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'logo_url')} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                        <img src={displayLogo} className="h-16 w-16 object-cover mx-auto rounded-full shadow-md" />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold bg-white/80 opacity-0 group-hover:opacity-100 z-10 transition">Cambiar Logo</div>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer relative overflow-hidden group">
                        <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'banner_url')} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                        <img src={displayBanner} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold bg-white/80 opacity-0 group-hover:opacity-100 z-10 transition">Cambiar Portada</div>
                    </div>
                </div>
                
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nombre del Negocio</label>
                        <input value={data.name} onChange={(e) => setData({...data, name: e.target.value})} className="w-full p-3 border rounded-xl font-bold outline-none focus:border-black" placeholder="Ej: Burger King"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Descripción / Slogan</label>
                        <textarea value={data.description} onChange={(e) => setData({...data, description: e.target.value})} className="w-full p-3 border rounded-xl text-sm outline-none focus:border-black" rows={2} placeholder="Ej: Las mejores hamburguesas..."/>
                    </div>
                </div>

                <div className="flex gap-4 items-center bg-gray-50 p-3 rounded-lg mt-2">
                    <input type="color" value={data.theme_color} onChange={(e) => setData({...data, theme_color: e.target.value})} className="w-8 h-8 rounded border-none cursor-pointer"/>
                    <div className="flex-1">
                         <label className="text-xs font-bold block mb-1">Opacidad Portada: {data.banner_opacity}%</label>
                         <input type="range" min="0" max="90" value={data.banner_opacity} onChange={(e) => setData({...data, banner_opacity: parseInt(e.target.value)})} className="w-full h-1.5 bg-gray-300 rounded-lg accent-black cursor-pointer"/>
                    </div>
                </div>
            </section>

            {/* Carga Inicial Limitada */}
            <section className="space-y-4">
                <div className="flex justify-between items-end">
                    <h3 className="font-bold flex items-center gap-2"><Store size={18}/> Carga Inicial</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {Math.min(products.length, 2)} / 2 Agregados
                    </span>
                </div>

                {/* LISTA DE AGREGADOS (LIMITADA A 2 VISUALMENTE) */}
                {products.length > 0 && (
                    <div className="space-y-2 mb-4 bg-white border border-gray-100 rounded-xl p-2">
                        {/* AQUI ESTA EL CAMBIO: .slice(0, 2) */}
                        {products.slice(0, 2).map(p => (
                            <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition">
                                <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden border">
                                    {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover"/> : <ImageIcon size={16} className="m-auto mt-2 text-gray-400"/>}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold">{p.name}</div>
                                    <div className="text-xs text-gray-500">${p.price}</div>
                                </div>
                                {/* Solo dejamos borrar si son estos primeros 2 para el onboarding */}
                                {products.length <= 2 && (
                                    <button onClick={() => handleDeleteQuick(p.id)} className="text-red-500 p-2 hover:bg-red-50 rounded" title="Borrar">
                                        <Trash2 size={16}/>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* FORMULARIO (Se oculta si ya hay 2 o más) */}
                {products.length < 2 ? (
                    <div className="bg-gray-50 border p-4 rounded-xl space-y-3 relative animate-in fade-in">
                        {uploading && <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center"><Loader2 className="animate-spin"/></div>}
                        
                        <div className="flex gap-3">
                            <div className="w-16 h-16 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center relative cursor-pointer hover:border-black transition flex-shrink-0 group">
                                <input type="file" accept="image/*" onChange={handleNewProdImage} className="absolute inset-0 opacity-0 cursor-pointer" />
                                {newProd.image_url ? <img src={newProd.image_url} className="w-full h-full object-cover rounded-lg"/> : <div className="text-center"><ImageIcon size={20} className="text-gray-400 mx-auto"/><span className="text-[9px] text-gray-400">Foto</span></div>}
                            </div>
                            <div className="flex-1 space-y-2">
                                <input value={newProd.name} onChange={(e) => setNewProd({...newProd, name: e.target.value})} placeholder="Nombre (Ej: Pizza)" className="w-full p-2 border rounded text-sm font-bold outline-none focus:border-black"/>
                                <input type="number" value={newProd.price} onChange={(e) => setNewProd({...newProd, price: e.target.value})} placeholder="Precio ($)" className="w-full p-2 border rounded text-sm outline-none focus:border-black"/>
                            </div>
                        </div>
                        
                        <textarea value={newProd.description} onChange={(e) => setNewProd({...newProd, description: e.target.value})} placeholder="Descripción del plato (Ingredientes...)" rows={2} className="w-full p-2 border rounded text-sm outline-none focus:border-black"/>

                        <button onClick={handleAddProduct} disabled={loading || !newProd.name || !newProd.price} className="w-full bg-black text-white py-3 rounded-lg text-sm font-bold hover:bg-gray-800 flex justify-center gap-2 items-center">
                            {loading ? <Loader2 className="animate-spin" size={14}/> : <Plus size={14}/>}
                            Agregar Producto
                        </button>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-200 p-6 rounded-xl text-center animate-in zoom-in-95">
                        <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check size={20} />
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1">¡Carga Inicial Completa!</h4>
                        <p className="text-sm text-gray-600 mb-4">Ya tienes {products.length} productos cargados.</p>
                        
                        <Link href="/dashboard/products" className="block w-full bg-green-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-green-700 transition flex items-center justify-center gap-2">
                            Gestionar Todos <ArrowRight size={16}/>
                        </Link>
                    </div>
                )}
            </section>

            <button onClick={handleSave} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition shadow-lg sticky bottom-0 z-10">
                Guardar Diseño Global
            </button>
        </div>
      </div>

      {/* --- PREVIEW CELULAR --- */}
      <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-3xl border p-4 lg:p-10 relative">
        <div className="w-[340px] h-[700px] bg-white rounded-[40px] border-[10px] border-gray-900 shadow-2xl overflow-hidden relative z-10 flex flex-col">
            
            {/* HEADER */}
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

            {/* BODY - Aquí SÍ mostramos todos para que veas como queda el menú completo */}
            <div className={`flex-1 overflow-y-auto no-scrollbar p-3 ${data.template_id === 'urban' ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
                
                {data.template_id === 'fresh' && (
                    <div className="text-center mt-6 mb-4 px-2">
                        <h2 className="font-bold text-gray-900 text-lg">{data.name || 'Nombre del Local'}</h2>
                        <p className="text-xs text-gray-500 mt-1">{data.description}</p>
                    </div>
                )}

                <div className={data.template_id === 'fresh' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                    {displayProducts.map((p, i) => {
                        const mockKey = `prod${i + 1}` as keyof typeof mockImages;
                        const fallbackImg = mockImages[mockKey] || mockImages.prod1;
                        const finalImg = p.image_url || fallbackImg; 

                        if (data.template_id === 'fresh') {
                            return (
                                <div key={p.id || i} className="relative aspect-square rounded-xl overflow-hidden group shadow-sm bg-gray-200">
                                    <img src={finalImg} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white">
                                        <p className="text-xs font-bold truncate">{p.name}</p>
                                        <p className="text-[10px]">${p.price}</p>
                                    </div>
                                </div>
                            );
                        } 
                        
                        if (data.template_id === 'urban') {
                            return (
                                <div key={p.id || i} className="bg-gray-800 p-3 rounded-xl border border-gray-700 flex gap-3 items-center">
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-white">{p.name}</div>
                                        <div className="text-[10px] text-gray-400 mt-1 line-clamp-1">{p.description}</div>
                                        <div className="text-xs font-bold text-white mt-1">${p.price}</div>
                                    </div>
                                    <img src={finalImg} className="w-16 h-16 rounded-lg object-cover bg-gray-700" />
                                </div>
                            );
                        }

                        return (
                            <div key={p.id || i} className="bg-white p-2.5 rounded-xl border flex gap-3 shadow-sm">
                                <img src={finalImg} className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
                                <div className="flex-1">
                                    <div className="font-bold text-sm text-gray-900">{p.name}</div>
                                    <div className="text-[10px] text-gray-500 line-clamp-1">{p.description}</div>
                                    <div className="font-bold text-gray-900 text-xs mt-1">${p.price}</div>
                                </div>
                                <div className="self-center bg-gray-100 p-1 rounded-full"><div className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-bold">+</div></div>
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