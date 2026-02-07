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
        return `${common} body { background: ${BG}; margin: 0; font-family: 'Lato', sans-serif; } .app-wrapper { min-height: 100vh; padding: 20px 15px 120px; text-align: center; color: ${TEXT}; } .header-logo { width: 60px; height: 60px; background: ${THEME}; border-radius: 50%; margin: 0 auto 10px; background-size: cover; } .prod-card { padding: 15px 0; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; text-align: left; }`;
      case "pop":
        return `${common} body { background: ${BG}; margin: 0; font-family: 'Inter', sans-serif; } .header-sec { display: flex; align-items: center; gap: 10px; background: ${CARD_BG}; border: 3px solid ${TEXT}; padding: 10px; border-radius: 12px; box-shadow: 4px 4px 0 ${TEXT}; margin: 15px; } .prod-card { background: ${CARD_BG}; border: 3px solid ${TEXT}; border-radius: 10px; padding: 10px; margin: 15px; box-shadow: 4px 4px 0 ${THEME}; }`;
      case "spotlight":
        return `${common} body { background: ${BG}; margin: 0; font-family: 'Inter', sans-serif; } .spot-banner { height: 200px; background-size: cover; background-position: center; position: relative; display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; } .prod-card { display: flex; align-items: center; gap: 12px; padding: 12px 15px; border-bottom: 1px solid rgba(0,0,0,0.05); background: ${CARD_BG}; }`;
      case "fresh":
        return `${common} body { background: ${BG}; } .grid-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 15px; } .grid-card { background: ${CARD_BG}; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; flex-direction: column; } .grid-img { width: 100%; aspect-ratio: 1/1; background-size: cover; background-position: center; } .grid-info { padding: 10px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; } .grid-name { font-weight: 700; font-size: 14px; color: ${TEXT}; line-height: 1.2; }`;
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
          <div className="app-wrapper">
            <div className="header-sec border-b pb-4 mb-4 text-center">
              <div
                className="header-logo mx-auto"
                style={{ backgroundImage: `url('${LOGO || ""}')` }}
              ></div>
              <h1 className="text-xl font-black uppercase tracking-widest">
                {restaurant.name}
              </h1>
            </div>
            {restaurant.categories?.map((cat: any) => (
              <div key={cat.id} className="mb-6 px-4 text-left">
                <h2 className="text-xs font-bold opacity-40 uppercase mb-3">
                  {cat.name}
                </h2>
                {cat.products?.map((prod: any) => (
                  <div
                    key={prod.id}
                    className="prod-card flex justify-between items-center border-b pb-2 mb-2"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-sm">{prod.name}</div>
                      <div
                        className="text-xs font-black"
                        style={{ color: THEME }}
                      >
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

      case "fresh":
        return (
          <div className="pb-24">
            <div className="p-6 text-center">
              <h1 className="text-2xl font-black">{restaurant.name}</h1>
              <p className="text-sm opacity-60">{restaurant.description}</p>
            </div>
            {restaurant.categories?.map((cat: any) => (
              <div key={cat.id}>
                <h2 className="px-4 font-black text-xs uppercase opacity-40 mb-3 tracking-tighter text-left">
                  {cat.name}
                </h2>
                <div className="grid-container">
                  {cat.products?.map((prod: any) => (
                    <div key={prod.id} className="grid-card text-left" onClick={() => mostrarAviso("✅ Producto agregado")}>
                      <div
                        className="grid-img"
                        style={{
                          backgroundImage: `url('${prod.image_url || ""}')`,
                        }}
                      ></div>
                      <div className="grid-info">
                        <div className="grid-name">{prod.name}</div>
                        <div className="flex justify-between items-center mt-2">
                          <span
                            className="font-black text-sm"
                            style={{ color: THEME }}
                          >
                            {formatPrice(prod.price)}
                          </span>
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
{notificacion && (
  <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[999] w-auto max-w-[90vw]">
    <div className="bg-blue-600 shadow-2xl shadow-blue-900/20 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-3 animate-bounce border border-blue-400 backdrop-blur-sm">
      {notificacion.includes('✅') ? <Check size={18} className="text-white" /> : null}
      <span className="font-bold text-sm whitespace-nowrap">{notificacion}</span>
    </div>
  </div>
)}
      {renderTemplate()}
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