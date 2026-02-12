'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, Plus, Search, Image as ImageIcon, Trash2, Edit2, UtensilsCrossed, Store, Zap, X, Save, UploadCloud, LayoutGrid, List, Check, Layers, DollarSign, AlignLeft, Tag } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const router = useRouter(); 
  const [loading, setLoading] = useState(true);
  
  const templatesSinFoto = ['minimal', 'classic', 'elegant', 'pop', 'bistro'];
  const [products, setProducts] = useState<any[]>([]);
  const [availableExtras, setAvailableExtras] = useState<any[]>([]); 
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]); 

  const [activeTab, setActiveTab] = useState<'products' | 'extras'>('products');
  const [view, setView] = useState('list'); 
  const [isLocked, setIsLocked] = useState(true); 
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false); 
  const [showExtraModal, setShowExtraModal] = useState(false); 
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', description: '', price: '', image_url: '' });
  const [extraFormData, setExtraFormData] = useState({ name: '', price: '' });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
      const savedView = localStorage.getItem('productsView');
      if (savedView) setView(savedView);
  }, []);

  const changeView = (newView: string) => {
      setView(newView);
      localStorage.setItem('productsView', newView);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: rest, error: restError } = await supabase
            .from('restaurants')
            .select('id, subscription_plan, subscription_status, template_id')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (restError) throw restError;

        if (rest) {
            setRestaurantId(rest.id);
            setCurrentPlan(rest.subscription_plan);
            if (rest.template_id) setSelectedTemplate(rest.template_id);

            const hasActivePlan = rest.subscription_plan !== null || rest.subscription_status === 'active';

            if (hasActivePlan) {
                setIsLocked(false);
                const { data: prods } = await supabase.from('products').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false });
                if (prods) setProducts(prods);
                
                const { data: extras } = await supabase.from('extras').select('*').eq('restaurant_id', rest.id).order('name', { ascending: true });
                if (extras) setAvailableExtras(extras);
            } else { 
                setIsLocked(true); 
            }
        }
      } catch (error) { 
          console.error("Error:", error); 
      } finally { 
          setLoading(false); 
      }
    };
    loadData();
  }, [supabase]);

  const openCreateModal = () => {
      if (!isLocked && currentPlan === 'light' && products.length >= 15) {
           if (confirm("🚀 Límite alcanzado. ¿Pasar al plan Plus?")) router.push('/dashboard/settings'); 
           return; 
      }
      setEditingId(null);
      setFormData({ name: '', description: '', price: '', image_url: '' });
      setSelectedExtras([]); 
      setShowModal(true);
  };

  const openEditModal = async (product: any) => {
      setEditingId(product.id);
      setFormData({
          name: product.name,
          description: product.description || '',
          price: product.price,
          image_url: product.image_url || ''
      });
      setSelectedExtras([]); 
      const { data: rels } = await supabase.from('product_extras').select('extra_id').eq('product_id', product.id);
      if (rels) setSelectedExtras(rels.map(r => r.extra_id));
      setShowModal(true);
  };

  const toggleExtra = (extraId: string) => {
      if (selectedExtras.includes(extraId)) setSelectedExtras(selectedExtras.filter(id => id !== extraId));
      else setSelectedExtras([...selectedExtras, extraId]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      setUploading(true);
      const file = e.target.files[0];
      const fileName = `prod_${Math.random()}.${file.name.split('.').pop()}`;
      try {
          await supabase.storage.from('images').upload(fileName, file);
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
          setFormData({ ...formData, image_url: publicUrl });
      } catch (error) { alert('Error al subir imagen'); } finally { setUploading(false); }
  };

  const handleSaveProduct = async () => {
      if (!formData.name || !formData.price) return alert("Nombre y Precio son obligatorios");
      if (!restaurantId) return;
      setSaving(true);
      try {
          let productId = editingId;
          const productData = {
              name: formData.name,
              description: formData.description,
              price: Number(formData.price),
              image_url: formData.image_url
          };

          if (editingId) {
              await supabase.from('products').update(productData).eq('id', editingId);
              setProducts(products.map(p => p.id === editingId ? { ...p, ...productData } : p));
          } else {
              let categoryId;
              const { data: cats } = await supabase.from('categories').select('id').eq('restaurant_id', restaurantId).limit(1);
              if (cats && cats.length > 0) categoryId = cats[0].id;
              else {
                  const { data: newCat } = await supabase.from('categories').insert({ restaurant_id: restaurantId, name: 'General', sort_order: 1 }).select().single();
                  if (newCat) categoryId = newCat.id;
              }
              const { data: inserted } = await supabase.from('products').insert({ restaurant_id: restaurantId, category_id: categoryId, ...productData }).select().single();
              if (inserted) { productId = inserted.id; setProducts([inserted, ...products]); }
          }

          if (productId) {
              await supabase.from('product_extras').delete().eq('product_id', productId);
              if (selectedExtras.length > 0) {
                  await supabase.from('product_extras').insert(selectedExtras.map(extraId => ({ product_id: productId, extra_id: extraId })));
              }
          }
          setShowModal(false);
      } catch (error: any) { alert("Error: " + error.message); } finally { setSaving(false); }
  };

  const handleDeleteProduct = async (id: string) => {
      if(!confirm("¿Eliminar producto?")) return;
      await supabase.from('products').delete().eq('id', id);
      setProducts(products.filter(p => p.id !== id));
  };

  const openCreateExtra = () => { setEditingId(null); setExtraFormData({ name: '', price: '' }); setShowExtraModal(true); };
  const openEditExtra = (extra: any) => { setEditingId(extra.id); setExtraFormData({ name: extra.name, price: extra.price }); setShowExtraModal(true); };
  
  const handleSaveExtra = async () => {
      if (!extraFormData.name || !extraFormData.price) return alert("Campos obligatorios");
      setSaving(true);
      try {
          if (editingId) {
              await supabase.from('extras').update({ name: extraFormData.name, price: Number(extraFormData.price) }).eq('id', editingId);
              setAvailableExtras(availableExtras.map(e => e.id === editingId ? {...e, ...extraFormData, price: Number(extraFormData.price)} : e));
          } else {
              const { data } = await supabase.from('extras').insert({ restaurant_id: restaurantId, name: extraFormData.name, price: Number(extraFormData.price), is_available: true }).select().single();
              if(data) setAvailableExtras([...availableExtras, data]);
          }
          setShowExtraModal(false);
      } catch (error: any) { alert("Error: " + error.message); } finally { setSaving(false); }
  };

  const handleDeleteExtra = async (id: string) => {
      if(!confirm("¿Eliminar este adicional?")) return;
      await supabase.from('extras').delete().eq('id', id);
      setAvailableExtras(availableExtras.filter(e => e.id !== id));
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-violet-600"/></div>;

  return (
    <div className="max-w-6xl mx-auto relative min-h-[80vh] pt-24 md:pt-0 font-sans">
        
        {isLocked && (
            <div className="absolute inset-0 z-50 backdrop-blur-md bg-white/60 flex items-center justify-center rounded-3xl overflow-hidden p-4">
                <div className="bg-white shadow-2xl p-8 rounded-3xl max-w-md w-full text-center border border-violet-100">
                    <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-violet-100 text-violet-600">
                        <Store size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-3 text-gray-800">Comienza a Vender</h2>
                    <Link href="/dashboard/settings" className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-violet-600 text-white hover:bg-violet-700 transition shadow-lg shadow-violet-200">
                        Ver Planes <Zap size={20}/>
                    </Link>
                </div>
            </div>
        )}

        <div className={`space-y-8 ${isLocked ? 'blur-sm pointer-events-none opacity-60' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                        <span className="p-2 bg-violet-100 text-violet-600 rounded-lg"><UtensilsCrossed size={24}/></span>
                        Menú Digital
                    </h1>
                    <p className="text-gray-500 mt-1 ml-1">Administra tus productos y opciones extra.</p>
                </div>

                <div className="bg-gray-100 p-1.5 rounded-xl inline-flex self-start md:self-auto">
                    <button onClick={() => setActiveTab('products')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-white text-violet-700 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                        <UtensilsCrossed size={16} className="inline mr-2"/> Mis Productos
                    </button>
                    <button onClick={() => setActiveTab('extras')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'extras' ? 'bg-white text-violet-700 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                        <Layers size={16} className="inline mr-2"/> Adicionales
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
               {activeTab === 'products' ? (
                   <>
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                            <input placeholder="Buscar producto..." className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-violet-500 transition shadow-sm"/>
                        </div>

                        <div className="flex items-center gap-3">
                             <div className="bg-white border border-gray-200 rounded-xl p-1 flex items-center shadow-sm">
                                <button onClick={() => changeView('list')} className={`p-2 rounded-lg ${view === 'list' ? 'bg-violet-50 text-violet-700' : 'text-gray-400'}`}><List size={20}/></button>
                                <button onClick={() => changeView('grid')} className={`p-2 rounded-lg ${view === 'grid' ? 'bg-violet-50 text-violet-700' : 'text-gray-400'}`}><LayoutGrid size={20}/></button>
                            </div>
                            <button onClick={openCreateModal} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-violet-700 transition shadow-lg active:scale-95">
                                <Plus size={20}/> Nuevo Producto
                            </button>
                        </div>
                   </>
               ) : (
                   <div className="flex justify-end w-full">
                       <button onClick={openCreateExtra} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-violet-700 transition shadow-lg active:scale-95">
                            <Plus size={20}/> Crear Adicional
                        </button>
                   </div>
               )}
            </div>

            {activeTab === 'products' && (
                <div className="mt-6">
                    {products.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center text-gray-500">
                             No hay productos aún.
                        </div>
                    ) : (
                        view === 'list' ? (
                            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Producto</th>
                                            <th className="px-6 py-4">Precio</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {products.map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50 group transition">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                                                            {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover"/> : <ImageIcon className="p-2 text-gray-300 w-full h-full"/>}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900">{p.name}</p>
                                                            <p className="text-[10px] text-gray-400 line-clamp-1">{p.description}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-violet-600">${p.price}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => openEditModal(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={14}/></button>
                                                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {products.map((p) => (
                                    <div key={p.id} className="bg-white border rounded-2xl overflow-hidden group hover:shadow-lg transition">
                                        <div className="aspect-square bg-gray-100 relative">
                                            {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover"/> : <ImageIcon className="p-10 text-gray-200 w-full h-full"/>}
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button onClick={() => openEditModal(p)} className="bg-white p-2 rounded-full shadow text-blue-500"><Edit2 size={12}/></button>
                                                <button onClick={() => handleDeleteProduct(p.id)} className="bg-white p-2 rounded-full shadow text-red-500"><Trash2 size={12}/></button>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <p className="font-bold text-sm truncate">{p.name}</p>
                                            <p className="text-violet-600 font-bold text-xs mt-1">${p.price}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            )}

            {activeTab === 'extras' && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b bg-gray-50">
                        <h3 className="font-bold text-gray-900">Mis Adicionales</h3>
                        <p className="text-xs text-gray-400">Opciones que los clientes pueden sumar a sus platos.</p>
                    </div>
                    <table className="w-full text-left text-sm">
                        <tbody className="divide-y">
                            {availableExtras.map((e) => (
                                <tr key={e.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-medium">{e.name}</td>
                                    <td className="px-6 py-4 text-green-600 font-bold">+${e.price}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => openEditExtra(e)} className="p-2 text-gray-400 hover:text-blue-500"><Edit2 size={14}/></button>
                                        <button onClick={() => handleDeleteExtra(e.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* MODAL PRODUCTO */}
        {showModal && (
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                    <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                        <h2 className="font-bold text-lg text-gray-900">{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                        <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                    </div>

                  <div className="p-6 overflow-y-auto space-y-6 bg-white">
                        
                        {/* 1. SECCIÓN DE FOTO O MENSAJE SEGÚN PLANTILLA */}
                        {selectedTemplate && ['minimal', 'classic', 'elegant', 'pop', 'bistro'].some(t => selectedTemplate.toLowerCase().includes(t)) ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                    <ImageIcon className="text-amber-500" size={24} />
                                </div>
                                <h4 className="text-amber-800 font-bold text-sm">Diseño sin imágenes</h4>
                                <p className="text-amber-700/80 text-xs mt-1 leading-relaxed">
                                    La plantilla <b>{selectedTemplate.toUpperCase()}</b> no utiliza fotos. Si querés usarlas, elegí una plantilla visual en la galería.
                                </p>
                            </div>
                        ) : (
                            <div className="flex justify-center animate-in fade-in zoom-in-95 duration-200">
                                <label className="relative w-full h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-violet-50 hover:border-violet-300 transition-all group overflow-hidden">
                                    {formData.image_url ? (
                                        <>
                                            <img src={formData.image_url} alt="Producto" className="w-full h-full object-cover"/>
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white font-bold text-sm flex items-center gap-2"><UploadCloud size={18}/> Cambiar Foto</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            <div className="bg-white p-3 rounded-full shadow-sm inline-block mb-3"><ImageIcon className="text-violet-400" size={24}/></div>
                                            <p className="text-sm font-bold text-gray-600">Sube una foto atractiva</p>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                </label>
                            </div>
                        )}

                        {/* 2. DATOS BÁSICOS DEL PRODUCTO */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-700 uppercase mb-2 block ml-1 tracking-wider">Nombre del Producto</label>
                                <div className="relative">
                                    <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-violet-500 transition-all" placeholder="Ej: Pizza Napolitana"/>
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 uppercase mb-2 block ml-1 tracking-wider">Precio</label>
                                <div className="relative">
                                    <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-violet-500 transition-all" placeholder="0"/>
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 uppercase mb-2 block ml-1 tracking-wider">Descripción</label>
                                <div className="relative">
                                    <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-violet-500 transition-all min-h-[80px] resize-none" placeholder="Ingredientes, tamaño..."/>
                                    <AlignLeft className="absolute left-3 top-4 text-gray-400" size={18}/>
                                </div>
                            </div>
                        </div>

                        {/* 3. SECCIÓN DE ADICIONALES (EXTRAS) */}
                        <div className="pt-2 border-t border-gray-50">
                            <label className="text-xs font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                                <span className="bg-violet-100 p-1 rounded text-violet-600"><Layers size={14}/></span> 
                                Adicionales Disponibles
                            </label>
                            
                            {availableExtras.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {availableExtras.map(extra => {
                                        const isSelected = selectedExtras.includes(extra.id);
                                        return (
                                            <div 
                                                key={extra.id} 
                                                onClick={() => toggleExtra(extra.id)} 
                                                className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between group ${isSelected ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:bg-violet-50'}`}
                                            >
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-bold text-sm truncate">{extra.name}</span>
                                                    <span className={`text-xs ${isSelected ? 'text-violet-200' : 'text-gray-400'}`}>+${extra.price}</span>
                                                </div>
                                                {isSelected ? <Check size={14} strokeWidth={3}/> : <div className="w-4 h-4 rounded-full border-2 border-gray-200"></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                    <p className="text-sm text-gray-500 mb-2">No tienes adicionales creados.</p>
                                    <button onClick={() => {setShowModal(false); setActiveTab('extras');}} className="text-violet-600 text-sm font-bold hover:underline">Ir a crear Extras</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 border-t bg-gray-50">
                        <button onClick={handleSaveProduct} disabled={saving} className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-violet-700 transition active:scale-[0.98] disabled:opacity-50 shadow-xl">
                            {saving ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Guardar Cambios</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL EXTRA */}
        {showExtraModal && (
            <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="font-bold text-gray-900">{editingId ? 'Editar Extra' : 'Nuevo Extra'}</h2>
                        <button onClick={() => setShowExtraModal(false)}><X size={20} className="text-gray-400"/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <input value={extraFormData.name} onChange={(e) => setExtraFormData({...extraFormData, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none focus:border-violet-500 transition" placeholder="Nombre (Ej: Queso Extra)"/>
                        <input type="number" value={extraFormData.price} onChange={(e) => setExtraFormData({...extraFormData, price: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none focus:border-violet-500 transition" placeholder="Precio adicional"/>
                    </div>
                    <div className="p-6 border-t bg-gray-50">
                        <button onClick={handleSaveExtra} disabled={saving} className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition hover:bg-violet-700 shadow-lg">
                            {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={18}/>} Guardar Extra
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}