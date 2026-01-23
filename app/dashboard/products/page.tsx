'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, Plus, Search, Image as ImageIcon, Trash2, Edit2, Archive, MoreHorizontal, UtensilsCrossed, Store, Zap } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(true); // Bloqueado por defecto
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 1. Verificar Restaurante y Plan
        const { data: rest } = await supabase
            .from('restaurants')
            .select('id, subscription_plan')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (rest) {
            setRestaurantId(rest.id);
            // Lógica de desbloqueo: Cualquier plan sirve
            if (rest.subscription_plan) {
                setIsLocked(false);
                
                // Si está desbloqueado, cargamos productos
                const { data: prods } = await supabase
                    .from('products')
                    .select('*')
                    .eq('restaurant_id', rest.id)
                    .order('created_at', { ascending: false });
                
                if (prods) setProducts(prods);
            } else {
                setIsLocked(true);
            }
        } else {
            setIsLocked(true);
        }

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
      if(!confirm("¿Seguro que quieres eliminar este producto?")) return;
      await supabase.from('products').delete().eq('id', id);
      setProducts(products.filter(p => p.id !== id));
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400"/></div>;

  return (
    <div className="max-w-6xl mx-auto relative min-h-[80vh]">
        
        {/* --- CAPA DE BLOQUEO --- */}
        {isLocked && (
            <div className="absolute inset-0 z-50 backdrop-blur-sm bg-white/50 flex items-center justify-center rounded-3xl overflow-hidden p-4">
                <div className="bg-white shadow-2xl p-8 rounded-3xl max-w-md w-full text-center border border-gray-100 animate-in zoom-in-95 duration-300">
                    <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-black text-white">
                        <Store size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-3 text-gray-900">Comienza a Vender</h2>
                    <p className="text-gray-500 mb-8 text-base">
                        Para crear tu catálogo de productos, primero debes activar un plan para tu negocio.
                    </p>
                    <Link href="/dashboard/settings" className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 bg-black text-white hover:bg-gray-800">
                        Ver Planes <Zap size={20} fill="currentColor"/>
                    </Link>
                </div>
            </div>
        )}

        {/* --- CONTENIDO REAL --- */}
        <div className={`space-y-6 ${isLocked ? 'blur-sm pointer-events-none opacity-60' : ''}`}>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <UtensilsCrossed className="text-gray-400"/> Mis Productos
                    </h1>
                    <p className="text-gray-500">Administra tu menú y precios.</p>
                </div>
                <button 
                    onClick={() => alert("Función de agregar modal aquí")} // Aquí conectarías tu modal de crear producto
                    className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg"
                >
                    <Plus size={20}/> Nuevo Producto
                </button>
            </div>

            {/* TABLA / LISTA */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                        <input placeholder="Buscar producto..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-lg text-sm outline-none focus:ring-2 ring-black/5"/>
                    </div>
                </div>
                
                {products.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                        <UtensilsCrossed size={48} className="mb-4 text-gray-200"/>
                        <p>No tienes productos aún.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Imagen</th>
                                    <th className="px-6 py-4 font-bold">Nombre</th>
                                    <th className="px-6 py-4 font-bold">Precio</th>
                                    <th className="px-6 py-4 font-bold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {products.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-3">
                                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border">
                                                {product.image_url ? (
                                                    <img src={product.image_url} className="w-full h-full object-cover"/>
                                                ) : (
                                                    <ImageIcon className="w-full h-full p-3 text-gray-300"/>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-medium text-gray-900">
                                            {product.name}
                                            <div className="text-gray-400 text-xs font-normal line-clamp-1">{product.description}</div>
                                        </td>
                                        <td className="px-6 py-3 font-bold">
                                            ${product.price}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDelete(product.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}