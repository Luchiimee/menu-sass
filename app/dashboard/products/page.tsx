'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, Plus, Search, Image as ImageIcon, Trash2, Edit2, UtensilsCrossed, Store, Zap, X, Save, UploadCloud, LayoutGrid, List, Check, Layers, DollarSign, AlignLeft, Tag, Clock, Info, Star, Video, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { CldUploadWidget } from 'next-cloudinary';

export default function ProductsPage() {
  const router = useRouter(); 
  const [loading, setLoading] = useState(true);
  
  const templatesSinFoto = ['minimal', 'classic', 'elegant', 'pop', 'bistro', 'icecream'];
  const [products, setProducts] = useState<any[]>([]);
  const [availableExtras, setAvailableExtras] = useState<any[]>([]); 
  const [categories, setCategories] = useState<any[]>([]); 
const [showCategoryModal, setShowCategoryModal] = useState(false);
const [categoryFormData, setCategoryFormData] = useState({ name: '' });
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]); 

  const [activeTab, setActiveTab] = useState<'products' | 'extras' | 'categories'>('products');
  const [view, setView] = useState('list'); 
  const [isLocked, setIsLocked] = useState(true);
  const [showBestSellers, setShowBestSellers] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [showModal, setShowModal] = useState(false); 
  const [showExtraModal, setShowExtraModal] = useState(false); 
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string | null>(null);

const [formData, setFormData] = useState({ 
  name: '', 
  description: '', 
  price: '', 
  image_url: '', 
  video_url: '', // <--- AGREGAMOS ESTO
  category_id: '',
  variations: [] as { label: string, price: string, is_featured?: boolean }[]
});
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

        // 1. Detectamos si sos el SuperAdmin para el bypass total
        const isSuperAdmin = session.user.email === 'luchiimee2@gmail.com';
        setIsAdmin(isSuperAdmin);

   const { data: rest, error: restError } = await supabase
    .from('restaurants')
    .select('id, business_type, subscription_plan, subscription_status, template_id, show_best_sellers, best_sellers_activated_at, card_name_bg')
    .eq('user_id', session.user.id)
    .maybeSingle();

if (restError) throw restError;

if (rest) {
    setRestaurantId(rest.id);
    setBusinessType(rest.business_type); // <--- IMPORTANTE: Esto es lo que activa el modo "Kilos"
    setCurrentPlan(rest.subscription_plan);
    
            if (rest.template_id) setSelectedTemplate(rest.template_id);

            // 2. Lógica de Bloqueo: Si no tiene plan y NO es admin, se bloquea la pantalla
            const hasNoPlan = rest.subscription_plan === null;
            setIsLocked(hasNoPlan && !isSuperAdmin);

            // 3. Cargamos los productos y extras
            // (Los cargamos siempre para que el contador 0/15 se actualice incluso si es Light)
            const { data: prods } = await supabase
                .from('products')
                .select('*')
                .eq('restaurant_id', rest.id)
                .order('created_at', { ascending: false });
            
            if (prods) setProducts(prods);
            
            const { data: extras } = await supabase
                .from('extras')
                .select('*')
                .eq('restaurant_id', rest.id)
                .order('name', { ascending: true });
            
            if (extras) setAvailableExtras(extras);

    const { data: cats } = await supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', rest.id)
    .order('sort_order', { ascending: true });

if (cats) setCategories(cats);
        }
      } catch (error) { 
          console.error("Error cargando productos:", error); 
      } finally { 
          setLoading(false); 
      }
    };
    loadData();
  }, [supabase]);

const openCreateModal = () => {
    // Si llegó al límite de su plan y no es Admin
    if (!isAdmin && products.length >= maxProds) {
         const nextPlan = currentPlan === 'light' ? 'GO (hasta 60 productos)' : 'Plus (Ilimitados)';
if (confirm(`🚀 Límite de ${maxProds} productos alcanzado. ¿Pasar al plan ${nextPlan}?`)) {
    router.push('/dashboard/settings');
}
         return; 
    }
    setEditingId(null);
    setFormData({ 
      name: '', description: '', price: '', image_url: '', video_url: '', category_id: '',
      variations: [] 
    });
    setSelectedExtras([]); 
    setShowModal(true);
};

