import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import AddToCartBtn from '@/components/AddToCartBtn'; // Asegurate de tener este componente o quítalo si da error
import CartFooter from '@/components/CartFooter';     // Asegurate de tener este componente o quítalo si da error
import { Phone, Clock, Star, MapPin } from 'lucide-react';

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

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);

  if (!restaurant) return notFound();

  // --- LÓGICA VISUAL (Igual que en el Dashboard) ---
  const TEMPLATE = restaurant.template_id || 'classic'; // 'classic', 'urban', 'fresh'
  const PRIMARY_COLOR = restaurant.theme_color || '#000000';
  const OPACITY = restaurant.banner_opacity !== undefined ? restaurant.banner_opacity / 100 : 0.5;
  
  // Variables de Estilo según la plantilla
  const IS_DARK = TEMPLATE === 'urban';
  const BG_PAGE = IS_DARK ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const CARD_BG = IS_DARK ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const TEXT_TITLE = IS_DARK ? 'text-white' : 'text-gray-900';
  const TEXT_DESC = IS_DARK ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen pb-24 font-sans ${BG_PAGE}`}>
      
      {/* 1. HEADER DINÁMICO */}
      <div className={`relative w-full overflow-hidden ${TEMPLATE === 'fresh' ? 'h-48' : 'h-64'}`}>
        {/* Imagen de Fondo */}
        {restaurant.banner_url ? (
            <Image 
                src={restaurant.banner_url} 
                alt="Portada" 
                fill 
                className="object-cover"
                priority
            />
        ) : (
            <div className="absolute inset-0 bg-gray-300" />
        )}

        {/* Capa de Color + Opacidad */}
        <div 
            className="absolute inset-0 z-10"
            style={{ backgroundColor: PRIMARY_COLOR, opacity: OPACITY }}
        />
        
        {/* Gradiente de lectura */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-20" />

        {/* Info del Negocio */}
        <div className={`absolute bottom-0 left-0 right-0 p-6 z-30 flex items-end gap-4 ${restaurant.logo_position === 'center' ? 'flex-col items-center text-center pb-8' : ''} ${restaurant.logo_position === 'right' ? 'flex-row-reverse text-right' : ''}`}>
            
            {restaurant.logo_url && (
                <div className={`relative flex-shrink-0 rounded-full border-4 border-white/20 shadow-xl overflow-hidden ${TEMPLATE === 'fresh' ? 'w-24 h-24 translate-y-8' : 'w-20 h-20'}`}>
                    <Image src={restaurant.logo_url} alt="Logo" fill className="object-cover" />
                </div>
            )}

            <div className={`flex-1 ${TEMPLATE === 'fresh' && restaurant.logo_position === 'center' ? 'mb-4' : 'mb-1'}`}>
                <h1 className="text-3xl font-extrabold text-white leading-tight drop-shadow-md">
                    {restaurant.name}
                </h1>
                {restaurant.logo_position !== 'center' && (
                    <p className="text-white/90 text-sm mt-1 line-clamp-2 font-medium">
                        {restaurant.description}
                    </p>
                )}
            </div>
        </div>
      </div>

      {/* 2. BARRA DE INFO (Delivery, Rating) */}
      <div className={`sticky top-0 z-40 backdrop-blur-md border-b shadow-sm px-4 py-3 flex items-center justify-between ${IS_DARK ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
          <div className="flex items-center gap-3 text-xs font-bold">
             <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${IS_DARK ? 'bg-gray-800 text-green-400' : 'bg-green-100 text-green-700'}`}>
                <Clock size={14}/> Abierto
             </span>
             <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${IS_DARK ? 'bg-gray-800 text-yellow-400' : 'bg-yellow-50 text-yellow-700'}`}>
                <Star size={14}/> 4.8
             </span>
          </div>
          <a href={`https://wa.me/${restaurant.phone}`} target="_blank" className="bg-green-500 text-white p-2 rounded-full shadow-lg hover:scale-105 transition">
            <Phone size={18} />
          </a>
      </div>

      {/* 3. MENÚ DE PRODUCTOS */}
      <main className={`max-w-2xl mx-auto p-4 space-y-8 ${TEMPLATE === 'fresh' ? 'pt-12' : 'pt-6'}`}>
        
        {/* Descripción centrada si es estilo Fresh */}
        {TEMPLATE === 'fresh' && restaurant.logo_position === 'center' && (
            <div className="text-center px-6 mb-6">
                <p className={`${TEXT_DESC}`}>{restaurant.description}</p>
            </div>
        )}

        {/* Renderizado de Categorías */}
        {restaurant.categories?.map((category: any) => (
          <div key={category.id}>
            
            {/* Título de Categoría */}
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-3 ${TEXT_TITLE}`}>
                {category.name}
                <div className={`h-px flex-1 ${IS_DARK ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            </h2>
            
            {/* --- CONTENEDOR DE PRODUCTOS (Cambia según Template) --- */}
            <div className={`${TEMPLATE === 'fresh' ? 'grid grid-cols-2 gap-3' : 'grid gap-4'}`}>
              
              {category.products?.map((product: any) => (
                <div 
                    key={product.id} 
                    className={`
                        relative overflow-hidden group transition-all
                        ${TEMPLATE === 'fresh' 
                            ? 'rounded-2xl aspect-square shadow-sm bg-gray-200' 
                            : `rounded-xl border shadow-sm p-3 flex gap-3 ${CARD_BG}`
                        }
                    `}
                >
                  
                  {/* === DISEÑO A: FRESH (GRILLA) === */}
                  {TEMPLATE === 'fresh' ? (
                    <>
                        {product.image_url ? (
                             <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                        ) : null}
                        
                        {/* Overlay Gradiente */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3 text-white">
                            <h3 className="font-bold leading-tight text-sm mb-0.5 line-clamp-2">{product.name}</h3>
                            <div className="flex justify-between items-center mt-1">
                                <span className="font-bold text-sm">${product.price}</span>
                                <div className="bg-white text-black w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">+</div>
                            </div>
                        </div>
                    </>
                  ) : (
                  /* === DISEÑO B: CLÁSICO & URBANO (LISTA) === */
                    <>
                        {/* Info Texto */}
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className={`font-bold leading-tight mb-1 ${TEXT_TITLE}`}>{product.name}</h3>
                                <p className={`text-xs line-clamp-2 ${TEXT_DESC}`}>{product.description}</p>
                            </div>
                            <div className="mt-2 font-bold text-lg text-primary flex items-center justify-between">
                                <span className={TEXT_TITLE}>${product.price}</span>
                            </div>
                        </div>

                        {/* Imagen Derecha */}
                        <div className={`relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden ${IS_DARK ? 'bg-gray-800' : 'bg-gray-100'}`}>
                             {product.image_url ? (
                                <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Sin Foto</div>
                             )}
                        </div>
                        
                        {/* Botón Flotante */}
                        <div className="absolute bottom-3 right-28 sm:static sm:block">
                             {/* Aquí iría el botón de agregar real */}
                        </div>
                    </>
                  )}

                </div>
              ))}
            </div>
          </div>
        ))}

        {(!restaurant.categories || restaurant.categories.length === 0) && (
             <div className="text-center py-10 opacity-50">
                 <p>Aún no hay productos cargados en el menú.</p>
             </div>
        )}
      </main>

      {/* Footer Fijo (Si tienes el componente CartFooter) */}
      {/* <CartFooter ... /> */}
      
    </div>
  );
}