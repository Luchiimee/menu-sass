'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit, Trash2, X, Image as ImageIcon, Loader2, Save } from 'lucide-react';

export default function ProductsManager() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para el Modal (Crear/Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    price: '', 
    image_url: '' 
  });
  const [uploading, setUploading] = useState(false);

  // 1. CARGAR PRODUCTOS
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Primero ID del restaurante
    const { data: rest } = await supabase.from('restaurants').select('id').eq('user_id', user.id).single();
    if (rest) {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', rest.id)
        .order('created_at', { ascending: false }); // Los más nuevos primero
      setProducts(data || []);
    }
    setLoading(false);
  };

  // 2. ABRIR MODAL (Nuevo o Editar)
  const openModal = (product?: any) => {
    if (product) {
      setEditingId(product.id);
      setFormData({ 
        name: product.name, 
        description: product.description || '', 
        price: product.price, 
        image_url: product.image_url || '' 
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', description: '', price: '', image_url: '' });
    }
    setIsModalOpen(true);
  };

  // 3. SUBIR IMAGEN
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const fileName = `prod_${Math.random()}.${file.name.split('.').pop()}`;

    try {
      await supabase.storage.from('images').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
      setFormData({ ...formData, image_url: publicUrl });
    } catch (error) {
      alert('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  // 4. GUARDAR (Crear o Actualizar)
  const handleSave = async () => {
    if (!formData.name || !formData.price) return alert("Nombre y Precio son obligatorios");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    // Verificamos usuario
    if (!user) {
        alert("Sesión expirada");
        setLoading(false);
        return;
    }

    const { data: rest } = await supabase.from('restaurants').select('id').eq('user_id', user.id).single();

    // --- CORRECCIÓN AQUÍ: Verificamos que 'rest' exista antes de seguir ---
    if (!rest) {
        alert("Error: No se encontró el restaurante asociado.");
        setLoading(false);
        return;
    }

    try {
      if (editingId) {
        // ACTUALIZAR
        await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description,
            price: Number(formData.price),
            image_url: formData.image_url
          })
          .eq('id', editingId);
      } else {
        // CREAR NUEVO
        // Buscamos una categoría por defecto usando rest.id (ahora seguro)
        const { data: cat } = await supabase.from('categories').select('id').eq('restaurant_id', rest.id).limit(1).single();
        let catId = cat?.id;
        
        // Si no hay categoría, creamos una
        if (!catId) {
            const { data: newCat } = await supabase.from('categories').insert({ restaurant_id: rest.id, name: 'General', sort_order: 1 }).select().single();
            // Validación extra por si falla la creación de categoría
            if (newCat) catId = newCat.id;
        }

        await supabase.from('products').insert({
          restaurant_id: rest.id,
          category_id: catId,
          name: formData.name,
          description: formData.description,
          price: Number(formData.price),
          image_url: formData.image_url
        });
      }
      
      await fetchProducts(); // Recargar lista
      setIsModalOpen(false);

    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al guardar");
    } finally {
      setLoading(false);
    }
  };

  // 5. BORRAR
  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que quieres borrar este producto?')) return;
    await supabase.from('products').delete().eq('id', id);
    setProducts(products.filter(p => p.id !== id));
  };

  // Filtrado de búsqueda
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      
      {/* --- ENCABEZADO --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Menú</h1>
          <p className="text-sm text-gray-500">Administra todos tus platos y precios.</p>
        </div>
        <button 
          onClick={() => openModal()} 
          className="bg-black text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg"
        >
          <Plus size={20} /> Agregar Nuevo
        </button>
      </div>

      {/* --- BARRA DE BÚSQUEDA --- */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar producto..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition"
        />
      </div>

      {/* --- LISTA DE PRODUCTOS --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && products.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Cargando menú...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            {searchTerm ? 'No se encontraron productos' : 'Aún no has agregado productos.'}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Foto</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre y Descripción</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Precio</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-gray-50 transition group">
                  <td className="p-4 w-20">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={16}/></div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{prod.name}</div>
                    <div className="text-xs text-gray-500 line-clamp-1 max-w-xs">{prod.description || '-'}</div>
                  </td>
                  <td className="p-4 font-bold text-gray-900">
                    ${prod.price}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openModal(prod)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(prod.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- MODAL (POPUP) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black transition">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              
              {/* Carga de Imagen */}
              <div className="flex justify-center mb-4">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-black cursor-pointer group transition">
                   <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                   {formData.image_url ? (
                     <img src={formData.image_url} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                       <ImageIcon size={24} />
                       <span className="text-[10px] mt-1">Foto</span>
                     </div>
                   )}
                   {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-30"><Loader2 className="animate-spin"/></div>}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nombre</label>
                <input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border rounded-xl outline-none focus:border-black font-bold"
                  placeholder="Ej: Hamburguesa Doble"
                  autoFocus
                />
              </div>

              <div className="flex gap-4">
                 <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Precio ($)</label>
                    <input 
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="w-full p-3 border rounded-xl outline-none focus:border-black"
                      placeholder="0"
                    />
                 </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Descripción</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 border rounded-xl outline-none focus:border-black text-sm"
                  rows={3}
                  placeholder="Ingredientes, detalles..."
                />
              </div>

              <button 
                onClick={handleSave}
                disabled={loading || uploading}
                className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                {editingId ? 'Guardar Cambios' : 'Crear Producto'}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}