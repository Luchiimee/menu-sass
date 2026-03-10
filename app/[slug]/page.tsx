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
  Zap, Ticket, Lock
} from "lucide-react";
import AddToCartBtn from "@/components/AddToCartBtn";
import CartFooter from "@/components/CartFooter";
import ClearCartLogic from "@/components/ClearCartLogic";
import { CartProvider, useCart } from "@/context/CartContext";
import MarketProTemplate from "@/components/templates/MarketProTemplate";
import AlternaPro from "@/components/templates/AlternaPro";
import UrbanoDark from "@/components/templates/UrbanoDark";



const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createBrowserClient(supabaseUrl, supabaseKey);

// --- 1. DATOS ---
async function getRestaurant(slug: string) {
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select(`*, categories (id, name, products (id, name, description, price, image_url, variations))`)
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
  TEMPLATE: any, 
  BG: any, 
  THEME: any, 
  CARD_BG: any, 
  TEXT: any, 
  DESC: any, 
  PROMO_BG: any,
  PROD_NAME: string, 
  PROD_DESC: string, 
  PROD_PRICE: string, 
  BTN_BG: string,
  BTN_TEXT: string, // Posición 12: Color del símbolo +
  PROMO_TEXT: string, 
  HERO_BADGE_BG?: string, 
  HERO_BADGE_COLOR?: string, 
  HERO_TITLE_COLOR?: string, 
  HERO_PRICE_COLOR?: string
) => {
    // ESTILOS GLOBALES: Bloquean el "Pull-to-Refresh" del iPhone y mejoran el scroll
    const common = `
      html, body { 
        margin: 0;
        padding: 0;
        overscroll-behavior-y: none !important; /* BLOQUEO CLAVE PARA IPHONE */
        height: 100%;
        width: 100%;
        overflow-x: hidden;
      }

      /* Evita el rebote elástico en contenedores principales */
      main, .layout-container, .app-wrapper {
        overscroll-behavior-y: none !important;
        -webkit-overflow-scrolling: touch;
      }
      
      /* Sincronización de bordes del botón con el editor */
      .add-btn-wrapper button {
        border-radius: 8px !important;
      }
    `;

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
                .header-title { font-weight: bold; font-size: 22px; margin: 0; color: ${TEXT}; }
                .header-desc { font-size: 13px; color: ${DESC}; opacity: 0.8; }
                .classic-item { display: flex; flex-direction: column; background: ${CARD_BG}; padding: 15px 20px; }
                .classic-prod { font-weight: bold; font-size: 18px; color: ${PROD_NAME || '#000000'}; }
                .classic-p-desc { font-size: 13px; color: ${PROD_DESC || '#666666'}; margin-bottom: 5px; }
                .classic-price { font-weight: bold; font-size: 16px; color: ${PROD_PRICE || THEME}; }
/* Reemplazá el bloque de .add-btn-wrapper button por este */
.add-btn-wrapper button, 
.add-btn-wrapper button *, 
.add-btn-wrapper svg,
.add-btn-wrapper path { 
    background-color: ${BTN_BG} !important; 
    color: ${BTN_TEXT} !important; 
    stroke: ${BTN_TEXT} !important; /* Esto cambia el trazo del + */
    fill: ${BTN_TEXT} !important;   /* Por si el icono usa relleno */
    font-weight: 900 !important; 
    font-size: 18px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 0 !important;
}
                .classic-line { height: 1px; background-color: #eee; width: 90%; margin: 0 auto; }
                .promo-box { background: ${PROMO_BG}; color: ${THEME}; text-align: center; font-size: 12px; padding: 10px; margin-bottom: 10px; font-weight: 600; }
                .cat-title { font-size: 16px; font-weight: bold; margin: 20px 20px 10px; color: ${TEXT}; border-left: 4px solid ${THEME}; padding-left: 10px; }
            `;
    case "urban":
        return `
            ${common} 
            body { background: ${BG}; margin: 0; font-family: 'Inter', sans-serif; } 
            .app-wrapper { padding: 12px; display: flex; flex-direction: column; min-height: 100vh; padding-bottom: 120px; } 

            /* --- HEADER (Alineación perfecta) --- */
            .urbano-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-shrink: 0; }
            .urbano-brand { display: flex; gap: 10px; align-items: center; text-align: left; }
            .urbano-logo { width: 45px; height: 45px; border-radius: 50%; border: 2px solid ${TEXT}; background-size: cover; background-position: center; flex-shrink: 0; }
            .urbano-names h4 { font-size: 14px; font-weight: 800; margin: 0; line-height: 1.1; color: ${TEXT}; }
            .urbano-names span { font-size: 10px; color: ${DESC}; opacity: 0.8; }
            .urbano-status { color: #000; font-size: 9px; font-weight: 900; padding: 4px 8px; border-radius: 8px; height: fit-content; text-transform: uppercase; }
            
            /* --- PROMO --- */
            .urbano-msg { background: ${PROMO_BG}; padding: 10px; border-radius: 10px; font-size: 10px; color: ${PROMO_TEXT}; margin-bottom: 20px; border-left: 4px solid ${THEME}; font-weight: 700; text-align: left; }
            
            /* --- PRODUCTOS --- */
            .urbano-card { background: ${CARD_BG}; padding: 10px; border-radius: 20px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; }
            .urbano-item-main { display: flex; gap: 12px; position: relative; }
            .urbano-img { width: 75px; height: 75px; background-size: cover; border-radius: 12px; background-position: center; flex-shrink: 0; background-color: #222; }
            .urbano-info { flex: 1; padding-right: 25px; display: flex; flex-direction: column; justify-content: center; text-align: left; }
            .urbano-tit { font-weight: 800; font-size: 13px; margin-bottom: 2px; color: ${PROD_NAME}; }
            .urbano-desc { font-size: 9px; color: ${PROD_DESC}; line-height: 1.3; opacity: 0.7; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            .urbano-price { color: ${PROD_PRICE} !important; font-weight: 900; font-size: 13px; margin-top: 5px; }
            
            /* BOTÓN + */
           .add-btn-wrapper { position: absolute; bottom: 0; right: 0; z-index: 10; }
            .add-btn-wrapper button { 
                min-width: 28px !important; 
                height: 28px !important; 
                background: ${BTN_BG} !important; 
                color: ${BG} !important; 
                border-radius: 20px !important; 
                padding: 0 8px !important; 
                display: flex !important; 
                align-items: center !important; 
                justify-content: center !important; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                border: none !important;
                font-weight: 900 !important;
            }

            /* --- EXTRAS URBAN --- */
            .urbano-extras-box { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); }
            .urbano-extra-row { display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 12px; margin-bottom: 6px; }
            .urbano-extra-name { font-size: 10px; font-weight: 800; color: #fff; text-transform: uppercase; }
            .urbano-extra-price { font-size: 9px; color: ${PROD_PRICE}; font-weight: 700; }
            .urbano-extra-add { width: 22px; height: 22px; border-radius: 6px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); display: flex; align-items: center; justify-content: center; }
        `;
      case "minimal":
        return `
            ${common} 
            body { background: ${BG}; margin: 0; font-family: 'Lato', sans-serif; } 
            .app-wrapper { min-height: 100vh; padding: 0 0 120px; color: ${TEXT}; } 
            .header-sec { padding: 40px 20px 20px; text-align: center; } 
            .header-logo { width: 60px; height: 60px; background-size: cover; margin: 0 auto 15px; border-radius: 50%; } 
            .promo-minimal { margin: 0 20px 30px; padding: 15px; background-color: #f4f4f5; border: 1px solid #eee; text-align: center; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: ${TEXT}; }
            .prod-card { padding: 20px; border-bottom: 1px solid #f5f5f5; display: block; }
            .prod-card .font-bold { color: ${PROD_NAME || TEXT}; }
            .prod-card .opacity-50 { color: ${PROD_DESC || DESC}; }
            .prod-card .font-black { color: ${PROD_PRICE || THEME}; }
        `;
      case "visualgrid":
        return `
            ${common} 
            body { background: #121212; margin: 0; }
            .notificacion-glass { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.2); color: white; padding: 12px 24px; border-radius: 16px; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; z-index: 9999; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); display: flex; align-items: center; gap: 10px; }`;
      case "pop":
        return `
            ${common}
            body { background: ${BG}; margin: 0; font-family: 'Inter', sans-serif; }
            .app-wrapper { min-height: 100vh; padding-bottom: 120px; color: ${TEXT}; }
            .pop-header-box { background: white; border: 3px solid black; border-radius: 12px; margin: 20px 15px; padding: 15px; display: flex; align-items: center; gap: 12px; box-shadow: 4px 4px 0 black; position: relative; }
            .pop-status { position: absolute; top: -10px; right: 10px; background: #00CED1; border: 2px solid black; padding: 2px 8px; font-size: 8px; font-weight: 900; transform: rotate(3deg); color: black; }
            .pop-promo { background: #FFD700; border: 3px solid black; margin: 0 15px 20px; padding: 10px; text-align: center; font-weight: 900; font-size: 12px; box-shadow: 3px 3px 0 rgba(0,0,0,0.2); transform: rotate(-1deg); }
            .pop-card { background: ${CARD_BG}; border: 3px solid black; border-radius: 15px; margin: 0 15px 15px; padding: 15px; box-shadow: 4px 4px 0 ${THEME}; }
            .pop-prod-title { font-weight: 900; font-size: 18px; text-transform: uppercase; color: ${PROD_NAME || THEME}; }
            .pop-price-tag { background: ${PROD_PRICE || 'black'}; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 900; transform: rotate(2deg); }
        `;
      case "spotlight":
        return `
            body { background: ${BG}; margin: 0; font-family: 'Inter', sans-serif; }
            .app-wrapper { min-height: 100vh; padding-bottom: 120px; color: ${TEXT}; }
            .spot-header { padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; background: white; }
            .spot-logo { width: 45px; height: 45px; border-radius: 50%; background-size: cover; background-position: center; border: 1px solid #eee; }
            .spot-status-pill { background: #2ecc71; color: white; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 800; }
            .spot-banner-container { position: relative; height: 260px; width: 100%; overflow: hidden; }
            .spot-hero-img { width: 100%; height: 100%; background-size: cover; background-position: center; transition: transform 0.5s ease; }
            .spot-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%); display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; }
            .spot-hero-content { color: white; position: relative; z-index: 2; text-align: left; width: 85%; }
            .spot-badge { background: ${HERO_BADGE_BG || THEME}; color: ${HERO_BADGE_COLOR || 'white'}; padding: 4px 10px; font-size: 10px; font-weight: 900; border-radius: 6px; display: inline-block; margin-bottom: 6px; text-transform: uppercase; }
            .spot-hero-title { color: ${HERO_TITLE_COLOR || 'white'}; font-size: 24px; font-weight: 900; text-shadow: 0 2px 4px rgba(0,0,0,0.3); line-height: 1.1; margin-bottom: 4px; text-transform: uppercase; italic; }
            .spot-hero-price { color: ${HERO_PRICE_COLOR || '#FFD700'}; font-size: 20px; font-weight: 900; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
            .spot-plus-btn { position: absolute; bottom: 20px; right: 20px; width: 45px; height: 45px; background: white; color: black; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 10; transition: transform 0.2s; }
            .spot-promo-bar { background: ${PROMO_BG}; color: #000; padding: 12px; text-align: center; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; }
            .spot-product-card h3 { color: ${PROD_NAME || TEXT}; }
            .spot-product-price { font-weight: 900; font-size: 15px; margin-top: 4px; color: ${PROD_PRICE || '#111'}; }
        `;
      case "elegant":
        return `
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&display=swap');
            body, h1, h2, h3, p, span, div, button { font-family: 'Playfair Display', serif !important; }
            body { background: ${BG}; margin: 0; color: ${TEXT}; }
            .app-wrapper { min-height: 100vh; padding-bottom: 120px; text-align: center; }
            .elegant-header { padding: 60px 20px 30px; }
            .elegant-logo { width: 90px; height: 90px; margin: 0 auto 20px; border-radius: 50%; border: 2px solid ${THEME}; padding: 4px; object-fit: cover; }
            .elegant-title { font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; font-style: italic; }
            .elegant-promo { background: ${PROMO_BG}; border: 1px solid ${THEME}40; padding: 18px; margin: 0 25px 40px 25px; font-size: 15px; font-weight: 700; font-style: italic; color: ${TEXT}; border-radius: 12px; }
            .elegant-card { padding: 20px 25px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; text-align: left; border-bottom: 1px solid rgba(0,0,0,0.04); }
            .elegant-prod-name { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: ${PROD_NAME || TEXT}; }
            .elegant-prod-desc { font-size: 14px; font-style: italic; color: ${PROD_DESC || TEXT}; opacity: 0.9; margin-top: 6px; line-height: 1.5; }
            .elegant-price { font-size: 18px; font-weight: 900; color: ${PROD_PRICE || THEME}; margin-top: 10px; }
        `;
      case "bistro":
        return `
            @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');
            body, h1, h2, h3, p, span, div, button { font-family: 'Patrick Hand', cursive !important; }
            body { background: ${BG}; margin: 0; color: #eeeeee; }
            .app-wrapper { min-height: 100vh; display: flex; flex-direction: column; padding: 15px; padding-bottom: 40px; }
            .bistro-border { border: 2px dashed #555555; border-radius: 20px; padding: 20px 15px; flex: 1; display: flex; flex-direction: column; position: relative; }
            .bistro-header { text-align: center; margin-bottom: 25px; }
            .bistro-logo { width: 65px; height: 65px; margin: 0 auto 12px; border-radius: 50%; border: 2px solid #e6c87e; padding: 3px; object-fit: cover; }
            .bistro-title { font-size: 30px; color: #e6c87e; line-height: 1; margin-bottom: 5px; text-transform: uppercase; }
            .bistro-desc { font-size: 15px; color: #aaaaaa; }
            .bistro-promo { margin-bottom: 25px; padding: 12px; border: 2px dashed rgba(230, 200, 126, 0.4); border-radius: 12px; text-align: center; color: #e6c87e; font-size: 14px; font-weight: bold; text-transform: uppercase; }
            .bistro-item-container { display: flex; flex-direction: column; gap: 4px; margin-bottom: 20px; text-align: left; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 15px; }
            .bistro-name { font-size: 20px; font-weight: bold; color: #ffffff; line-height: 1.2; }
            .bistro-price { font-size: 18px; color: #e6c87e; font-weight: bold; }
            .bistro-extra-btn { width: 28px; height: 28px; border-radius: 8px; background: #e6c87e; color: #222; display: flex; align-items: center; justify-content: center; border: none; }
        `;
      case "marketpro":
        return `
            ${common}
            body { background: ${BG}; margin: 0; }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `;
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
  const [showClosedAlert, setShowClosedAlert] = useState(false);
  console.log("Dato del botón:", restaurant.card_btn_text);
  const { cart, addToCart, updateQuantity } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [currentExtras, setCurrentExtras] = useState<any[]>([]);
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [showHeroModal, setShowHeroModal] = useState(false); 
  const [heroQty, setHeroQty] = useState(1);
  const [variationsQuantities, setVariationsQuantities] = useState<{[key: number]: number}>({});
  const [cardSelections, setCardSelections] = useState<{[key: string]: number | null}>({});
 const [selectedExtras, setSelectedExtras] = useState<any[]>([]);
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

  // --- 1. VARIABLES DE DISEÑO (SINCRONIZADAS CON EL EDITOR) ---
  const TEMPLATE = restaurant.template_id || "classic";
  const isUrban = TEMPLATE === "urban";

  // Identidad
  const THEME = restaurant.theme_color || (isUrban ? "#ea580c" : "#d32f2f");
  const BG = restaurant.bg_color || (isUrban ? "#121212" : "#ffffff");
  const TEXT = restaurant.text_color || "#ffffff";
  const DESC = restaurant.description_color || (isUrban ? "#888888" : "#ffffff");

  // Productos (Variables que coinciden con UrbanoDark.tsx)
  const CARD_BG = restaurant.card_color || (isUrban ? "#1E1E1E" : "#ffffff");
  const PROD_NAME = restaurant.card_name_color || (isUrban ? "#ffffff" : "#000000");
  const PROD_DESC = restaurant.card_desc_color || (isUrban ? "#888888" : "#666666");
  
  // ARREGLO CLAVE: Si es Urban, el precio NO sigue al acento por defecto
  const PROD_PRICE = restaurant.card_price_color || (isUrban ? "#ea580c" : THEME);
  
  const BTN_BG = restaurant.card_btn_bg || "#ffffff";
  const BTN_TEXT = restaurant.card_btn_text || "#000000";

  // Promo
  const PROMO_BG = restaurant.promo_bg_color || (isUrban ? "#1E1E1E" : "#ffebee");
  const PROMO_TEXT = restaurant.promo_text_color || "#ffffff";
  
  const LOGO = restaurant.logo_url;
  const BANNER = restaurant.banner_url;
  const SHOW_BANNER = restaurant.show_banner;

  // --- 2. LLAMADA A GETSTYLES (ARGUMENTOS EN ORDEN) ---
  const memoizedStyles = useMemo(() => {
    return getStyles(
      TEMPLATE, BG, THEME, CARD_BG, TEXT, DESC, PROMO_BG, // 1 al 7
      PROD_NAME, PROD_DESC, PROD_PRICE, BTN_BG,          // 8 al 11
      BTN_TEXT,   // 12
      PROMO_TEXT,                                        // 13
      restaurant.hero_badge_bg,                          // 14
      restaurant.hero_badge_color,                       // 15
      restaurant.hero_title_color,                       // 16
      restaurant.hero_price_color                        // 17
    );
  }, [
    TEMPLATE, BG, THEME, CARD_BG, TEXT, DESC, PROMO_BG, 
    PROD_NAME, PROD_DESC, PROD_PRICE, BTN_BG, BTN_TEXT, PROMO_TEXT,
    restaurant.hero_badge_bg, restaurant.hero_badge_color, 
    restaurant.hero_title_color, restaurant.hero_price_color
  ]);
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

    const allProducts = restaurant.categories?.flatMap((c: any) =>
      c.products.map((p: any) => ({ ...p, category_id: c.id }))
    ) || [];

    // 2. LÓGICA DE CATEGORÍAS PARA ALTERNA-PRO (Filtra "General" y pone defaults)
    const rawCats = restaurant.categories || [];
    const cleanCats = rawCats.filter((c: any) => c.name.toLowerCase() !== 'general');
    const displayCats = cleanCats.length > 0 
      ? cleanCats 
      : [{ name: 'Semillas' }, { name: 'Frutos' }, { name: 'Aceites' }];
    switch (TEMPLATE) {
      
    case "urban":
        return (
          <div className="app-wrapper">
            {/* 1. HEADER (Logo/Nombre a la izq, Status a la der) */}
            <div className="urbano-top">
              <div className="urbano-brand">
                <div className="urbano-logo" style={{ backgroundImage: `url('${LOGO || ""}')` }}></div>
                <div className="urbano-names">
                  <h4>{restaurant.name}</h4>
                  <span>{restaurant.description}</span>
                </div>
              </div>
              <div className="urbano-status" style={{ backgroundColor: isOpen ? '#22c55e' : '#ef4444' }}>
                {isOpen ? "ABIERTO" : "CERRADO"}
              </div>
            </div>

            {/* 2. PROMO */}
            {restaurant.show_promo && restaurant.promo_message && (
              <div className="urbano-msg">{restaurant.promo_message}</div>
            )}

            {/* 3. LISTA */}
            <div className="flex-1 overflow-y-auto">
              {restaurant.categories?.map((cat: any) => (
                <div key={cat.id}>
                  {cat.products?.map((prod: any) => {
                    const extras = getExtrasForProduct(prod.id);
                    const principalEnCarrito = cart.some(item => item.id === prod.id);
                    return (
                      <div key={prod.id} className="urbano-card">
                        <div className="urbano-item-main">
                          <div className="urbano-img" style={{ backgroundImage: `url('${prod.image_url || ""}')` }}></div>
                          <div className="urbano-info">
                            <div className="urbano-tit">{prod.name}</div>
                            <div className="urbano-desc">{prod.description}</div>
                            <div className="urbano-price">{formatPrice(prod.price)}</div>
                          </div>
                          {/* El botón ahora es un "pill" que crece si hay cantidad */}
                          <div className="add-btn-wrapper" onClick={() => !principalEnCarrito && mostrarAviso("✅ Agregado")}>
                            <AddToCartBtn product={prod} variant="icon" isDark={true} disabled={!isOpen} />
                          </div>
                        </div>

                        {/* SECCIÓN EXTRAS */}
                        {principalEnCarrito && extras && extras.length > 0 && (
                          <div className="urbano-extras-box animate-in fade-in slide-in-from-top-2 duration-300">
                            {extras.map((ex: any) => (
                              <div key={ex.id} className="urbano-extra-row">
                                <div className="text-left">
                                  <div className="urbano-extra-name">{ex.name}</div>
                                  <div className="urbano-extra-price">+{formatPrice(ex.price)}</div>
                                </div>
                                <button 
                                  onClick={() => { addToCart({ id: prod.id, extraId: ex.id, name: ex.name, price: Number(ex.price) }); mostrarAviso("✅ Extra sumado"); }} 
                                  className="urbano-extra-add"
                                >
                                  <Plus size={14} strokeWidth={3} />
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
  case 'icecream-v1': {
  // 1. APLANAMOS LA LISTA: Sacamos los productos de sus carpetas (categorías)
  // para tener una sola lista corrida de todos los productos.
  const flatProducts = restaurant.categories?.flatMap((c: any) => c.products) || [];

  return (
    <div className="flex flex-col h-full font-sans text-left animate-in fade-in duration-500 pb-20" style={{ backgroundColor: BG }}>
      
      {/* HEADER PREMIUM */}
      <div className="p-6 bg-white border-b flex justify-between items-center shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border border-white overflow-hidden bg-gray-50" style={{ backgroundColor: THEME }}>
            {LOGO ? (
              <img src={LOGO} className="w-full h-full object-cover" alt="Logo" />
            ) : (
              <span className="text-2xl">🍦</span>
            )}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-lg font-black uppercase tracking-tighter leading-none" style={{ color: TEXT }}>{restaurant.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] mt-1 text-slate-900">{restaurant.description}</span>
          </div>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black italic border-2 ${isOpen ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
          {isOpen ? "• ABIERTO" : "• CERRADO"}
        </div>
      </div>

      <div className="p-5 space-y-12">
        {/* MENSAJE DE PROMO */}
        {restaurant.show_promo && restaurant.promo_message && (
          <div className="p-5 rounded-[2rem] text-xs font-black text-center border-2 shadow-xl animate-pulse" style={{ backgroundColor: PROMO_BG, color: PROMO_TEXT, borderColor: THEME + '40' }}>
            {restaurant.promo_message}
          </div>
        )}

        {/* 2. LISTADO ÚNICO DE PRODUCTOS (YA NO HAY CATEGORÍAS AQUÍ) */}
        <div className="space-y-8">
          {flatProducts.map((prod: any) => {
            const variations = prod.variations || [];
            const selectedIdx = cardSelections[prod.id];
            const isSelected = selectedIdx !== null && selectedIdx !== undefined;

            return (
              <div key={prod.id} className="bg-white p-7 rounded-[3rem] shadow-xl shadow-slate-200 border border-slate-100 transition-all">
                <div className="flex justify-between items-start mb-5">
                  <div className="text-left flex-1 pr-4">
                    <h4 className="text-xl font-black uppercase leading-tight tracking-tight mb-2" style={{ color: TEXT }}>{prod.name}</h4>
                    <p className="text-[12px] font-bold leading-relaxed text-slate-800">{prod.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                      <span className="text-2xl font-black block leading-none" style={{ color: PROD_PRICE }}>
                        {formatPrice(isSelected ? variations[selectedIdx].price : (variations.length > 0 ? variations[0].price : prod.price))}
                      </span>
                      <span className="text-[10px] text-slate-900 font-black uppercase tracking-widest mt-1 block">
                       {isSelected ? variations[selectedIdx].label : 'Desde'}
                      </span>
                  </div>
                </div>
                
                {/* SELECTORES DE PESO */}
                {variations.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest ml-1 text-left">Seleccioná cantidad:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {variations.slice(0, 3).map((v: any, idx: number) => {
                        const isMore = idx === 2 && variations.length > 3;
                        const active = selectedIdx === idx;
                        return (
                          <button 
                            key={idx}
                            onClick={() => {
                              if (!isOpen) { setShowClosedAlert(true); return; }
                              if (isMore) { setSelectedProduct(prod); }
                              else { setCardSelections({...cardSelections, [prod.id]: active ? null : idx}); }
                            }}
                            className={`border-2 rounded-2xl py-3 text-[10px] text-center font-black uppercase transition-all duration-200 ${
                              active ? 'border-emerald-500 bg-emerald-50 text-emerald-700 scale-105 shadow-md' : 'border-slate-200 bg-slate-50 text-slate-900'
                            }`}
                          >
                            {isMore ? "VER MÁS +" : v.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* BOTONES ACCIÓN */}
                <div className="flex gap-2 mt-6">
                  {isSelected && (
                    <button 
                      onClick={() => {
                        const v = variations[selectedIdx];
                        addToCart({
                          ...prod,
                          id: `${prod.id}-${selectedIdx}`,
                          name: `${prod.name} (${v.label})`,
                          price: Number(v.price)
                        });
                        mostrarAviso("✅ Agregado");
                        setCardSelections({...cardSelections, [prod.id]: null});
                      }}
                      className="flex-1 bg-emerald-600 text-white rounded-[1.5rem] py-4 text-[10px] font-black uppercase tracking-widest shadow-lg animate-in slide-in-from-left-2 duration-300 flex items-center justify-center gap-1 active:scale-95"
                    >
                      <Plus size={14} strokeWidth={4} /> Carrito
                    </button>
                  )}

                  <button 
                    onClick={() => {
                      if (!isOpen) { setShowClosedAlert(true); return; }
                      setSelectedProduct(prod);
                    }}
                    className={`font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center shadow-lg active:scale-95 py-4 ${
                      isSelected ? 'flex-1 bg-slate-900 text-white rounded-[1.5rem] text-[10px]' : 'w-full bg-white text-black border-2 border-slate-200 rounded-[2rem] text-xs'
                    }`}
                    style={!isSelected && isOpen ? { backgroundColor: BTN_BG, color: BTN_TEXT } : {}}
                  >
                    {isSelected ? "Ver más" : "Ver opciones"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
case 'alterna-pro': 
  return (
    <AlternaPro 
      restaurant={restaurant} 
      products={allProducts} 
      setSelectedProduct={setSelectedProduct}
      isMockup={false} // <--- ESTO AGRANDA TODO EN EL CELULAR DEL CLIENTE
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
 <div className="flex-1 relative">
  {/* --- ESCUDO GLOBAL DE CIERRE --- */}


  {renderTemplate()}
</div>

      {/* EL FOOTER DE SNAPPY AHORA SIEMPRE QUEDARÁ ABAJO */}
      <a href="https://snappy.uno" target="_blank" rel="noreferrer" className="block w-full py-8 text-center bg-gray-900/50 hover:bg-black transition-colors cursor-pointer no-underline">
        <p className="text-[10px] font-black text-white/40 flex items-center justify-center gap-1 uppercase tracking-[0.2em]">
            Potenciado por <Zap size={12} className="text-yellow-400/50 fill-yellow-400/50"/> Snappy
        </p>
      </a>

      <div className="sticky bottom-0 left-0 w-full z-[50]">
        <CartFooter phone={restaurant.phone} deliveryCost={Number(restaurant.delivery_cost)} restaurantId={restaurant.id} aliasMp={restaurant.alias_mp} planType={restaurant.subscription_plan} receiveWhatsapp={restaurant.receive_whatsapp}
        businessType={restaurant.business_type} />
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
      {/* --- MODAL DE SELECCIÓN PARA VENTA FRACCIONADA (DIETÉTICA/HELADERÍA) --- */}
     {/* --- MODAL DE COMPRA MÚLTIPLE (DIETÉTICA/HELADERÍA) --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setSelectedProduct(null); setVariationsQuantities({}); }}></div>
          
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] relative z-10 overflow-hidden animate-in slide-in-from-bottom-10 shadow-2xl max-h-[90vh] flex flex-col">
            
            {/* CABECERA */}
            <div className="p-6 pb-4 flex justify-between items-start border-b border-gray-50">
              <div className="text-left flex-1">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none text-gray-900">{selectedProduct.name}</h3>
                <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest leading-relaxed">{selectedProduct.description}</p>
              </div>
              <button onClick={() => { setSelectedProduct(null); setVariationsQuantities({}); }} className="w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center active:scale-90"><X size={20} strokeWidth={3}/></button>
            </div>

            {/* CUERPO: LISTA DE VARIANTES CON CONTADORES INDEPENDIENTES */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">Elegí las cantidades:</p>
              
              {selectedProduct.variations?.map((v: any, idx: number) => {
                const qty = variationsQuantities[idx] || 0;
                return (
                  <div key={idx} className={`flex items-center justify-between p-4 rounded-[2rem] border-2 transition-all ${qty > 0 ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex flex-col text-left">
                      <span className={`font-black text-sm uppercase ${qty > 0 ? 'text-indigo-900' : 'text-gray-500'}`}>{v.label}</span>
                      <span className={`font-bold text-xs ${qty > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>{formatPrice(v.price)}</span>
                    </div>

                    {/* SELECTOR +/- POR CADA PESO */}
                    <div className="flex items-center gap-4 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                      <button 
                        onClick={() => setVariationsQuantities({...variationsQuantities, [idx]: Math.max(0, qty - 1)})}
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-lg transition-colors ${qty > 0 ? 'text-indigo-600 bg-indigo-50' : 'text-gray-300 cursor-not-allowed'}`}
                      >
                        -
                      </button>
                      <span className={`font-black text-sm w-4 text-center ${qty > 0 ? 'text-gray-900' : 'text-gray-300'}`}>{qty}</span>
                      <button 
                        onClick={() => setVariationsQuantities({...variationsQuantities, [idx]: qty + 1})}
                        className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
{/* --- SECCIÓN EXTRAS (PEGAR ABAJO DE LA SECCIÓN KG) --- */}
<div className="mt-8 space-y-3 pb-4 px-1">
  <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-1 text-left">¿Querés sumar algo más?</p>
  <div className="grid grid-cols-1 gap-2">
    {restaurant.fetched_extras
      ?.filter((ex: any) => ex.product_extras?.some((re: any) => String(re.product_id) === String(selectedProduct.id)))
      .map((ex: any) => {
        const isSelected = selectedExtras.some(s => s.id === ex.id);
        
        // --- ESTA LÍNEA ES LA QUE BLOQUEA: ---
        const hasMainQty = Object.values(variationsQuantities).some(q => q > 0);

        return (
          <button 
            key={ex.id}
            type="button"
            disabled={!hasMainQty} // <-- NO DEJA MARCAR SI NO HAY KILOS/UNIDADES
            onClick={() => setSelectedExtras(prev => isSelected ? prev.filter(s => s.id !== ex.id) : [...prev, ex])}
            className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
              !hasMainQty 
                ? 'opacity-30 grayscale cursor-not-allowed border-gray-100' // DISEÑO BLOQUEADO
                : isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200'}`}>
                {isSelected && <Check size={10} className="text-white" strokeWidth={4} />}
              </div>
              <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-emerald-900' : 'text-gray-400'}`}>{ex.name}</span>
            </div>
            <span className="text-[10px] font-bold text-gray-400">+{formatPrice(ex.price)}</span>
          </button>
        );
      })}
  </div>
</div>
            {/* BOTÓN FINAL DE CONFIRMACIÓN */}
           <div className="p-6 bg-gray-50 border-t border-gray-100">
  <button 
    disabled={Object.values(variationsQuantities).every(q => q === 0)}
   onClick={() => {
  // 1. Recorremos las cantidades elegidas (Kilos/Unidades)
  Object.entries(variationsQuantities).forEach(([idx, qty]) => {
    if (qty > 0) {
      const variation = selectedProduct.variations[Number(idx)];
      const parentId = `${selectedProduct.id}-${idx}`; // Creamos un ID único para esta versión

      // Agregamos al carrito en un bucle según la cantidad elegida
      for (let i = 0; i < qty; i++) {
        
        // A. Sumamos el producto principal
        addToCart({
          ...selectedProduct,
          id: parentId, // Importante: mismo ID para agrupar
          name: `${selectedProduct.name} (${variation.label})`,
          price: Number(variation.price)
        });

        // B. Sumamos cada extra elegido vinculado a ese ID
        selectedExtras.forEach(extra => {
          addToCart({
            id: parentId,     // <--- MISMO ID QUE EL PADRE (Clave para que se anide)
            extraId: extra.id, // ID propio del adicional
            name: extra.name, 
            price: Number(extra.price)
          });
        });
      }
    }
  });

  mostrarAviso("✅ Agregado al pedido");
  
  // Reseteamos todo para el próximo producto
  setSelectedProduct(null);
  setVariationsQuantities({});
  setSelectedExtras([]); 
}}
    className="w-full py-5 rounded-2xl font-black text-white text-center uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3" 
    style={{ backgroundColor: THEME }}
  >
      Confirmar y Sumar
      <div className="h-4 w-[1px] bg-white/20"/>
      {/* MOSTRAMOS EL TOTAL: Kilos + Extras */}
      {formatPrice(
        Object.entries(variationsQuantities).reduce((acc, [idx, qty]) => {
          return acc + (Number(selectedProduct.variations[Number(idx)].price) * qty);
        }, 0) + selectedExtras.reduce((acc, e) => acc + Number(e.price), 0)
      )}
  </button>
</div>
          </div>
        </div>
      )}
      {/* --- MODAL DE AVISO LOCAL CERRADO --- */}
{/* --- PEGÁ ESTO JUSTO ARRIBA DE </main> --- */}
      {showClosedAlert && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs p-8 rounded-[3rem] shadow-2xl text-center animate-in zoom-in-95 duration-300 relative">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Clock size={32} />
            </div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-gray-900">Local Cerrado</h2>
            <p className="text-gray-500 text-[10px] font-bold mt-2 leading-relaxed uppercase tracking-widest">
              ¡Hola! Estamos fuera de <br/> nuestro horario de atención.
            </p>
            <button 
              onClick={() => setShowClosedAlert(false)} 
              className="mt-6 w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all"
            >
              Entendido
            </button>
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
    <MenuContent 
  restaurant={restaurant} 
  isOpen={restaurant.is_open && checkIsOpen(restaurant.business_hours)} 
/>
    </CartProvider>
  );
}