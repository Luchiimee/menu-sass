'use client';

// 1. Velocidad: No guardar caché
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
// Agregué Zap aquí
import { Plus, Search, Loader2, Trash2, Edit, X, Image as ImageIcon, Save, Zap } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // --- ESTADOS PARA EL MODAL (VENTANA) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProdId, setCurrentProdId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- NUEVOS ESTADOS DE PLAN ---
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [plan, setPlan] = useState('free');

  // Datos del formulario
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: ''
  });

  // --- 1. CARGA RÁPIDA (CON FUSIBLE) ---
  useEffect(() => {
    let mounted = true;
    
    // Fusible de seguridad (2 segs)
    const safetyTimer = setTimeout(() => {
        if (mounted && loading) setLoading(false);
    }, 2000);

    const loadProducts = async () => {
        try {
            // Usamos getSession (Rápido)
            const { data: { session } } = await supabase.auth.getSession();
            if(!session) return;
            
            // Traemos ID y PLAN en la misma consulta
            const { data: rest } = await supabase
                .from('restaurants')
                .select('id, subscription_plan')
                .eq('user_id', session.user.id)
                .single();
            
            if(rest && mounted) {
                setRestaurantId(rest.id);
                // Chequeamos plan
                if (rest.subscription_plan === 'plus' || rest.subscription_plan === 'max') {
                    setPlan('plus');
                }
                
                const { data: prods } = await supabase.from('products').select('*').eq('restaurant_id', rest.id).order('created_at', {ascending: false});
                if(prods) setProducts(prods);
            }
        } catch(e) { console.error(e); } 
        finally { if(mounted) setLoading(false); }
    };

    loadProducts();
    return () => { mounted = false; clearTimeout(safetyTimer); };
  }, []);

  // --- 2. FUNCIONES DEL MODAL ---
  
  const openNewModal = () => {
    // 🛑 BLOQUEO DE SEGURIDAD
    if (plan === 'free') {
        setShowUpgradeModal(true);
        return;
    }

    setFormData({ name: '', description: '', price: '', image_url: '' });
    setIsEditing(false);
    setCurrentProdId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price,
        image_url: product.image_url || ''
    });
    setIsEditing(true);
    setCurrentProdId(product.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSaving(false);
  };

  // --- 3. FUNCIONES DE BASE DE DATOS ---

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const fileName = `prod_${Math.random()}.${file.name.split('.').pop()}`;
    try {
        await supabase.storage.from('images').upload(fileName, file);
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
        setFormData({ ...formData, image_url: publicUrl });
    } catch (error) { alert('Error subiendo imagen'); } 
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price) return alert("Nombre y Precio son obligatorios");
    if (!restaurantId) return;

    setSaving(true);
    try {
        if (isEditing && currentProdId) {
            // ACTUALIZAR
            const { error } = await supabase
                .from('products')
                .update({
                    name: formData.name,
                    description: formData.description,
                    price: Number(formData.price),
                    image_url: formData.image_url
                })
                .eq('id', currentProdId);
            
            if (error) throw error;
            
            // Actualizar lista localmente
            setProducts(products.map(p => p.id === currentProdId ? { ...p, ...formData, price: Number(formData.price) } : p));

        } else {
            // CREAR NUEVO
            // Buscar categoría (o crearla si no existe)
            let categoryId;
            const { data: cats } = await supabase.from('categories').select('id').eq('restaurant_id', restaurantId).limit(1);
            if (cats && cats.length > 0) categoryId = cats[0].id;
            else {
                const { data: newCat } = await supabase.from('categories').insert({ restaurant_id: restaurantId, name: 'General', sort_order: 1 }).select().single();
                if(newCat) categoryId = newCat.id;
            }

            const { data: newProd, error } = await supabase
                .from('products')
                .insert({
                    restaurant_id: restaurantId,
                    category_id: categoryId,
                    name: formData.name,
                    description: formData.description,
                    price: Number(formData.price),
                    image_url: formData.image_url
                })
                .select()
                .single();

            if (error) throw error;
            if (newProd) setProducts([newProd, ...products]);
        }
        closeModal();
    } catch (error: any) {
        alert("Error: " + error.message);
    } finally {
        setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres borrar este producto?")) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
        setProducts(products.filter(p => p.id !== id));
    } else {
        alert("Error al borrar");
    }
  };


  // --- 4. RENDERIZADO ---

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin mr-2"/> Cargando menú...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
        
        {/* CABECERA */}
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Gestión de Menú</h1>
            <button 
                onClick={openNewModal}
                className="bg-black text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-800 transition"
            >
                <Plus size={18}/> Agregar Nuevo
            </button>
        </div>
        
        {/* LISTA DE PRODUCTOS */}
        {products.length === 0 ? (
             <div className="text-center py-20 bg-white border border-dashed rounded-2xl">
                <p className="text-gray-500 mb-4">No tienes productos aún.</p>
                <button onClick={openNewModal} className="text-black underline font-bold">Crear el primero</button>
             </div>
        ) : (
            <div className="grid gap-3">
                {products.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-xl border flex gap-4 items-center shadow-sm hover:shadow-md transition">
                        
                        {/* FOTO */}
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border">
                            {p.image_url ? (
                                <img src={p.image_url} className="w-full h-full object-cover"/>
                            ) : (
                                <ImageIcon className="w-6 h-6 m-auto mt-5 text-gray-300"/>
                            )}
                        </div>

                        {/* INFO */}
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{p.name}</h3>
                            <p className="text-sm text-gray-500 line-clamp-1">{p.description || "Sin descripción"}</p>
                            <div className="text-sm font-bold mt-1">${p.price}</div>
                        </div>

                        {/* ACCIONES */}
                        <div className="flex gap-2">
                            <button 
                                onClick={() => openEditModal(p)}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition" 
                                title="Editar"
                            >
                                <Edit size={18}/>
                            </button>
                            <button 
                                onClick={() => handleDelete(p.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" 
                                title="Borrar"
                            >
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- MODAL (VENTANA EMERGENTE) --- */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    
                    {/* Header Modal */}
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-lg">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                        <button onClick={closeModal} className="text-gray-400 hover:text-black"><X size={20}/></button>
                    </div>

                    {/* Body Modal */}
                    <div className="p-6 space-y-4">
                        
                        {/* Imagen Upload */}
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-gray-100 rounded-xl border border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group cursor-pointer">
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10"/>
                                {formData.image_url ? (
                                    <img src={formData.image_url} className="w-full h-full object-cover"/>
                                ) : (
                                    <ImageIcon className="text-gray-400"/>
                                )}
                                {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin"/></div>}
                            </div>
                            <div className="text-sm text-gray-500">
                                <p className="font-bold text-gray-700">Foto del plato</p>
                                <p className="text-xs">Recomendado: Cuadrada</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                            <input 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full p-3 border rounded-xl outline-none focus:border-black"
                                placeholder="Ej: Hamburguesa Doble"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio</label>
                                <input 
                                    type="number"
                                    value={formData.price} 
                                    onChange={e => setFormData({...formData, price: e.target.value})}
                                    className="w-full p-3 border rounded-xl outline-none focus:border-black"
                                    placeholder="$ 0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción</label>
                            <textarea 
                                value={formData.description} 
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="w-full p-3 border rounded-xl outline-none focus:border-black resize-none"
                                rows={3}
                                placeholder="Ingredientes, detalles..."
                            />
                        </div>
                    </div>

                    {/* Footer Modal */}
                    <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                        <button onClick={closeModal} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">Cancelar</button>
                        <button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="px-6 py-2 bg-black text-white font-bold rounded-lg flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50"
                        >
                            {saving && <Loader2 className="animate-spin" size={16}/>}
                            {isEditing ? 'Guardar Cambios' : 'Crear Producto'}
                        </button>
                    </div>

                </div>
            </div>
        )}

        {/* --- MODAL UPGRADE (BLOQUEO) --- */}
        {showUpgradeModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center relative shadow-2xl animate-in fade-in zoom-in duration-300">
                    <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                        <Zap size={32} fill="currentColor" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">¡Límite de Productos!</h3>
                    <p className="text-gray-500 mb-6">El Plan Free te permite probar la plataforma, pero para gestionar un menú real necesitas el Plan Plus.</p>
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