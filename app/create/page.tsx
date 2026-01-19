'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Rocket, Store, Phone, Globe } from 'lucide-react'; // Cambié Icono Link por Globe

export default function CreateRestaurantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    phone: '',
    description: ''
  });

  // 1. Lógica inteligente: Si editan el nombre, sugerimos un slug (si el slug estaba vacío o era igual al anterior)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const autoSlug = name.toLowerCase().replace(/ñ/g, 'n').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    
    // Solo autocompletamos el slug si el usuario no ha escrito uno personalizado muy diferente
    // Para el MVP, simplificamos: el nombre siempre sugiere, pero el usuario puede corregir después.
    setFormData(prev => ({ 
      ...prev, 
      name, 
      slug: prev.slug === '' || prev.slug === autoSlug.slice(0, -1) ? autoSlug : prev.slug 
    }));
  };

  // 2. Lógica de URL Manual: Permite editar pero fuerza formato URL
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Forzamos minúsculas y reemplazamos espacios por guiones en tiempo real
    const cleanSlug = raw.toLowerCase()
      .replace(/\s+/g, '-')      // Espacios -> Guiones
      .replace(/[^\w-]/g, '');   // Eliminar caracteres raros (tildes, emojis, etc)

    setFormData({ ...formData, slug: cleanSlug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validación extra antes de enviar
      if (formData.slug.length < 3) {
        alert("La URL debe tener al menos 3 letras");
        setLoading(false);
        return;
      }

      // 1. Crear el Restaurante
      const { data: restaurant, error } = await supabase
        .from('restaurants')
        .insert({
          user_id: '5e941b40-5f8a-4c74-a176-41ee6601051c', 
          name: formData.name,
          slug: formData.slug,
          phone: formData.phone,
          description: formData.description,
          theme_color: '#000000'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') alert(`¡La dirección snappy.uno/${formData.slug} ya está ocupada! Elige otra.`);
        else alert('Error creando el local: ' + error.message);
        throw error;
      }

      // 2. Crear datos de ejemplo
      if (restaurant) {
        const { data: category } = await supabase
          .from('categories')
          .insert({ restaurant_id: restaurant.id, name: 'Promociones', sort_order: 1 })
          .select()
          .single();
        
        if (category) {
            await supabase.from('products').insert({
                restaurant_id: restaurant.id,
                category_id: category.id,
                name: 'Combo Snappy',
                description: 'La especialidad de la casa para probar el sistema.',
                price: 1500,
                image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'
            });
        }
      }

      // 3. Redirigir
      router.push(`/${formData.slug}`);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-black p-6 text-white text-center">
          <Rocket className="w-12 h-12 mx-auto mb-2" />
          <h1 className="text-2xl font-bold">Snappy.uno</h1>
          <p className="text-gray-400 text-sm">Crea tu carta digital en 30 segundos</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Nombre del Local */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Negocio</label>
            <div className="relative">
              <Store className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                required
                type="text" 
                placeholder="Ej: Burger King"
                value={formData.name}
                onChange={handleNameChange}
                className="w-full pl-10 p-3 border rounded-xl focus:ring-2 focus:ring-black focus:outline-none transition"
              />
            </div>
          </div>

          {/* URL PERSONALIZABLE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tu Link Personalizado</label>
            <div className="relative flex items-center">
              <div className="absolute left-3 top-3 text-gray-500 font-semibold text-sm pointer-events-none z-10">
                snappy.uno/
              </div>
              <input 
                required
                type="text" 
                value={formData.slug}
                onChange={handleSlugChange}
                placeholder="tu-nombre"
                className="w-full pl-24 p-3 bg-gray-50 border rounded-xl text-black font-bold focus:ring-2 focus:ring-black focus:outline-none"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 pl-1">
              Este será el link que compartirás por WhatsApp.
            </p>
          </div>

          {/* Teléfono WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (con código país)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
              <input 
                required
                type="tel" 
                placeholder="54911..."
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full pl-10 p-3 border rounded-xl focus:ring-2 focus:ring-black focus:outline-none"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slogan o Descripción</label>
            <textarea 
              rows={2}
              placeholder="Las mejores hamburguesas..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-black focus:outline-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition flex justify-center items-center gap-2 disabled:opacity-70"
          >
            {loading ? 'Configurando snappy.uno...' : 'Crear mi Web App'}
            {!loading && <Rocket size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}