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
import MarketProTemplate from "@/components/templates/MarketProTemplate";

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
const getStyles = (
  TEMPLATE: any, BG: any, THEME: any, CARD_BG: any, TEXT: any, DESC: any, PROMO_BG: any,
  // Agregamos estos 4 parámetros nuevos:
  HERO_BADGE_BG?: string, HERO_BADGE_COLOR?: string, HERO_TITLE_COLOR?: string, HERO_PRICE_COLOR?: string
) => {
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

  case "pop":
  return `
      ${common}
      body { background: ${BG}; margin: 0; font-family: 'Inter', sans-serif; }
      .app-wrapper { min-height: 100vh; padding-bottom: 120px; color: ${TEXT}; }
      
      .pop-header-box { 
          background: white; border: 3px solid black; border-radius: 12px; 
          margin: 20px 15px; padding: 15px; display: flex; align-items: center; gap: 12px;
          box-shadow: 4px 4px 0 black; position: relative;
      }
      .pop-status { 
          position: absolute; top: -10px; right: 10px; background: #00CED1; 
          border: 2px solid black; padding: 2px 8px; font-size: 8px; font-weight: 900;
          transform: rotate(3deg); color: black;
      }
      .pop-promo { 
          background: #FFD700; border: 3px solid black; margin: 0 15px 20px; 
          padding: 10px; text-align: center; font-weight: 900; font-size: 12px;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.2); transform: rotate(-1deg);
      }
      .pop-card { 
          background: white; border: 3px solid black; border-radius: 15px; 
          margin: 0 15px 15px; padding: 15px; 
          box-shadow: 4px 4px 0 ${THEME}; /* Usamos el color de tema para la sombra */
      }
      .pop-prod-title { font-weight: 900; font-size: 18px; text-transform: uppercase; color: ${THEME}; }
      .pop-price-tag { 
          background: black; color: white; padding: 2px 8px; 
          border-radius: 4px; font-weight: 900; transform: rotate(2deg);
      }
  `;
case "spotlight":
        return `
            body { background: #ffffff; margin: 0; font-family: 'Inter', sans-serif; }
            .app-wrapper { min-height: 100vh; padding-bottom: 120px; color: #000000; }
            .spot-header { padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; background: white; }
            .spot-logo { width: 45px; height: 45px; border-radius: 50%; background-size: cover; background-position: center; border: 1px solid #eee; }
            .spot-status-pill { background: #2ecc71; color: white; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 800; }
            .spot-banner-container { position: relative; height: 260px; width: 100%; overflow: hidden; }
            .spot-hero-img { width: 100%; height: 100%; background-size: cover; background-position: center; transition: transform 0.5s ease; }
            .spot-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%); display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; }
            .spot-hero-content { color: white; position: relative; z-index: 2; text-align: left; width: 85%; }
            
            /* USAMOS LOS COLORES DINÁMICOS AQUÍ */
            .spot-badge { 
                background: ${HERO_BADGE_BG || THEME}; 
                color: ${HERO_BADGE_COLOR || 'white'}; 
                padding: 4px 10px; font-size: 10px; font-weight: 900; border-radius: 6px; display: inline-block; margin-bottom: 6px; text-transform: uppercase; 
            }
            .spot-hero-title { 
                color: ${HERO_TITLE_COLOR || 'white'}; 
                font-size: 24px; font-weight: 900; text-shadow: 0 2px 4px rgba(0,0,0,0.3); line-height: 1.1; margin-bottom: 4px; text-transform: uppercase; italic; 
            }
            .spot-hero-price { 
                color: ${HERO_PRICE_COLOR || '#FFD700'}; 
                font-size: 20px; font-weight: 900; text-shadow: 0 2px 4px rgba(0,0,0,0.5); 
            }
            
            .spot-plus-btn { position: absolute; bottom: 20px; right: 20px; width: 45px; height: 45px; background: white; color: black; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 10; transition: transform 0.2s; }
            .spot-promo-bar { background: #fff3e0; color: #000; padding: 12px; text-align: center; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; }
            .spot-product-card { display: flex; align-items: center; gap: 15px; padding: 15px 20px; border-bottom: 1px solid #f8f8f8; }
            .spot-product-thumb { width: 70px; height: 70px; border-radius: 12px; background-size: cover; background-position: center; flex-shrink: 0; }
            .spot-product-price { font-weight: 900; font-size: 15px; margin-top: 4px; color: #111; }
        `;


        case "elegant":
        return `
            /* 1. Importamos la fuente con todos los pesos necesarios (400, 700 y 900) */
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&display=swap');
            
            body, h1, h2, h3, p, span, div, button { 
                font-family: 'Playfair Display', serif !important; 
            }

            body { background: ${BG}; margin: 0; color: ${TEXT}; }
            .app-wrapper { min-height: 100vh; padding-bottom: 120px; text-align: center; }
            
            /* Header */
            .elegant-header { padding: 60px 20px 30px; }
            .elegant-logo { width: 90px; height: 90px; margin: 0 auto 20px; border-radius: 50%; border: 2px solid ${THEME}; padding: 4px; object-fit: cover; }
            .elegant-title { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; font-style: italic; }
            
            /* Banner de Promoción */
            .elegant-promo { 
                background: ${PROMO_BG}; 
                border: 1px solid ${THEME}40;
                padding: 18px; 
                margin: 0 25px 40px 25px;
                font-size: 15px; 
                font-weight: 700; /* Más negro */
                font-style: italic;
                color: ${TEXT};
                border-radius: 12px;
            }
            
            .elegant-cat-title { display: none; } 

            /* Tarjetas de Producto */
            .elegant-card { 
                padding: 20px 25px; 
                margin-bottom: 10px; 
                display: flex; 
                justify-content: space-between; 
                align-items: flex-start; 
                text-align: left; 
                border-bottom: 1px solid rgba(0,0,0,0.04); 
            }

            /* Nombre del producto: Más grande y bien negro */
            .elegant-prod-name { 
                font-size: 20px; 
                font-weight: 900; 
                text-transform: uppercase; 
                letter-spacing: 0.5px; 
                color: ${TEXT}; 
            }

            /* DESCRIPCIÓN: Subimos tamaño a 14px y oscurecemos el color */
            .elegant-prod-desc { 
                font-size: 14px; 
                font-style: italic; 
                color: ${TEXT}; 
                opacity: 0.9; /* Casi negro total */
                margin-top: 6px; 
                line-height: 1.5; 
            }

            .elegant-price { 
                font-size: 18px; 
                font-weight: 900; 
                color: ${THEME}; 
                margin-top: 10px; 
            }
        `;
        case "bistro":
        return `
            @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');
            
            body, h1, h2, h3, p, span, div, button { 
                font-family: 'Patrick Hand', cursive !important; 
            }

            body { background: #222222; margin: 0; color: #eeeeee; }
            
            .app-wrapper { 
                min-height: 100vh; 
                display: flex; 
                flex-direction: column; 
                padding: 15px; 
                padding-bottom: 40px; 
            }
            
            .bistro-border { 
                border: 2px dashed #555555; 
                border-radius: 20px; 
                padding: 20px 15px; 
                flex: 1; 
                display: flex;
                flex-direction: column;
                position: relative;
            }

            .bistro-header { text-align: center; margin-bottom: 25px; }
            .bistro-logo { width: 65px; height: 65px; margin: 0 auto 12px; border-radius: 50%; border: 2px solid #e6c87e; padding: 3px; object-fit: cover; }
            .bistro-title { font-size: 30px; color: #e6c87e; line-height: 1; margin-bottom: 5px; text-transform: uppercase; }
            .bistro-desc { font-size: 15px; color: #aaaaaa; }

            .bistro-promo {
                margin-bottom: 25px;
                padding: 12px;
                border: 2px dashed rgba(230, 200, 126, 0.4);
                border-radius: 12px;
                text-align: center;
                color: #e6c87e;
                font-size: 14px;
                font-weight: bold;
                text-transform: uppercase;
            }

            /* --- ESTRUCTURA DE PRODUCTO REFORZADA --- */
            .bistro-item-container {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-bottom: 20px;
                text-align: left;
                border-bottom: 1px dashed rgba(255,255,255,0.05);
                padding-bottom: 15px;
            }

            /* Nombre: se achica y opaca cuando ya está en el carrito */
            .bistro-name { 
                font-size: 20px; 
                font-weight: bold;
                color: #ffffff; 
                line-height: 1.2;
                transition: all 0.2s ease;
            }
            .bistro-name.in-cart { font-size: 16px; opacity: 0.6; }

            /* Descripción: se achica si está en el carrito */
            .bistro-prod-desc { 
                font-size: 13px; 
                color: #888888; 
                margin-bottom: 8px; 
                display: block; 
                width: 100%;
                line-height: 1.3;
                transition: all 0.2s ease;
            }
            .bistro-prod-desc.in-cart { font-size: 11px; opacity: 0.5; }

            /* Fila inferior: Precio e interfaz de carrito */
            .bistro-footer-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 5px;
            }

            .bistro-price { 
                font-size: 18px; 
                color: #e6c87e; 
                font-weight: bold; 
            }

            .bistro-btn-wrapper {
                flex-shrink: 0;
                min-width: 45px;
                display: flex;
                justify-content: flex-end;
            }
            /* Espacio reservado para que el - 1 + no empuje el diseño */
            .bistro-btn-wrapper.expanded {
                min-width: 100px;
            }
                .bistro-extras-container {
    margin-top: 15px;
    padding-top: 12px;
    border-top: 1px dashed rgba(230, 200, 126, 0.2);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.bistro-extra-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.03);
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid rgba(230, 200, 126, 0.1);
}

.bistro-extra-info {
    display: flex;
    flex-direction: column;
    text-align: left;
}

.bistro-extra-name {
    font-size: 13px;
    text-transform: uppercase;
    color: #eeeeee;
    font-weight: bold;
}

.bistro-extra-price {
    font-size: 11px;
    color: #e6c87e;
}

.bistro-extra-btn {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #e6c87e;
    color: #222;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    transition: transform 0.1s;
}
.bistro-extra-btn:active { transform: scale(0.9); }
 
   `;
        case "marketpro":
        return `
            ${common}
            body { background: ${BG}; margin: 0; }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `;
        
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
  const [showHeroModal, setShowHeroModal] = useState(false); // Controla si el modal está abierto
  const [heroQty, setHeroQty] = useState(1);

  const handleAddHeroToCart = () => {
    if (!restaurant.hero_title || !restaurant.hero_price) return;

    // Creamos un objeto que el carrito entienda
    const heroProduct = {
      id: 'hero-item', // ID único para el destacado
      name: restaurant.hero_title,
      price: Number(restaurant.hero_price),
      quantity: heroQty
    };

    // Usamos tu función existente del context
    for (let i = 0; i < heroQty; i++) {
      addToCart(heroProduct);
    }

    setShowHeroModal(false);
    setHeroQty(1); // Reseteamos la cantidad
    mostrarAviso("✅ Destacado agregado");
  };
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
  return getStyles(
    TEMPLATE, BG, THEME, CARD_BG, TEXT, DESC, PROMO_BG,
    restaurant.hero_badge_bg, 
    restaurant.hero_badge_color, 
    restaurant.hero_title_color, 
    restaurant.hero_price_color
  );
}, [TEMPLATE, BG, THEME, CARD_BG, TEXT, DESC, PROMO_BG, restaurant.hero_badge_bg, restaurant.hero_badge_color, restaurant.hero_title_color, restaurant.hero_price_color]);

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
        case "pop":
  return (
    <div className="app-wrapper">
      {/* Encabezado Estilo Cómic */}
      <div className="pop-header-box">
        <div className="pop-status">{isOpen ? "OPEN" : "CLOSED"}</div>
        <div className="w-16 h-16 rounded-full border-4 border-black overflow-hidden flex-shrink-0 bg-white">
          <img src={LOGO} className="w-full h-full object-cover" alt="logo" />
        </div>
        <div>
          <h1 className="text-xl font-black uppercase leading-none">{restaurant.name}</h1>
          <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-tight">{restaurant.description}</p>
        </div>
      </div>

      {/* Mensaje Promo */}
     {restaurant.show_promo && restaurant.promo_message && (
  <div className="pop-promo">
    {restaurant.promo_message} 
  </div>
)}

      {/* Lista de Productos */}
      {restaurant.categories?.map((cat: any) => (
        <div key={cat.id}>
        
          {cat.products?.map((prod: any) => {
            const extras = getExtrasForProduct(prod.id);
            const principalEnCarrito = cart.some(item => item.id === prod.id);
            return (
              <div key={prod.id} className="pop-card text-left">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="pop-prod-title">{prod.name}</h3>
                    <p className="text-xs font-bold text-gray-500 mb-2 leading-tight">{prod.description}</p>
                    <span className="pop-price-tag inline-block">{formatPrice(prod.price)}</span>
                  </div>
                  <div onClick={() => !principalEnCarrito && mostrarAviso("✅ Producto agregado")}>
                    <AddToCartBtn product={prod} variant="icon" isDark={true} disabled={!isOpen} />
                  </div>
                </div>

                {/* Extras para Pop */}
                {principalEnCarrito && extras && extras.length > 0 && (
                  <div className="mt-4 pt-3 border-t-2 border-black/5 space-y-2">
                    {extras.map((ex: any) => (
                      <div key={ex.id} className="flex justify-between items-center bg-gray-50 p-2 border-2 border-black rounded-lg">
                        <span className="text-[10px] font-black uppercase">{ex.name} (+{formatPrice(ex.price)})</span>
                        <button 
                          onClick={() => { addToCart({ id: prod.id, extraId: ex.id, name: ex.name, price: Number(ex.price) }); mostrarAviso("✅ Extra sumado"); }}
                          className="w-8 h-8 bg-black text-white rounded-md flex items-center justify-center active:scale-90"
                        >
                          <Plus size={14} strokeWidth={4} />
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
 case "spotlight":
  return (
    <div className="app-wrapper">
      {/* 1. Encabezado Superior */}
      <div className="spot-header">
        <div className="flex items-center gap-3 text-left">
          <div className="spot-logo" style={{ backgroundImage: `url('${LOGO}')` }}></div>
          <div>
            <h1 className="text-sm font-black uppercase leading-none tracking-tight">{restaurant.name}</h1>
            {/* CORRECCIÓN: Quitamos el substring para eliminar los puntos suspensivos (...) */}
            <p className="text-[10px] font-bold opacity-50 uppercase">{restaurant.description}</p>
          </div>
        </div>
        <div className="spot-status-pill">{isOpen ? "ABIERTO" : "CERRADO"}</div>
      </div>

      {/* 2. Banner Héroe Interactivo */}
      <div className="spot-banner-container" onClick={() => isOpen && restaurant.hero_title && setShowHeroModal(true)}>
        <div className="spot-hero-img" style={{ backgroundImage: `url('${BANNER || LOGO}')` }}></div>
        
        {restaurant.hero_title && (
            <div className="spot-overlay">
              <div className="spot-hero-content">
                <div className="spot-badge">{restaurant.hero_badge_text || 'DESTACADO'}</div>
                <h2 className="spot-hero-title">{restaurant.hero_title}</h2>
                {restaurant.hero_price && <div className="spot-hero-price">{formatPrice(restaurant.hero_price)}</div>}
              </div>
              {isOpen && (
                  <button className="spot-plus-btn">
                    <Plus size={24} strokeWidth={3} />
                  </button>
              )}
            </div>
        )}
      </div>

      {/* 3. Barra Promo */}
      {restaurant.show_promo && restaurant.promo_message && (
        <div className="spot-promo-bar">
          {restaurant.promo_message}
        </div>
      )}

      {/* 4. Lista de Productos */}
      {restaurant.categories?.map((cat: any) => (
        <div key={cat.id}>
          {cat.products?.map((prod: any) => {
            const principalEnCarrito = cart.some(item => item.id === prod.id);
            return (
              <div key={prod.id} className="spot-product-card text-left">
                <div className="spot-product-thumb" style={{ backgroundImage: `url('${prod.image_url || ""}')` }}></div>
                <div className="flex-1">
                  <h3 className="font-bold text-[14px] leading-tight uppercase">{prod.name}</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{prod.description}</p>
                  <div className="spot-product-price">{formatPrice(prod.price)}</div>
                </div>
                <div onClick={() => !principalEnCarrito && mostrarAviso("✅ Agregado")}>
                   <AddToCartBtn product={prod} variant="icon" isDark={false} disabled={!isOpen} />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  case "elegant":
  return (
    <div className="app-wrapper">
      <div className="elegant-header">
        {LOGO && <img src={LOGO} className="elegant-logo" alt="logo" />}
        <h1 className="elegant-title">{restaurant.name}</h1>
        <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 font-bold">{restaurant.description}</p>
      </div>

      {restaurant.show_promo && restaurant.promo_message && (
        <div className="elegant-promo">
          {restaurant.promo_message}
        </div>
      )}

      {restaurant.categories?.map((cat: any) => (
        <div key={cat.id}>
          <h2 className="elegant-cat-title">{cat.name}</h2>
          {cat.products?.map((prod: any) => {
            const extras = getExtrasForProduct(prod.id);
            const principalEnCarrito = cart.some(item => item.id === prod.id);
            return (
              <div key={prod.id} className="elegant-card">
                <div className="flex-1 pr-6">
                  <h3 className="elegant-prod-name">{prod.name}</h3>
                  <p className="elegant-prod-desc">{prod.description}</p>
                  <div className="elegant-price">{formatPrice(prod.price)}</div>
                  
                  {/* Extras Estilo Elegante */}
                  {principalEnCarrito && extras && extras.length > 0 && (
                    <div className="mt-4 space-y-3 border-l border-black/10 pl-4 animate-in fade-in slide-in-from-left-2">
                       {extras.map((ex: any) => (
                         <div key={ex.id} className="flex justify-between items-center text-[11px]">
                           <span className="font-bold opacity-60 uppercase">{ex.name} (+{formatPrice(ex.price)})</span>
                           <button onClick={() => { addToCart({ id: prod.id, extraId: ex.id, name: ex.name, price: Number(ex.price) }); mostrarAviso("✅ Adicional sumado"); }} className="w-6 h-6 rounded-full border border-black/10 flex items-center justify-center active:bg-black/5"><Plus size={12} /></button>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
                <div onClick={() => !principalEnCarrito && mostrarAviso("✅ Producto agregado")}>
                  <AddToCartBtn product={prod} variant="icon" isDark={false} disabled={!isOpen} />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );


case "bistro":
  return (
    <div className="app-wrapper">
      {/* Contenedor con borde de tiza */}
      <div className="bistro-border relative">
        
        {/* --- CARTEL DE ESTADO (Abierto/Cerrado) Estilo Sello --- */}
        <div className="absolute -top-3 -right-2 rotate-12 z-20">
          <div className={`
            px-3 py-1 border-2 border-dashed rounded-lg text-[10px] font-black uppercase tracking-widest
            ${isOpen ? 'border-[#2ecc71] text-[#2ecc71] bg-[#222]/80' : 'border-red-500 text-red-500 bg-[#222]/80'}
          `}>
            {isOpen ? "Abierto" : "Cerrado"}
          </div>
        </div>

        {/* Header */}
        <div className="bistro-header">
          {LOGO && <img src={LOGO} className="bistro-logo" alt="logo" />}
          <h1 className="bistro-title">{restaurant.name}</h1>
          <p className="bistro-desc">{restaurant.description}</p>
        </div>

        {/* Banner de Promoción (Como en el editor) */}
        {restaurant.show_promo && restaurant.promo_message && (
          <div className="bistro-promo">
            {restaurant.promo_message}
          </div>
        )}

        {/* Lista de Productos */}
     {restaurant.categories?.map((cat: any) => (
  <div key={cat.id} className="mb-8">
    {cat.products?.map((prod: any) => {
      // 1. OBTENEMOS ADICIONALES
      const extras = getExtrasForProduct(prod.id);
      const principalEnCarrito = cart.some(item => item.id === prod.id);
      
      return (
        <div key={prod.id} className="bistro-item-container">
          <h3 className={`bistro-name ${principalEnCarrito ? 'in-cart' : ''}`}>
            {prod.name}
          </h3>

          {prod.description && (
            <p className={`bistro-prod-desc italic ${principalEnCarrito ? 'in-cart' : ''}`}>
              {prod.description}
            </p>
          )}

          <div className="bistro-footer-row">
            <span className="bistro-price">{formatPrice(prod.price)}</span>
            
            <div 
              className={`bistro-btn-wrapper ${principalEnCarrito ? 'expanded' : ''}`}
              onClick={() => !principalEnCarrito && mostrarAviso("✅ Agregado")}
            >
               <AddToCartBtn product={prod} variant="icon" isDark={true} disabled={!isOpen} />
            </div>
          </div>

          {/* 2. DIBUJAMOS ADICIONALES SI EL PLATO ESTÁ EN EL CARRITO */}
          {principalEnCarrito && extras && extras.length > 0 && (
            <div className="bistro-extras-container animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Adicionales</p>
              {extras.map((ex: any) => (
                <div key={ex.id} className="bistro-extra-item">
                  <div className="bistro-extra-info">
                    <span className="bistro-extra-name">{ex.name}</span>
                    <span className="bistro-extra-price">+{formatPrice(ex.price)}</span>
                  </div>
                  <button 
                    onClick={() => { 
                        addToCart({ id: prod.id, extraId: ex.id, name: ex.name, price: Number(ex.price) }); 
                        mostrarAviso("✅ Extra sumado"); // <-- EL AVISO QUE FALTABA
                    }} 
                    className="bistro-extra-btn"
                  >
                    <Plus size={16} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    })}
  </div>
))}  </div>
    </div>

 );
 case "marketpro":
        const allProducts = restaurant.categories?.flatMap((c: any) => 
          c.products.map((p: any) => ({ ...p, category_id: c.id }))
        ) || [];
        
        return (
          <MarketProTemplate 
            restaurant={restaurant}
            products={allProducts}
            categories={restaurant.categories || []}
            fetchedExtras={restaurant.fetched_extras} // <-- AGREGÁ ESTA LÍNEA
            onAddToCart={(product: any, qty: number) => {
              for(let i = 0; i < qty; i++) {
                addToCart(product);
              }
              mostrarAviso("✅ Producto agregado");
            }}
          />
        );
      default:
        return <div className="p-10 text-center">Menú no encontrado</div>;
    }
  };
return (
<main className="min-h-screen bg-[#0a0a0a]">
    {/* Agregamos flex y flex-col aquí */}
    <div className="max-w-[500px] mx-auto min-h-screen relative shadow-[0_0_100px_rgba(0,0,0,0.8)] border-x border-white/5 overflow-x-hidden flex flex-col" style={{ backgroundColor: BG }}>
      <style dangerouslySetInnerHTML={{ __html: memoizedStyles }} />
      <ClearCartLogic currentRestaurantId={restaurant.id} />
      
      {/* Notificaciones... */}
     {notificacion && (
  <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[2000] whitespace-nowrap">
    <div className={`
      ${TEMPLATE === 'visualgrid' ? 'bg-white/10 backdrop-blur-xl border-white/20 text-white' : 
        TEMPLATE === 'minimal' ? 'bg-white text-black border-gray-200' : 
        TEMPLATE === 'bistro' ? 'bg-[#1a1a1a] text-[#e6c87e] border-dashed border-[#e6c87e]/40' : // Estilo Tiza
        'bg-blue-600 text-white border-blue-400'} 
      px-4 py-2 rounded-full shadow-lg flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300 border
    `}>
      <Check size={16} className={TEMPLATE === 'minimal' || TEMPLATE === 'bistro' ? 'text-[#e6c87e]' : 'text-white'} />
      <span className="font-bold text-xs uppercase tracking-wide">
          {notificacion.replace('✅', '').replace('⚠️', '')}
      </span>
    </div>
  </div>
)}

      {/* ENVOLVEMOS EL CONTENIDO EN UN DIV QUE CRECE */}
      <div className="flex-1">
        {renderTemplate()}
      </div>

      {/* EL FOOTER DE SNAPPY AHORA SIEMPRE QUEDARÁ ABAJO */}
      <a href="https://snappy.uno" target="_blank" rel="noreferrer" className="block w-full py-8 text-center bg-gray-900/50 hover:bg-black transition-colors cursor-pointer no-underline">
        <p className="text-[10px] font-black text-white/40 flex items-center justify-center gap-1 uppercase tracking-[0.2em]">
            Potenciado por <Zap size={12} className="text-yellow-400/50 fill-yellow-400/50"/> Snappy
        </p>
      </a>

      <div className="sticky bottom-0 left-0 w-full z-[50]">
        <CartFooter phone={restaurant.phone} deliveryCost={Number(restaurant.delivery_cost)} restaurantId={restaurant.id} aliasMp={restaurant.alias_mp} planType={restaurant.subscription_plan} receiveWhatsapp={restaurant.receive_whatsapp} />
      </div>
    </div>

    {/* --- CÓDIGO DEL MODAL PARA EL PRODUCTO DESTACADO --- */}
      {showHeroModal && restaurant.hero_title && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4">
          {/* Fondo oscuro con blur */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowHeroModal(false)}></div>
          
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 overflow-hidden animate-in slide-in-from-bottom-10 duration-300 shadow-2xl">
            {/* Imagen del plato en el modal */}
            <div className="h-56 bg-cover bg-center relative" style={{ backgroundImage: `url('${BANNER || LOGO}')` }}>
                <button onClick={() => setShowHeroModal(false)} className="absolute top-5 right-5 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md">
                  <X size={20} strokeWidth={3} />
                </button>
            </div>
            
            <div className="p-8 text-left bg-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-2">{restaurant.hero_title}</h3>
                  <div className="text-2xl font-black text-orange-500">{formatPrice(restaurant.hero_price)}</div>
                </div>
                {/* Selector de cantidad simple */}
                <div className="flex items-center gap-3 bg-gray-100 p-1.5 rounded-2xl">
                  <button onClick={() => setHeroQty(Math.max(1, heroQty - 1))} className="w-8 h-8 flex items-center justify-center font-bold">-</button>
                  <span className="font-bold w-4 text-center">{heroQty}</span>
                  <button onClick={() => setHeroQty(heroQty + 1)} className="w-8 h-8 flex items-center justify-center font-bold">+</button>
                </div>
              </div>
              
              <p className="text-gray-500 text-sm leading-relaxed mb-8 border-t pt-4">
                {restaurant.hero_description || "Sin descripción disponible."}
              </p>
              
              <button 
                className="w-full py-4 rounded-2xl font-black text-white text-center uppercase tracking-widest shadow-lg transition-transform active:scale-95" 
                style={{ backgroundColor: THEME }}
                onClick={handleAddHeroToCart}
              >
                Sumar al pedido — {formatPrice(restaurant.hero_price * heroQty)}
              </button>
            </div>
          </div>
        </div>
      )}
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