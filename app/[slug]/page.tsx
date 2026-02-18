"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr"; 
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
  Zap, Ticket
} from "lucide-react";
import AddToCartBtn from "@/components/AddToCartBtn";
import CartFooter from "@/components/CartFooter";
import ClearCartLogic from "@/components/ClearCartLogic";
import { CartProvider, useCart } from "@/context/CartContext";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createBrowserClient(supabaseUrl, supabaseKey);

// --- 1. DATOS ---
async function getRestaurant(slug: string) {
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select(`*, categories (id, name, products (id, name, description, price, image_url))`)
    .eq("slug", slug)
    .single();

  if (!restaurant) return null;

  const { data: allExtras } = await supabase
    .from("extras")
    .select(`*, product_extras (product_id)`)
    .eq("restaurant_id", restaurant.id);

  return { ...restaurant, fetched_extras: allExtras || [] };
}

// --- 2. HORARIOS ---
function checkIsOpen(businessHours: any) {
  if (!businessHours) return true;
  try {
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

    const isInsideFirstSlot = currentTime >= open1 && currentTime <= close1;
    const isInsideSecondSlot = todayConfig.isSplit && 
                               currentTime >= (todayConfig.open2 || "17:00") && 
                               currentTime <= fixTime(todayConfig.close2 || "23:00");

    return isInsideFirstSlot || isInsideSecondSlot;
  } catch (err) {
    return true; 
  }
}

// --- 3. FUNCIÓN DE ESTILOS (MOVIDA ARRIBA PARA EVITAR EL ERROR DE INICIALIZACIÓN) ---
const getStyles = (TEMPLATE: any, BG: any, THEME: any, CARD_BG: any, TEXT: any, DESC: any, PROMO_BG: any) => {
    const common = ``;

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
            .prod-card { background: ${CARD_BG}; padding: 15px; border-radius: 24px; margin: 0 15px 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); display: block; } 
            .prod-main-content { display: flex; gap: 15px; align-items: center; width: 100%; }
            .prod-img { width: 90px; height: 90px; border-radius: 18px; background-size: cover; background-position: center; flex-shrink: 0; background-color: #222; } 
            .extras-container { width: 100%; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); }
        `;
      case "minimal":
        return `
            ${common} 
            body { background: ${BG}; margin: 0; font-family: 'Lato', sans-serif; } 
            .app-wrapper { min-height: 100vh; padding: 0 0 120px; color: ${TEXT}; } 
            .header-sec { padding: 40px 20px 20px; text-align: center; } 
            .header-logo { width: 60px; height: 60px; background-size: cover; margin: 0 auto 15px; border-radius: 50%; } 
            .promo-minimal { margin: 0 20px 30px; padding: 15px; background-color: #f4f4f5; border: 1px solid #eee; text-align: center; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: ${TEXT}; }
            .prod-card { padding: 20px; border-bottom: 1px solid #f5f5f5; display: block; }`;
      case "visualgrid":
        return `
            ${common} 
            body { background: #121212; margin: 0; }
            .notificacion-glass { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.2); color: white; padding: 12px 24px; border-radius: 16px; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; z-index: 9999; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); display: flex; align-items: center; gap: 10px; }`;
      default:
        return `${common} body { background: ${BG}; }`;
    }
};

