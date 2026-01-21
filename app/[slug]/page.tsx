import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Clock, Star } from 'lucide-react';
import AddToCartBtn from '@/components/AddToCartBtn'; 
import CartFooter from '@/components/CartFooter';     

// 1. LÍNEAS MÁGICAS: Esto obliga a que el link nuevo funcione AL INSTANTE
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getRestaurant(slug: string) {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select(`*, categories (id, name, products (id, name, description, price, image_url))`)
    .eq('slug', slug)
    .single();
  return restaurant;
}

// --- FUNCIÓN INTELIGENTE DE HORARIOS ---
function checkIsOpen(businessHours: any) {
  if (!businessHours) return true; 
  
  const now = new Date();
  const options = { timeZone: "America/Argentina/Buenos_Aires", hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'long' } as const;
  
  // Día en inglés para coincidir con DB
  const dayNameEn = new Date().toLocaleDateString('en-US', { timeZone: "America/Argentina/Buenos_Aires", weekday: 'long' }).toLowerCase();
  const todayConfig = businessHours[dayNameEn]; 

  if (!todayConfig || !todayConfig.isOpen) return false;

  const formatter = new Intl.DateTimeFormat('en-US', { ...options, weekday: undefined });
  const currentTime = formatter.format(now); 
  
  return currentTime >= todayConfig.open && currentTime <= todayConfig.close;
}

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Buscamos el restaurante por el LINK (Slug)
  const restaurant = await getRestaurant(slug);

  // Si no existe (porque cambiaste el link y entraste al viejo, o escribiste mal), da 404
  if (!restaurant) return notFound();

  // CALCULAMOS EL ESTADO
  const isOpen = checkIsOpen(restaurant.business_hours);

  const TEMPLATE = restaurant.template_id || 'classic';
  const IS_DARK = TEMPLATE === 'urban';
  const PRIMARY_COLOR = restaurant.theme_color || '#000000';
  const OPACITY = restaurant.banner_opacity !== undefined ? restaurant.banner_opacity / 100 : 0.5;
  
  const BG_PAGE = IS_DARK ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const CARD_BG = IS_DARK ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const TEXT_TITLE = IS_DARK ? 'text-white' : 'text-gray-900';
  const TEXT_DESC = IS_DARK ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen pb-24 font-sans ${BG_PAGE}`}>
      
      {/* HEADER SUSHI (FRESH) */}
      {TEMPLATE === 'fresh' ? (
        <div className="mb-8">
            <div className="relative w-full h-48 overflow-hidden rounded-b-[2.5rem] shadow-sm z-0">
                {restaurant.banner_url ? (
                    <Image src={restaurant.banner_url} alt="Portada" fill className="object-cover" priority />
                ) : (
                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-400">Sin Portada</div>
                )}
                <div className="absolute inset-0 z-10" style={{ backgroundColor: PRIMARY_COLOR, opacity: OPACITY }} />
            </div>

            {restaurant.logo_url && (
                <div className="relative z-20 mx-auto -mt-12 w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                    <Image src={restaurant.logo_url} alt="Logo" fill className="object-cover" />
                </div>
            )}

            <div className="text-center px-6 mt-4">
                <h1 className={`text-2xl font-extrabold ${TEXT_TITLE}`}>{restaurant.name}</h1>
                <p className={`text-sm mt-1 font-medium ${TEXT_DESC} max-w-md mx-auto leading-relaxed`}>
                    {restaurant.description}
                </p>
            </div>
        </div>
      ) : (
      /* HEADER ESTÁNDAR */
        <div className="relative w-full h-64 overflow-hidden mb-6">
            {restaurant.banner_url ? (
                <Image src={restaurant.banner_url} alt="Portada" fill className="object-cover" priority />
            ) : (
                <div className="absolute inset-0 bg-gray-300 flex items-center justify-center text-gray-500">Sin Portada</div>
            )}
            <div className="absolute inset-0 z-10" style={{ backgroundColor: PRIMARY_COLOR, opacity: OPACITY }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20" />

            <div className={`absolute bottom-0 left-0 right-0 p-6 z-30 flex gap-4 
                ${restaurant.logo_position === 'center' ? 'flex-col items-center justify-end text-center pb-8' : 'flex-row items-end text-left'} 
                ${restaurant.logo_position === 'right' ? 'flex-row-reverse text-right' : ''}
            `}>
                {restaurant.logo_url && (
                    <div className={`relative flex-shrink-0 rounded-full border-4 border-white/20 shadow-xl overflow-hidden w-24 h-24`}>
                        <Image src={restaurant.logo_url} alt="Logo" fill className="object-cover" />
                    </div>
                )}
                <div className={`flex-1 min-w-0 flex flex-col justify-end mb-1 ${restaurant.logo_position === 'center' ? 'w-full' : ''}`}>
                    <h1 className="text-3xl font-extrabold text-white leading-tight drop-shadow-md">{restaurant.name}</h1>
                    <p className={`text-white/90 text-sm mt-1 font-medium leading-relaxed max-w-lg
                        ${restaurant.logo_position === 'center' ? 'mx-auto' : ''}
                        ${restaurant.logo_position === 'right' ? 'ml-auto' : ''}
                    `}>
                        {restaurant.description}
                    </p>
                </div>
            </div>
        </div>
      )}

      {/* BARRA INFO */}
      <div className={`sticky top-0 z-40 backdrop-blur-md border-b shadow-sm px-4 py-3 flex items-center justify-between ${IS_DARK ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
          <div className="flex items-center gap-3 text-xs font-bold">
             {isOpen ? (
                 <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${IS_DARK ? 'bg-gray-800 text-green-400' : 'bg-green-100 text-green-700'}`}>
                    <Clock size={14}/> Abierto
                 </span>
             ) : (
                 <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${IS_DARK ? 'bg-gray-800 text-red-400' : 'bg-red-100 text-red-700'}`}>
                    <Clock size={14}/> Cerrado
                 </span>
             )}
             <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${IS_DARK ? 'bg-gray-800 text-yellow-400' : 'bg-yellow-50 text-yellow-700'}`}><Star size={14}/> 4.8</span>
          </div>
      </div>

      <main className="max-w-2xl mx-auto p-4 space-y-8 pt-6">
        {restaurant.categories?.map((category: any) => (
          <div key={category.id}>
            <h2 className={`text-xl font-bold mb-4 flex items-center gap-3 ${TEXT_TITLE}`}>
                {category.name}
                <div className={`h-px flex-1 ${IS_DARK ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
            </h2>
            
            <div className={`${TEMPLATE === 'fresh' ? 'grid grid-cols-2 gap-3' : 'space-y-4'}`}>
              {category.products?.map((product: any) => (
                <div key={product.id} className={`relative overflow-hidden group transition-all 
                    ${TEMPLATE === 'fresh' ? 'rounded-2xl aspect-square shadow-sm bg-gray-200' : ''}
                    ${TEMPLATE === 'classic' ? `rounded-xl border shadow-sm p-3 flex gap-3 items-center ${CARD_BG}` : ''}
                    ${TEMPLATE === 'urban' ? `rounded-xl border shadow-sm p-3 flex gap-3 items-center ${CARD_BG}` : ''}
                `}>
                  
                  {/* CARD FRESH */}
                  {TEMPLATE === 'fresh' && (
                    <>
                        {product.image_url ? <Image src={product.image_url} alt={product.name} fill className="object-cover" /> : <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">Sin Foto</div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3 text-white">
                            <h3 className="font-bold leading-tight text-sm mb-0.5 line-clamp-2">{product.name}</h3>
                            <div className="flex justify-between items-center mt-1">
                                <span className="font-bold text-sm">${product.price}</span>
                                <AddToCartBtn product={product} variant="full" />
                            </div>
                        </div>
                    </>
                  )}
                  
                  {/* CARD CLASSIC */}
                  {TEMPLATE === 'classic' && (
                    <>
                        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                             {product.image_url ? <Image src={product.image_url} alt={product.name} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Sin Foto</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className={`font-bold leading-tight mb-1 ${TEXT_TITLE}`}>{product.name}</h3>
                            <p className={`text-xs line-clamp-2 ${TEXT_DESC}`}>{product.description}</p>
                            <div className={`font-bold mt-2 ${TEXT_TITLE}`}>${product.price}</div>
                        </div>
                        <div className="flex-shrink-0"><AddToCartBtn product={product} variant="icon" isDark={false} /></div>
                    </>
                  )}

                  {/* CARD URBAN */}
                  {TEMPLATE === 'urban' && (
                    <>
                        <div className="flex-1 min-w-0">
                            <h3 className={`font-bold leading-tight mb-1 ${TEXT_TITLE}`}>{product.name}</h3>
                            <p className={`text-xs line-clamp-2 ${TEXT_DESC}`}>{product.description}</p>
                            <div className={`font-bold mt-2 ${TEXT_TITLE}`}>${product.price}</div>
                        </div>
                        <div className="flex-shrink-0"><AddToCartBtn product={product} variant="icon" isDark={true} /></div>
                        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800 ml-2">
                             {product.image_url ? <Image src={product.image_url} alt={product.name} fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">Sin Foto</div>}
                        </div>
                    </>
                  )}

                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      <CartFooter phone={restaurant.phone} deliveryCost={Number(restaurant.delivery_cost)} restaurantId={restaurant.id} />
    </div>
  );
}