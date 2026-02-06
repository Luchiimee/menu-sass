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
  
  // --- ESTADOS ---
  const [products, setProducts] = useState<any[]>([]);
  const [availableExtras, setAvailableExtras] = useState<any[]>([]); 
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]); 

  const [activeTab, setActiveTab] = useState<'products' | 'extras'>('products');
  const [view, setView] = useState('list'); 
  const [isLocked, setIsLocked] = useState(true); 
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

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

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: rest } = await supabase.from('restaurants').select('id, subscription_plan').eq('user_id', session.user.id).maybeSingle();

        if (rest) {
            setRestaurantId(rest.id);
            setCurrentPlan(rest.subscription_plan);
            if (rest.subscription_plan) {
                setIsLocked(false);
                const { data: prods } = await supabase.from('products').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: false });
                if (prods) setProducts(prods);
                const { data: extras } = await supabase.from('extras').select('*').eq('restaurant_id', rest.id).order('name', { ascending: true });
                if (extras) setAvailableExtras(extras);
            } else { setIsLocked(true); }
        } else { setIsLocked(true); }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    loadData();
  }, []);

  // --- LOGICA PRODUCTOS ---
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

  // --- LOGICA EXTRAS ---
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
        
        {/* BLOQUEO */}
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
            
            {/* --- HEADER SUPERIOR --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
                        <span className="p-2 bg-violet-100 text-violet-600 rounded-lg"><UtensilsCrossed size={24}/></span>
                        Menú Digital
                    </h1>
                    <p className="text-gray-500 mt-1 ml-1">Administra tus productos y opciones extra.</p>
                </div>

                {/* --- PESTAÑAS TIPO CAPSULA (Nuevo Diseño) --- */}
                <div className="bg-gray-100 p-1.5 rounded-xl inline-flex self-start md:self-auto">
                    <button 
                        onClick={() => setActiveTab('products')}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === 'products' ? 'bg-white text-violet-700 shadow-md transform scale-[1.02]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <UtensilsCrossed size={16}/> Mis Productos
                    </button>
                    <button 
                        onClick={() => setActiveTab('extras')}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === 'extras' ? 'bg-white text-violet-700 shadow-md transform scale-[1.02]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Layers size={16}/> Adicionales
                    </button>
                </div>
            </div>

            {/* --- CONTROLES Y BOTÓN PRINCIPAL --- */}
            <div className="flex flex-wrap items-center justify-between gap-4">
               {activeTab === 'products' ? (
                   <>
                        {/* Buscador */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                            <input 
                                placeholder="Buscar producto..." 
                                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                             <div className="bg-white border border-gray-200 rounded-xl p-1 flex items-center shadow-sm">
                                <button onClick={() => changeView('list')} className={`p-2 rounded-lg transition ${view === 'list' ? 'bg-violet-50 text-violet-700' : 'text-gray-400 hover:text-gray-600'}`}><List size={20}/></button>
                                <button onClick={() => changeView('grid')} className={`p-2 rounded-lg transition ${view === 'grid' ? 'bg-violet-50 text-violet-700' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={20}/></button>
                            </div>
                            <button onClick={openCreateModal} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-violet-700 transition shadow-lg shadow-violet-200 active:scale-95">
                                <Plus size={20}/> Nuevo Producto
                            </button>
                        </div>
                   </>
               ) : (
                   <div className="flex justify-end w-full">
                       <button onClick={openCreateExtra} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-violet-700 transition shadow-lg shadow-violet-200 active:scale-95">
                            <Plus size={20}/> Crear Adicional
                        </button>
                   </div>
               )}
            </div>

            {/* --- CONTENIDO PESTAÑA PRODUCTOS --- */}
            {activeTab === 'products' && (
                <>
                    {products.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UtensilsCrossed size={32} className="text-gray-300"/>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Tu menú está vacío</h3>
                            <p className="text-gray-500 mb-6">Agrega tu primer plato para empezar a vender.</p>
                            <button onClick={openCreateModal} className="text-violet-600 font-bold hover:underline">Crear Producto</button>
                        </div>
                    ) : (
                        <>
                            {view === 'list' ? (
                                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50/50 border-b text-gray-500 uppercase text-xs tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Detalle</th>
                                                <th className="px-6 py-4 font-bold">Precio</th>
                                                <th className="px-6 py-4 font-bold text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {products.map((product) => (
                                                <tr key={product.id} className="hover:bg-violet-50/30 transition group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden border shadow-sm flex-shrink-0">
                                                                {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover"/> : <ImageIcon className="w-full h-full p-3 text-gray-300"/>}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900 text-base">{product.name}</p>
                                                                <p className="text-gray-400 text-xs line-clamp-1 mt-0.5">{product.description || "Sin descripción"}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-violet-700 text-base">
                                                        ${product.price}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openEditModal(product)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 border border-transparent hover:border-blue-100 transition"><Edit2 size={16}/></button>
                                                            <button onClick={() => handleDeleteProduct(product.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 border border-transparent hover:border-red-100 transition"><Trash2 size={16}/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {products.map((product) => (
                                        <div key={product.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-violet-200 transition-all duration-300 group flex flex-col">
                                            <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition z-10">
                                                    <button onClick={() => openEditModal(product)} className="bg-white/90 backdrop-blur p-2 rounded-full shadow text-blue-600 hover:scale-110 transition"><Edit2 size={14}/></button>
                                                    <button onClick={() => handleDeleteProduct(product.id)} className="bg-white/90 backdrop-blur p-2 rounded-full shadow text-red-500 hover:scale-110 transition"><Trash2 size={14}/></button>
                                                </div>
                                                {product.image_url ? (
                                                    <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-500"/>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={40}/></div>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                                                <div className="absolute bottom-3 left-3 text-white font-bold text-lg drop-shadow-md">
                                                    ${product.price}
                                                </div>
                                            </div>
                                            <div className="p-4 flex-1 flex flex-col justify-center">
                                                <h3 className="font-bold text-gray-900 leading-tight">{product.name}</h3>
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* --- CONTENIDO PESTAÑA EXTRAS --- */}
            {activeTab === 'extras' && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-8 text-center bg-violet-50/50 border-b border-violet-100">
                        <Layers className="mx-auto text-violet-400 mb-2" size={32}/>
                        <h3 className="font-bold text-gray-900 text-lg">Biblioteca de Adicionales</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-lg mx-auto">
                            Crea opciones como "Papas Fritas", "Salsa Extra" o "Bebida Grande". 
                            Luego, podrás asignarlas a tus productos individuales.
                        </p>
                    </div>

                    {availableExtras.length === 0 ? (
                        <div className="p-12 text-center">
                            <button onClick={openCreateExtra} className="inline-flex items-center gap-2 text-violet-600 font-bold hover:underline bg-violet-50 px-6 py-3 rounded-xl transition">
                                <Plus size={18}/> Crear mi primer Extra
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-8 py-4 font-bold">Nombre del Extra</th>
                                        <th className="px-8 py-4 font-bold">Precio</th>
                                        <th className="px-8 py-4 font-bold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {availableExtras.map((extra) => (
                                        <tr key={extra.id} className="hover:bg-gray-50 transition">
                                            <td className="px-8 py-4 font-medium text-gray-900">{extra.name}</td>
                                            <td className="px-8 py-4 font-bold text-green-600 bg-green-50 inline-block my-3 ml-8 rounded-lg px-3 py-1 border border-green-100">+ ${extra.price}</td>
                                            <td className="px-8 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openEditExtra(extra)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 size={16}/></button>
                                                    <button onClick={() => handleDeleteExtra(extra.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* --- MODAL PRODUCTO (DISEÑO MEJORADO) --- */}
        {showModal && (
            <div className="fixed inset-0 z-50 bg-[#f0b001]/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-gray-900/5">
                    
                    {/* Header Modal */}
                    <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Producto' : 'Crear Nuevo Producto'}</h2>
                            <p className="text-gray-500 text-sm mt-1">Completa los detalles de tu plato.</p>
                        </div>
                        <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-2 bg-white rounded-full shadow-sm border border-gray-200 transition">
                            <X size={20}/>
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-6 bg-white">
                        
                        {/* FOTO */}
                        <div className="flex justify-center">
                            <label className="relative w-full h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-violet-50 hover:border-violet-300 transition group overflow-hidden">
                                {formData.image_url ? (
                                    <>
                                        <img src={formData.image_url} className="w-full h-full object-cover"/>
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                            <p className="text-white font-bold text-sm flex items-center gap-2"><UploadCloud size={18}/> Cambiar Foto</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-4">
                                        <div className="bg-white p-3 rounded-full shadow-sm inline-block mb-3 group-hover:scale-110 transition">
                                            <ImageIcon className="text-violet-400" size={24}/>
                                        </div>
                                        <p className="text-sm font-bold text-gray-600 group-hover:text-violet-600 transition">Sube una foto atractiva</p>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG hasta 2MB</p>
                                    </div>
                                )}
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        </div>

                        {/* INPUTS CON DISEÑO SOLID */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-700 uppercase mb-2 block ml-1">Nombre del Plato</label>
                                <div className="relative">
                                    <input 
                                        value={formData.name} 
                                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-gray-400" 
                                        placeholder="Ej: Burger Doble Cheddar"
                                    />
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-700 uppercase mb-2 block ml-1">Precio</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={formData.price} 
                                            onChange={(e) => setFormData({...formData, price: e.target.value})} 
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-gray-400" 
                                            placeholder="0"
                                        />
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 uppercase mb-2 block ml-1">Descripción</label>
                                <div className="relative">
                                    <textarea 
                                        value={formData.description} 
                                        onChange={(e) => setFormData({...formData, description: e.target.value})} 
                                        rows={3} 
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all resize-none placeholder:text-gray-400" 
                                        placeholder="Ingredientes principales, detalles..."
                                    />
                                    <AlignLeft className="absolute left-3 top-4 text-gray-400" size={18}/>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN EXTRAS MEJORADA */}
                        <div className="pt-2">
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
                                                className={`
                                                    p-3 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between group
                                                    ${isSelected 
                                                        ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200' 
                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:bg-violet-50'}
                                                `}
                                            >
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="font-bold text-sm truncate">{extra.name}</span>
                                                    <span className={`text-xs ${isSelected ? 'text-violet-200' : 'text-gray-400 group-hover:text-violet-500'}`}>+${extra.price}</span>
                                                </div>
                                                {isSelected ? <div className="bg-white/20 p-1 rounded-full"><Check size={14} strokeWidth={3}/></div> : <div className="w-5 h-5 rounded-full border-2 border-gray-200 group-hover:border-violet-300"></div>}
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
                    {/* Footer Modal */}
                    <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
                        <button onClick={handleSaveProduct} disabled={saving} className="btn-primary w-full bg-violet-600 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-violet-700 transition shadow-lg shadow-violet-200 active:scale-95 disabled:opacity-50">
                            {saving ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Guardar Producto</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- MODAL EXTRA (DISEÑO MEJORADO) --- */}
        {showExtraModal && (
          <div className="fixed inset-0 z-50 bg-[#f0b001]/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden ring-1 ring-gray-900/5">
                    
                     <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Adicional' : 'Nuevo Adicional'}</h2>
                            <p className="text-gray-500 text-xs">Ej: Bacon, Queso Extra...</p>
                        </div>
                        <button onClick={() => setShowExtraModal(false)} className="text-gray-400 hover:text-black p-2 bg-white rounded-full shadow-sm border transition">
                            <X size={18}/>
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-5 bg-white">
                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase mb-2 block ml-1">Nombre</label>
                            <div className="relative">
                                <input value={extraFormData.name} onChange={(e) => setExtraFormData({...extraFormData, name: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-gray-400" placeholder="Ej: Bacon Crocante"/>
                                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase mb-2 block ml-1">Precio Extra</label>
                            <div className="relative">
                                <input type="number" value={extraFormData.price} onChange={(e) => setExtraFormData({...extraFormData, price: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-gray-400" placeholder="0"/>
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 border-t border-gray-100 bg-gray-50">
                        <button onClick={handleSaveExtra} disabled={saving} className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-violet-700 transition shadow-lg shadow-violet-200 active:scale-95 disabled:opacity-50">
                            {saving ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Guardar Extra</>}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}