// --- 4. COMPONENTE DE CONTENIDO ---
function MenuContent({
  restaurant,
  isOpen,
}: {
  restaurant: any;
  isOpen: boolean;
}) {
  const [activeCardId, setActiveCardId] = useState<any>(null);
  const { cart, addToCart, updateQuantity } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [currentExtras, setCurrentExtras] = useState<any[]>([]);
  const [notificacion, setNotificacion] = useState<string | null>(null);
// --- DETECTOR SEGURO DE SALIDA ---
  useEffect(() => {
    const handleBeforeUnload = (e: any) => {
      // Esto hace que el navegador pregunte "¿Seguro que quieres salir?"
      // si algo intenta refrescar la página.
      e.preventDefault();
      e.returnValue = ''; 
      return "";
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  // ---------------------------------

  // Variables de diseño
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

  // --- OPTIMIZACIÓN DE ESTILOS MEMORIZADOS ---
  const memoizedStyles = useMemo(() => {
    return getStyles(TEMPLATE, BG, THEME, CARD_BG, TEXT, DESC, PROMO_BG);
  }, [TEMPLATE, BG, THEME, CARD_BG, TEXT, DESC, PROMO_BG]);

 useEffect(() => {
  if (activeCardId) {
    // Verificamos si el producto activo ya está en el carrito
    const isProductInCart = cart.some(item => item.id === activeCardId);
    
    const timer = setTimeout(() => {
      const panel = document.getElementById(`scroll-panel-${activeCardId}`);
      if (panel) {
        // Si ya está en el carrito (mostrando extras), bajamos más el scroll
        // para que los adicionales queden a la vista.
        const scrollAmount = isProductInCart ? 350 : 180; 
        panel.scrollTo({ top: scrollAmount, behavior: 'smooth' });
      }
    }, 150); // Un delay corto para esperar a que el DOM de los extras se renderice
    
    return () => clearTimeout(timer);
  }
}, [activeCardId, cart.length]);

  const mostrarAviso = useCallback((msg: string) => {
    setNotificacion(msg);
    const timer = setTimeout(() => setNotificacion(null), 2500);
    return () => clearTimeout(timer);
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(price);

  const getExtrasForProduct = useCallback((productId: string) => {
    if (!restaurant?.fetched_extras) return [];
    return restaurant.fetched_extras.filter((extra: any) =>
      extra.product_extras?.some(
        (rel: any) => String(rel.product_id) === String(productId),
      ),
    );
  }, [restaurant]);
  
  const toggleExtra = (extra: any) => {
    setCurrentExtras((prev) =>
      prev.find((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra],
    );
  };

  const avisarSeleccionPrimero = () => {
    mostrarAviso("⚠️ Elegí primero el menú principal");
  };

  const renderTemplate = () => {
    switch (TEMPLATE) {
      case "urban":
        return (
          <div className="app-wrapper" style={{ backgroundColor: BG, minHeight: '100vh', paddingBottom: '120px', color: TEXT }}>
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
                      {principalEnCarrito && extras && extras.length > 0 && (
                        <div className="extras-container">
                          <div className="grid grid-cols-1 gap-2">
                            {extras.map((ex: any) => (
                              <div key={ex.id} className="flex justify-between items-center bg-black/40 p-3 rounded-2xl border border-white/5">
                                <div className="text-left">
                                  <div className="text-[11px] font-black uppercase text-white">{ex.name}</div>
                                  <div className="text-[10px] font-bold text-orange-500">+{formatPrice(ex.price)}</div>
                                </div>
                                <button onClick={() => { addToCart({ id: prod.id, extraId: ex.id, name: ex.name, price: Number(ex.price) }); mostrarAviso("✅ Extra sumado"); }} className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center active:scale-90"><Plus size={18} strokeWidth={3} /></button>
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
              <div className="status-badge">{isOpen ? "ABIERTO" : "CERRADO"}</div>
              <div className="header-logo">{LOGO ? <img src={LOGO} alt="Logo" /> : <Utensils size={30} color={THEME} />}</div>
              <h1 className="header-title">{restaurant.name}</h1>
              <p className="header-desc">{restaurant.description}</p>
            </div>
            {restaurant.show_promo && restaurant.promo_message && <div className="promo-box">{restaurant.promo_message}</div>}
            {restaurant.categories?.map((cat: any) => (
              <div key={cat.id}>
                {cat.products?.map((prod: any) => {
                  const extras = getExtrasForProduct(prod.id);
                  const principalEnCarrito = cart.some((item) => item.id === prod.id);
                  return (
                    <div key={prod.id}>
                      <div className="classic-item">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 pr-4 text-left">
                            <div className="classic-prod">{prod.name}</div>
                            <div className="classic-p-desc">{prod.description}</div>
                            <div className="classic-price">{formatPrice(prod.price)}</div>
                            {extras && extras.length > 0 && (
                              <div className="mt-3 space-y-2 border-l-2 border-gray-100 pl-3">
                                {extras.map((ex: any) => (
                                  <div key={ex.id} className="flex justify-between items-center text-[11px] py-1">
                                    <span className={`font-medium ${principalEnCarrito ? "text-gray-600" : "text-gray-400"}`}>{ex.name} <span className={`${principalEnCarrito ? "text-[#f0b001]" : "text-gray-300"} font-bold`}>(+{formatPrice(ex.price)})</span></span>
                                    <button onClick={() => { if (!principalEnCarrito) { avisarSeleccionPrimero(); } else { addToCart({ id: prod.id, extraId: ex.id, name: ex.name, price: Number(ex.price) }); mostrarAviso("✅ Extra sumado"); } }} className={`w-6 h-6 rounded-full border flex items-center justify-center bg-white transition-colors ${principalEnCarrito ? "border-gray-200 text-gray-400 hover:bg-gray-50" : "border-gray-100 text-gray-200 cursor-not-allowed"}`}><Plus size={12} strokeWidth={3} /></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="add-btn-wrapper pt-1" onClick={() => mostrarAviso("✅ Producto agregado")}><AddToCartBtn product={prod} disabled={!isOpen} hasExtras={false} /></div>
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
            <div className="header-sec relative" style={{ padding: '60px 20px 20px', textAlign: 'center' }}>
              <div className="absolute top-6 right-5">
                <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase tracking-widest bg-white ${isOpen ? 'border-black text-black' : 'border-red-500 text-red-600'}`}>
                  {isOpen ? "ABIERTO" : "CERRADO"}
                </span>
              </div>
              <div className="header-logo" style={{ backgroundImage: `url('${LOGO || ""}')`, width: '60px', height: '60px', borderRadius: '50%', backgroundSize: 'cover', margin: '0 auto 15px', border: `1px solid ${TEXT}` }}></div>
              <h1 className="text-xl font-black uppercase tracking-widest mb-1" style={{ color: TEXT }}>{restaurant.name}</h1>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{restaurant.description}</p>
            </div>
            {restaurant.show_promo && restaurant.promo_message && <div className="promo-minimal">{restaurant.promo_message}</div>}
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
                          <div className="text-xs font-black" style={{ color: THEME }}>{formatPrice(prod.price)}</div>
                        </div>
                        <div onClick={() => !principalEnCarrito && mostrarAviso("✅ Producto agregado")}>
                          <AddToCartBtn product={prod} variant="icon" disabled={!isOpen} />
                        </div>
                      </div>
                      {principalEnCarrito && extras && extras.length > 0 && (
                        <div className="mt-3 pl-2 space-y-2 border-l-2 border-gray-100 ml-1">
                          {extras.map((ex: any) => (
                            <div key={ex.id} className="flex justify-between items-center py-1">
                              <span className="text-[11px] font-medium opacity-70">+ {ex.name} <span style={{ color: THEME }}>({formatPrice(ex.price)})</span></span>
                              <button onClick={() => { addToCart({ id: prod.id, extraId: ex.id, name: ex.name, price: Number(ex.price) }); mostrarAviso("✅ Extra sumado"); }} className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center bg-white active:bg-gray-50"><Plus size={12} strokeWidth={3} /></button>
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
           <div className="absolute top-4 right-4 z-[100]">
              <span className={`text-[10px] font-black px-2 py-1 rounded border uppercase tracking-widest shadow-2xl ${isOpen ? 'bg-white text-black border-white' : 'border-red-500 text-red-500 bg-black/80'}`}>
                {isOpen ? "ABIERTO" : "CERRADO"}
              </span>
            </div>
            <div className="relative pt-10 px-6 pb-4">
              <div className="flex items-center gap-4 text-left">
                <div className="w-14 h-14 rounded-full border-2 border-white/10 bg-cover bg-center shadow-lg shrink-0" style={{ backgroundImage: `url('${LOGO || ""}')` }}></div>
                <div>
                  <h1 className="text-3xl font-black uppercase italic leading-none text-white tracking-tighter">{restaurant.name}</h1>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{restaurant.description}</p>
                </div>
              </div>
              {restaurant.show_promo && restaurant.promo_message && (
                <div className="mt-6 flex items-center gap-3 px-1">
                  <div className="w-[3px] h-5 bg-orange-600 rounded-full shrink-0" />
                  <p className="text-[12px] text-gray-300 font-medium leading-none">{restaurant.promo_message}</p>
                </div>
              )}
            </div>
            {restaurant.categories?.map((cat: any) => (
              <div key={cat.id} className="mb-4">
                <div className="grid grid-cols-2 gap-3 px-4">
                  {cat.products?.map((prod: any) => {
                    const extras = getExtrasForProduct(prod.id);
                    const principalEnCarrito = cart.some(item => item.id === prod.id);
                    const isActive = activeCardId === prod.id; 
                    return (
                      <div key={prod.id} className={`relative rounded-[2rem] overflow-hidden aspect-[3/4] transition-all duration-300 ${isActive ? 'z-20 ring-2 ring-white/20 scale-[1.02]' : 'z-0'}`} onClick={() => setActiveCardId(prod.id)}>
                        <div className="absolute inset-0 bg-cover bg-center transition-all duration-500" style={{ backgroundImage: `url('${prod.image_url || ""}')`, filter: isActive ? 'brightness(0.15) blur(2px)' : 'brightness(0.8)', }} />
                        {!isActive && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-4 text-left">
                             <div className="text-white font-bold text-sm leading-tight drop-shadow-md">{prod.name}</div>
                             <div className="text-white/60 font-black text-xs mt-1">{formatPrice(prod.price)}</div>
                          </div>
                        )}
                        {isActive && (
                            <div id={`scroll-panel-${prod.id}`} className="absolute inset-0 p-4 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-y-auto no-scrollbar scroll-smooth">
                              <div className="flex justify-end mb-2">
                                <button onClick={(e) => { e.stopPropagation(); setActiveCardId(null); }} className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/10 active:scale-90"><X size={18} /></button>
                              </div>
                              <div className="text-left">
                                <div className="text-white font-black text-xl leading-none mb-1">{prod.name}</div>
                                <div className="text-white/50 text-[11px] leading-snug mb-3">{prod.description}</div>
                                <div className="text-orange-400 font-black text-sm mb-4">{formatPrice(prod.price)}</div>
                                <div className="mb-4" onClick={(e) => e.stopPropagation()}><AddToCartBtn product={prod} variant="full" disabled={!isOpen} /></div>
                                {principalEnCarrito && extras && extras.length > 0 && (
                                  <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300 pb-4">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest border-b border-white/10 pb-1 mb-2">Opcionales</p>
                                    {extras.map((ex: any) => (
                                      <div key={ex.id} className="flex justify-between items-center bg-black/40 p-2 rounded-xl border border-white/5">
                                        <div className="text-left leading-none">
                                          <div className="text-[10px] font-bold text-white">{ex.name}</div>
                                          <div className="text-[9px] text-orange-400 mt-1">+{formatPrice(ex.price)}</div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); addToCart({ id: prod.id, extraId: ex.id, name: ex.name, price: Number(ex.price) }); mostrarAviso("Extra sumado"); }} className="w-8 h-8 bg-white text-black rounded-xl flex items-center justify-center active:scale-90 shadow-lg"><Plus size={16} strokeWidth={3} /></button>
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
      default:
        return <div className="p-10 text-center">Menú no encontrado</div>;
    }
  };
return (
  <main className="min-h-screen bg-[#0a0a0a]"> {/* Fondo neutro para el resto de la pantalla en PC */}
    <div className="max-w-[500px] mx-auto min-h-screen relative shadow-[0_0_100px_rgba(0,0,0,0.8)] border-x border-white/5 overflow-x-hidden" style={{ backgroundColor: BG }}>
      <style dangerouslySetInnerHTML={{ __html: memoizedStyles }} />
      <ClearCartLogic currentRestaurantId={restaurant.id} />
      
    {/* Notificación más chica y centrada */}
      {notificacion && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[2000] whitespace-nowrap">
          <div className={`
            ${TEMPLATE === 'visualgrid' ? 'bg-white/10 backdrop-blur-xl border-white/20 text-white' : TEMPLATE === 'minimal' ? 'bg-white text-black border-gray-200' : 'bg-blue-600 text-white border-blue-400'} 
            px-4 py-2 rounded-full shadow-lg flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300 border
          `}>
            <Check size={16} className={TEMPLATE === 'minimal' ? 'text-green-500' : 'text-white'} />
            <span className="font-bold text-xs uppercase tracking-wide">
                {notificacion.replace('✅', '').replace('⚠️', '')}
            </span>
          </div>
        </div>
      )}

      {renderTemplate()}

      <a href="https://snappy.uno" target="_blank" rel="noreferrer" className="block w-full py-8 text-center bg-gray-900/50 hover:bg-black transition-colors cursor-pointer no-underline" style={{ paddingBottom: '100px' }}>
        <p className="text-[10px] font-black text-white/40 flex items-center justify-center gap-1 uppercase tracking-[0.2em]">Potenciado por <Zap size={12} className="text-yellow-400/50 fill-yellow-400/50"/> Snappy</p>
      </a>

      {/* El Footer ahora quedará anclado al contenedor de 500px si es fixed/absolute */}
      <div className="sticky bottom-0 left-0 w-full z-[50]">
        <CartFooter phone={restaurant.phone} deliveryCost={Number(restaurant.delivery_cost)} restaurantId={restaurant.id} aliasMp={restaurant.alias_mp} planType={restaurant.subscription_plan} receiveWhatsapp={restaurant.receive_whatsapp} />
      </div>
    </div>
  </main>
);
}

// --- 5. EXPORT PRINCIPAL (CORREGIDO PARA NEXT.JS 15 Y EVITAR REFRESH) ---
export default function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const resolvedParams = await params;
        const data = await getRestaurant(resolvedParams.slug);
        if (active) {
          setRestaurant(data);
          setLoading(false);
        }
      } catch (error) {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []); // Array vacío para cargar una sola vez

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-black" size={40} /></div>;
  if (!restaurant) return notFound();

  return (
    <CartProvider>
      <MenuContent restaurant={restaurant} isOpen={checkIsOpen(restaurant.business_hours)} />
    </CartProvider>
  );
}