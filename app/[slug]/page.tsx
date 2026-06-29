"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
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
  Store,
  Phone,
  Facebook,
  Instagram,
  Music2,
  ExternalLink,
  MapPin,
  Minus,
  CalendarIcon,
  Eye,
  CheckCircle2,XCircle,ShieldAlert, LogIn, AlertCircle, 
} from "lucide-react";
import SpotlightHero from "@/components/templates/SpotlightHero";
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
import ClassicDelivery from "@/components/templates/ClassicDelivery";
import MinimalWhite from "@/components/templates/MinimalWhite";
import Carta from "@/components/templates/Carta";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createBrowserClient(supabaseUrl, supabaseKey);

// --- 1. DATOS ---
// --- 1. DATOS (ORDEN DE PRIORIDAD CORREGIDO) ---
async function getRestaurant(slug: string) {
  const cleanSlug = slug.toLowerCase().trim();
  console.log("🔍 Buscando página para:", cleanSlug);

  // 🚀 A. PRIORIDAD 1: Buscamos en la tabla de MENÚS (RESTAURANTS)
  const { data: menuData } = await supabase
    .from("restaurants")
    .select(`*, categories (id, name, image_url)`)
    .ilike("slug", cleanSlug)
    .maybeSingle();

  if (menuData) {
    console.log("✅ MENÚ ENCONTRADO - PRIORIDAD ALTA");
    const { data: products } = await supabase
      .from("products")
      .select("id, name, description, price, image_url, video_url, category_id, sale_type, variations")
      .eq("restaurant_id", menuData.id)
      .order("name", { ascending: true });

    const { data: allExtras } = await supabase
      .from("extras")
      .select(`*, product_extras (product_id)`)
      .eq("restaurant_id", menuData.id);

    const categoriesWithProducts = (menuData.categories || []).map(
      (cat: any) => ({
        ...cat,
        products: (products || []).filter(
          (p: any) => String(p.category_id) === String(cat.id),
        ),
      }),
    );

    return {
      ...menuData,
      categories: categoriesWithProducts,
      fetched_products: products || [],
      fetched_extras: allExtras || [],
      page_type: "menu",
    };
  }

  // 🚀 B. PRIORIDAD 2: Solo si no hay menú, buscamos en SnappyLinks (BIO)
  const { data: bioData } = await supabase
    .from("snappylinks")
    .select(`*, restaurant:restaurants(*)`)
    .ilike("slug", cleanSlug)
    .maybeSingle();

  if (bioData) {
    console.log("✅ BIO ENCONTRADA - NO HABÍA MENÚ CON ESTE SLUG");
    return {
      ...bioData.restaurant,
      snappylink_bio: bioData.bio,
      snappylink_links: bioData.links,
      snappylink_template_id: bioData.template_id,
      is_bio_active: bioData.is_active,
      snappylink_title: bioData.title,
      snappylink_bg_color: bioData.bg_color,
      snappylink_bg_img: bioData.bg_img,
      snappylink_btn_color: bioData.btn_color,
      snappylink_btn_text_color: bioData.btn_text_color,
      snappylink_shadow_color: bioData.shadow_color,
      snappylink_title_color: bioData.title_color,
      snappylink_desc_color: bioData.desc_color,
      snappylink_social_links: (bioData as any).social_links || [],
      snappylink_social_pos: (bioData as any).social_pos || "bottom",
      page_type: "bio",
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
      @keyframes notification-animation {
      0% { transform: translateY(-100%) scale(0.9); opacity: 0; }
      15% { transform: translateY(0) scale(1); opacity: 1; }
      85% { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(-40px) scale(0.9); opacity: 0; }
    }
    .animate-notification {
      animation: notification-animation 2.5s ease-in-out forwards;
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
                background-color: ${PROMO_BG === "transparent" || !PROMO_BG ? "#1E1E1E" : PROMO_BG}; 
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
            
            .pop-cat-title { font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: ${TEXT}; margin: 25px 0 12px; padding-bottom: 6px; border-bottom: 3px solid ${TEXT}; }
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
  const searchParams = useSearchParams();
  const [mesaId, setMesaId] = useState<string | null>(null);
  const [mesaLabel, setMesaLabel] = useState<string | null>(null);

  useEffect(() => {
    const mesaParam = searchParams.get('mesa');
    if (!mesaParam) return;
    setMesaId(mesaParam);
    supabase
      .from('tables')
      .select('name')
      .eq('id', mesaParam)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setMesaLabel(data.name);
      });
  }, [searchParams]);

  const [activeCardId, setActiveCardId] = useState<any>(null);
  const [showClosedAlert, setShowClosedAlert] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [searchPhone, setSearchPhone] = useState("");
  const [myReservation, setMyReservation] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [blockedDates, setBlockedDates] = useState<string[]>([]); 
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [resData, setResData] = useState({
    name: "",
    phone: "",
    lastname: "",
    date: new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    }),
    time: "21:00",
    guests: 2,
    notes: "",
  });

  console.log("Dato del botón:", restaurant.card_btn_text);
  const { cart, addToCart, updateQuantity, activeOrderId, setActiveOrderId } =
    useCart();
  const [showTracking, setShowTracking] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [currentExtras, setCurrentExtras] = useState<any[]>([]);
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [showHeroModal, setShowHeroModal] = useState(false);
  const [heroQty, setHeroQty] = useState(1);
  const [showBlockedModal, setShowBlockedModal] = useState(false); 
  const [variationsQuantities, setVariationsQuantities] = useState<{
    [key: number]: number;
  }>({});
  const [cardSelections, setCardSelections] = useState<{
    [key: string]: number | null;
  }>({});
  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);
  const validatePhone = async (phone: string) => {
    if (phone.length < 8) { // No buscamos si el número es muy corto
        setPhoneError(null);
        return;
    }

    const { data } = await supabase
      .from('reservations')
      .select('id')
      .eq('restaurant_id', restaurant.id)
      .eq('customer_phone', phone)
      .neq('status', 'cancelada') // Ignoramos si la reserva anterior fue cancelada
      .maybeSingle();

    if (data) {
      setPhoneError("⚠️ Ya tenés una reserva activa con este número.");
    } else {
      setPhoneError(null);
    }
  };
