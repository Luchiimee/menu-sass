import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import AddToCartBtn from '@/components/AddToCartBtn';
import CartFooter from '@/components/CartFooter';
import { MapPin, Phone, Star, Clock } from 'lucide-react';

// Forzamos que la pagina no se guarde en caché para ver cambios al instante
export const dynamic = 'force-dynamic';

async function getRestaurant(slug: string) {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select(`
      *,
      categories (
        id, name,
        products ( id, name, description, price, image_url )
      )
    `)
    .eq('slug', slug)
    .single();

  return restaurant;
}

export default async function MenuPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);

  if (!restaurant) return notFound();

  return (
    <div className="min-h-screen bg-gray-50 pb-32 font-sans">
      
      {/* 1. HEADER HERO (Imagen de portada o Color) */}
      <div className="relative h-48 w-full bg-gray-900 overflow-hidden">
        {/* Usamos un color sólido o patrón si no hay foto de portada */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
        <div 
            className="absolute inset-0 opacity-50"
            style={{ backgroundColor: restaurant.theme_color || '#000' }}
        />
        
        <div className="absolute bottom-4 left-4 right-4 z-20 text-white">
          <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-md">{restaurant.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm font-medium opacity-90">
             <span className="flex items-center gap-1"><Star size={14} className="fill-yellow-400 text-yellow-400"/> 4.8</span>
             <span className="flex items-center gap-1"><Clock size={14} /> 20-30 min</span>
          </div>
        </div>
      </div>

      {/* 2. INFO BAR */}
      <div className="bg-white p-4 shadow-sm border-b flex flex-col gap-2">
         <p className="text-gray-600 text-sm leading-relaxed">{restaurant.description || "Sin descripción disponible."}</p>
         <div className="flex gap-4 mt-2">
            <a href={`https://wa.me/${restaurant.phone}`} className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                <Phone size={14} /> Contactar
            </a>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                <MapPin size={14} /> Delivery & Takeaway
            </div>
         </div>
      </div>

      {/* 3. MENU / CATEGORÍAS */}
      <main className="max-w-xl mx-auto p-4 space-y-10">
        {restaurant.categories?.map((category: any) => (
          <div key={category.id} className="scroll-mt-20">
            {/* Título de Categoría Sticky */}
            <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 py-3 mb-2">
                <h2 className="text-xl font-bold text-gray-900 border-l-4 border-black pl-3">
                {category.name}
                </h2>
            </div>
            
            <div className="grid gap-4">
              {category.products?.map((product: any) => (
                <div key={product.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-3 h-32 overflow-hidden relative">
                  
                  {/* Info (Izquierda) */}
                  <div className="flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-900 leading-tight mb-1">{product.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-auto pr-2">{product.description}</p>
                    
                    <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-lg text-gray-900">${product.price}</span>
                        <div className="block sm:hidden"> 
                            {/* Botón Móvil (Solo el icono +) */}
                            <AddToCartBtn product={product} minimal /> 
                        </div>
                    </div>
                  </div>

                  {/* Imagen (Derecha) */}
                  <div className="relative w-28 h-full rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {product.image_url ? (
                        <Image 
                        src={product.image_url} 
                        alt={product.name}
                        fill
                        className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <span className="text-xs">Sin foto</span>
                        </div>
                    )}
                    
                    {/* Botón flotante sobre la imagen (Estilo UberEats) */}
                    <div className="absolute bottom-2 right-2 hidden sm:block">
                        <AddToCartBtn product={product} />
                    </div>
                  </div>
                  
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Mensaje si está vacío */}
        {(!restaurant.categories || restaurant.categories.length === 0) && (
            <div className="text-center py-20 text-gray-400">
                <p>Este local aún no ha cargado su menú.</p>
            </div>
        )}
      </main>

      <CartFooter 
        restaurantPhone={restaurant.phone} 
        restaurantId={restaurant.id}
      />
      
    </div>
  );
}