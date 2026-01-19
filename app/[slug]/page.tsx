import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import AddToCartBtn from '@/components/AddToCartBtn'; // <--- Importamos
import CartFooter from '@/components/CartFooter';     // <--- Importamos

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
    <div className="min-h-screen bg-gray-50 pb-32"> {/* pb-32 para dar espacio al footer */}
      
      {/* HEADER */}
      <div className="bg-white shadow-sm sticky top-0 z-10 p-4 border-b">
        <h1 className="text-xl font-bold text-gray-900">{restaurant.name}</h1>
        <p className="text-sm text-gray-500">{restaurant.description}</p>
      </div>

      {/* BODY */}
      <main className="max-w-md mx-auto p-4 space-y-8">
        {restaurant.categories?.map((category: any) => (
          <div key={category.id}>
            <h2 className="text-lg font-bold text-gray-800 mb-4 sticky top-16 bg-gray-50 py-2 pl-1 rounded">
              {category.name}
            </h2>
            <div className="space-y-4">
              {category.products?.map((product: any) => (
                <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm flex gap-4 border border-gray-100">
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <Image 
                      src={product.image_url || 'https://via.placeholder.com/150'} 
                      alt={product.name}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="font-bold text-gray-900">${product.price}</span>
                      
                      {/* AQUÍ ESTÁ EL COMPONENTE INTERACTIVO */}
                      <AddToCartBtn product={product} />
                      
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* FOOTER DEL CARRITO (Se activa al agregar items) */}
      <CartFooter 
        restaurantPhone={restaurant.phone} 
        restaurantId={restaurant.id}
      />
      
    </div>
  );
}