const openEditModal = async (product: any) => {
    setEditingId(product.id);
    setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price || '',
        image_url: product.image_url || '',
        video_url: product.video_url || '',
        category_id: product.category_id || '',
        variations: product.variations || [] 
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
      const isVideo = file.type.startsWith('video/');

      try {
        if (isVideo && isVideoDisabled) {
         setToast("❌ Tu plan actual no admite videos. Sube una imagen o mejora al Plan GO. 🎥");
         setTimeout(() => setToast(null), 5000);
         setUploading(false);
         return;
     }
          if (isVideo) {
              // --- 1. VALIDAR PESO (Máx 10MB) ---
              if (file.size > 10 * 1024 * 1024) {
                  setToast("❌ El video es muy pesado. Máximo 10MB.");
                  setTimeout(() => setToast(null), 4000);
                  setUploading(false);
                  return;
              }

              // --- 2. VALIDAR DURACIÓN (Magia para leer los metadatos antes de subir) ---
              const duration: number = await new Promise((resolve) => {
                  const video = document.createElement('video');
                  video.preload = 'metadata';
                  video.onloadedmetadata = () => {
                      window.URL.revokeObjectURL(video.src);
                      resolve(video.duration);
                  };
                  video.src = URL.createObjectURL(file);
              });

              // Le damos un margen hasta 5.5 por los milisegundos de algunos celulares
              if (duration > 5.5) {
                  setToast("⏱️ El video es muy largo. Debe durar máximo 5 segundos para mantener tu menú rápido.");
                  setTimeout(() => setToast(null), 5000);
                  setUploading(false);
                  return;
              }

              // --- 3. SUBIR A CLOUDINARY (Si pasó las pruebas) ---
              const formDataCloudinary = new FormData();
              formDataCloudinary.append('file', file);
              formDataCloudinary.append('upload_preset', 'snappy_videos');

              
              const cloudName = 'dlm6mc4i2';
           const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
                  method: 'POST',
                  body: formDataCloudinary
              });
             const data = await response.json();
              if (data.secure_url) {
                  setFormData({ ...formData, video_url: data.secure_url, image_url: '' }); 
              } else {
                  console.error("Error de Cloudinary:", data); // Esto te dirá el error si falla
                  throw new Error("Error al subir a Cloudinary");
              }

          } else {
              // --- LÓGICA SUPABASE PARA IMÁGENES (La que ya tenías) ---
              const fileName = `prod_${Math.random()}.${file.name.split('.').pop()}`;
              await supabase.storage.from('images').upload(fileName, file);
              const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
              setFormData({ ...formData, image_url: publicUrl, video_url: '' }); 
          }
      } catch (error) { 
          setToast("❌ Error al subir el archivo."); 
          setTimeout(() => setToast(null), 4000);
      } finally { 
          setUploading(false); 
      }
  };

 const handleSaveProduct = async () => {
    // 1. VALIDACIÓN INTELIGENTE
    const hasVariations = formData.variations && formData.variations.length > 0;
    
    // Si no hay nombre, o si no hay precio único NI variaciones, tira error
    if (!formData.name || (!formData.price && !hasVariations)) {
        return alert("Faltan datos: Nombre y Precio (o al menos una Opción de Venta) son obligatorios.");
    }

    if (!restaurantId) return;
    setSaving(true);

    try {
        let productId = editingId;
        
        // 2. PREPARAMOS LOS DATOS (Incluyendo las nuevas variaciones)
      // 2. PREPARAMOS LOS DATOS (Incluyendo video y variaciones)
        const productData: any = {
            name: formData.name,
            description: formData.description,
            price: formData.price ? Number(formData.price) : 0, 
            image_url: formData.image_url,
            video_url: formData.video_url || null, // <--- GUARDAMOS EL VIDEO
            category_id: formData.category_id || null,
            variations: formData.variations 
        };

        if (editingId) {
            const { error } = await supabase.from('products').update(productData).eq('id', editingId);
            if (error) throw error;
            setProducts(products.map(p => p.id === editingId ? { ...p, ...productData } : p));
        } else {
            // Lógica de categoría por defecto (la misma que ya tenías)
            let categoryIdToUse = formData.category_id;
            if (!categoryIdToUse) {
                const { data: cats } = await supabase.from('categories').select('id').eq('restaurant_id', restaurantId).limit(1);
                if (cats && cats.length > 0) {
                    categoryIdToUse = cats[0].id;
                } else {
                    const { data: newCat } = await supabase.from('categories').insert({ 
                        restaurant_id: restaurantId, name: 'General', sort_order: 1 
                    }).select().single();
                    if (newCat) categoryIdToUse = newCat.id;
                }
            }

            const { data: inserted, error } = await supabase.from('products').insert({ 
                ...productData, 
                restaurant_id: restaurantId, 
                category_id: categoryIdToUse 
            }).select().single();

            if (error) throw error;
            if (inserted) { productId = inserted.id; setProducts([inserted, ...products]); }
        }

        // Lógica de extras (la misma que ya tenías)
        if (productId) {
            await supabase.from('product_extras').delete().eq('product_id', productId);
            if (selectedExtras.length > 0) {
                await supabase.from('product_extras').insert(selectedExtras.map(extraId => ({ product_id: productId, extra_id: extraId })));
            }
        }
        
        setShowModal(false);
    } catch (error: any) { 
        alert("Error al guardar: " + error.message); 
    } finally { 
        setSaving(false); 
    }
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

const handleSaveCategory = async () => {
    if (!categoryFormData.name) return;
    setSaving(true);
    try {
        const { data, error } = await supabase.from('categories').insert({ 
            restaurant_id: restaurantId, 
            name: categoryFormData.name,
            sort_order: categories.length + 1 
        }).select().single();
        
        if (data) {
            setCategories([...categories, data]);
            setShowCategoryModal(false);
            setCategoryFormData({ name: '' });
        }
    } catch (e) { alert("Error al crear categoría"); } finally { setSaving(false); }
};

const handleDeleteCategory = async (id: string) => {
    if (!confirm("¿Borrar categoría? Los productos quedarán sin categoría asignada.")) return;
    await supabase.from('categories').delete().eq('id', id);
    setCategories(categories.filter(c => c.id !== id));
};
  const handleDeleteExtra = async (id: string) => {
      if(!confirm("¿Eliminar este adicional?")) return;
      await supabase.from('extras').delete().eq('id', id);
      setAvailableExtras(availableExtras.filter(e => e.id !== id));
  };

if (loading) return (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[200]">
    <Loader2 className="animate-spin text-violet-600 mb-4" size={40}/>
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">Cargando catálogo...</p>
  </div>
);
const isNoPhotoTemplate = selectedTemplate && templatesSinFoto.some(t => selectedTemplate.toLowerCase().includes(t));

const maxProds = currentPlan === 'light' ? 15 : currentPlan === 'go' ? 60 : 999;
  const isVideoDisabled = currentPlan === 'light' && !isAdmin;
  return (
   <div className="max-w-6xl mx-auto relative min-h-[80vh] pt-4 md:pt-4 font-sans">
        
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

 <div className={`space-y-8 transition-all duration-500 ${isLocked ? 'blur-sm pointer-events-none opacity-60' : ''}`}>
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
    <div>
      <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3 tracking-tight">
        <span className="p-2 bg-violet-100 text-violet-600 rounded-lg"><UtensilsCrossed size={24}/></span>
        Menú Digital
        
        {currentPlan === 'light' && !isAdmin && (
          <span className={`ml-2 px-2 py-0.5 rounded-md text-xs font-bold border ${
              products.length >= 15 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-100 text-gray-500'
          }`}>
              {products.length} / 15
          </span>
        )}
      </h1>

      {/* --- BADGE DE RUBRO ACTUALIZADO --- */}
      <div className="mt-4 flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-sm ${
          businessType === 'fraccionado' 
          ? 'bg-cyan-50 border-cyan-100 text-cyan-700' 
          : 'bg-violet-50 border-violet-100 text-violet-700'
        }`}>
          <Check size={12} strokeWidth={3}/>
          Catálogo adaptado para: {businessType === 'fraccionado' ? 'Venta por Peso / Fraccionado' : 'Venta por Unidad'}
        </div>
      </div>
      <p className="text-slate-500 mt-3 ml-1 text-sm font-medium">Administra tus productos y opciones de tu negocio.</p>
    </div>

    {/* NAVEGACIÓN DE TABS */}
{/* NAVEGACIÓN DE TABS */}
<div className="bg-gray-100 p-1.5 rounded-xl inline-flex self-start md:self-auto shadow-inner">
  <button onClick={() => setActiveTab('products')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-white text-violet-700 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
    <UtensilsCrossed size={16} className="inline mr-2"/> Mis Productos
  </button>
  <button onClick={() => setActiveTab('extras')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'extras' ? 'bg-white text-violet-700 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
    <Layers size={16} className="inline mr-2"/> Adicionales
  </button>
  

{/* Habilitamos categorías para Urban también */}
{['marketpro', 'alterna-pro', 'spotlight', 'urban', 'classic', 'minimal', 'visualgrid'].includes(selectedTemplate || '') && (
  <button onClick={() => setActiveTab('categories')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'categories' ? 'bg-white text-violet-700 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
      <List size={16} className="inline mr-2"/> Categorías
  </button>
)}
</div>
  </div>
      {/* --- EL RESTO DE TU CÓDIGO (Buscador, Tabla, etc.) SIGUE ABAJO --- */}

       {/* --- BARRA DE HERRAMIENTAS Y BÚSQUEDA --- */}
      <div className="mt-8 flex flex-col gap-6">
       {activeTab === 'products' && (
    <div className="flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-300">
        <div className="relative flex-1 max-w-xl flex items-center gap-3">
            
            {/* Buscador */}
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                <input 
                    placeholder="Buscar producto..." 
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-violet-500 transition shadow-sm"
                />
            </div>

         {/* BOTÓN INTELIGENTE "MÁS PEDIDOS" */}
           {['marketpro', 'alterna-pro', 'spotlight', 'urban', 'classic', 'minimal'].includes(selectedTemplate || '') && (
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={async () => {
                            if (!restaurantId) return;
                            const newValue = !showBestSellers;
                            
                            // DETERMINAMOS LA FECHA: Si activa, hoy. Si desactiva, null.
                            const activatedDate = newValue ? new Date().toISOString().split('T')[0] : null;

                            // Actualización en la base de datos (Ambas columnas)
                            const { error } = await supabase
                                .from('restaurants')
                                .update({ 
                                    show_best_sellers: newValue,
                                    best_sellers_activated_at: activatedDate // <--- FECHA DE INICIO
                                })
                                .eq('id', restaurantId);
                            
                            if (!error) {
                                setShowBestSellers(newValue);
                                
                                if (newValue) {
                                    setToast("🚀 ¡Sección activada! Aparecerá en tu menú en 30 días calculando tus ventas reales.");
                                    setTimeout(() => setToast(null), 6000);
                                }
                            } else {
                                setToast("❌ Error al actualizar la configuración.");
                                setTimeout(() => setToast(null), 4000);
                            }
                        }}
                        className={`shrink-0 px-4 py-3 rounded-2xl border transition-all flex items-center gap-2 shadow-sm active:scale-95 ${
                            showBestSellers 
                            ? 'bg-amber-50 border-amber-400 text-amber-700 font-black' 
                            : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                        }`}
                    >
                        <Zap size={16} fill={showBestSellers ? "currentColor" : "none"}/>
                        <span className="hidden sm:inline text-[10px] font-black uppercase tracking-tighter">Más Pedidos</span>
                    </button>

                    {/* Icono de Info con gris fuerte */}
                    <div className="group relative hidden sm:block">
                        <div className="p-2 text-slate-800 hover:text-violet-600 cursor-help transition-colors">
                            <Info size={18} strokeWidth={2.5} />
                        </div>
                        {/* Tooltip explicativo */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-5 bg-slate-900 text-white rounded-[2rem] opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 shadow-2xl z-[100] border border-white/10 text-left">
                            <p className="text-[10px] leading-relaxed font-medium">
                                <b className="text-amber-400 block mb-1 uppercase tracking-widest text-[11px]">¿Cómo funciona?</b>
                                El sistema analizará tus pedidos reales. Una vez pasados **30 días** desde la activación, creará automáticamente la sección destacada para tus clientes.
                            </p>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Botones de Vista y Nuevo Producto */}
        <div className="flex items-center gap-3">
            <div className="bg-white border border-gray-200 rounded-2xl p-1 flex items-center shadow-sm">
                <button onClick={() => changeView('list')} className={`p-2 rounded-xl ${view === 'list' ? 'bg-violet-50 text-violet-700' : 'text-gray-400'}`}><List size={20}/></button>
                <button onClick={() => changeView('grid')} className={`p-2 rounded-xl ${view === 'grid' ? 'bg-violet-50 text-violet-700' : 'text-gray-400'}`}><LayoutGrid size={20}/></button>
            </div>
            <button onClick={openCreateModal} className="bg-violet-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-violet-700 transition shadow-lg active:scale-95">
                <Plus size={20}/> <span className="hidden lg:inline">Nuevo Producto</span>
            </button>
        </div>
    </div>
)}

        {/* --- BOTÓN PARA ADICIONALES (Mantenido) --- */}
        {activeTab === 'extras' && (
          <div className="flex justify-end w-full animate-in fade-in duration-300">
            <button onClick={openCreateExtra} className="bg-violet-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-violet-700 transition shadow-lg active:scale-95">
              <Plus size={20}/> Crear Adicional
            </button>
          </div>
        )}

        {/* --- BOTÓN PARA CATEGORÍAS (Mantenido) --- */}
        {activeTab === 'categories' && (
          <div className="flex justify-end w-full animate-in fade-in duration-300">
            <button onClick={() => setShowCategoryModal(true)} className="bg-violet-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-violet-700 transition shadow-lg">
              <Plus size={16} className="inline mr-1"/> Nueva Categoría
            </button>
          </div>
        )}
      </div>

{/* --- LISTADO DE PRODUCTOS CORREGIDO --- */}
{activeTab === 'products' && (
    <div className="mt-6">
        {products.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center text-gray-500">
                 No hay productos aún.
            </div>
        ) : (
            view === 'list' ? (
                /* 1. CONTENEDOR CON SCROLL HORIZONTAL PARA MOBILE */
                <div className="bg-white border rounded-2xl overflow-x-auto shadow-sm no-scrollbar">
                    {/* 2. MIN-WIDTH PARA QUE NO SE AMONTONE EN EL CELU */}
                    <table className="w-full text-left text-sm min-w-[550px]">
                        <thead className="bg-gray-50 border-b text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Producto</th>
                                <th className="px-6 py-4">Precio</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {products.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3 text-left">
                                      <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 shadow-sm border border-gray-100 relative group">
    {p.image_url ? (
        <img src={p.image_url} className="w-full h-full object-cover" alt={p.name}/>
    ) : p.video_url ? (
        <>
            <img src={p.video_url.replace(/\.[^/.]+$/, ".jpg")} className={`w-full h-full object-cover ${isVideoDisabled ? 'blur-[2px] opacity-40' : 'opacity-80'}`} alt={p.name}/>
            <div className="absolute inset-0 flex items-center justify-center">
                {isVideoDisabled ? (
                    <AlertTriangle size={14} className="text-red-600 animate-pulse" />
                ) : (
                    <Video size={12} className="text-white" />
                )}
            </div>
            {isVideoDisabled && (
                <div className="absolute -bottom-0.5 inset-x-0 bg-red-600 text-[6px] text-white font-black text-center py-0.5 uppercase">
                    Error
                </div>
            )}
        </>
    ) : (
        <ImageIcon className="p-3 text-gray-300 w-full h-full"/>
    )}
</div>
                                            <div className="flex flex-col min-w-0">
                                                {/* NOMBRE NEGRITA Y COMPACTO */}
                                                <p className="font-black text-slate-900 uppercase leading-tight text-xs truncate max-w-[180px]">
                                                    {p.name}
                                                </p>
                                                {/* 3. DESCRIPCIÓN TRUNCADA (SOLO UN POCO) */}
                                                <p className="text-[10px] text-slate-400 font-bold truncate max-w-[220px]">
                                                    {p.description}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <p className="font-black text-violet-600 whitespace-nowrap text-xs bg-violet-50 px-2 py-1 rounded-lg w-fit">
                                            {p.variations && p.variations.length > 0
                                                ? `$ ${p.variations.find((v: any) => v.label.toUpperCase() === '1KG')?.price || p.variations[0].price}`
                                                : `$ ${p.price || 0}`}
                                        </p>
                                    </td>

                                    {/* ACCIONES AL FINAL DEL SCROLL DERECHO */}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => openEditModal(p)} 
                                                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl active:scale-90 transition-transform shadow-sm"
                                            >
                                                <Edit2 size={18}/>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteProduct(p.id)} 
                                                className="hidden md:flex p-2.5 bg-red-50 text-red-500 rounded-xl"
                                            >
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* VISTA EN CUADRICULA (GRID) */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {products.map((p) => (
                        <div key={p.id} className="bg-white border rounded-2xl overflow-hidden group hover:shadow-lg transition">
  <div className="aspect-square bg-gray-100 relative overflow-hidden group">
  {/* 🚀 CASO 1: TIENE IMAGEN */}
  {p.image_url ? (
    <>
      <img 
        src={p.image_url} 
        className={`w-full h-full object-cover transition-all duration-500 ${isNoPhotoTemplate ? 'blur-[4px] opacity-50 grayscale' : ''}`} 
        alt={p.name}
      />
      {isNoPhotoTemplate && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-black/40 backdrop-blur-[1px] z-10">
          <ImageIcon size={24} className="text-white mb-1" />
          <p className="text-[8px] font-black text-white uppercase leading-tight tracking-tighter">
            No visible en <br/> diseño {selectedTemplate?.toUpperCase()}
          </p>
        </div>
      )}
    </>
  ) : p.video_url ? (
    <>
      {/* 🚀 CASO 2: TIENE VIDEO */}
      <img 
        src={p.video_url.replace(/\.[^/.]+$/, ".jpg")} 
        className={`w-full h-full object-cover ${ (isVideoDisabled || isNoPhotoTemplate) ? 'blur-[4px] opacity-50 grayscale' : '' }`} 
        alt={p.name}
      />
      
      {/* PRIORIDAD 1: AVISO DE PLANTILLA (Si Classic no muestra fotos) */}
      {isNoPhotoTemplate ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-black/40 backdrop-blur-[1px] z-10">
          <Video size={24} className="text-white mb-1" />
          <p className="text-[8px] font-black text-white uppercase leading-tight tracking-tighter">
            No visible en <br/> diseño {selectedTemplate?.toUpperCase()}
          </p>
        </div>
      ) : isVideoDisabled ? (
        /* PRIORIDAD 2: AVISO DE PLAN (Si el video está bloqueado por el plan) */
        <div className="absolute inset-0 bg-red-600/20 flex flex-col items-center justify-center p-2 text-center z-10">
          <AlertTriangle size={24} className="text-red-600 mb-1 drop-shadow-md" />
          <p className="text-[8px] font-black text-red-700 uppercase leading-tight bg-white/90 px-2 py-1 rounded-lg shadow-sm">
            Video no disponible <br/> en Plan Light
          </p>
        </div>
      ) : (
        /* ESTADO NORMAL: ICONO DE VIDEO */
        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md p-1.5 rounded-lg border border-white/20">
          <Video size={14} className="text-white" />
        </div>
      )}
    </>
  ) : (
    /* 🚀 CASO 3: SIN NADA (ICONO VACÍO) */
    <ImageIcon className="p-10 text-gray-200 w-full h-full"/>
  )}
  
  {/* BOTONES DE ACCIÓN (Lápiz/Tacho) - Siempre al frente con z-20 */}
  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
    <button onClick={(e) => { e.stopPropagation(); openEditModal(p); }} className="bg-white p-2 rounded-full shadow-lg text-blue-500 hover:scale-110 transition active:scale-95">
      <Edit2 size={12}/>
    </button>
    <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id); }} className="bg-white p-2 rounded-full shadow-lg text-red-500 hover:scale-110 transition active:scale-95">
      <Trash2 size={12}/>
    </button>
  </div>
</div>
                            <div className="p-3">
                                <p className="font-bold text-sm truncate uppercase text-slate-800">{p.name}</p>
                                <p className="font-black text-violet-600 text-sm mt-1">
                                    {p.variations && p.variations.length > 0
                                        ? `$ ${p.variations.find((v: any) => v.label.toUpperCase() === '1KG')?.price || p.variations[0].price}`
                                        : `$ ${p.price || 0}`}
                                </p>
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

{activeTab === 'categories' && (
    <div className="space-y-6 animate-in fade-in duration-300">
        
    
       

        {/* --- TABLA DE CATEGORÍAS (MANTENIDA) --- */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-gray-900">Mis Categorías</h3>
                    <p className="text-xs text-gray-400">Organiza tu menú por secciones (Burgers, Bebidas, etc.)</p>
                </div>
                <button onClick={() => setShowCategoryModal(true)} className="bg-violet-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-violet-700 transition shadow-lg">
                    <Plus size={16} className="inline mr-1"/> Nueva Categoría
                </button>
            </div>
            <table className="w-full text-left text-sm">
                <tbody className="divide-y">
                    {categories.filter(c => c.name.toLowerCase() !== 'general').map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 font-bold text-gray-700 uppercase tracking-tighter italic">{c.name}</td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={() => handleDeleteCategory(c.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
)}
        </div>
      
        {/* MODAL PRODUCTO */}
        {showModal && (
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                    <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              {currentPlan !== 'plus' && currentPlan !== 'max' && !isAdmin && (
    <div className="flex flex-col items-end mr-2">
        <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black ${products.length >= maxProds ? 'text-red-500' : 'text-gray-400'}`}>
                {products.length}/{maxProds}
            </span>
            <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-500 ${products.length >= maxProds ? 'bg-red-500' : currentPlan === 'go' ? 'bg-blue-500' : 'bg-violet-500'}`}
                    style={{ width: `${Math.min((products.length / maxProds) * 100, 100)}%` }}
                />
            </div>
        </div>
        <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">Capacidad del Plan</span>
    </div>
)}
                        <h2 className="font-bold text-lg text-gray-900">{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                        <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                    </div>

                  <div className="p-6 overflow-y-auto space-y-6 bg-white">
                        
                      {/* 1. SECCIÓN DE FOTO O MENSAJE SEGÚN PLANTILLA */}

{selectedTemplate && templatesSinFoto.some(t => selectedTemplate.toLowerCase().includes(t)) ? (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
            <ImageIcon className="text-amber-500" size={24} />
        </div>
        <h4 className="text-amber-800 font-bold text-sm uppercase tracking-tight">Diseño de Carga Rápida</h4>
        <p className="text-amber-700/80 text-[11px] mt-2 leading-relaxed">
            La plantilla <b>{selectedTemplate.toUpperCase()}</b> es un diseño simplificado.<br/> 
            No utiliza imágenes para priorizar la velocidad de carga.
        </p>
    </div>
) : (
    <div className="flex justify-center animate-in fade-in zoom-in-95 duration-200">
        <label className={`relative w-full h-48 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-violet-50 hover:border-violet-300 transition-all group overflow-hidden ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            
            {uploading ? (
                <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-violet-500 mb-2" size={30} />
                    <span className="text-xs font-bold text-violet-700">Subiendo archivo...</span>
                </div>
           ) : formData.video_url ? (
    <>
        <video src={formData.video_url} autoPlay loop muted playsInline className={`w-full h-full object-cover ${isVideoDisabled ? 'blur-md opacity-40' : ''}`} />
        
        {isVideoDisabled ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <div className="bg-red-50 text-red-600 p-3 rounded-2xl mb-2 shadow-xl border border-red-100">
                    <AlertTriangle size={32} />
                </div>
                <h4 className="text-red-700 font-black text-xs uppercase tracking-tighter">Acción requerida</h4>
                <p className="text-[10px] text-gray-500 font-bold max-w-[200px] mt-1">
                    Bajaste al <b>Plan Light</b>. Debes cambiar este video por una imagen o no se mostrará en tu catálogo.
                </p>
            </div>
        ) : (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <p className="text-white font-bold text-sm flex items-center gap-2"><UploadCloud size={18}/> Cambiar Archivo</p>
            </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] text-white font-bold rounded-lg uppercase tracking-widest flex items-center gap-1">
            <Video size={12}/> Video
        </div>
    </>
            ) : formData.image_url ? (
                <>
                    <img src={formData.image_url} alt="Producto" className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-bold text-sm flex items-center gap-2"><UploadCloud size={18}/> Cambiar Archivo</p>
                    </div>
                </>
            ) : (
        <>
                    {/* ESTADO VACÍO: CENTRADO TOTAL SIN RELLENOS EXTRAS */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                        
                        {/* La cápsula de iconos */}
                        <div className="bg-white px-4 py-2 rounded-full shadow-sm inline-flex items-center justify-center mb-3 border border-violet-50 group-hover:scale-110 transition-transform duration-300">
                            <div className="flex items-center gap-2.5 text-violet-500">
                                <ImageIcon size={18}/>
                                <div className="w-[1px] h-4 bg-violet-100"></div>
                                <Video size={18}/>
                            </div>
                        </div>
                        
                        {/* Bloque de textos juntos */}
                        <div className="space-y-0.5">
                           <p className="text-[13px] font-bold text-gray-700">
    {isVideoDisabled ? 'Sube tu imagen' : 'Sube Foto o Video animado'}
</p>
<p className="text-[10px] text-gray-400 font-medium">
    {isVideoDisabled ? 'Formato JPG, PNG o WEBP' : 'Duración ideal: 3 a 5 segundos'}
</p>
                        </div>
                    </div>
                </>
            )}
            {/* EL TRUCO: Aceptar image/* y video/* */}
            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleImageUpload} disabled={uploading} />
        </label>
    </div>
)}

             {/* 2. DATOS BÁSICOS DEL PRODUCTO */}
