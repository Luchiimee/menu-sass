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
  Zap,
  Ticket,
  Lock,
} from "lucide-react";
import AddToCartBtn from "@/components/AddToCartBtn";
import CartFooter from "@/components/CartFooter";
import ClearCartLogic from "@/components/ClearCartLogic";
import { CartProvider, useCart } from "@/context/CartContext";
import MarketProTemplate from "@/components/templates/MarketProTemplate";
import AlternaPro from "@/components/templates/AlternaPro";
import UrbanoDark from "@/components/templates/UrbanoDark";
import HeladeriaSoft from "@/components/templates/HeladeriaSoft";
import VisualGrid from "@/components/templates/VisualGrid";
import BioModern from "@/components/templates/bio/BioModern";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createBrowserClient(supabaseUrl, supabaseKey);

// --- 1. DATOS ---
async function getRestaurant(slug: string) {
  // Limpiamos el slug por si viene con espacios o mayúsculas
  const cleanSlug = slug.toLowerCase().trim();
  console.log("🔍 Buscando página para:", cleanSlug);

  // A. Buscamos primero en la tabla de BIOS (Independiente)
 const { data: bioData, error: bioError } = await supabase
  .from("snappylinks")
  .select(`*, restaurant:restaurants(*)`)
  .ilike("slug", slug)
  .maybeSingle();

if (bioData) {
  console.log("✅ BIO ENCONTRADA EN SNAPPYLINKS");
  return {
    ...bioData.restaurant, // Info base (nombre local, logo original)
    snappylink_bio: bioData.bio,
        snappylink_links: bioData.links,
        snappylink_template_id: bioData.template_id,
        is_bio_active: bioData.is_active,
        
        // Colores y diseño
        snappylink_title: bioData.title, 
        snappylink_bg_color: bioData.bg_color,
        snappylink_bg_img: bioData.bg_img,
        snappylink_btn_color: bioData.btn_color,
        snappylink_btn_text_color: bioData.btn_text_color,
        snappylink_shadow_color: bioData.shadow_color,
        snappylink_title_color: bioData.title_color,
        snappylink_desc_color: bioData.desc_color,

  snappylink_social_links: (bioData as any).social_links || [], 
        snappylink_social_pos: (bioData as any).social_pos || 'bottom',
        
        page_type: 'bio'
        
        
       
  };
}

  // B. Si no estaba en Bios, buscamos en la tabla de MENÚS
  const { data: menuData, error: menuError } = await supabase
    .from("restaurants")
    .select(`*, categories (id, name)`)
    .ilike("slug", slug)
    .maybeSingle();

  if (menuData) {
    console.log("✅ MENÚ ENCONTRADO EN RESTAURANTS");
    const { data: products } = await supabase.from("products").select("*").eq("restaurant_id", menuData.id).order("name", { ascending: true });
    const { data: allExtras } = await supabase.from("extras").select(`*, product_extras (product_id)`).eq("restaurant_id", menuData.id);

    const categoriesWithProducts = (menuData.categories || []).map((cat: any) => ({
      ...cat,
      products: (products || []).filter((p: any) => String(p.category_id) === String(cat.id)),
    }));

    return { 
      ...menuData, 
      categories: categoriesWithProducts, 
      fetched_products: products || [], 
      fetched_extras: allExtras || [], 
      page_type: 'menu' 
    };
  }

  return null;
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
    const isInsideSecondSlot =
      todayConfig.isSplit &&
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
  HERO_PRICE_COLOR?: string,
  TITLE_FONT?: string,
  DESC_FONT?: string,
  PROMO_FONT?: string,
) => {
 
const common = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Patrick+Hand&family=Lato:wght@400;700;900&display=swap');
    
    html, body { 
      margin: 0;
      padding: 0;
      overscroll-behavior-y: none !important;
      height: 100%;
      width: 100%;
      overflow-x: hidden;
      /* FIX iOS: Despierta los eventos de clic en Safari */
      cursor: pointer; 
      -webkit-tap-highlight-color: transparent;
      -webkit-overflow-scrolling: touch;
    }

    /* FIX RADICAL iOS: Fuerza a los botones a estar "arriba" y ser clicables */
    button, [role="button"], .cursor-pointer {
      touch-action: manipulation;
      -webkit-appearance: none;
      /* Fuerza renderizado de hardware para evitar capas fantasma */
      transform: translateZ(0); 
    }

    /* Asegura que los elementos fijos (como el Carrito) no se hundan en la pantalla */
    .fixed {
      touch-action: manipulation;
      transform: translateZ(0);
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
    }
    
    main, .layout-container, .app-wrapper {
      overscroll-behavior-y: none !important;
      -webkit-overflow-scrolling: touch;
    }

    /* Sincronización de botones */
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
                .classic-prod { font-weight: bold; font-size: 18px; color: ${PROD_NAME || "#000000"}; }
                .classic-p-desc { font-size: 13px; color: ${PROD_DESC || "#666666"}; margin-bottom: 5px; }
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
            .app-wrapper { padding: 16px; display: flex; flex-direction: column; min-height: 100vh; padding-bottom: 120px; } 

            /* --- HEADER AGRANDADO --- */
            .urbano-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-shrink: 0; }
            .urbano-brand { display: flex; gap: 14px; align-items: center; text-align: left; }
            .urbano-logo { width: 60px; height: 60px; border-radius: 50%; border: 2px solid ${TEXT}; background-size: cover; background-position: center; flex-shrink: 0; }
            .urbano-names h4 { font-size: 20px; font-weight: 800; margin: 0; line-height: 1.1; color: ${TEXT}; text-transform: uppercase; }
            .urbano-names span { font-size: 13px; color: ${DESC}; opacity: 0.8; margin-top: 2px; line-height: 1.2; display: block; }
            .urbano-status { color: #000; font-size: 10px; font-weight: 900; padding: 5px 10px; border-radius: 10px; height: fit-content; text-transform: uppercase; }
            
            /* --- PROMO --- */
            .urbano-msg { background: ${PROMO_BG}; padding: 14px; border-radius: 12px; font-size: 12px; color: ${PROMO_TEXT}; margin-bottom: 25px; border-left: 5px solid ${THEME}; font-weight: 700; text-align: left; }
            
            /* --- PRODUCTOS XL --- */
           .urbano-card { background: ${CARD_BG}; padding: 14px; border-radius: 24px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
            .urbano-item-main { display: flex; gap: 16px; position: relative; }
            .urbano-img { width: 95px; height: 95px; background-size: cover; border-radius: 18px; background-position: center; flex-shrink: 0; background-color: #222; }background-position: center; flex-shrink: 0; background-color: #222; }
            .urbano-info { flex: 1; padding-right: 48px; display: flex; flex-direction: column; justify-content: center; text-align: left; }
            .urbano-tit { font-weight: 800; font-size: 17px; margin-bottom: 4px; color: ${PROD_NAME}; letter-spacing: -0.02em; }
            .urbano-desc { font-size: 12px; color: ${PROD_DESC}; line-height: 1.4; opacity: 0.7; }
            .urbano-price { color: ${PROD_PRICE} !important; font-weight: 900; font-size: 18px; margin-top: 8px; }
            
            /* BOTÓN + GRANDE */
            .add-btn-wrapper { position: absolute; bottom: 0; right: 0; z-index: 10; }
           .add-btn-wrapper button { 
            min-width: 26px !important; 
height: 26px !important;
                background: ${BTN_BG} !important; 
                color: ${BTN_TEXT} !important; 
                border-radius: 14px !important; 
                display: flex !important; 
                align-items: center !important; 
                justify-content: center !important; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                border: none !important;
                font-weight: 900 !important;
                font-size: 16px !important;
            }

            /* --- EXTRAS --- */
            .urbano-extras-box { margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); }
            .urbano-extra-row { display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25); padding: 10px 15px; border-radius: 14px; margin-bottom: 8px; }
            .urbano-extra-name { font-size: 12px; font-weight: 800; color: #fff; text-transform: uppercase; }
            .urbano-extra-price { font-size: 11px; color: ${PROD_PRICE}; font-weight: 700; }
            .urbano-extra-add { width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
        `;
    case "minimal":
      return `
            ${common} 
            body { background: ${BG}; margin: 0; font-family: 'Lato', sans-serif; } 
            .app-wrapper { min-height: 100vh; padding: 0 0 120px; color: ${TEXT}; } 
            .header-sec { padding: 40px 20px 20px; text-align: center; } 
            .header-logo { width: 60px; height: 60px; background-size: cover; margin: 0 auto 15px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.05); } 
            
            .promo-minimal { margin: 0 20px 30px; padding: 15px; background-color: ${PROMO_BG}; border: 1px solid rgba(0,0,0,0.05); text-align: center; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${PROMO_TEXT}; }
            
            .prod-card { 
                padding: 22px 20px; 
                border-bottom: 1px solid rgba(0,0,0,0.05); 
                display: flex !important; 
                justify-content: space-between !important; 
                align-items: center !important; 
                background: ${CARD_BG}; 
            }
            .prod-info-group { text-align: left; flex: 1; padding-right: 15px; }

            /* --- TEXTOS AGRANDADOS --- */
            .prod-card .font-bold { color: ${PROD_NAME} !important; font-size: 16px !important; line-height: 1.2; }
            .prod-card .opacity-50 { color: ${PROD_DESC} !important; font-size: 11px !important; margin-top: 4px; opacity: 0.7 !important; line-height: 1.4; }
            .prod-card .font-black { color: ${PROD_PRICE} !important; font-size: 15px !important; margin-top: 6px; }

            /* --- BOTÓN + MÁS GRANDE --- */
            .add-btn-wrapper button { 
                background-color: ${BTN_BG} !important; 
                color: ${BTN_TEXT} !important; 
                border-radius: 50% !important; 
                width: 32px !important; /* De 24px a 32px */
                height: 32px !important; /* De 24px a 32px */
                display: flex !important; 
                align-items: center !important; 
                justify-content: center !important; 
                border: none !important;
                box-shadow: 0 3px 10px rgba(0,0,0,0.12);
                font-size: 20px !important;
                font-weight: 900 !important;
            }
            .add-btn-wrapper svg { 
                color: ${BTN_TEXT} !important; 
                width: 18px !important; /* De 14px a 18px */
                height: 18px !important; 
                stroke-width: 3.5;
            }
        `;

    case "visualgrid":
      return `
            ${common} 
            body { background: ${BG}; margin: 0; font-family: 'Inter', sans-serif; color: ${TEXT}; } 
            .app-wrapper { min-height: 100vh; padding: 0 0 120px; }
            
            /* HEADER */
            .sushi-header { display: flex; justify-content: space-between; align-items: center; padding: 25px 20px; }
            .sushi-logo { width: 50px; height: 50px; border-radius: 50%; border: 2px solid ${THEME}; background-size: cover; background-position: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
            
            .sushi-msg-box { 
                margin: 5px 15px 18px; 
                /* Si el color es transparente o no existe, forzamos el gris oscuro del editor */
                background-color: ${PROMO_BG === 'transparent' || !PROMO_BG ? '#1E1E1E' : PROMO_BG}; 
                color: ${PROMO_TEXT}; 
                border-left: 4px solid ${THEME}; 
                padding: 10px 14px; 
                font-size: 11px; 
                font-weight: 700; 
                text-align: left; 
                /* AQUÍ ESTÁ EL CAMBIO DE DISEÑO */
                border-radius: 12px !important; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
            }
            
            .sushi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 15px; }
            
            /* CARD INTERACTIVA */
            .sushi-item { 
                position: relative; 
                aspect-ratio: 3 / 4; 
                border-radius: 20px; 
                overflow: hidden; 
                background-color: ${CARD_BG}; 
                border: 1px solid rgba(255,255,255,0.05);
                box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
            }
            
            .sushi-overlay-norm { 
                position: absolute; inset: 0; 
                background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.2) 50%, transparent 80%); 
                padding: 12px; display: flex; flex-direction: column; justify-content: flex-end; text-align: left; 
            }
            .sushi-title-norm { font-weight: 800; font-size: 13px; color: ${PROD_NAME}; margin-bottom: 2px; text-shadow: 0 1px 2px black; }
            .sushi-price-norm { color: ${PROD_PRICE}; font-size: 13px; font-weight: 900; text-shadow: 0 1px 2px black; }

            /* BOTÓN FLOTANTE */
            .add-btn-wrapper-grid { position: absolute; top: 10px; right: 10px; z-index: 10; }
            .add-btn-wrapper-grid button { 
                background-color: ${BTN_BG} !important; 
                color: ${BTN_TEXT} !important; 
                border-radius: 50% !important; 
                width: 30px !important; height: 30px !important; 
                display: flex !important; align-items: center !important; justify-content: center !important; 
                border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            }
            .add-btn-wrapper-grid svg { width: 16px !important; height: 16px !important; stroke-width: 3.5; color: ${BTN_TEXT} !important; }

            /* PANEL ACTIVO (BLUR) */
            .sushi-active-panel {
                position: absolute; inset: 0; padding: 15px; 
                display: flex; flex-direction: column; 
                background: rgba(0,0,0,0.7); backdrop-blur: 10px;
                animation: fadeIn 0.2s ease;
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `;

    case "pop":
      return `
            ${common}
            body { background: ${BG}; margin: 0; font-family: 'Inter', sans-serif; }
            .app-wrapper { min-height: 100vh; padding: 15px 15px 120px; color: ${TEXT}; }
            .pop-header-box { background: ${CARD_BG}; border: 3px solid ${TEXT}; border-radius: 12px; padding: 15px; display: flex; align-items: center; gap: 12px; box-shadow: 5px 5px 0 ${TEXT}; position: relative; margin-bottom: 25px; }
            .pop-status { position: absolute; top: -12px; right: 10px; background: #00CED1; border: 2px solid ${TEXT}; padding: 3px 10px; font-size: 9px; font-weight: 900; transform: rotate(3deg); color: black; z-index: 10; }
            .pop-promo { background: ${PROMO_BG}; color: ${PROMO_TEXT}; border: 3px solid ${TEXT}; margin-bottom: 25px; padding: 12px; text-align: center; font-weight: 900; font-size: 13px; box-shadow: 4px 4px 0 rgba(0,0,0,0.1); transform: rotate(-1deg); }
            
            .pop-card { background: ${CARD_BG}; border: 3px solid ${TEXT}; border-radius: 18px; padding: 18px; margin-bottom: 20px; box-shadow: 6px 6px 0 ${THEME}; transition: all 0.2s; position: relative; overflow: hidden; }
            .pop-prod-title { font-weight: 900; font-size: 18px; text-transform: uppercase; color: ${PROD_NAME}; line-height: 1.1; }
            .pop-price-tag { background: ${PROD_PRICE}; color: white; padding: 4px 10px; border-radius: 6px; font-weight: 900; transform: rotate(3deg); font-size: 14px; }
            
            /* BOTÓN VIDEO STYLE */
            .pop-btn-full { width: 100%; background: ${BTN_BG} !important; color: ${BTN_TEXT} !important; border: 3px solid ${BTN_TEXT} !important; padding: 12px !important; border-radius: 15px !important; font-weight: 900 !important; text-transform: uppercase !important; box-shadow: 4px 4px 0 ${TEXT} !important; }
        `;

    case "spotlight":
      return `
            ${common}
            body { background: ${BG}; margin: 0; font-family: 'Inter', sans-serif; color: ${TEXT}; }
            .app-wrapper { min-height: 100vh; padding-bottom: 120px; }
            
            /* HEADER */
            .spot-header-pub { padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; background: ${BG}; border-bottom: 1px solid rgba(0,0,0,0.05); }
            .spot-logo-pub { width: 65px; height: 65px; border-radius: 50%; background-size: cover; background-position: center; border: 1px solid rgba(0,0,0,0.1); background-color: #000; flex-shrink: 0; }
            .spot-status-pill { background: #2ecc71; color: white; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 800; }
            
            /* BANNER HERO */
            .spot-banner-container { position: relative; height: 280px; width: 100%; overflow: hidden; background-color: #eee; }
            .spot-hero-img { width: 100%; height: 100%; background-size: cover; background-position: center; transition: transform 0.5s ease; }
            .spot-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 70%); display: flex; flex-direction: column; justify-content: flex-end; padding: 25px; }
            
            .spot-badge { 
                background: ${HERO_BADGE_BG || THEME}; 
                color: ${HERO_BADGE_COLOR || "white"}; 
                padding: 4px 12px; font-size: 10px; font-weight: 900; border-radius: 8px; display: inline-block; margin-bottom: 8px; text-transform: uppercase; 
            }
            .spot-hero-title { 
                color: ${HERO_TITLE_COLOR || "white"}; 
                font-size: 28px; font-weight: 900; text-shadow: 0 2px 4px rgba(0,0,0,0.3); line-height: 1; margin-bottom: 6px; text-transform: uppercase; font-style: italic; 
            }
            .spot-hero-price { 
                color: ${HERO_PRICE_COLOR || THEME}; 
                font-size: 22px; font-weight: 900; text-shadow: 0 2px 4px rgba(0,0,0,0.5); 
            }
            
            .spot-plus-btn { position: absolute; bottom: 25px; right: 25px; width: 48px; height: 48px; background: white; color: black; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 10; border: none; }

            /* PROMO BAR */
            .spot-promo-bar { background: ${PROMO_BG}; color: ${PROMO_TEXT || "#000"}; padding: 14px; text-align: center; font-size: 12px; font-weight: 700; border-bottom: 1px solid rgba(0,0,0,0.05); }
            
            /* PRODUCT LIST */
            .spot-product-card { display: flex; align-items: center; gap: 15px; padding: 15px 20px; border-bottom: 1px solid rgba(0,0,0,0.05); background: ${CARD_BG}; }
            .spot-product-thumb { width: 60px; height: 60px; background-size: cover; border-radius: 12px; background-color: #f0f0f0; flex-shrink: 0; }
            .spot-product-name { font-weight: 800; font-size: 14px; color: ${PROD_NAME}; text-transform: uppercase; }
            .spot-product-desc { font-size: 11px; color: ${PROD_DESC}; margin-top: 2px; line-height: 1.3; opacity: 0.8; }
            .spot-product-price { font-weight: 900; font-size: 15px; margin-top: 5px; color: ${PROD_PRICE}; }
            
            /* BOTONES LISTA */
            .spot-add-wrapper button { 
                width: 32px !important; height: 32px !important; 
                background: ${BTN_BG} !important; 
                color: ${BTN_TEXT} !important; 
                border-radius: 50% !important; 
                display: flex !important; align-items: center !important; justify-content: center !important;
                border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
        `;
    case "elegant":
      return `
            ${common}
            /* Quitamos el import local porque ya está en common */
            /* body, h1, h2, h3, p, span, div, button { font-family: 'Playfair Display', serif !important; } */
            body { background: ${BG}; margin: 0; color: ${TEXT}; font-family: '${DESC_FONT}', sans-serif; }
            .app-wrapper { min-height: 100vh; padding-bottom: 120px; text-align: center; }
            .elegant-header { padding: 60px 20px 30px; }
            .elegant-logo { width: 90px; height: 90px; margin: 0 auto 20px; border-radius: 50%; border: 2px solid ${THEME}; padding: 4px; object-fit: cover; }
            
            /* Título y subtítulo */
            .elegant-title { font-family: '${TITLE_FONT}', serif; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; font-style: italic; }
            .elegant-desc-local { font-family: '${DESC_FONT}', sans-serif; } /* Nueva clase si la necesitas para la descripción del local */
            
            /* Promo */
            .elegant-promo { font-family: '${PROMO_FONT}', serif; background: ${PROMO_BG}; border: 1px solid ${THEME}40; padding: 18px; margin: 0 25px 40px 25px; font-size: 15px; font-weight: 700; font-style: italic; color: ${PROMO_TEXT}; border-radius: 12px; }
            
            /* Cards */
            .elegant-card { padding: 20px 25px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; text-align: left; border-bottom: 1px solid rgba(0,0,0,0.04); }
            .elegant-prod-name { font-family: '${TITLE_FONT}', serif; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: ${PROD_NAME || TEXT}; }
            .elegant-prod-desc { font-family: '${DESC_FONT}', sans-serif; font-size: 14px; font-style: italic; color: ${PROD_DESC || TEXT}; opacity: 0.9; margin-top: 6px; line-height: 1.5; }
            .elegant-price { font-family: '${TITLE_FONT}', serif; font-size: 18px; font-weight: 900; color: ${PROD_PRICE || THEME}; margin-top: 10px; }
          
           
        `;
    case "bistro":
      return `
            @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');
            body { background: ${BG}; margin: 0; color: ${TEXT}; font-family: '${DESC_FONT || "Patrick Hand"}', cursive !important; }
            .app-wrapper { min-height: 100vh; display: flex; flex-direction: column; padding: 15px; padding-bottom: 40px; background: ${BG}; }
            .bistro-border { border: 2px dashed ${THEME}60; border-radius: 20px; padding: 20px 15px; flex: 1; display: flex; flex-direction: column; position: relative; }
            .bistro-header { text-align: center; margin-bottom: 25px; }
            .bistro-logo { width: 65px; height: 65px; margin: 0 auto 12px; border-radius: 50%; border: 2px solid ${THEME}; padding: 3px; object-fit: cover; }
            .bistro-title { 
              font-size: 30px; 
              color: ${TEXT}; /* <--- RECONECTADO A "NOMBRE LOCAL" */
              line-height: 1; 
              margin-bottom: 5px; 
              text-transform: uppercase; 
              font-family: '${TITLE_FONT || "Patrick Hand"}', cursive; 
            }
            .bistro-desc { font-size: 15px; color: ${DESC}; font-family: '${DESC_FONT || "Patrick Hand"}', cursive; }
            
            /* --- PROMO RECONECTADA EN SLUGPAGE --- */
            .bistro-promo { 
              margin-bottom: 25px; 
              padding: 12px; 
              /* CORRECCIÓN AQUÍ: border 2px dotted */
              border: 2px dotted ${THEME}90; 
              border-radius: 12px; 
              text-align: center; 
              background-color: ${PROMO_BG}; 
              color: ${PROMO_TEXT};         
              font-size: 14px; 
              font-weight: bold; 
              text-transform: uppercase; 
              font-family: '${PROMO_FONT || "Patrick Hand"}', cursive; 
            }
            .bistro-cat-title { color: ${THEME}; font-size: 18px; text-align: left; margin-bottom: 10px; opacity: 0.8; font-family: '${TITLE_FONT || "Patrick Hand"}', cursive; border-bottom: 1px dashed ${THEME}40; padding-bottom: 4px; text-transform: uppercase; }
            
            .bistro-row { display: flex; justify-content: space-between; align-items: baseline; }
            .bistro-name { font-size: 20px; font-weight: bold; color: ${PROD_NAME || TEXT}; line-height: 1.2; font-family: '${TITLE_FONT || "Patrick Hand"}', cursive; }
            .bistro-dots { flex: 1; border-bottom: 1px dotted ${THEME}50; margin: 0 6px; }
            .bistro-price { font-size: 18px; color: ${PROD_PRICE || THEME}; font-weight: bold; font-family: '${TITLE_FONT || "Patrick Hand"}', cursive; }
            .bistro-prod-desc { color: ${PROD_DESC || DESC}; font-family: '${DESC_FONT || "Patrick Hand"}', cursive; opacity: 0.8; font-size: 14px; margin-top: 4px; }
            .bistro-extra-btn { width: 28px; height: 28px; border-radius: 8px; background: ${BTN_BG || THEME}; color: ${BTN_TEXT || BG}; display: flex; align-items: center; justify-content: center; border: none; font-family: 'Inter', sans-serif; }
         /* SOLO el botón + principal adopta el color. Si se expande, vuelve a blanco/negro */
            .bistro-item-container .add-btn-wrapper:not(.expanded) button {
              width: 24px !important;
              height: 24px !important;
              min-width: 0 !important;
              padding: 0 !important;
              border-radius: 50% !important;
              background-color: ${BTN_BG} !important;
              color: ${BTN_TEXT} !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              border: none !important;
            }
            .bistro-item-container .add-btn-wrapper:not(.expanded) button svg,
            .bistro-item-container .add-btn-wrapper:not(.expanded) button path {
              stroke: ${BTN_TEXT} !important;
              fill: ${BTN_TEXT} !important;
              color: ${BTN_TEXT} !important;
            }
        `;
 case "marketpro":
  return `
        ${common}
        /* Bloqueo total del rebote elástico del navegador (Safari iOS) */
        html, body {
          overflow: hidden !important;
          height: 100dvh !important; /* dVH se ajusta perfecto a la pantalla del celu */
          position: fixed !important;
          width: 100% !important;
          margin: 0;
          padding: 0;
        }
        
        /* El scroll real queda encerrado únicamente dentro de la etiqueta <main> */
        main {
          height: 100dvh !important;
          width: 100% !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important; /* Suavidad en iPhone */
          overscroll-behavior-y: contain !important; /* Evita que el scroll 'salte' al navegador */
        }

        /* Forzamos que el carrito y los modales se mantengan fijos a la pantalla, no al contenido */
        .fixed {
          position: fixed !important;
        }

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
  const { cart, addToCart, updateQuantity, activeOrderId, setActiveOrderId } = useCart();
  const [showTracking, setShowTracking] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [currentExtras, setCurrentExtras] = useState<any[]>([]);
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [showHeroModal, setShowHeroModal] = useState(false);
  const [heroQty, setHeroQty] = useState(1);
  const [variationsQuantities, setVariationsQuantities] = useState<{
    [key: number]: number;
  }>({});
  const [cardSelections, setCardSelections] = useState<{
    [key: string]: number | null;
  }>({});
  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);
  const handleAddHeroToCart = () => {
    if (!restaurant.hero_title || !restaurant.hero_price) return;

    // Creamos un objeto que el carrito entienda
    const heroProduct = {
      id: "hero-item", // ID único para el destacado
      name: restaurant.hero_title,
      price: Number(restaurant.hero_price),
      quantity: heroQty,
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
    const handleAndroidPrompt = (e: any) => {
      // 1. Esto le dice a Chrome: "No muestres tu barrita de instalar, yo me encargo"
      e.preventDefault(); 
      console.log("Cartel de Android bloqueado para el cliente.");
    };

    window.addEventListener('beforeinstallprompt', handleAndroidPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleAndroidPrompt);
  }, []);
  useEffect(() => {
    const handleBeforeUnload = (e: any) => {
      // Esto hace que el navegador pregunte "¿Seguro que quieres salir?"
      // si algo intenta refrescar la página.
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);


  // --- 1. VARIABLES DE DISEÑO (SINCRONIZADAS CON EL EDITOR) ---
  const TEMPLATE = restaurant.template_id || "classic";
  const isUrban = TEMPLATE === "urban";
  const isMarket = TEMPLATE === "marketpro";

  // Identidad
  const THEME = restaurant.theme_color || (isUrban ? "#ea580c" : "#d32f2f");
  const BG = restaurant.bg_color || (isUrban ? "#121212" : "#ffffff");
  const TEXT = restaurant.text_color || "#ffffff";
  const DESC =
    restaurant.description_color || (isUrban ? "#888888" : "#ffffff");

  // Productos (Variables que coinciden con UrbanoDark.tsx)
  const CARD_BG = restaurant.card_color || (isUrban ? "#1E1E1E" : "#ffffff");
  const PROD_NAME =
    restaurant.card_name_color || (isUrban ? "#ffffff" : "#000000");
  const PROD_DESC =
    restaurant.card_desc_color || (isUrban ? "#888888" : "#666666");

  // ARREGLO CLAVE: Si es Urban, el precio NO sigue al acento por defecto
  const PROD_PRICE =
    restaurant.card_price_color || (isUrban ? "#ea580c" : THEME);

  const BTN_BG = restaurant.card_btn_bg || "#ffffff";
  const BTN_TEXT = restaurant.card_btn_text || "#000000";

  // Promo
  const PROMO_BG =
    restaurant.promo_bg_color || (isUrban ? "#1E1E1E" : "#ffebee");
  const PROMO_TEXT = restaurant.promo_text_color || "#ffffff";

  const LOGO = restaurant.logo_url;
  const BANNER = restaurant.banner_url;
  const SHOW_BANNER = restaurant.show_banner;

  // --- 2. LLAMADA A GETSTYLES (ARGUMENTOS EN ORDEN) ---
  const memoizedStyles = useMemo(() => {
    return getStyles(
      TEMPLATE,
      BG,
      THEME,
      CARD_BG,
      TEXT,
      DESC,
      PROMO_BG, // 1 al 7
      PROD_NAME,
      PROD_DESC,
      PROD_PRICE,
      BTN_BG, // 8 al 11
      BTN_TEXT, // 12
      PROMO_TEXT, // 13
      restaurant.hero_badge_bg, // 14
      restaurant.hero_badge_color, // 15
      restaurant.hero_title_color, // 16
      restaurant.hero_price_color, // 17
      restaurant.title_font ||
        (TEMPLATE === "elegant"
          ? "Playfair Display"
          : TEMPLATE === "bistro"
            ? "Patrick Hand"
            : "Inter"),
      restaurant.desc_font ||
        (TEMPLATE === "elegant"
          ? "Playfair Display"
          : TEMPLATE === "bistro"
            ? "Patrick Hand"
            : "Inter"),
      restaurant.promo_font ||
        (TEMPLATE === "elegant"
          ? "Playfair Display"
          : TEMPLATE === "bistro"
            ? "Patrick Hand"
            : "Inter"),
    );
  }, [
    TEMPLATE,
    BG,
    THEME,
    CARD_BG,
    TEXT,
    DESC,
    PROMO_BG,
    PROD_NAME,
    PROD_DESC,
    PROD_PRICE,
    BTN_BG,
    BTN_TEXT,
    PROMO_TEXT,
    restaurant.hero_badge_bg,
    restaurant.hero_badge_color,
    restaurant.hero_title_color,
    restaurant.hero_price_color,
  ]);
  useEffect(() => {
    if (activeCardId) {
      // Verificamos si el producto activo ya está en el carrito
      const isProductInCart = cart.some((item) => item.id === activeCardId);

      const timer = setTimeout(() => {
        const panel = document.getElementById(`scroll-panel-${activeCardId}`);
        if (panel) {
          // Si ya está en el carrito (mostrando extras), bajamos más el scroll
          // para que los adicionales queden a la vista.
          const scrollAmount = isProductInCart ? 350 : 180;
          panel.scrollTo({ top: scrollAmount, behavior: "smooth" });
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

  const getExtrasForProduct = useCallback(
    (productId: string) => {
      if (!restaurant?.fetched_extras) return [];
      return restaurant.fetched_extras.filter((extra: any) =>
        extra.product_extras?.some(
          (rel: any) => String(rel.product_id) === String(productId),
        ),
      );
    },
    [restaurant],
  );

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
    // DEJALA ASÍ:
    const allProducts = restaurant.fetched_products || [];
    // 2. LÓGICA DE CATEGORÍAS PARA ALTERNA-PRO (Filtra "General" y pone defaults)
    const rawCats = restaurant.categories || [];
    const cleanCats = rawCats.filter(
      (c: any) => c.name.toLowerCase() !== "general",
    );
    const displayCats =
      cleanCats.length > 0
        ? cleanCats
        : [{ name: "Semillas" }, { name: "Frutos" }, { name: "Aceites" }];
    switch (TEMPLATE) {
      case "urban":
        return (
          <div className="app-wrapper">
            {/* 1. HEADER (Logo/Nombre a la izq, Status a la der) */}
            <div className="urbano-top">
              <div className="urbano-brand">
                <div
                  className="urbano-logo"
                  style={{ backgroundImage: `url('${LOGO || ""}')` }}
                ></div>
                <div className="urbano-names">
                  <h4>{restaurant.name}</h4>
                  <span>{restaurant.description}</span>
                </div>
              </div>
              <div
                className="urbano-status"
                style={{ backgroundColor: isOpen ? "#22c55e" : "#ef4444" }}
              >
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
                    const principalEnCarrito = cart.some(
                      (item) => item.id === prod.id,
                    );
                    return (
                      <div key={prod.id} className="urbano-card">
                        <div className="urbano-item-main">
                         <div className="urbano-img overflow-hidden bg-zinc-900">
  {prod.video_url ? (
    <video 
      src={prod.video_url} 
      autoPlay 
      muted 
      loop 
      playsInline 
      className="w-full h-full object-cover"
    />
  ) : (
    <img 
      src={prod.image_url || ""} 
      className="w-full h-full object-cover" 
      alt={prod.name} 
    />
  )}
</div>
                          <div className="urbano-info">
                            <div className="urbano-tit">{prod.name}</div>
                            <div className="urbano-desc">
                              {prod.description}
                            </div>
                            <div className="urbano-price">
                              {formatPrice(prod.price)}
                            </div>
                          </div>
                          {/* El botón ahora es un "pill" que crece si hay cantidad */}
                          <div
                            className="add-btn-wrapper"
                            onClick={() => {
                              if (!isOpen) return setShowClosedAlert(true); // <--- AGREGADO
                              !principalEnCarrito &&
                                mostrarAviso("✅ Agregado");
                            }}
                          >
                            <AddToCartBtn
                              product={prod}
                              variant="icon"
                              isDark={true}
                              disabled={false} // <--- CAMBIAR A FALSE
                            />
                          </div>
                        </div>

                        {/* SECCIÓN EXTRAS */}
                        {principalEnCarrito && extras && extras.length > 0 && (
                          <div className="urbano-extras-box animate-in fade-in slide-in-from-top-2 duration-300">
                            {extras.map((ex: any) => (
                              <div key={ex.id} className="urbano-extra-row">
                                <div className="text-left">
                                  <div className="urbano-extra-name">
                                    {ex.name}
                                  </div>
                                  <div className="urbano-extra-price">
                                    +{formatPrice(ex.price)}
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    addToCart({
                                      id: prod.id,
                                      extraId: ex.id,
                                      name: ex.name,
                                      price: Number(ex.price),
                                    });
                                    mostrarAviso("✅ Extra sumado");
                                  }}
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
              <div
                className="status-badge"
                style={{
                  backgroundColor: isOpen ? "white" : "#fef2f2",
                  color: isOpen ? THEME : "#ef4444",
                  border: isOpen ? "none" : "1px solid #fecaca",
                }}
              >
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
                                    <button
                                      className={`w-6 h-6 rounded-full border flex items-center justify-center bg-white transition-colors ${principalEnCarrito ? "border-gray-200 text-gray-400 hover:bg-gray-50" : "border-gray-100 text-gray-200 cursor-not-allowed"}`}
                                    >
                                      <Plus size={12} strokeWidth={3} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div
                            className="add-btn-wrapper pt-1"
                            onClick={() => {
                              if (!isOpen) return setShowClosedAlert(true); // <--- AGREGADO
                              mostrarAviso("✅ Producto agregado");
                            }}
                          >
                            <AddToCartBtn
                              product={prod}
                              disabled={false} // <--- CAMBIAR A FALSE
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
            <div className="header-sec relative">
              <div
                className="header-logo"
                style={{ backgroundImage: `url('${LOGO || ""}')` }}
              ></div>
              <h1
                className="text-xl font-black uppercase tracking-widest mb-1"
                style={{ color: TEXT }}
              >
                {restaurant.name}
              </h1>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                {restaurant.description}
              </p>
            </div>

            {restaurant.show_promo && restaurant.promo_message && (
              <div className="promo-minimal">{restaurant.promo_message}</div>
            )}

            {restaurant.categories?.map((cat: any) => (
              <div key={cat.id} className="mb-6">
                {cat.products?.map((prod: any) => (
                  <div key={prod.id} className="prod-card">
                    {/* GRUPO IZQUIERDA: TEXTO */}
                    <div className="prod-info-group">
                      <div className="font-bold">{prod.name}</div>
                      <div className="opacity-50">{prod.description}</div>
                      <div className="font-black">
                        {formatPrice(prod.price)}
                      </div>
                    </div>

                    {/* GRUPO DERECHA: BOTÓN */}
                    <div
                      className="add-btn-wrapper"
                      onClick={() => {
                        if (!isOpen) return setShowClosedAlert(true); // <--- AGREGADO
                        mostrarAviso("✅ Producto agregado");
                      }}
                    >
                      <AddToCartBtn
                        product={prod}
                        variant="icon"
                        disabled={false} // <--- CAMBIAR A FALSE
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );

      case "visualgrid":
        return (
          <div
            className="app-wrapper"
            style={{
              backgroundColor: BG,
              minHeight: "100vh",
              paddingBottom: "120px",
            }}
          >
            {/* Status Pill */}
            <div className="absolute top-6 right-6 z-[100]">
              <span
                className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase tracking-widest shadow-2xl ${isOpen ? "bg-emerald-500 text-white border-emerald-400" : "border-red-500 text-red-500 bg-black/80"}`}
              >
                {isOpen ? "ABIERTO" : "CERRADO"}
              </span>
            </div>

            {/* Header Sushi */}
            <div className="sushi-header">
              <div className="flex items-center gap-4">
                <div
                  className="sushi-logo"
                  style={{ backgroundImage: `url('${LOGO || ""}')` }}
                ></div>
                <div className="text-left">
                  <h1
                    className="text-2xl font-black uppercase italic leading-none tracking-tighter"
                    style={{ color: TEXT }}
                  >
                    {restaurant.name}
                  </h1>
                  <p
                    className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1"
                    style={{ color: DESC }}
                  >
                    {restaurant.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Promo con tus colores recuperados */}
            {restaurant.show_promo && restaurant.promo_message && (
              <div className="sushi-msg-box">{restaurant.promo_message}</div>
            )}

            {/* Grilla Interactiva */}
            <div className="sushi-grid">
              {restaurant.categories?.map((cat: any) => (
                <div key={cat.id} style={{ display: "contents" }}>
                  {cat.products?.map((prod: any) => {
                    const extras = getExtrasForProduct(prod.id);
                    const principalEnCarrito = cart.some(
                      (item) => item.id === prod.id,
                    );
                    const isActive = activeCardId === prod.id;

                    return (
                      <div
                        key={prod.id}
                        className={`sushi-item ${isActive ? "z-20 scale-[1.05]" : "z-0"}`}
                        onClick={() => setActiveCardId(prod.id)}
                      >
                        {/* Imagen con desenfoque al tocar (Video Flow) */}
                      <div className="absolute inset-0 transition-all duration-500 overflow-hidden bg-zinc-900">
 {prod.video_url ? (
  <video 
    src={prod.video_url} 
    autoPlay 
    muted 
    loop 
    playsInline // <-- Esta es clave
    preload="auto"
    className="w-full h-full object-cover transition-all duration-500"
    style={{ filter: isActive ? "brightness(0.2) blur(8px)" : "none" }}
  />
  ) : (
    <div
      className="w-full h-full bg-cover bg-center transition-all duration-500"
      style={{
        backgroundImage: `url('${prod.image_url || ""}')`,
        filter: isActive ? "brightness(0.2) blur(8px)" : "none",
      }}
    />
  )}
</div>

                        {/* Vista Normal */}
                        {!isActive && (
                          <div className="sushi-overlay-norm">
                            <div className="font-bold text-sm text-white leading-tight mb-1">
                              {prod.name}
                            </div>
                            <div
                              className="font-black text-xs"
                              style={{ color: THEME }}
                            >
                              {formatPrice(prod.price)}
                            </div>
                          </div>
                        )}

                        {/* Vista Activa (Detalle centrado como en el video) */}
                        {isActive && (
                          <div
                            id={`scroll-panel-${prod.id}`}
                            className="sushi-active-panel no-scrollbar overflow-y-auto"
                          >
                            <div className="flex justify-end mb-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveCardId(null);
                                }}
                                className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center active:scale-90"
                              >
                                <X size={18} />
                              </button>
                            </div>
                            <div className="text-left flex-1 flex flex-col justify-center">
                              <div className="font-black text-white text-xl leading-none mb-1 uppercase italic">
                                {prod.name}
                              </div>
                              <div className="text-[11px] text-white/50 mb-4 leading-snug">
                                {prod.description}
                              </div>
                              <div
                                className="font-black text-lg mb-6"
                                style={{ color: THEME }}
                              >
                                {formatPrice(prod.price)}
                              </div>

                              {/* BOTÓN LARGO Y CENTRADO */}
                              <div
                                className="add-btn-full-width mb-6"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AddToCartBtn
                                  product={prod}
                                  variant="full"
                                  disabled={!isOpen}
                                />
                              </div>

                              {/* EXTRAS CON SCROLL AUTOMÁTICO */}
                              {principalEnCarrito &&
                                extras &&
                                extras.length > 0 && (
                                  <div className="space-y-2 pb-6 animate-in slide-in-from-bottom-2">
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest border-b border-white/10 pb-1 mb-2">
                                      Adicionales
                                    </p>
                                    {extras.map((ex: any) => (
                                      <div
                                        key={ex.id}
                                        className="flex justify-between items-center bg-black/40 p-3 rounded-2xl border border-white/5"
                                      >
                                        <div className="text-left leading-none">
                                          <div className="text-[11px] font-bold text-white">
                                            {ex.name}
                                          </div>
                                          <div
                                            className="text-[10px] mt-1"
                                            style={{ color: THEME }}
                                          >
                                            +{formatPrice(ex.price)}
                                          </div>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            addToCart({
                                              id: prod.id,
                                              extraId: ex.id,
                                              name: ex.name,
                                              price: Number(ex.price),
                                            });
                                            mostrarAviso("✅ Extra sumado");
                                          }}
                                          className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 shadow-lg"
                                          style={{
                                            backgroundColor: BTN_BG,
                                            color: BTN_TEXT,
                                          }}
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
              ))}
            </div>
          </div>
        );
      case "pop":
        // Usamos la nueva columna de la DB para los bordes y sombras rígidas
        const shadow = restaurant.card_shadow_color || "#000000";

        return (
          /* Agregamos px-5 (padding horizontal) para que la sombra rígida de 6px no se corte */
          <div
            className="app-wrapper"
            style={{
              backgroundColor: BG,
              minHeight: "100vh",
              padding: "0 20px 120px",
            }}
          >
            {/* 1. Header Pop - Borde y Sombra sincronizados con 'shadow' */}
            <div
              className="pop-header-box"
              style={{
                border: `3px solid ${shadow}`,
                boxShadow: `5px 5px 0 ${shadow}`,
                backgroundColor: CARD_BG,
                marginTop: "20px",
              }}
            >
              <div
                className="pop-status"
                style={{
                  border: `2px solid ${shadow}`,
                  backgroundColor: "#00CED1",
                  color: "black",
                }}
              >
                {isOpen ? "OPEN" : "CLOSED"}
              </div>
              <div
                className="w-16 h-16 rounded-full border-4 overflow-hidden flex-shrink-0 bg-white shadow-inner"
                style={{ borderColor: shadow }}
              >
                <img
                  src={LOGO || ""}
                  className="w-full h-full object-cover"
                  alt="logo"
                />
              </div>
              <div className="text-left">
                <h1
                  className="text-xl font-black uppercase leading-none"
                  style={{ color: TEXT }}
                >
                  {restaurant.name}
                </h1>
                <p
                  className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-tight"
                  style={{ color: DESC }}
                >
                  {restaurant.description}
                </p>
              </div>
            </div>

            {/* 2. Promo - Borde sincronizado */}
            {restaurant.show_promo && restaurant.promo_message && (
              <div
                className="pop-promo"
                style={{
                  border: `3px solid ${shadow}`,
                  backgroundColor: PROMO_BG,
                  color: PROMO_TEXT,
                  boxShadow: `4px 4px 0 rgba(0,0,0,0.1)`,
                }}
              >
                {restaurant.promo_message}
              </div>
            )}

            {/* 3. Grilla de Productos */}
            {restaurant.categories?.map((cat: any) => (
              <div key={cat.id} style={{ display: "contents" }}>
                {cat.products?.map((prod: any) => {
                  const extras = getExtrasForProduct(prod.id);
                  const principalEnCarrito = cart.some(
                    (item) => item.id === prod.id,
                  );
                  const isActive = activeCardId === prod.id;

                  return (
                    <div
                      key={prod.id}
                      className="pop-card"
                      style={{
                        border: `3px solid ${shadow}`,
                        /* CORRECCIÓN: La sombra de la card ahora usa 'shadow' (Azul), no THEME */
                        boxShadow: isActive
                          ? `3px 3px 0 ${shadow}`
                          : `6px 6px 0 ${shadow}`,
                        backgroundColor: CARD_BG,
                        transform: isActive ? "translate(3px, 3px)" : "none",
                        transition: "all 0.2s",
                      }}
                      onClick={() => setActiveCardId(isActive ? null : prod.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-left flex-1 pr-4">
                          <h3
                            className="pop-prod-title"
                            style={{ color: PROD_NAME }}
                          >
                            {prod.name}
                          </h3>
                          {!isActive && (
                            <p
                              className="text-xs font-bold opacity-60 mt-2"
                              style={{ color: DESC }}
                            >
                              {prod.description}
                            </p>
                          )}
                        </div>

                        {/* El precio usa PROD_PRICE (Independiente de la sombra) */}
                        <div
                          className="pop-price-tag"
                          style={{
                            backgroundColor: PROD_PRICE,
                            border: `2px solid ${shadow}`,
                            color: "white",
                          }}
                        >
                          {formatPrice(prod.price)}
                        </div>
                      </div>

                      {isActive && (
                        <div className="mt-6 animate-in fade-in zoom-in-95 duration-200">
                          <p
                            className="text-sm font-bold text-left mb-6"
                            style={{ color: DESC }}
                          >
                            {prod.description}
                          </p>

                          {/* BOTÓN PRINCIPAL: Envoltura corregida para evitar error TS */}
                          <div
                            className="mb-6"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              style={{
                                backgroundColor: BTN_BG,
                                color: BTN_TEXT,
                                border: `3px solid ${shadow}`,
                                boxShadow: `4px 4px 0 ${shadow}`,
                                borderRadius: "15px",
                                padding: "5px",
                              }}
                            >
                              <AddToCartBtn
                                product={prod}
                                variant="full"
                                disabled={!isOpen}
                              />
                            </div>
                          </div>

                          {/* 4. Extras con estilo Pop sincronizado */}
                          {principalEnCarrito &&
                            extras &&
                            extras.length > 0 && (
                              <div className="space-y-3 pt-4 border-t-4 border-black/5 text-left">
                                {extras.map((ex: any) => (
                                  <div
                                    key={ex.id}
                                    className="flex justify-between items-center bg-white p-3 border-2 rounded-xl"
                                    style={{
                                      borderColor: shadow,
                                      boxShadow: `3px 3px 0 ${shadow}`,
                                    }}
                                  >
                                    <span className="text-xs font-black uppercase text-black">
                                      {ex.name} (+{formatPrice(ex.price)})
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart({
                                          id: prod.id,
                                          extraId: ex.id,
                                          name: ex.name,
                                          price: Number(ex.price),
                                        });
                                        mostrarAviso("Agregado");
                                      }}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90"
                                      style={{
                                        backgroundColor: BTN_BG,
                                        color: BTN_TEXT,
                                        border: `2px solid ${shadow}`,
                                      }}
                                    >
                                      <Plus size={16} strokeWidth={4} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
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
        const heroBanner =
          restaurant.banner_url ||
          (allProducts.length > 0 ? allProducts[0].image_url : "");
        return (
          <div className="app-wrapper">
            {/* 1. Header con Logo y Status */}
            <div className="spot-header-pub">
              <div className="flex items-center gap-4 text-left">
                <div
                  className="spot-logo-pub"
                  style={{ backgroundImage: `url('${LOGO || ""}')` }}
                ></div>
                <div>
                  {/* Nombre más grande (XL) */}
                  <h1
                    className="text-xl font-black uppercase leading-none tracking-tight"
                    style={{ color: TEXT }}
                  >
                    {restaurant.name}
                  </h1>
                  {/* Descripción más grande (SM) */}
                  <p
                    className="text-sm font-bold opacity-50 uppercase mt-1"
                    style={{ color: DESC }}
                  >
                    {restaurant.description}
                  </p>
                </div>
              </div>
              <div
                className="spot-status-pill"
                style={{ backgroundColor: isOpen ? "#2ecc71" : "#e74c3c" }}
              >
                {isOpen ? "ABIERTO" : "CERRADO"}
              </div>
            </div>

            {/* 2. Banner Héroe Interactivo */}
            <div
              className="spot-banner-container"
              onClick={() =>
                isOpen && restaurant.hero_title && setShowHeroModal(true)
              }
            >
              <div
                className="spot-hero-img"
                style={{ backgroundImage: `url('${heroBanner}')` }}
              ></div>
              <div className="spot-overlay">
                <div className="text-left">
                  <div className="spot-badge">
                    {restaurant.hero_badge_text || "DESTACADO"}
                  </div>
                  <h2 className="spot-hero-title">
                    {restaurant.hero_title || allProducts[0]?.name}
                  </h2>
                  <div className="spot-hero-price">
                    {formatPrice(
                      restaurant.hero_price || allProducts[0]?.price || 0,
                    )}
                  </div>
                </div>
                {isOpen && restaurant.hero_title && (
                  <button className="spot-plus-btn">
                    <Plus size={24} strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>

            {/* 3. Barra de Promoción */}
            {restaurant.show_promo && restaurant.promo_message && (
              <div className="spot-promo-bar">{restaurant.promo_message}</div>
            )}

            {/* 4. Lista de Productos con Thumbnails */}
            <div className="flex-1">
              {restaurant.categories?.map((cat: any) => (
                <div key={cat.id} style={{ display: "contents" }}>
                  {cat.products?.map((prod: any) => {
                    const principalEnCarrito = cart.some(
                      (item) => item.id === prod.id,
                    );
                    return (
                      <div
                        key={prod.id}
                        className="spot-product-card text-left"
                      >
                       <div className="spot-product-thumb overflow-hidden bg-zinc-100">
  {prod.video_url ? (
    <video 
      src={prod.video_url} 
      autoPlay muted loop playsInline 
      className="w-full h-full object-cover"
    />
  ) : (
    <div 
      className="w-full h-full bg-cover bg-center"
      style={{ backgroundImage: `url('${prod.image_url || ""}')` }}
    />
  )}
</div>
                        <div className="flex-1">
                          <h3 className="spot-product-name">{prod.name}</h3>
                          <p className="spot-product-desc">
                            {prod.description}
                          </p>
                          <div className="spot-product-price">
                            {formatPrice(prod.price)}
                          </div>
                        </div>
                        <div
                          className="spot-add-wrapper"
                          onClick={() =>
                            !principalEnCarrito && mostrarAviso("✅ Agregado")
                          }
                        >
                          <AddToCartBtn
                            product={prod}
                            variant="icon"
                            disabled={!isOpen}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );

      case "elegant":
        return (
          <div className="app-wrapper">
            <div className="elegant-header" style={{ position: "relative" }}>
              {/* BADGE DE ESTADO */}
              <div
                className="elegant-status"
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  fontSize: "8px",
                  fontWeight: "900",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: `1px solid ${isOpen ? THEME : "#cc0000"}`,
                  color: isOpen ? THEME : "#cc0000",
                  backgroundColor: "transparent",
                  zIndex: 10,
                  fontFamily: "Inter, sans-serif", // Fuente neutra para el estado
                }}
              >
                {isOpen ? "Abierto" : "Cerrado"}
              </div>

              {LOGO && <img src={LOGO} className="elegant-logo" alt="logo" />}

              {/* TÍTULO CON FUENTE DINÁMICA */}
              <h1
                className="elegant-title"
                style={{
                  fontFamily: restaurant.title_font || "Playfair Display",
                }}
              >
                {restaurant.name}
              </h1>

              {/* DESCRIPCIÓN CON FUENTE DINÁMICA (Aquí estaba el fallo) */}
              <p
                className="text-[10px] uppercase tracking-[0.3em] opacity-40 font-bold"
                style={{ fontFamily: restaurant.desc_font || "Inter" }}
              >
                {restaurant.description}
              </p>
            </div>

            {restaurant.show_promo && restaurant.promo_message && (
              <div
                className="elegant-promo"
                style={{
                  fontFamily: restaurant.promo_font || "Playfair Display",
                }}
              >
                {restaurant.promo_message}
              </div>
            )}

            {/* LISTADO DE PRODUCTOS */}
            {restaurant.categories?.map((cat: any) => (
              <div key={cat.id}>
                {cat.name.toLowerCase() !== "general" && (
                  <h2
                    style={{
                      fontFamily: restaurant.title_font || "Playfair Display",
                      fontSize: "14px",
                      textTransform: "uppercase",
                      letterSpacing: "3px",
                      margin: "30px 0 15px",
                      opacity: 0.5,
                    }}
                  >
                    {cat.name}
                  </h2>
                )}

                {cat.products?.map((prod: any) => {
                  const principalEnCarrito = cart.some(
                    (item) => item.id === prod.id,
                  );
                  return (
                    <div key={prod.id} className="elegant-card">
                      <div className="flex-1 pr-6 text-left">
                        {/* NOMBRE PROD CON FUENTE DINÁMICA */}
                        <h3
                          className="elegant-prod-name"
                          style={{
                            fontFamily:
                              restaurant.title_font || "Playfair Display",
                          }}
                        >
                          {prod.name}
                        </h3>
                        {/* DESC PROD CON FUENTE DINÁMICA */}
                        <p
                          className="elegant-prod-desc"
                          style={{
                            fontFamily: restaurant.desc_font || "Inter",
                          }}
                        >
                          {prod.description}
                        </p>
                        <div
                          className="elegant-price"
                          style={{
                            fontFamily:
                              restaurant.title_font || "Playfair Display",
                          }}
                        >
                          {formatPrice(prod.price)}
                        </div>

                        {/* ... (resto de extras igual) ... */}
                      </div>

                      <div
                        onClick={() =>
                          !principalEnCarrito &&
                          mostrarAviso("✅ Producto agregado")
                        }
                      >
                        <AddToCartBtn
                          product={prod}
                          variant="icon"
                          isDark={false}
                          disabled={!isOpen}
                        />
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
            <div className="bistro-border relative">
              {/* --- CARTEL DE ESTADO (Abierto/Cerrado) --- */}
              <div className="absolute -top-3 -right-2 rotate-12 z-20">
                <div
                  className={`px-3 py-1 border-2 border-dashed rounded-lg text-[10px] font-black uppercase tracking-widest`}
                  style={{
                    backgroundColor: BG,
                    color: isOpen ? "#2ecc71" : "#e74c3c", // Verde abierto, Rojo cerrado
                    borderColor: isOpen ? "#2ecc71" : "#e74c3c",
                    fontFamily: restaurant.title_font || "Patrick Hand",
                  }}
                >
                  {isOpen ? "Abierto" : "Cerrado"}
                </div>
              </div>

              <div className="bistro-header">
                {LOGO && <img src={LOGO} className="bistro-logo" alt="logo" />}
                <h1 className="bistro-title">{restaurant.name}</h1>
                <p className="bistro-desc">{restaurant.description}</p>
              </div>

              {restaurant.show_promo && restaurant.promo_message && (
                <div className="bistro-promo">{restaurant.promo_message}</div>
              )}

              {/* LISTA DE PRODUCTOS */}
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {restaurant.categories?.map((cat: any) => (
                  <div key={cat.id} className="mb-8">
                    {/* FILTRO DE CATEGORÍA "GENERAL" */}
                    {cat.name.toLowerCase() !== "general" && (
                      <div className="bistro-cat-title">{cat.name}</div>
                    )}

                    {cat.products?.map((prod: any) => {
                      const extras = getExtrasForProduct(prod.id);
                      const principalEnCarrito = cart.some(
                        (item) => item.id === prod.id,
                      );

                      return (
                        <div key={prod.id} className="bistro-item-container">
                          <div className="bistro-row">
                            <div
                              className={`bistro-name ${principalEnCarrito ? "in-cart" : ""}`}
                            >
                              {prod.name}
                            </div>
                            <div className="bistro-dots"></div>
                            <div className="bistro-price">
                              {formatPrice(prod.price)}
                            </div>
                          </div>

                          {prod.description && (
                            <p
                              className={`bistro-prod-desc ${principalEnCarrito ? "in-cart" : ""}`}
                            >
                              {prod.description}
                            </p>
                          )}

                          <div className="flex justify-end mt-2">
                            <div
                              className={`add-btn-wrapper ${principalEnCarrito ? "expanded" : ""}`}
                              onClick={() =>
                                !principalEnCarrito &&
                                mostrarAviso("✅ Agregado")
                              }
                            >
                              <AddToCartBtn
                                product={prod}
                                variant="icon"
                                isDark={true}
                                disabled={!isOpen}
                              />
                            </div>
                          </div>

                          {/* SECCIÓN EXTRAS */}
                          {principalEnCarrito &&
                            extras &&
                            extras.length > 0 && (
                              <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-4 border-t border-dashed border-gray-600/50 pt-3">
                                <p
                                  className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2"
                                  style={{
                                    fontFamily:
                                      restaurant.desc_font || "Patrick Hand",
                                  }}
                                >
                                  Adicionales
                                </p>
                                {extras.map((ex: any) => (
                                  <div
                                    key={ex.id}
                                    className="flex justify-between items-center mb-2"
                                  >
                                    <div className="text-left">
                                      <span
                                        style={{
                                          color: TEXT,
                                          fontSize: "14px",
                                          fontFamily:
                                            restaurant.desc_font ||
                                            "Patrick Hand",
                                        }}
                                      >
                                        {ex.name}
                                      </span>
                                      <span
                                        style={{
                                          color: THEME,
                                          fontSize: "14px",
                                          fontWeight: "bold",
                                          marginLeft: "6px",
                                          fontFamily:
                                            restaurant.title_font ||
                                            "Patrick Hand",
                                        }}
                                      >
                                        +{formatPrice(ex.price)}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        addToCart({
                                          id: prod.id,
                                          extraId: ex.id,
                                          name: ex.name,
                                          price: Number(ex.price),
                                        });
                                        mostrarAviso("✅ Extra sumado");
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
                ))}
              </div>
            </div>
          </div>
        );
      case "marketpro":
        return (
          <MarketProTemplate
            restaurant={restaurant}
            products={allProducts}
            categories={restaurant.categories || []}
            fetchedExtras={restaurant.fetched_extras} 
            isOpen={isOpen}
            onAddToCart={(product: any, qty: number) => {
              for (let i = 0; i < qty; i++) {
                addToCart(product);
              }
              mostrarAviso("✅ Producto agregado");
            }}
          />
        );
      case "icecream-v1": {
        const iceCreamProducts = restaurant.fetched_products || [];
        return (
          <HeladeriaSoft
            restaurant={restaurant}
            products={iceCreamProducts}
            isOpen={isOpen} // <--- AGREGÁ ESTA LÍNEA
            onAddToCart={(product: any) => {
              addToCart(product);
              mostrarAviso("✅ Producto agregado");
            }}
            isMockup={false}
          />
        );
      }
      case "alterna-pro":
        return (
          <AlternaPro
            restaurant={{ ...restaurant, selectedProduct }}
            products={allProducts}
            setSelectedProduct={setSelectedProduct}
            isOpen={isOpen} // <--- AGREGÁ ESTA LÍNEA
            onAddToCart={(product: any, qty: number) => {
              for (let i = 0; i < qty; i++) {
                addToCart(product);
              }
              mostrarAviso("✅ Producto agregado");
            }}
            isMockup={false}
          />
        );
      default:
        return <div className="p-10 text-center">Menú no encontrado</div>;
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Agregamos flex y flex-col aquí */}
      <div
        className="max-w-[500px] mx-auto min-h-screen relative shadow-[0_0_100px_rgba(0,0,0,0.8)] border-x border-white/5 overflow-x-hidden flex flex-col"
        style={{ backgroundColor: BG }}
      >
        <style dangerouslySetInnerHTML={{ __html: memoizedStyles }} />
        <ClearCartLogic currentRestaurantId={restaurant.id} />

        {/* Notificaciones... */}
        {notificacion && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[2000] whitespace-nowrap">
            <div
              className={`
      ${
        TEMPLATE === "visualgrid"
          ? "bg-white/10 backdrop-blur-xl border-white/20 text-white"
          : TEMPLATE === "minimal"
            ? "bg-white text-black border-gray-200"
            : TEMPLATE === "bistro"
              ? "bg-[#1a1a1a] text-[#e6c87e] border-dashed border-[#e6c87e]/40" // Estilo Tiza
              : "bg-blue-600 text-white border-blue-400"
      } 
      px-4 py-2 rounded-full shadow-lg flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300 border
    `}
            >
              <Check
                size={16}
                className={
                  TEMPLATE === "minimal" || TEMPLATE === "bistro"
                    ? "text-[#e6c87e]"
                    : "text-white"
                }
              />
              <span className="font-bold text-xs uppercase tracking-wide">
                {notificacion.replace("✅", "").replace("⚠️", "")}
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
        <a
          href="https://snappy.uno"
          target="_blank"
          rel="noreferrer"
          className="block w-full py-8 text-center bg-gray-900/50 hover:bg-black transition-colors cursor-pointer no-underline"
        >
          <p className="text-[10px] font-black text-white/40 flex items-center justify-center gap-1 uppercase tracking-[0.2em]">
            Potenciado por{" "}
            <Zap size={12} className="text-yellow-400/50 fill-yellow-400/50" />{" "}
            Snappy
          </p>
        </a>

        <div className="sticky bottom-0 left-0 w-full z-[50]">
          <CartFooter
            phone={restaurant.phone}
            deliveryCost={Number(restaurant.delivery_cost)}
            restaurantId={restaurant.id}
            aliasMp={restaurant.alias_mp}
            planType={restaurant.subscription_plan}
            receiveWhatsapp={restaurant.receive_whatsapp}
            businessType={restaurant.business_type}
            restaurantName={restaurant.name}
          />
        </div>
      </div>

      {/* --- CÓDIGO DEL MODAL PARA EL PRODUCTO DESTACADO --- */}
      {showHeroModal && restaurant.hero_title && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4">
          {/* Fondo oscuro con blur */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowHeroModal(false)}
          ></div>

          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] relative z-10 overflow-hidden animate-in slide-in-from-bottom-10 duration-300 shadow-2xl">
            {/* Imagen del plato en el modal */}
            <div
              className="h-56 bg-cover bg-center relative"
              style={{ backgroundImage: `url('${BANNER || LOGO}')` }}
            >
              <button
                onClick={() => setShowHeroModal(false)}
                className="absolute top-5 right-5 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="p-8 text-left bg-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-2">
                    {restaurant.hero_title}
                  </h3>
                  <div className="text-2xl font-black text-orange-500">
                    {formatPrice(restaurant.hero_price)}
                  </div>
                </div>
                {/* Selector de cantidad simple */}
                <div className="flex items-center gap-3 bg-gray-100 p-1.5 rounded-2xl">
                  <button
                    onClick={() => setHeroQty(Math.max(1, heroQty - 1))}
                    className="w-8 h-8 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="font-bold w-4 text-center">{heroQty}</span>
                  <button
                    onClick={() => setHeroQty(heroQty + 1)}
                    className="w-8 h-8 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
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
    
      {/* --- MODAL DE COMPRA MÚLTIPLE (DIETÉTICA/HELADERÍA) --- */}
    {/* --- MODAL DE COMPRA MÚLTIPLE (DIETÉTICA/HELADERÍA) --- */}
      {selectedProduct && !["alterna-pro", "marketpro"].includes(TEMPLATE) && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => {
              setSelectedProduct(null);
              setVariationsQuantities({});
              setSelectedExtras([]);
            }}
          ></div>

          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] relative z-10 overflow-hidden animate-in slide-in-from-bottom-10 shadow-2xl max-h-[90vh] flex flex-col">
            {/* CABECERA */}
            <div className="p-6 pb-4 flex justify-between items-start border-b border-gray-50">
              <div className="text-left flex-1">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none text-gray-900">
                  {selectedProduct.name}
                </h3>
                <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest leading-relaxed">
                  {selectedProduct.description}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setVariationsQuantities({});
                  setSelectedExtras([]);
                }}
                className="w-10 h-10 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center active:scale-90"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            {/* CUERPO: LISTA DE VARIANTES */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 no-scrollbar">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">
                Elegí las cantidades:
              </p>

              {selectedProduct.variations?.map((v: any, idx: number) => {
                const qty = variationsQuantities[idx] || 0;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-[2rem] border-2 transition-all ${qty > 0 ? "border-indigo-500 bg-indigo-50/50" : "border-gray-100 bg-gray-50"}`}
                  >
                    <div className="flex flex-col text-left">
                      <span className={`font-black text-sm uppercase ${qty > 0 ? "text-indigo-900" : "text-gray-500"}`}>
                        {v.label}
                      </span>
                      <span className={`font-bold text-xs ${qty > 0 ? "text-indigo-600" : "text-gray-400"}`}>
                        {formatPrice(v.price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                      <button
                        onClick={() =>
                          setVariationsQuantities({
                            ...variationsQuantities,
                            [idx]: Math.max(0, qty - 1),
                          })
                        }
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-lg transition-colors ${qty > 0 ? "text-indigo-600 bg-indigo-50" : "text-gray-300 cursor-not-allowed"}`}
                      >
                        -
                      </button>
                      <span className={`font-black text-sm w-4 text-center ${qty > 0 ? "text-gray-900" : "text-gray-300"}`}>
                        {qty}
                      </span>
                      <button
                        onClick={() =>
                          setVariationsQuantities({
                            ...variationsQuantities,
                            [idx]: qty + 1,
                          })
                        }
                        className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* --- SECCIÓN EXTRAS (DINÁMICA: SE OCULTA SI NO HAY) --- */}
          {/* --- SECCIÓN EXTRAS DINÁMICA --- */}
{(() => {
    // 1. Filtramos los extras que pertenecen a este producto específico
    const extrasDisponibles = restaurant.fetched_extras?.filter((ex: any) =>
        ex.product_extras?.some(
            (re: any) => String(re.product_id) === String(selectedProduct.id)
        )
    ) || [];

    // 2. Si no hay extras para este producto, devolvemos NULL y no se muestra nada
    if (extrasDisponibles.length === 0) return null;

    // 3. Si hay extras, mostramos el título y la lista
    return (
        <div className="mt-8 space-y-3 pb-4 px-1 animate-in fade-in duration-500">
            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-1 text-left">
                ¿Querés sumar algo más?
            </p>
            <div className="grid grid-cols-1 gap-2">
                {extrasDisponibles.map((ex: any) => {
                    const isSelected = selectedExtras.some((s) => s.id === ex.id);
                    const hasMainQty = Object.values(variationsQuantities).some((q) => q > 0);

                    return (
                        <button
                            key={ex.id}
                            type="button"
                            disabled={!hasMainQty}
                            onClick={() =>
                                setSelectedExtras((prev) =>
                                    isSelected
                                        ? prev.filter((s) => s.id !== ex.id)
                                        : [...prev, ex]
                                )
                            }
                            className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                                !hasMainQty
                                    ? "opacity-30 grayscale cursor-not-allowed border-gray-100"
                                    : isSelected
                                        ? "border-emerald-500 bg-emerald-50"
                                        : "border-gray-100 bg-white"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                        isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-200"
                                    }`}
                                >
                                    {isSelected && <Check size={10} className="text-white" strokeWidth={4} />}
                                </div>
                                <span className={`text-[10px] font-black uppercase ${isSelected ? "text-emerald-900" : "text-gray-400"}`}>
                                    {ex.name}
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400">
                                +{formatPrice(ex.price)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
})()}
            </div>

            {/* BOTÓN FINAL DE CONFIRMACIÓN */}
            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <button
                disabled={Object.values(variationsQuantities).every((q) => q === 0)}
                onClick={() => {
                  Object.entries(variationsQuantities).forEach(([idx, qty]) => {
                    if (qty > 0) {
                      const variation = selectedProduct.variations[Number(idx)];
                      const parentId = `${selectedProduct.id}-${idx}`;
                      for (let i = 0; i < qty; i++) {
                        addToCart({
                          ...selectedProduct,
                          id: parentId,
                          name: `${selectedProduct.name} (${variation.label})`,
                          price: Number(variation.price),
                        });
                        selectedExtras.forEach((extra) => {
                          addToCart({
                            id: parentId,
                            extraId: extra.id,
                            name: extra.name,
                            price: Number(extra.price),
                          });
                        });
                      }
                    }
                  });
                  mostrarAviso("✅ Agregado al pedido");
                  setSelectedProduct(null);
                  setVariationsQuantities({});
                  setSelectedExtras([]);
                }}
                className="w-full py-5 rounded-2xl font-black text-white text-center uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
                style={{ backgroundColor: THEME }}
              >
                Confirmar y Sumar
                <div className="h-4 w-[1px] bg-white/20" />
                {formatPrice(
                  Object.entries(variationsQuantities).reduce((acc, [idx, qty]) => {
                    return acc + Number(selectedProduct.variations[Number(idx)].price) * qty;
                  }, 0) + selectedExtras.reduce((acc, e) => acc + Number(e.price), 0)
                )}
              </button>
            </div>
          </div>
        </div>
      )}
  
      {/* --- PEGÁ ESTO JUSTO ARRIBA DE </main> --- */}
      {showClosedAlert && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs p-8 rounded-[3rem] shadow-2xl text-center animate-in zoom-in-95 duration-300 relative">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Clock size={32} />
            </div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-gray-900">
              Local Cerrado
            </h2>
            <p className="text-gray-500 text-[10px] font-bold mt-2 leading-relaxed uppercase tracking-widest">
              ¡Hola! Estamos fuera de <br /> nuestro horario de atención.
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
function BioContent({ restaurant }: { restaurant: any }) {
  const mainStyle = {
    backgroundColor: restaurant.snappylink_bg_color || "#ffffff",
    backgroundImage: restaurant.snappylink_bg_img ? `url(${restaurant.snappylink_bg_img})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };
  
  const displayTitle = restaurant.snappylink_title || restaurant.name;
  
  return (
    <main className="min-h-screen flex flex-col" style={mainStyle}>
      <div className="max-w-[500px] mx-auto w-full flex-1 flex flex-col items-center pt-16 px-6 relative z-10">
        
        {/* HEADER (Logo) */}
        <div className="w-24 h-24 rounded-full border-4 shadow-xl overflow-hidden mb-6" 
             style={{ borderColor: restaurant.snappylink_btn_color || restaurant.theme_color }}>
          <img src={restaurant.snappylink_logo_url || restaurant.logo_url || '/placeholder.png'} 
               className="w-full h-full object-cover" alt="logo" />
        </div>
        
        {/* TEXTOS (Título y Bio con colores dinámicos) */}
        <div className="text-center space-y-2 mb-10">
          <h1 className="font-black text-2xl uppercase italic tracking-tighter leading-none" 
              style={{ color: restaurant.snappylink_title_color || '#000000' }}>
            {displayTitle}
          </h1>
          <p className="text-xs font-medium max-w-xs" 
             style={{ color: restaurant.snappylink_desc_color || '#666666' }}>
            {restaurant.snappylink_bio}
          </p>
        </div>

        {/* DISEÑO DINÁMICO (BioModern ya gestiona los iconos arriba/abajo) */}
        <div className="w-full">
          <BioModern data={restaurant} />
        </div>

        {/* FOOTER */}
        <div className="mt-auto py-10">
          <a href="https://snappy.uno" target="_blank" className="no-underline opacity-30 hover:opacity-100 transition-opacity">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
              Potenciado por <Zap size={12} className="fill-yellow-400 text-yellow-400" /> Snappy
            </p>
          </a>
        </div>
      </div>
      
      {restaurant.snappylink_bg_img && (
        <div className="absolute inset-0 bg-black/20 pointer-events-none z-0"></div>
      )}
    </main>
  );
}
// --- 5. EXPORT PRINCIPAL (CORREGIDO PARA NEXT.JS 15 Y LÓGICA DE PAUSA) ---
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
        console.error("Error en carga:", error);
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [params]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-black" size={40} />
    </div>
  );
  
  if (!restaurant) return notFound();

  // 🚀 SI EL SLUG ERA DE UNA BIO
  if (restaurant.page_type === 'bio') {
    if (restaurant.is_bio_active === false) return notFound();
    return <BioContent restaurant={restaurant} />;
  }

  // 🍔 SI EL SLUG ERA DE UN MENÚ
  return (
    <CartProvider>
      <MenuContent
        restaurant={restaurant}
        isOpen={restaurant.always_open || (restaurant.is_open && checkIsOpen(restaurant.business_hours))}
      />
    </CartProvider>
  );
}