const handleSendReservation = async () => {
    const now = new Date();
    // 🕒 Obtenemos fecha y hora actual de Argentina para comparar
    const argDate = now.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
    const argTime = now.toLocaleTimeString("en-GB", { timeZone: "America/Argentina/Buenos_Aires", hour: '2-digit', minute: '2-digit' });

    // 🛡️ DEFINICIÓN DE BLOQUEO (Esto arregla el error de tu captura)
    const isDayBlocked = blockedDates.includes(resData.date);

    // 🛡️ ESCUDO 1: Bloqueo de día cerrado
    if (isDayBlocked) {
        setShowBlockedModal(true); // ✅ Abrimos tu nuevo modal
        return;
    }

    // 🛡️ ESCUDO 2: Bloqueo de hora pasada (solo si es para hoy)
    if (resData.date === argDate && resData.time <= argTime) {
        setShowBlockedModal(true); // ✅ Abrimos el modal también si la hora pasó
        return;
    }

    if (!resData.name || !resData.lastname || !resData.phone) {
        return alert("Por favor, completá nombre, apellido y WhatsApp.");
    }

    setIsSubmitting(true);

    try {
        // 🚀 VERIFICACIÓN DE ÚLTIMO SEGUNDO
        const { data: isStillBlocked } = await supabase
            .from('blocked_dates')
            .select('id')
            .eq('restaurant_id', restaurant.id)
            .eq('blocked_date', resData.date)
            .maybeSingle();

        if (isStillBlocked) {
            setIsSubmitting(false);
            setShowBlockedModal(true);
            return;
        }

        const { error } = await supabase.from('reservations').insert({
            restaurant_id: restaurant.id,
            customer_name: resData.name,
            customer_lastname: resData.lastname,
            customer_phone: resData.phone,
            reservation_date: resData.date,
            reservation_time: resData.time,
            guests: resData.guests,
            notes: resData.notes,
            status: 'pendiente'
        });

        if (error) throw error;

        setShowSuccessModal(true); 
        setShowReservationModal(false);
        setResData({ ...resData, name: '', lastname: '', phone: '', notes: '' });

    } catch (error: any) {
        alert("Error: " + error.message);
    } finally {
        setIsSubmitting(false);
    }
};
  const handleCheckReservation = async () => {
    if (!searchPhone) return alert("Ingresá tu número de WhatsApp");

    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("customer_phone", searchPhone)
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setMyReservation(data);
    } else {
      alert("No encontramos ninguna reserva con ese número.");
    }
  };

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

    window.addEventListener("beforeinstallprompt", handleAndroidPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleAndroidPrompt);
  }, []);
 
  useEffect(() => {
   
    window.onbeforeunload = () => {
      return "Tienes productos en el carrito, ¿seguro que quieres salir?";
    };

    return () => {
      window.onbeforeunload = null; 
    };
  }, []);

  useEffect(() => {
    const fetchBlocks = async () => {
      const { data } = await supabase
        .from('blocked_dates')
        .select('blocked_date')
        .eq('restaurant_id', restaurant.id);
      
      const blocks = data?.map(d => d.blocked_date) || [];
      setBlockedDates(blocks);

      
      const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
      if (blocks.includes(todayStr)) {
          setResData(prev => ({ ...prev, date: '' }));
      }
    };
    fetchBlocks();
  }, [restaurant.id]);

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
    // 1. Filtramos la categoría "General" si existe
    const cleanCats = rawCats.filter(
      (c: any) => c.name.toLowerCase() !== "general",
    );

    // 🚀 LA SOLUCIÓN: Si no hay categorías, mandamos una lista vacía
    // para que no aparezcan botones de ejemplo.
    const displayCats = cleanCats;
    switch (TEMPLATE) {
      case "urban":
        return (
          <UrbanoDark
            restaurant={restaurant}
            products={allProducts}
            categories={displayCats}
            fetchedExtras={restaurant.fetched_extras}
            isOpen={isOpen}
            mesaLabel={mesaLabel}
            onAddToCart={(product: any, qty: number) => {
              for (let i = 0; i < qty; i++) {
                addToCart(product);
              }
              mostrarAviso("✅ Producto agregado");
            }}
            isMockup={false}
            setShowInfo={setShowInfo}
          />
        );
      case "classic":
        return (
          <ClassicDelivery
            restaurant={restaurant}
            products={allProducts}
            categories={displayCats}
            fetchedExtras={restaurant.fetched_extras || []}
            isOpen={isOpen}
            mesaLabel={mesaLabel}
            onAddToCart={(product: any, qty: number = 1) => {
              for (let i = 0; i < qty; i++) {
                addToCart(product);
              }
              mostrarAviso("✅ Agregado");
            }}
            isMockup={false}
            setShowInfo={setShowInfo}
          />
        );
      case "minimal":
        return (
          <MinimalWhite
            restaurant={restaurant}
            products={allProducts}
            categories={displayCats}
            fetchedExtras={restaurant.fetched_extras || []}
            isOpen={isOpen}
            mesaLabel={mesaLabel}
            onAddToCart={(product: any, qty: number = 1) => {
              for (let i = 0; i < qty; i++) {
                addToCart(product);
              }
              mostrarAviso("✅ Agregado");
            }}
            isMockup={false}
            setShowInfo={setShowInfo}
          />
        );

      case "visualgrid":
        return (
          <VisualGrid
            restaurant={restaurant}
            products={allProducts}
            categories={displayCats}
            fetchedExtras={restaurant.fetched_extras}
            isOpen={isOpen}
            mesaLabel={mesaLabel}
            setShowInfo={setShowInfo}
            isMockup={false}
            onAddToCart={(product: any) => {
              const exists = cart.find(
                (item) => item.id === product.id && !item.parentId,
              );
              if (!exists || product.parentId) {
                addToCart(product);
              }
              mostrarAviso("✅ Pedido agregado");
            }}
          />
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
                {mesaLabel ? `📍 ${mesaLabel}` : isOpen ? "OPEN" : "CLOSED"}
              </div>
              <div
                className="w-16 h-16 rounded-full border-4 overflow-hidden flex-shrink-0 bg-white shadow-inner"
                style={{ borderColor: shadow }}
              >
                <img
                  src={getOptimizedImageUrl(LOGO, 150, 75) || ""}
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
                {cat.name.toLowerCase() !== "general" && cat.products?.length > 0 && (
                  <div className="pop-cat-title">{cat.name}</div>
                )}
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
  return (
    <SpotlightHero
      restaurant={restaurant}
      products={allProducts}
      categories={displayCats}
      fetchedExtras={restaurant.fetched_extras}
      onAddToCart={(product: any, qty: number) => {
        for (let i = 0; i < qty; i++) {
          addToCart(product);
        }
        mostrarAviso("✅ Producto agregado");
      }}
      isOpen={isOpen}
      mesaLabel={mesaLabel}
      setShowInfo={setShowInfo}
    />
  );;
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
                  border: `1px solid ${mesaLabel ? "#d97706" : isOpen ? THEME : "#cc0000"}`,
                  color: mesaLabel ? "#d97706" : isOpen ? THEME : "#cc0000",
                  backgroundColor: "transparent",
                  zIndex: 10,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {mesaLabel ? `📍 ${mesaLabel}` : isOpen ? "Abierto" : "Cerrado"}
              </div>

              {LOGO && <img src={getOptimizedImageUrl(LOGO, 150, 75)} className="elegant-logo" alt="logo" />}

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
                    color: mesaLabel ? "#d97706" : isOpen ? "#2ecc71" : "#e74c3c",
                    borderColor: mesaLabel ? "#d97706" : isOpen ? "#2ecc71" : "#e74c3c",
                    fontFamily: restaurant.title_font || "Patrick Hand",
                  }}
                >
                  {mesaLabel ? `📍 ${mesaLabel}` : isOpen ? "Abierto" : "Cerrado"}
                </div>
              </div>

              <div className="bistro-header">
                {LOGO && <img src={getOptimizedImageUrl(LOGO, 150, 75)} className="bistro-logo" alt="logo" />}
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
            mesaLabel={mesaLabel}
            setShowInfo={setShowInfo}
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
            isOpen={isOpen}
            mesaLabel={mesaLabel}
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
      isOpen={isOpen}
      mesaLabel={mesaLabel}
      onAddToCart={(product: any, qty: number) => {
        for (let i = 0; i < qty; i++) {
          addToCart(product);
        }
        mostrarAviso("✅ Producto agregado");
      }}
      isMockup={false}
      setShowInfo={setShowInfo}
    />
  );
      case "carta":
        return (
          <Carta
            restaurant={restaurant}
            products={allProducts}
            categories={displayCats}
            fetchedExtras={restaurant.fetched_extras || []}
            isOpen={isOpen}
            mesaLabel={mesaLabel}
            onAddToCart={(product: any, qty: number = 1) => {
              for (let i = 0; i < qty; i++) {
                addToCart(product);
              }
              mostrarAviso("✅ Agregado");
            }}
            isMockup={false}
            setShowInfo={setShowInfo}
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

        {/* 🚀 NOTIFICACIÓN PREMIUM CORREGIDA (Centrada y con Salida) */}
        {notificacion && (
          <div className="fixed top-8 inset-x-0 z-[10000] flex justify-center pointer-events-none px-4">
            <div className="bg-zinc-900/95 backdrop-blur-xl text-white px-6 py-3 rounded-full shadow-[0_15px_50px_rgba(0,0,0,0.5)] flex items-center gap-3 border border-white/10 animate-notification">
              <div className="bg-emerald-500 rounded-full p-1.5 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Check size={14} className="text-white" strokeWidth={4} />
              </div>
              <p className="font-black text-[11px] uppercase tracking-[0.15em] whitespace-nowrap italic pr-1">
                ¡Pedido agregado!
              </p>
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
            scheduled_delivery_enabled={restaurant.scheduled_delivery_enabled}
            scheduled_delivery_slots={restaurant.scheduled_delivery_slots}
            scheduled_delivery_config={restaurant.scheduled_delivery_config}
            isAdmin={false}
            tableIdFromQR={mesaId}
            mesaLabel={mesaLabel}
            currentShiftId={restaurant.current_shift_id ?? null}
            deliveryZonesEnabled={!!restaurant.delivery_zones_enabled}
            deliveryLat={restaurant.delivery_lat ?? null}
            deliveryLng={restaurant.delivery_lng ?? null}
            deliveryZone1Km={Number(restaurant.delivery_zone1_km) || 3}
            deliveryZone1Cost={Number(restaurant.delivery_zone1_cost) || 0}
            deliveryZone2Km={Number(restaurant.delivery_zone2_km) || 7}
            deliveryZone2Cost={Number(restaurant.delivery_zone2_cost) || 0}
          />
        </div>
        {showReservationModal && (
          <div className="fixed inset-0 z-[10001] bg-black/70 backdrop-blur-md flex items-end md:items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-t-[2.5rem] md:rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-6">
                <div className="text-left">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900">
                    Reservar Mesa
                  </h3>

                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                    Completá tus datos
                  </p>
                </div>

                <button
                  onClick={() => setShowReservationModal(false)}
                  className="p-2 bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

            <div className="space-y-4">
                {/* NOMBRE Y APELLIDO EN DOS COLUMNAS */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="text-left space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Nombre</label>
                        <input type="text" value={resData.name} onChange={(e)=>setResData({...resData, name: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-amber-500" placeholder="Ej: Juan" />
                    </div>
                    <div className="text-left space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Apellido</label>
                        <input type="text" value={resData.lastname} onChange={(e)=>setResData({...resData, lastname: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-amber-500" placeholder="Ej: Pérez" />
                    </div>
                </div>

                <div className="text-left space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">WhatsApp</label>
                    <input type="tel" value={resData.phone} onChange={(e) => {
            const val = e.target.value;
            setResData({...resData, phone: val});
            validatePhone(val); // 🚀 Validamos en tiempo real
        }}className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-amber-500" placeholder="Ej: 1123456789" />
        {phoneError && (
        <p className="text-[10px] font-bold text-red-500 ml-2 animate-pulse">
            {phoneError}
        </p>
    )}
                </div>

                {/* DÍA Y HORA */}
                <div className="grid grid-cols-2 gap-3">
             <div className="text-left space-y-1">
    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Día</label>
    <input 
        type="date" 
        value={resData.date} 
        onChange={(e) => {
            const chosen = e.target.value;
            if (blockedDates.includes(chosen)) {
                alert("🚫 Cupo lleno: No aceptamos más reservas para este día.");
                setResData({...resData, date: ''});
            } else {
                setResData({...resData, date: chosen});
            }
        }} 
        className={`w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-xs ${!resData.date && 'ring-2 ring-red-500'}`} 
    />
    {!resData.date && <p className="text-[9px] text-red-500 font-bold ml-2">Día no disponible o no seleccionado</p>}
</div>
                    <div className="text-left space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Hora</label>
                        <input type="time" value={resData.time} onChange={(e)=>setResData({...resData, time: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs" />
                    </div>
                </div>

                {/* NOTAS / DESCRIPCIÓN */}
                <div className="text-left space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">¿Alguna nota especial?</label>
                    <textarea value={resData.notes} onChange={(e)=>setResData({...resData, notes: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none h-20 resize-none focus:ring-2 ring-amber-500" placeholder="Ej: Cumpleaños, mesa cerca de la ventana..." />
                </div>



                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    ¿Cuántas personas?
                  </span>

                  <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                    <button
                      onClick={() =>
                        setResData({
                          ...resData,
                          guests: Math.max(1, resData.guests - 1),
                        })
                      }
                    >
                      <Minus size={18} className="text-red-500" />
                    </button>

                    <span className="font-black text-sm w-4 text-center">
                      {resData.guests}
                    </span>

                    <button
                      onClick={() =>
                        setResData({ ...resData, guests: resData.guests + 1 })
                      }
                    >
                      <Plus size={18} className="text-green-600" />
                    </button>
                  </div>
                </div>

               <button 
    onClick={handleSendReservation} 
    disabled={isSubmitting || !!phoneError} // 🚀 Si hay error, el botón se bloquea
    className="w-full py-5 bg-amber-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 disabled:opacity-50 disabled:grayscale"
>
    {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : 'Enviar Solicitud'}
</button>
              </div>
            </div>
          </div>
        )}
        {/* 🎫 MODAL: CONSULTAR MI RESERVA */}
        {showCheckModal && (
          <div className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[#18181b] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative text-center animate-in zoom-in-95">
              <button
                onClick={() => {
                  setShowCheckModal(false);
                  setMyReservation(null);
                }}
                className="absolute top-5 right-5 text-gray-500 p-2"
              >
                <X size={20} />
              </button>

              {!myReservation ? (
                <div className="space-y-6">
                  <div className="text-left">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">
                      Mi Reserva
                    </h3>
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">
                      Ingresá tu número para ver el estado
                    </p>
                  </div>
                  <input
                    type="tel"
                    placeholder="WhatsApp (Ej: 1123456789)"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 ring-amber-500 font-bold"
                  />
                  <button
                    onClick={handleCheckReservation}
                    className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                  >
                    Buscar Reserva
                  </button>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                    {myReservation.status === "confirmada" ? (
                      <CheckCircle2 className="text-emerald-500" size={40} />
                    ) : (
                      <Clock className="text-amber-500" size={40} />
                    )}
                  </div>

                  <div>
                    <h4 className="text-white font-black uppercase text-lg leading-none">
                      Hola, {myReservation.customer_name}
                    </h4>
                    <p className="text-gray-400 text-[10px] mt-2 font-bold uppercase tracking-widest">
                      Reserva:{" "}
                      {myReservation.reservation_date
                        .split("-")
                        .reverse()
                        .join("/")}{" "}
                      a las {myReservation.reservation_time.slice(0, 5)} hs
                    </p>
                  </div>

                  <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
                    <p className="text-xs font-black text-white uppercase tracking-widest">
                      Estado:
                      {myReservation.status === "pendiente" && (
                        <span className="text-amber-500 ml-2">
                          ⏳ PENDIENTE
                        </span>
                      )}
                      {myReservation.status === "confirmada" && (
                        <span className="text-emerald-500 ml-2">
                          ✅ CONFIRMADA
                        </span>
                      )}
                      {myReservation.status === "suspendida" && (
                        <span className="text-orange-500 ml-2">
                          ⚠️ SUSPENDIDA
                        </span>
                      )}
                      {myReservation.status === "programada" && (
                        <span className="text-fresco ml-2">
                          📅 REPROGRAMADA
                        </span>
                      )}
                      {myReservation.status === "cancelada" && (
                        <span className="text-red-500 ml-2">❌ CANCELADA</span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-300 mt-4 leading-relaxed font-medium">
                      {myReservation.status === "programada" ? (
                        <>
                          <span className="text-blue-400 font-black">
                            ¡Atención!
                          </span>{" "}
                          El local movió tu reserva para el día{" "}
                          <span className="text-white font-black">
                            {myReservation.reservation_date
                              .split("-")
                              .reverse()
                              .join("/")}
                          </span>{" "}
                          a las{" "}
                          <span className="text-white font-black">
                            {myReservation.reservation_time.slice(0, 5)} hs
                          </span>
                          .
                        </>
                      ) : myReservation.status === "suspendida" ? (
                        "Tu reserva se encuentra suspendida temporalmente por factores climáticos o fuerza mayor. El local se contactará con vos."
                      ) : (
                        "Tu reserva se encuentra " +
                        myReservation.status +
                        " para el día " +
                        myReservation.reservation_date
                          .split("-")
                          .reverse()
                          .join("/") +
                        "."
                      )}
                    </p>

                    {/* Mensajes extra según el estado */}
                    <p className="text-[10px] text-gray-400 mt-4 leading-relaxed italic">
                      {myReservation.status === "pendiente" &&
                        "Estamos revisando tu solicitud. Te avisaremos pronto."}
                      {myReservation.status === "confirmada" &&
                        "¡Todo listo! Te esperamos en el horario pactado."}
                      {myReservation.status === "suspendida" &&
                        "Por lluvia o fuerza mayor se suspendió. Nos contactaremos con vos."}
                      {myReservation.status === "programada" &&
                        "Tu reserva fue movida. Revisá el horario arriba."}
                      {myReservation.status === "cancelada" &&
                        "Esta reserva ya no es válida."}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowCheckModal(false);
                      setMyReservation(null);
                    }}
                    className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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
              style={{ backgroundImage: `url('${getOptimizedImageUrl(BANNER || LOGO, 800, 75)}')` }}
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
              <p className="text-[10px] font-black text-fresco uppercase tracking-[0.2em] mb-4">
                Elegí las cantidades:
              </p>

              {selectedProduct.variations?.map((v: any, idx: number) => {
                const qty = variationsQuantities[idx] || 0;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-[2rem] border-2 transition-all ${qty > 0 ? "border-fresco bg-[#F0FAF6]/50" : "border-gray-100 bg-gray-50"}`}
                  >
                    <div className="flex flex-col text-left">
                      <span
                        className={`font-black text-sm uppercase ${qty > 0 ? "text-indigo-900" : "text-gray-500"}`}
                      >
                        {v.label}
                      </span>
                      <span
                        className={`font-bold text-xs ${qty > 0 ? "text-fresco" : "text-gray-400"}`}
                      >
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
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-lg transition-colors ${qty > 0 ? "text-fresco bg-[#F0FAF6]" : "text-gray-300 cursor-not-allowed"}`}
                      >
                        -
                      </button>
                      <span
                        className={`font-black text-sm w-4 text-center ${qty > 0 ? "text-gray-900" : "text-gray-300"}`}
                      >
                        {qty}
                      </span>
                      <button
                        onClick={() =>
                          setVariationsQuantities({
                            ...variationsQuantities,
                            [idx]: qty + 1,
                          })
                        }
                        className="w-8 h-8 rounded-full bg-fresco text-white flex items-center justify-center font-black text-lg shadow-md active:scale-90"
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
                const extrasDisponibles =
                  restaurant.fetched_extras?.filter((ex: any) =>
                    ex.product_extras?.some(
                      (re: any) =>
                        String(re.product_id) === String(selectedProduct.id),
                    ),
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
                        const isSelected = selectedExtras.some(
                          (s) => s.id === ex.id,
                        );
                        const hasMainQty = Object.values(
                          variationsQuantities,
                        ).some((q) => q > 0);

                        return (
                          <button
                            key={ex.id}
                            type="button"
                            disabled={!hasMainQty}
                            onClick={() =>
                              setSelectedExtras((prev) =>
                                isSelected
                                  ? prev.filter((s) => s.id !== ex.id)
                                  : [...prev, ex],
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
                                  isSelected
                                    ? "bg-emerald-500 border-emerald-500"
                                    : "border-gray-200"
                                }`}
                              >
                                {isSelected && (
                                  <Check
                                    size={10}
                                    className="text-white"
                                    strokeWidth={4}
                                  />
                                )}
                              </div>
                              <span
                                className={`text-[10px] font-black uppercase ${isSelected ? "text-emerald-900" : "text-gray-400"}`}
                              >
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
                disabled={Object.values(variationsQuantities).every(
                  (q) => q === 0,
                )}
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
                  Object.entries(variationsQuantities).reduce(
                    (acc, [idx, qty]) => {
                      return (
                        acc +
                        Number(selectedProduct.variations[Number(idx)].price) *
                          qty
                      );
                    },
                    0,
                  ) +
                    selectedExtras.reduce((acc, e) => acc + Number(e.price), 0),
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

     
      {/* --- MODAL DE INFO GLOBAL (DISEÑO PREMIUM MAESTRO) --- */}
      {showInfo && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 text-center">
            <button
              onClick={() => setShowInfo(false)}
              className="absolute top-5 right-5 text-gray-400 p-2"
            >
              <X size={20} />
            </button>

            <div className="flex items-center justify-center gap-2 mb-8">
              <Store size={20} className="text-white opacity-60" />
              <h3 className="text-base font-black uppercase italic tracking-tighter text-white">
                Información del Local
              </h3>
            </div>

            <div className="space-y-6 text-left mb-8">
              {/* UBICACIÓN: Link real a Google Maps */}
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-2xl flex-shrink-0 bg-white/5 text-white/50 border border-white/5">
                  <MapPin size={18} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-white/20">
                    Ubicación
                  </p>
                  {restaurant.google_maps_link ? (
                    <a
                      href={restaurant.google_maps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-gray-200 underline decoration-white/20 hover:text-white transition-colors flex items-center gap-1"
                    >
                      {restaurant.address || "Ver en mapa"}{" "}
                      <ExternalLink size={10} className="opacity-30" />
                    </a>
                  ) : (
                    <p className="text-xs font-bold text-gray-200">
                      {restaurant.address || "No especificada"}
                    </p>
                  )}
                </div>
              </div>

              {/* HORARIOS */}
              {restaurant.opening_hours && (
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-2xl flex-shrink-0 bg-white/5 text-white/50 border border-white/5">
                    <Clock size={18} strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-white/20">
                      Horarios
                    </p>
                    <p className="text-xs font-bold text-gray-200 whitespace-pre-line leading-tight">
                      {restaurant.opening_hours}
                    </p>
                  </div>
                </div>
              )}

              {restaurant.reservations_enabled && (
                <div className="space-y-3 pt-6 border-t border-white/5 mt-6">
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">
                    ¿Querés venir al local?
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setShowInfo(false);
                        setShowReservationModal(true);
                      }}
                      className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                      <CalendarIcon size={16} strokeWidth={3} /> Reservar Mesa
                    </button>
                    <button
                      onClick={() => {
                        setShowInfo(false);
                        setShowCheckModal(true);
                      }}
                      className="w-full py-3 bg-white/5 text-gray-300 border border-white/10 rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Eye size={14} /> Ver mi reserva
                    </button>
                  </div>
                </div>
              )}

            {/* REDES SOCIALES: Lógica inteligente para links o nombres de usuario */}
<div className="flex justify-center gap-6 pt-8 border-t border-white/5">
  {restaurant.instagram && (
    <a
      href={
        restaurant.instagram.startsWith("http")
          ? restaurant.instagram
          : restaurant.instagram.includes(".")
            ? `https://${restaurant.instagram.replace("https://", "")}`
            : `https://instagram.com/${restaurant.instagram.replace("@", "")}`
      }
      target="_blank"
      className="text-white opacity-60 hover:opacity-100 hover:scale-110 transition-all"
    >
      <Instagram size={24} strokeWidth={1.5} />
    </a>
  )}
  
  {restaurant.facebook && (
    <a
      href={
        restaurant.facebook.startsWith("http")
          ? restaurant.facebook
          : restaurant.facebook.includes(".") // 🚀 FIX: Si puso un link como google.com
            ? `https://${restaurant.facebook.replace("https://", "")}`
            : `https://facebook.com/${restaurant.facebook}`
      }
      target="_blank"
      className="text-white opacity-60 hover:opacity-100 hover:scale-110 transition-all"
    >
      <Facebook size={24} strokeWidth={1.5} />
    </a>
  )}
  
  {restaurant.tiktok && (
    <a
      href={
        restaurant.tiktok.startsWith("http")
          ? restaurant.tiktok
          : restaurant.tiktok.includes(".") // 🚀 FIX: Si puso un link externo
            ? `https://${restaurant.tiktok.replace("https://", "")}`
            : `https://tiktok.com/@${restaurant.tiktok.replace("@", "")}`
      }
      target="_blank"
      className="text-white opacity-60 hover:opacity-100 hover:scale-110 transition-all"
    >
      <Music2 size={24} strokeWidth={1.5} />
    </a>
  )}
</div>
            </div>

            <button
              onClick={() => setShowInfo(false)}
              className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
     {showSuccessModal && (
      <div className="fixed inset-0 z-[10002] bg-zinc-900/90 backdrop-blur-md flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} strokeWidth={3} />
          </div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">
            ¡Solicitud Enviada!
          </h3>
          <p className="text-gray-500 text-[11px] font-bold mt-4 leading-relaxed uppercase tracking-widest text-center">
            Tu reserva está siendo procesada. <br /> 
            <span className="text-emerald-600">¡Te avisaremos pronto!</span>
          </p>
          <button 
            onClick={() => setShowSuccessModal(false)}
            className="mt-8 w-full py-5 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
          >
            Entendido, gracias
          </button>
        </div>
      </div>
    )}
    {/* 🚫 MODAL: CUPO LLENO / DISPONIBILIDAD (DISEÑO PREMIUM) */}
    {showBlockedModal && (
      <div className="fixed inset-0 z-[10003] bg-zinc-900/90 backdrop-blur-md flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center animate-in zoom-in-95 duration-300 border-4 border-red-50">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <XCircle size={48} strokeWidth={3} />
          </div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">
            Sin Disponibilidad
          </h3>
          <p className="text-gray-500 text-[11px] font-bold mt-4 leading-relaxed uppercase tracking-widest text-center">
            Lo sentimos, el local ya <span className="text-red-500">no acepta más reservas</span> para el horario o día seleccionado. 
            <br /><br />
            Por favor, <span className="text-gray-900">elegí otra fecha</span> para que podamos recibirte.
          </p>
          <button 
            onClick={() => setShowBlockedModal(false)}
            className="mt-8 w-full py-5 bg-red-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
          >
            Elegir otro día
          </button>
        </div>
      </div>
    )}
    </main>
  );
}
function BioContent({ restaurant }: { restaurant: any }) {
  // 🛡️ LÓGICA DE LÍMITES PARA EL LINK PÚBLICO
  const plan = restaurant.subscription_plan?.toLowerCase() || 'light';
  const limit = plan === 'light' ? 2 : plan === 'go' ? 4 : 100;
  
  // Recortamos la lista para que el cliente solo vea lo que el plan permite
  const visibleLinks = (restaurant.snappylink_links || []).slice(0, limit);

  // Creamos un objeto de datos filtrado para la plantilla
  const filteredData = {
    ...restaurant,
    snappylink_links: visibleLinks
  };

  const mainStyle = {
    backgroundColor: restaurant.snappylink_bg_color || "#ffffff",
    backgroundImage: restaurant.snappylink_bg_img
      ? `url(${restaurant.snappylink_bg_img})`
      : "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  const displayTitle = restaurant.snappylink_title || restaurant.name;

  return (
    <main className="min-h-screen flex flex-col" style={mainStyle}>
      <div className="max-w-[500px] mx-auto w-full flex-1 flex flex-col items-center pt-16 px-6 relative z-10">
        
        {/* HEADER (Logo) */}
        <div
          className="w-24 h-24 rounded-full border-4 shadow-xl overflow-hidden mb-6"
          style={{
            borderColor:
              restaurant.snappylink_btn_color || restaurant.theme_color,
          }}
        >
          <img
            src={
              getOptimizedImageUrl(
                restaurant.snappylink_logo_url || restaurant.logo_url || "/placeholder.png",
                150,
                75
              ) as string
            }
            className="w-full h-full object-cover"
            alt="logo"
          />
        </div>

        {/* TEXTOS (Título y Bio) */}
        <div className="text-center space-y-2 mb-10">
          <h1
            className="font-black text-2xl uppercase italic tracking-tighter leading-none"
            style={{ color: restaurant.snappylink_title_color || "#000000" }}
          >
            {displayTitle}
          </h1>
          <p
            className="text-xs font-medium max-w-xs"
            style={{ color: restaurant.snappylink_desc_color || "#666666" }}
          >
            {restaurant.snappylink_bio}
          </p>
        </div>

        {/* DISEÑO DINÁMICO (Ahora con links filtrados) */}
        <div className="w-full">
          <BioModern data={filteredData} /> 
        </div>

        {/* FOOTER */}
        <div className="mt-auto py-10">
          <a
            href="https://snappy.uno"
            target="_blank"
            className="no-underline opacity-30 hover:opacity-100 transition-opacity"
          >
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
              Potenciado por{" "}
              <Zap size={12} className="fill-yellow-400 text-yellow-400" />{" "}
              Snappy
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
// ─── EXPORT DEFAULT MenuPage — REEMPLAZÁ COMPLETO ────────────────────────────
// Solo cambia el bloque de lógica de suspensión. Todo lo demás igual.

const ADMIN_EMAILS = ['luchiimee2@gmail.com', 'snappyuno25@gmail.com'];

export default function MenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-black" size={40} />
      </div>
    );

  if (!restaurant) return notFound();

  // ✅ ADMIN IMMUNITY: se basa en el DUEÑO del restaurante, no en el visitante.
  // Funciona en incógnito, celular, cualquier dispositivo — no requiere sesión activa.
  const ownerEmail = restaurant.owner_email || '';
  const isAdminRestaurant = ADMIN_EMAILS.includes(ownerEmail);

  // Calculamos si el trial expiró
  const trialStart = restaurant.trial_start_date
    ? new Date(restaurant.trial_start_date)
    : new Date(restaurant.created_at);
  const today = new Date();
  const diffDays = Math.floor(
    (today.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const trialExpired = restaurant.subscription_status === 'trialing' && diffDays >= 14;

  // Ventana de gracia: si existe y es futura, el menú público nunca se bloquea
  const inGracePeriod = !!(
    restaurant.grace_period_until &&
    new Date(restaurant.grace_period_until) > new Date()
  );

  // Si el restaurante es de un admin O está en gracia → NUNCA se bloquea
  const isSuspended = !isAdminRestaurant && !inGracePeriod && (
    restaurant.subscription_status === 'cancelled' ||
    restaurant.subscription_status === 'paused' ||
    trialExpired
  );

  // Pantalla para clientes cuando el servicio está pausado
  if (isSuspended) {
    return (
      <div className="h-screen w-full bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-3xl flex items-center justify-center mb-6">
          <AlertCircle size={40} />
        </div>
        <h1 className="text-xl font-black uppercase italic tracking-tighter text-gray-900">
          Servicio Pausado
        </h1>
        <p className="text-gray-500 text-sm mt-2 max-w-xs font-medium leading-relaxed">
          Este menú no está recibiendo pedidos por el momento.{' '}
          <br /> Por favor, vuelve a intentarlo más tarde.
        </p>
        <Link
          href="https://snappy.uno"
          target="_blank"
          className="mt-20 flex items-center gap-1 no-underline"
        >
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            Potenciado por
          </span>
          <Zap size={12} className="fill-yellow-400 text-yellow-400 mx-1" />
          <span className="text-[10px] font-black text-black uppercase tracking-[0.2em]">
            Snappy
          </span>
        </Link>
      </div>
    );
  }

  // Bio
  if (restaurant.page_type === 'bio') {
    if (restaurant.is_bio_active === false) return notFound();
    return <BioContent restaurant={restaurant} />;
  }

  // Menú normal
  return (
    <CartProvider>
      <MenuContent
        restaurant={restaurant}
        isOpen={
          restaurant.always_open ||
          (restaurant.is_open && checkIsOpen(restaurant.business_hours))
        }
      />
    </CartProvider>
  );
}