<div className="space-y-4">
    {/* NOMBRE */}
    <div>
        <label className="text-xs font-bold text-gray-700 uppercase mb-2 block ml-1 tracking-wider text-left">Nombre del Producto</label>
        <div className="relative">
            <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-violet-500 transition-all" placeholder="Ej: Pizza Napolitana"/>
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
        </div>
    </div>

  

{/* LÓGICA DE PRECIO DINÁMICA (PESO/UNIDAD) */}
{businessType === 'fraccionado' ? (
  <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in duration-500 text-left">
    <div className="flex items-center justify-between mb-2">
      <div>
        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
          <Layers size={14} className="text-violet-500"/> Opciones de Venta
        </label>
        <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Marcá con la ⭐ el precio a mostrar</p>
      </div>
      <button 
        type="button"
        onClick={() => setFormData({
          ...formData, 
          variations: [...formData.variations, { label: '', price: '', is_featured: false } as any]
        })}
        className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-black transition-all flex items-center gap-1 shadow-md"
      >
        <Plus size={12}/> Agregar
      </button>
    </div>
    
    <div className="space-y-2">
      {formData.variations.length === 0 ? (
        <div className="text-center py-6 bg-white/50 rounded-xl border border-dashed border-slate-200">
          <p className="text-[10px] text-slate-400 font-medium italic">No hay opciones. Ej: "100g", "Por KG".</p>
        </div>
      ) : (
        formData.variations.map((v: any, index: number) => (
          <div key={index} className={`flex items-center gap-2 p-2 rounded-xl border transition-all duration-300 ${v.is_featured ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-slate-200'}`}>
            
            {/* BOTÓN ESTRELLA: Para elegir precio principal */}
            <button
              type="button"
              onClick={() => {
                const newVars = formData.variations.map((item: any, i: number) => ({
                  ...item,
                  is_featured: i === index
                }));
                setFormData({...formData, variations: newVars});
              }}
              className={`p-1.5 rounded-lg transition-all ${v.is_featured ? 'text-amber-500 scale-110' : 'text-slate-300 hover:text-amber-400'}`}
              title="Mostrar este precio en la carta"
            >
              <Star size={16} fill={v.is_featured ? "currentColor" : "none"} strokeWidth={2.5}/>
            </button>

            <input 
              type="text" 
              placeholder="Ej: 100g" 
              value={v.label}
              onChange={(e) => {
                const newVars = [...formData.variations];
                newVars[index].label = e.target.value;
                setFormData({...formData, variations: newVars});
              }}
              className="flex-1 bg-slate-50 p-2 rounded-lg text-[10px] font-bold outline-none border border-transparent focus:border-violet-200"
            />

            <div className="w-24 relative">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={12}/>
              <input 
                type="number" 
                placeholder="Precio" 
                value={v.price}
                onChange={(e) => {
                  const newVars = [...formData.variations];
                  newVars[index].price = e.target.value;
                  setFormData({...formData, variations: newVars});
                }}
                className="w-full pl-6 p-2 bg-slate-50 rounded-lg text-[10px] font-black outline-none" 
              />
            </div>

            <button 
              type="button"
              onClick={() => {
                const newVars = formData.variations.filter((_: any, i: number) => i !== index);
                setFormData({...formData, variations: newVars});
              }}
              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
            >
              <X size={14}/>
            </button>
          </div>
        ))
      )}
    </div>
  </div>
) : (
  /* PRECIO ÚNICO (ESTÁNDAR) */
  <div>
    <label className="text-xs font-bold text-gray-700 uppercase mb-2 block ml-1 tracking-wider text-left">Precio</label>
    <div className="relative">
      <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-violet-500 transition-all" placeholder="0"/>
      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
    </div>
  </div>
)}
    {/* DESCRIPCIÓN */}
    <div>
        <label className="text-xs font-bold text-gray-700 uppercase mb-2 block ml-1 tracking-wider text-left">Descripción</label>
        <div className="relative">
            <textarea 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})} 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-violet-500 transition-all min-h-[80px] resize-none" 
                placeholder="Ingredientes, tamaño..."
            />
            <AlignLeft className="absolute left-3 top-4 text-gray-400" size={18}/>
        </div>
    </div>


