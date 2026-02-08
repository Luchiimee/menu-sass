"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import {
  Plus,
  Check,
  Coffee,
  Loader2,
  X,
  Utensils,
  Star,
  Clock,
} from "lucide-react";
import AddToCartBtn from "@/components/AddToCartBtn";
import CartFooter from "@/components/CartFooter";
import ClearCartLogic from "@/components/ClearCartLogic";
import { CartProvider, useCart } from "@/context/CartContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);


// --- 1. DATOS (CORREGIDO PARA USAR TABLA product_extras) ---
async function getRestaurant(slug: string) {
  // 1. Traemos el restaurante y productos
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select(
      `
      *, 
      categories (
        id, 
        name, 
        products (id, name, description, price, image_url)
      )
    `,
    )
    .eq("slug", slug)
    .single();

  if (!restaurant) return null;

  // 2. Traemos los extras y sus relaciones desde la tabla intermedia
  const { data: allExtras } = await supabase
    .from("extras")
    .select(
      `
      *,
      product_extras (product_id)
    `,
    )
    .eq("restaurant_id", restaurant.id);

  return { ...restaurant, fetched_extras: allExtras || [] };
}

// --- 2. HORARIOS ---
function checkIsOpen(businessHours: any) {
  if (!businessHours) return true;
  const now = new Date();
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
  });
  const dayName = dayFormatter.format(now).toLowerCase();
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const currentTime = timeFormatter.format(now);
  const todayConfig = businessHours[dayName];
  if (!todayConfig || !todayConfig.isOpen) return false;
  const fixTime = (time: string) => (time === "00:00" ? "24:00" : time);
  const open1 = todayConfig.open || "09:00";
  const close1 = fixTime(todayConfig.close || "13:00");
  return (
    (currentTime >= open1 && currentTime <= close1) ||
    (todayConfig.isSplit &&
      currentTime >= (todayConfig.open2 || "17:00") &&
      currentTime <= fixTime(todayConfig.close2 || "23:00"))
  );
}

