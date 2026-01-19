'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash, Edit, Image as ImageIcon } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar productos
  useEffect(() => {
    const load = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return;

        // Primero obtenemos el ID del restaurante
        const { data: rest } = await supabase.from('restaurants').select('id').eq('user_id', user.id).single();
        if(rest) {
            const { data: prods } = await supabase.from('products').select('*').eq('restaurant_id', rest.id);
            setProducts(prods || []);
        }
        setLoading(false);
    };
    load();
  }, []);

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Mis Productos</h1>
            <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                <Plus size={16}/> Nuevo Producto
            </button>
        </div>

        {loading ? <p>Cargando...</p> : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4">Imagen</th>
                            <th className="p-4">Nombre</th>
                            <th className="p-4">Precio</th>
                            <th className="p-4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(prod => (
                            <tr key={prod.id} className="border-b hover:bg-gray-50">
                                <td className="p-4">
                                    <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden">
                                        {prod.image_url && <img src={prod.image_url} className="w-full h-full object-cover"/>}
                                    </div>
                                </td>
                                <td className="p-4 font-medium">{prod.name}</td>
                                <td className="p-4">${prod.price}</td>
                                <td className="p-4 flex gap-2">
                                    <button className="p-2 hover:bg-gray-200 rounded"><Edit size={16}/></button>
                                    <button className="p-2 hover:bg-red-100 text-red-600 rounded"><Trash size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {products.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No tienes productos aún.</div>
                )}
            </div>
        )}
    </div>
  );
}