{selectedTemplate && (!templatesSinFoto.some(t => selectedTemplate.toLowerCase().includes(t)) || ['classic', 'minimal', 'visualgrid'].includes(selectedTemplate)) && (
    <div className="pt-2">
        <label className="text-xs font-bold text-gray-700 uppercase mb-2 block ml-1 tracking-wider text-left">Categoría</label>
        <div className="relative">
            <select 
                value={formData.category_id || ''} 
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-violet-500 transition-all appearance-none cursor-pointer"
            >
                <option value="">Seleccionar categoría...</option>
                {categories.filter(c => c.name.toLowerCase() !== 'general').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Layers size={14}/>
            </div>
        </div>
    </div>
)}
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
                                                <div className="flex flex-col overflow-hidden text-left">
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

                   <div className="p-6 border-t bg-gray-50 flex gap-3">
    {/* BOTÓN BORRAR DENTRO DEL MODAL (Solo en mobile y cuando editamos) */}
    {editingId && (
        <button 
            type="button"
            onClick={() => {
                handleDeleteProduct(editingId);
                setShowModal(false); // Cerramos el modal después de borrar
            }} 
            className="md:hidden p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition active:scale-95 flex items-center justify-center"
            title="Eliminar producto"
        >
            <Trash2 size={20}/>
        </button>
    )}

    {/* BOTÓN GUARDAR (Agregamos 'flex-1' para que ocupe el resto del espacio) */}
    <button onClick={handleSaveProduct} disabled={saving} className="flex-1 bg-violet-600 text-white py-4 rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-violet-700 transition active:scale-[0.98] disabled:opacity-50 shadow-xl">
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
        {/* MODAL PARA CREAR CATEGORÍAS */}
{showCategoryModal && (
    <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <h2 className="font-bold text-gray-900">Nueva Categoría</h2>
                <button onClick={() => setShowCategoryModal(false)}><X size={20} className="text-gray-400"/></button>
            </div>
            <div className="p-6 space-y-4">
                <input 
                    value={categoryFormData.name} 
                    onChange={(e) => setCategoryFormData({name: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none focus:border-violet-500 transition" 
                    placeholder="Ej: Hamburguesas, Bebidas..."
                />
            </div>
            <div className="p-6 border-t bg-gray-50">
                <button onClick={handleSaveCategory} disabled={saving} className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition hover:bg-violet-700 shadow-lg">
                    {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={18}/>} Guardar Categoría
                </button>
            </div>
        </div>
    </div>
)}
{/* --- NOTIFICACIÓN PREMIUM (TOAST) --- */}
   
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4 animate-in fade-in slide-in-from-top-10 duration-500">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 p-5 rounded-[2.5rem] shadow-2xl flex items-start gap-4">
            <div className="bg-amber-400 p-2.5 rounded-2xl shadow-lg shrink-0 animate-pulse">
              <Zap size={20} fill="white" className="text-white"/>
            </div>
            <div className="flex-1 pt-1 text-left">
              <p className="text-white text-xs font-bold leading-relaxed">
                {toast}
              </p>
              <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                {/* Barra de tiempo: se vacía en 6 segundos */}
                <div className="h-full bg-amber-400 animate-progress-shrink" style={{ animationDuration: '6s' }} />
              </div>
            </div>
            <button onClick={() => setToast(null)} className="text-white/40 hover:text-white p-1 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}