// --- 3. COMPONENTE DE CONTENIDO ---
function MenuContent({
  restaurant,
  isOpen,
}: {
  restaurant: any;
  isOpen: boolean;
}) {
  const [activeCardId, setActiveCardId] = useState<any>(null);
  const { cart, addItem, updateQuantity } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [currentExtras, setCurrentExtras] = useState<any[]>([]);

  // --- LÓGICA DE NOTIFICACIÓN AGREGADA ---
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const mostrarAviso = (msg: string) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(null), 2500);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price);

  // --- LÓGICA DE FILTRADO DE EXTRAS ---
  const getExtrasForProduct = (productId: string) => {
    if (!restaurant?.fetched_extras) return [];
    return restaurant.fetched_extras.filter((extra: any) =>
      extra.product_extras?.some(
        (rel: any) => String(rel.product_id) === String(productId),
      ),
    );
  };

  
  const toggleExtra = (extra: any) => {
    setCurrentExtras((prev) =>
      prev.find((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra],
    );
  };

  // --- FUNCIÓN DE AVISO ---
  const avisarSeleccionPrimero = () => {
    mostrarAviso("⚠️ Elegí primero el menú principal");
  };

  const TEMPLATE = restaurant.template_id || "classic";
  const THEME = restaurant.theme_color || "#d32f2f";
  const BG = restaurant.bg_color || "#ffffff";
  const CARD_BG = restaurant.card_color || "#ffffff";
  const TEXT = restaurant.text_color || "#000000";
  const DESC = restaurant.description_color || "#666666";
  const PROMO_BG = restaurant.promo_bg_color || "#ffebee";
  const LOGO = restaurant.logo_url;
  const BANNER = restaurant.banner_url;
  const SHOW_BANNER = restaurant.show_banner;

  const getStyles = () => {
    const common = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700&family=Patrick+Hand&family=Lato:wght@400;700;900&display=swap');`;

    switch (TEMPLATE) {
      case "classic":
        return `
                ${common}
                body { background: ${BG}; margin: 0; }
                .layout-container { background: ${BG}; font-family: Arial, sans-serif; min-height: 100vh; padding-bottom: 120px; }
                .header-sec { background: ${THEME}; padding: 20px; color: white; text-align: center; position: relative; }
                .header-logo { width: 80px; height: 80px; background: white; border-radius: 50%; margin: 0 auto 10px; overflow: hidden; display: grid; place-items: center; }
                .header-logo img { width: 100%; height: 100%; object-fit: cover; }
                .status-badge { position: absolute; top: 15px; right: 15px; background: white; color: ${THEME}; font-size: 10px; font-weight: bold; padding: 4px 10px; border-radius: 4px; }
                .header-title { font-weight: bold; font-size: 22px; margin: 0; }
                .header-desc { font-size: 13px; opacity: 0.8; }
                .classic-item { display: flex; flex-direction: column; background: ${CARD_BG}; padding: 15px 20px; }
                .classic-prod { font-weight: bold; font-size: 18px; color: ${TEXT}; }
                .classic-p-desc { font-size: 13px; color: ${DESC}; margin-bottom: 5px; }
                .classic-price { font-weight: bold; font-size: 16px; color: ${THEME}; }
                .classic-line { height: 1px; background-color: #eee; width: 90%; margin: 0 auto; }
                .promo-box { background: ${PROMO_BG}; color: ${THEME}; text-align: center; font-size: 12px; padding: 10px; margin-bottom: 10px; font-weight: 600; }
                .cat-title { font-size: 16px; font-weight: bold; margin: 20px 20px 10px; color: ${TEXT}; border-left: 4px solid ${THEME}; padding-left: 10px; }
            `;
      case "urban":
  return `
      ${common} 
      body { background: ${BG}; margin: 0; font-family: 'Inter', sans-serif; } 
      .app-wrapper { min-height: 100vh; padding-bottom: 120px; color: ${TEXT}; } 
      .header-sec { padding: 25px 20px; display: flex; justify-content: space-between; align-items: center; } 
      .header-logo { width: 55px; height: 55px; border-radius: 50%; background-size: cover; background-position: center; border: 2px solid ${TEXT}; } 
      
      /* CAMBIO CLAVE: Quitamos el flex fijo para que el contenido pueda bajar */
      .prod-card { 
          background: ${CARD_BG}; 
          padding: 15px; 
          border-radius: 24px; 
          margin: 0 15px 15px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.05);
          display: block; /* Ahora es un bloque, no una fila obligatoria */
      } 
      
      .prod-main-content {
          display: flex;
          gap: 15px;
          align-items: center;
          width: 100%;
      }

      .prod-img { 
          width: 90px; 
          height: 90px; 
          border-radius: 18px; 
          background-size: cover; 
          background-position: center; 
          flex-shrink: 0; 
          background-color: #222; 
      } 
      
      /* Contenedor de extras para que ocupe todo el ancho abajo */
      .extras-container {
          width: 100%;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid rgba(255,255,255,0.1);
      }
  `;
      case "minimal":
  return `
      ${common} 
      body { background: ${BG}; margin: 0; font-family: 'Lato', sans-serif; } 
      .app-wrapper { min-height: 100vh; padding: 0 0 120px; color: ${TEXT}; } 
      .header-sec { padding: 40px 20px 20px; text-align: center; } 
      .header-logo { width: 60px; height: 60px; background-size: cover; margin: 0 auto 15px; border-radius: 50%; } 
      
      /* PROMO ESTILO CAFE CENTRAL */
      .promo-minimal {
          margin: 0 20px 30px;
          padding: 15px;
          background-color: #f4f4f5;
          border: 1px solid #eee;
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: ${TEXT};
      }

      .prod-card { 
          padding: 20px; 
          border-bottom: 1px solid #f5f5f5; 
          display: block; 
      }`
      ;
      case "pop":
        return `${common} body { background: ${BG}; margin: 0; font-family: 'Inter', sans-serif; } .header-sec { display: flex; align-items: center; gap: 10px; background: ${CARD_BG}; border: 3px solid ${TEXT}; padding: 10px; border-radius: 12px; box-shadow: 4px 4px 0 ${TEXT}; margin: 15px; } .prod-card { background: ${CARD_BG}; border: 3px solid ${TEXT}; border-radius: 10px; padding: 10px; margin: 15px; box-shadow: 4px 4px 0 ${THEME}; }`;
      case "spotlight":
        return `${common} body { background: ${BG}; margin: 0; font-family: 'Inter', sans-serif; } .spot-banner { height: 200px; background-size: cover; background-position: center; position: relative; display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; } .prod-card { display: flex; align-items: center; gap: 12px; padding: 12px 15px; border-bottom: 1px solid rgba(0,0,0,0.05); background: ${CARD_BG}; }`;

      case "visualgrid":
        return `.notificacion-glass {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 12px 24px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.5px;
  z-index: 9999;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  gap: 10px;
}`;
      case "elegant":
        return `${common} body { background: ${BG}; font-family: 'Playfair Display', serif; } .elegant-header { text-align: center; padding: 40px 20px; border-bottom: 1px double ${THEME}; margin-bottom: 30px; } .elegant-card { text-align: center; margin-bottom: 40px; padding: 0 20px; } .elegant-name { font-family: 'Playfair Display', serif; font-size: 20px; color: ${TEXT}; text-transform: capitalize; } .elegant-divider { width: 40px; height: 1px; background: ${THEME}; margin: 10px auto; }`;
      case "bistro":
        return `${common} body { background: #1a1a1a; color: white; font-family: 'Patrick Hand', cursive; } .chalk-board { border: 8px solid #4e342e; margin: 15px; padding: 20px; min-height: 80vh; background: #222; box-shadow: inset 0 0 50px rgba(0,0,0,0.5); } .chalk-title { font-family: 'Patrick Hand', cursive; font-size: 28px; text-align: center; color: #fff; border-bottom: 2px dashed #555; margin-bottom: 20px; } .chalk-item { display: flex; justify-content: space-between; margin-bottom: 15px; align-items: baseline; } .chalk-line { flex: 1; border-bottom: 1px dotted #444; margin: 0 10px; }`;
      default:
        return `${common} body { background: ${BG}; }`;
    }
  };

  const renderTemplate = () => {
    switch (TEMPLATE) {
 case "urban":
  return (
    <div className="app-wrapper" style={{ backgroundColor: BG, minHeight: '100vh', paddingBottom: '120px', color: TEXT }}>
      

      {/* HEADER */}
      <div className="header-sec" style={{ padding: '25px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex gap-3 items-center text-left">
          <div className="header-logo" style={{ backgroundImage: `url('${LOGO || ""}')`, width: '55px', height: '55px', borderRadius: '50%', backgroundSize: 'cover', border: `2px solid ${TEXT}` }}></div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter">{restaurant.name}</h1>
            <p className="text-[11px] opacity-60 font-bold">{restaurant.description}</p>
          </div>
        </div>
        <div className="status-badge bg-[#2ecc71] text-black px-3 py-1 rounded-full text-[10px] font-black italic">
          {isOpen ? "ABIERTO" : "CERRADO"}
        </div>
      </div>

      {/* PROMO */}
      {restaurant.show_promo && restaurant.promo_message && (
        <div className="mx-4 mb-6 p-4 bg-[#1a1a1a] rounded-xl border-l-4 border-orange-600 flex items-center gap-3 shadow-lg text-left">
        
          <p className="text-xs font-black uppercase tracking-tight text-white/90">{restaurant.promo_message}</p>
        </div>
      )}

     {restaurant.categories?.map((cat: any) => (
        <div key={cat.id}>
          {cat.products?.map((prod: any) => {
            const extras = getExtrasForProduct(prod.id);
            const principalEnCarrito = cart.some(item => item.id === prod.id);

            return (
              <div key={prod.id} className="prod-card">
                {/* PARTE SUPERIOR (Imagen + Info + Botón) */}
                <div className="prod-main-content">
                  <div className="prod-img" style={{ backgroundImage: `url('${prod.image_url || ""}')` }}></div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-black text-base mb-1 truncate">{prod.name}</div>
                    <div className="text-[10px] opacity-50 mb-2 line-clamp-2">{prod.description}</div>
                    
                    <div className="flex justify-between items-center">
                      <div className="font-black text-lg italic" style={{ color: THEME }}>{formatPrice(prod.price)}</div>
                      <div onClick={() => !principalEnCarrito && mostrarAviso("✅ Producto agregado")}>
                        <AddToCartBtn product={prod} variant="icon" isDark={true} disabled={!isOpen} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN EXTRAS (Ahora sí se va abajo porque está fuera de prod-main-content) */}
                {principalEnCarrito && extras && extras.length > 0 && (
                  <div className="extras-container">
                    <div className="grid grid-cols-1 gap-2">
                      {extras.map((ex: any) => (
                        <div key={ex.id} className="flex justify-between items-center bg-black/40 p-3 rounded-2xl border border-white/5">
                          <div className="text-left">
                            <div className="text-[11px] font-black uppercase text-white">{ex.name}</div>
                            <div className="text-[10px] font-bold text-orange-500">+{formatPrice(ex.price)}</div>
                          </div>
                          <button
                            onClick={() => {
                              addItem({ id: prod.id, extraId: ex.id, name: ex.name, price: Number(ex.price) }, true);
                              mostrarAviso("✅ Extra sumado");
                            }}
                            className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center active:scale-90"
                          >
                            <Plus size={18} strokeWidth={3} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
      case "classic":
        return (
          <div className="layout-container">
            <div className="header-sec">
              <div className="status-badge">
                {isOpen ? "ABIERTO" : "CERRADO"}
              </div>
              <div className="header-logo">
                {LOGO ? (
                  <img src={LOGO} alt="Logo" />
                ) : (
                  <Utensils size={30} color={THEME} />
                )}
              </div>
              <h1 className="header-title">{restaurant.name}</h1>
              <p className="header-desc">{restaurant.description}</p>
            </div>

            {restaurant.show_promo && restaurant.promo_message && (
              <div className="promo-box">{restaurant.promo_message}</div>
            )}

            {restaurant.categories?.map((cat: any) => (
              <div key={cat.id}>
                {cat.products?.map((prod: any) => {
                  const extras = getExtrasForProduct(prod.id);
                  const principalEnCarrito = cart.some(
                    (item) => item.id === prod.id,
                  );

                  return (
                    <div key={prod.id}>
                      <div className="classic-item">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 pr-4 text-left">
                            <div className="classic-prod">{prod.name}</div>
                            <div className="classic-p-desc">
                              {prod.description}
                            </div>
                            <div className="classic-price">
                              {formatPrice(prod.price)}
                            </div>

                            {extras && extras.length > 0 && (
                              <div className="mt-3 space-y-2 border-l-2 border-gray-100 pl-3">
                                {extras.map((ex: any) => (
                                  <div
                                    key={ex.id}
                                    className="flex justify-between items-center text-[11px] py-1"
                                  >
                                    <span
                                      className={`font-medium ${principalEnCarrito ? "text-gray-600" : "text-gray-400"}`}
                                    >
                                      {ex.name}{" "}
                                      <span
                                        className={`${principalEnCarrito ? "text-[#f0b001]" : "text-gray-300"} font-bold`}
                                      >
                                        (+{formatPrice(ex.price)})
                                      </span>
                                    </span>

                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => {
                                          if (!principalEnCarrito) {
                                            avisarSeleccionPrimero();
                                          } else {
                                            addItem(
                                              {
                                                id: prod.id,
                                                extraId: ex.id,
                                                name: ex.name,
                                                price: Number(ex.price),
                                              },
                                              true,
                                            );
                                            mostrarAviso("✅ Extra sumado");
                                          }
                                        }}
                                        className={`w-6 h-6 rounded-full border flex items-center justify-center bg-white transition-colors ${
                                          principalEnCarrito
                                            ? "border-gray-200 text-gray-400 hover:bg-gray-50"
                                            : "border-gray-100 text-gray-200 cursor-not-allowed"
                                        }`}
                                      >
                                        <Plus size={12} strokeWidth={3} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="add-btn-wrapper pt-1" onClick={() => mostrarAviso("✅ Producto agregado")}>
                            <AddToCartBtn
                              product={prod}
                              disabled={!isOpen}
                              hasExtras={false}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="classic-line"></div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );

case "minimal":
        return (
          <div className="app-wrapper" style={{ backgroundColor: BG, minHeight: '100vh', paddingBottom: '120px' }}>
            
            {/* HEADER CON POSICIÓN RELATIVA */}
            <div className="header-sec relative" style={{ padding: '60px 20px 20px', textAlign: 'center' }}>
              
              {/* CARTEL ABIERTO: ARRIBA A LA DERECHA, BORDE NEGRO, TEXTO NEGRO */}
              <div className="absolute top-6 right-5">
                <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase tracking-widest bg-white ${isOpen ? 'border-black text-black' : 'border-red-500 text-red-600'}`}>
                  {isOpen ? "ABIERTO" : "CERRADO"}
                </span>
              </div>

              {/* LOGO Y TÍTULO CENTRADOS */}
              <div
                className="header-logo"
                style={{ 
                  backgroundImage: `url('${LOGO || ""}')`,
                  width: '60px', height: '60px', borderRadius: '50%', backgroundSize: 'cover',
                  margin: '0 auto 15px', border: `1px solid ${TEXT}` 
                }}
              ></div>
              
              <h1 className="text-xl font-black uppercase tracking-widest mb-1" style={{ color: TEXT }}>
                {restaurant.name}
              </h1>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{restaurant.description}</p>
            </div>

            {/* TU PROMO (Mantenemos tu estilo) */}
            {restaurant.show_promo && restaurant.promo_message && (
              <div className="promo-minimal">
                {restaurant.promo_message}
              </div>
            )}

            {restaurant.categories?.map((cat: any) => (
              <div key={cat.id} className="mb-6 px-4">
                {cat.products?.map((prod: any) => {
                  const extras = getExtrasForProduct(prod.id);
                  const principalEnCarrito = cart.some(item => item.id === prod.id);

                  return (
                    <div key={prod.id} className="prod-card" style={{ padding: '20px', borderBottom: '1px solid #f5f5f5' }}>
                      <div className="flex justify-between items-center">
                        <div className="flex-1 text-left pr-4">
                          <div className="font-bold text-sm mb-1" style={{ color: TEXT }}>{prod.name}</div>
                          <div className="text-[10px] opacity-50 mb-1" style={{ color: TEXT }}>{prod.description}</div>
                          <div className="text-xs font-black" style={{ color: THEME }}>
                            {formatPrice(prod.price)}
                          </div>
                        </div>
                        <div onClick={() => !principalEnCarrito && mostrarAviso("✅ Producto agregado")}>
                          <AddToCartBtn
                            product={prod}
                            variant="icon"
                            disabled={!isOpen}
                          />
                        </div>
                      </div>

                      {/* EXTRAS DESPLEGABLES */}
                      {principalEnCarrito && extras && extras.length > 0 && (
                        <div className="mt-3 pl-2 space-y-2 border-l-2 border-gray-100 ml-1">
                          {extras.map((ex: any) => (
                            <div key={ex.id} className="flex justify-between items-center py-1">
                              <span className="text-[11px] font-medium opacity-70">
                                + {ex.name} <span style={{ color: THEME }}>({formatPrice(ex.price)})</span>
                              </span>
                              <button
                                onClick={() => {
                                  addItem({ id: prod.id, extraId: ex.id, name: ex.name, price: Number(ex.price) }, true);
                                  mostrarAviso("✅ Extra sumado");
                                }}
                                className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center bg-white active:bg-gray-50"
                              >
                                <Plus size={12} strokeWidth={3} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
case "visualgrid":
        return (
          <div className="app-wrapper" style={{ backgroundColor: '#121212', minHeight: '100vh', paddingBottom: '120px' }}>
            
            {/* --- BOTÓN ABIERTO FIJO ARRIBA A LA DERECHA --- */}
            <div className="fixed top-4 right-4 z-[100]">
              <span className={`text-[10px] font-black px-2 py-1 rounded border uppercase tracking-widest shadow-2xl ${isOpen ? 'bg-white text-black border-white' : 'border-red-500 text-red-500 bg-black/80'}`}>
                {isOpen ? "ABIERTO" : "CERRADO"}
              </span>
            </div>

            {/* --- HEADER --- */}
            <div className="relative pt-10 px-6 pb-4">
              <div className="flex items-center gap-4 text-left">
                {/* LOGO */}
                <div 
                  className="w-14 h-14 rounded-full border-2 border-white/10 bg-cover bg-center shadow-lg shrink-0"
                  style={{ backgroundImage: `url('${LOGO || ""}')` }}
                ></div>
                <div>
                  <h1 className="text-3xl font-black uppercase italic leading-none text-white tracking-tighter">
                    {restaurant.name}
                  </h1>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                    {restaurant.description}
                  </p>
                </div>
              </div>

              {/* --- DISEÑO DE PROMO CORREGIDO (Rayita Naranja) --- */}
           {restaurant.show_promo && restaurant.promo_message && (
  <div className="mt-6 flex items-center gap-3 px-1"> {/* Agregado: items-center */}
    <div className="w-[3px] h-5 bg-orange-600 rounded-full shrink-0" /> {/* Sacado: mt-0.5 */}
    <p className="text-[12px] text-gray-300 font-medium leading-none"> {/* Cambiado: leading-none para centrar mejor */}
      {restaurant.promo_message}
    </p>
  </div>
)}
            </div>

            {/* --- GRILLA DE PRODUCTOS --- */}
            {restaurant.categories?.map((cat: any) => (
              <div key={cat.id} className="mb-4">
                <div className="grid grid-cols-2 gap-3 px-4">
                  {cat.products?.map((prod: any) => {
                    const extras = getExtrasForProduct(prod.id);
                    const principalEnCarrito = cart.some(item => item.id === prod.id);
                    const isActive = activeCardId === prod.id; 

                    // --- LÓGICA DE AUTO-SCROLL AUTOMÁTICO ---
                    if (isActive && principalEnCarrito && extras.length > 0) {
                      setTimeout(() => {
                        const panel = document.getElementById(`scroll-panel-${prod.id}`);
                        if (panel && panel.scrollTop === 0) {
                          panel.scrollTo({ top: 180, behavior: 'smooth' });
                        }
                      }, 150);
                    }

                    return (
                      <div 
                        key={prod.id} 
                        className={`relative rounded-[2rem] overflow-hidden aspect-[3/4] transition-all duration-300 ${isActive ? 'z-20 ring-2 ring-white/20 scale-[1.02]' : 'z-0'}`}
                        onClick={() => setActiveCardId(prod.id)}
                      >
                        {/* FOTO DE FONDO */}
                        <div 
                          className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                          style={{ 
                            backgroundImage: `url('${prod.image_url || ""}')`,
                            filter: isActive ? 'brightness(0.15) blur(2px)' : 'brightness(0.8)', 
                          }}
                        />
                        
                        {/* NOMBRE Y PRECIO VISIBLES */}
                        {!isActive && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-4 text-left">
                             <div className="text-white font-bold text-sm leading-tight drop-shadow-md">{prod.name}</div>
                             <div className="text-white/60 font-black text-xs mt-1">{formatPrice(prod.price)}</div>
                          </div>
                        )}

                        {/* PANEL EXPANDIDO */}
                        {isActive && (
                           <div 
                            id={`scroll-panel-${prod.id}`}
                            className="absolute inset-0 p-4 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-y-auto no-scrollbar scroll-smooth"
                           >
                              <div className="flex justify-end mb-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveCardId(null); }}
                                  className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/10 active:scale-90"
                                >
                                  <X size={18} />
                                </button>
                              </div>

                              <div className="text-left">
                                <div className="text-white font-black text-xl leading-none mb-1">{prod.name}</div>
                                <div className="text-white/50 text-[11px] leading-snug mb-3">{prod.description}</div>
                                <div className="text-orange-400 font-black text-sm mb-4">{formatPrice(prod.price)}</div>

                                {/* CONTADOR */}
                                <div className="mb-4">
                                  <div className="inline-block" onClick={(e) => e.stopPropagation()}>
                                    <AddToCartBtn product={prod} variant="full" disabled={!isOpen} />
                                  </div>
                                </div>

                                {principalEnCarrito && extras && extras.length > 0 && (
                                  <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300 pb-4">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest border-b border-white/10 pb-1 mb-2">
                                      Opcionales
                                    </p>
                                    {extras.map((ex: any) => (
                                      <div key={ex.id} className="flex justify-between items-center bg-black/40 p-2 rounded-xl border border-white/5">
                                        <div className="text-left leading-none">
                                          <div className="text-[10px] font-bold text-white">{ex.name}</div>
                                          <div className="text-[9px] text-orange-400 mt-1">+{formatPrice(ex.price)}</div>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            addItem({ id: prod.id, extraId: ex.id, name: ex.name, price: Number(ex.price) }, true);
                                            mostrarAviso("Extra sumado");
                                          }}
                                          className="w-8 h-8 bg-white text-black rounded-xl flex items-center justify-center active:scale-90 shadow-lg"
                                        >
                                          <Plus size={16} strokeWidth={3} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                           </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      case "pop":
        return (
          <div className="app-wrapper">
            <div className="header-sec flex items-center gap-3 m-4 text-left">
              <div className="w-12 h-12 rounded-full border-2 border-black bg-white flex items-center justify-center font-bold">
                !
              </div>
              <div>
                <h1 className="font-black text-lg">{restaurant.name}</h1>
                <p className="text-xs">{restaurant.description}</p>
              </div>
            </div>
            {restaurant.categories?.map((cat: any) => (
              <div key={cat.id} className="text-left">
                <h2 className="mx-4 font-black text-xl italic">{cat.name}</h2>
                {cat.products?.map((prod: any) => (
                  <div key={prod.id} className="prod-card m-4" onClick={() => mostrarAviso("✅ Producto agregado")}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-black uppercase">{prod.name}</div>
                      <div className="bg-black text-white px-2 py-1 text-xs rounded">
                        {formatPrice(prod.price)}
                      </div>
                    </div>
                    <div className="text-xs mb-3 opacity-70">
                      {prod.description}
                    </div>
                    <AddToCartBtn
                      product={prod}
                      variant="full"
                      disabled={!isOpen}
                      hasExtras={getExtrasForProduct(prod.id).length > 0}
                      onOpenExtras={() => setSelectedProduct(prod)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        );

      case "spotlight":
        return (
          <div className="app-wrapper">
            {SHOW_BANNER && (
              <div
                className="spot-banner"
                style={{ backgroundImage: `url('${BANNER || ""}')` }}
              >
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="relative z-10 text-white p-6">
                  <h1 className="text-2xl font-black">{restaurant.name}</h1>
                </div>
              </div>
            )}
            {restaurant.categories?.map((cat: any) => (
              <div key={cat.id} className="p-4 text-left">
                <h2 className="font-black text-sm opacity-40 uppercase mb-4 tracking-tighter">
                  {cat.name}
                </h2>
                {cat.products?.map((prod: any) => (
                  <div
                    key={prod.id}
                    className="prod-card mb-4 border-b pb-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-bold">{prod.name}</div>
                      <div className="text-xs opacity-60 mb-2">
                        {prod.description}
                      </div>
                      <div className="font-black" style={{ color: THEME }}>
                        {formatPrice(prod.price)}
                      </div>
                    </div>
                    <div onClick={() => mostrarAviso("✅ Producto agregado")}>
                        <AddToCartBtn
                        product={prod}
                        variant="icon"
                        disabled={!isOpen}
                        hasExtras={getExtrasForProduct(prod.id).length > 0}
                        onOpenExtras={() => setSelectedProduct(prod)}
                        />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );

  
      case "elegant":
        return (
          <div className="pb-24 max-w-2xl mx-auto">
            <div className="elegant-header">
              <h1 className="text-4xl mb-2">{restaurant.name}</h1>
              <p className="italic opacity-70 text-sm">
                {restaurant.description}
              </p>
            </div>
            {restaurant.categories?.map((cat: any) => (
              <div key={cat.id} className="mb-12">
                <h2
                  className="text-center text-xl font-bold mb-8 tracking-widest uppercase"
                  style={{ color: THEME }}
                >
                  {cat.name}
                </h2>
                {cat.products?.map((prod: any) => (
                  <div key={prod.id} className="elegant-card">
                    <div className="elegant-name">{prod.name}</div>
                    <div className="elegant-divider"></div>
                    <p className="text-xs italic opacity-60 mb-2">
                      {prod.description}
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-lg font-bold">
                        {formatPrice(prod.price)}
                      </span>
                      <div onClick={() => mostrarAviso("✅ Producto agregado")}>
                        <AddToCartBtn
                            product={prod}
                            variant="icon"
                            disabled={!isOpen}
                            hasExtras={getExtrasForProduct(prod.id).length > 0}
                            onOpenExtras={() => setSelectedProduct(prod)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );

      case "bistro":
        return (
          <div className="pb-24">
            <div className="chalk-board text-left">
              <h1 className="chalk-title uppercase tracking-tighter">
                {restaurant.name}
              </h1>
              {restaurant.categories?.map((cat: any) => (
                <div key={cat.id} className="mb-8">
                  <h2 className="text-[#f0b001] text-xl mb-4 border-b border-[#333] inline-block">
                    {cat.name}
                  </h2>
                  {cat.products?.map((prod: any) => (
                    <div key={prod.id} className="mb-4">
                      <div className="chalk-item flex justify-between items-baseline">
                        <span className="text-lg">{prod.name}</span>
                        <div className="bistro-dots"></div>
                        <span className="text-lg text-[#f0b001]">
                          {formatPrice(prod.price)}
                        </span>
                        <div className="ml-3" onClick={() => mostrarAviso("✅ Producto agregado")}>
                          <AddToCartBtn
                            product={prod}
                            variant="icon"
                            isDark={true}
                            disabled={!isOpen}
                            hasExtras={getExtrasForProduct(prod.id).length > 0}
                            onOpenExtras={() => setSelectedProduct(prod)}
                          />
                        </div>
                      </div>
                      <p className="text-xs opacity-50 italic -mt-2">
                        {prod.description}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return <div className="p-10 text-center">Menú no encontrado</div>;
    }
  };

  return (
    <>
      <style>{getStyles()}</style>
      <ClearCartLogic currentRestaurantId={restaurant.id} />
      
   
{/* NOTIFICACION FLOTANTE CENTRADA */}
{/* NOTIFICACION FLOTANTE CENTRADA */}
{notificacion && (
  <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[1000] w-auto">
    <div className={`
      ${TEMPLATE === 'visualgrid' 
        ? 'bg-white/10 backdrop-blur-xl border-white/20 text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]' // Estilo Glass para VisualGrid
        : TEMPLATE === 'minimal' 
          ? 'bg-white text-black border-gray-200' 
          : 'bg-blue-600 text-white border-blue-400'} 
      px-8 py-3 rounded-2xl shadow-2xl flex items-center justify-center gap-3 animate-in fade-in zoom-in duration-300 border min-w-[200px]
    `}>
      <Check 
        size={20} 
        className={TEMPLATE === 'minimal' ? 'text-green-500' : 'text-white'} 
      />
      <span className="font-black text-sm uppercase tracking-tight whitespace-nowrap">
        {notificacion.replace('✅', '')}
      </span>
    </div>
  </div>
)}
      {renderTemplate()}
      {/* --- FOOTER DE MARCA SNAPPY --- */}
   <div className="w-full py-8 pb-0 flex flex-col items-center justify-center gap-2">
        <p className="text-[9px] font-bold tracking-[0.2em] text-gray-400 uppercase">
          Potenciado por
        </p>
        <a 
          href="https://snappy.uno" // <--- ACÁ VA TU LINK A LA LANDING
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          {/* --- ACÁ PONES LA URL DE TU IMAGEN --- */}
          <img 
            src="/logo.svg" // <--- CAMBIA ESTO
            alt="Snappy"
            className="h-7 w-auto" // Ajustá la altura (h-7, h-8, etc.) según necesites
          />
        </a>
      </div>
      {selectedProduct && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 flex items-end justify-center p-0"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl p-6 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 text-black">
              <h2 className="text-xl font-black">{selectedProduct.name}</h2>
              <X
                onClick={() => setSelectedProduct(null)}
                className="cursor-pointer"
              />
            </div>
            <div className="space-y-3 mb-8">
              {getExtrasForProduct(selectedProduct.id).map((ex: any) => (
                <div
                  key={ex.id}
                  onClick={() => toggleExtra(ex)}
                  className={`p-4 border-2 rounded-xl flex justify-between cursor-pointer ${currentExtras.some((e) => e.id === ex.id) ? "border-[#f0b001] bg-[#f0b001]/10 text-black" : "border-gray-100 text-gray-500"}`}
                >
                  <span className="font-bold">{ex.name}</span>
                  <span className="font-bold">+${ex.price}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const totalExtra = currentExtras.reduce(
                  (acc, e) => acc + Number(e.price),
                  0,
                );
                addItem({
                  ...selectedProduct,
                  price: selectedProduct.price + totalExtra,
                  uniqueId: `${selectedProduct.id}-${Date.now()}`,
                  selectedExtrasName: currentExtras
                    .map((e) => e.name)
                    .join(", "),
                });
                setSelectedProduct(null);
                setCurrentExtras([]);
                mostrarAviso("✅ Producto con extras agregado");
              }}
              className="w-full bg-black text-white py-4 rounded-2xl font-black shadow-lg"
            >
              AGREGAR AL PEDIDO
            </button>
          </div>
        </div>
      )}
      <CartFooter
        phone={restaurant.phone}
        deliveryCost={Number(restaurant.delivery_cost)}
        restaurantId={restaurant.id}
        aliasMp={restaurant.alias_mp}
        planType={restaurant.subscription_plan}
      />
    </>
  );
}

// --- 4. EXPORT PRINCIPAL (PADRE) ---
export default function MenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const resolvedParams = await params;
      const data = await getRestaurant(resolvedParams.slug);
      setRestaurant(data);
      setLoading(false);
    }
    load();
  }, [params]);

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-black" size={40} />
      </div>
    );
  if (!restaurant) return notFound();

  return (
    <CartProvider>
      <MenuContent
        restaurant={restaurant}
        isOpen={checkIsOpen(restaurant.business_hours)}
      />
    </CartProvider>
  );
}