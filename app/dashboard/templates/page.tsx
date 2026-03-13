'use client';

import { useState, useEffect, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, Lock, Check, Crown, Coffee, Utensils, Search, ShoppingBag, Zap, X,RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

// --- 1. AGREGAMOS ESTO: COLORES POR DEFECTO PARA EL RESET ---
const TEMPLATE_DEFAULTS: any = {
classic: { 
    theme: '#d32f2f', 
    bg: '#ffffff', 
    card: '#ffffff', 
    text: '#ffffff', 
    desc: '#ffffff', 
    card_name: '#000000',
    card_desc: '#666666',
    card_price: '#d32f2f',
    btn_bg: '#ffffff',
    btn_text: '#000000',
    promo: '#ffebee', 
    promo_text: '#d32f2f',
    banner: false 
  },
 
  urban: { 
    theme: '#ea580c', 
    bg: '#121212', 
    card: '#1E1E1E', 
    text: '#ffffff', 
    desc: '#888888', 
    card_name: '#ffffff',
    card_desc: '#888888',
    card_price: '#ea580c',
    btn_bg: '#ffffff',
    btn_text: '#121212',
    promo: '#1E1E1E', 
    promo_text: '#ffffff',
    banner: false 
  },

minimal: { 
    theme: '#000000', 
    bg: '#ffffff', 
    card: '#ffffff', 
    text: '#111111', 
    desc: '#777777', 
    card_name: '#111111',
    card_desc: '#999999',
    card_price: '#111111',
    btn_bg: '#111111',
    btn_text: '#ffffff',
    promo: '#fafafa', 
    promo_text: '#111111',
    banner: false 
},
visualgrid: { 
    theme: '#ea580c', 
    bg: '#1a1a1a', 
    card: '#2a2a2a', 
    text: '#ffffff', 
    desc: '#bbbbbb', 
    card_name: '#ffffff',
    card_desc: '#bbbbbb',
    card_price: '#ea580c',
    btn_bg: '#ea580c',
    btn_text: '#ffffff',
    promo: '#1a1a1a', 
    promo_text: '#ea580c',
    banner: false 
  },
pop: { 
    theme: '#FF1493',      // El rosa de las sombras y nombres
    bg: '#fffbe6',         // Fondo crema de la web
    card: '#ffffff',       // Fondo blanco de las tarjetas
    text: '#000000',       // Color de los bordes y nombre local
    desc: '#444444',       // Descripción local
    card_name: '#FF1493',  // Nombre del producto en rosa
    card_desc: '#444444', 
    card_price: '#000000', // Fondo negro de la etiqueta de precio
    card_shadow_color: '#000000', // Bordes negros rígidos
    btn_bg: '#ffffff',     // Fondo del botón agregar
    btn_text: '#FF1493',   // Texto del botón agregar
    promo: '#FFD700',      // Fondo amarillo de la promo
    promo_text: '#000000', // Texto negro de la promo
    banner: false 
  },
  spotlight: { 
    theme: '#FFD700',      // Dorado para acentos
    bg: '#ffffff', 
    card: '#ffffff', 
    text: '#000000', 
    desc: '#666666', 
    card_name: '#000000', 
    card_desc: '#666666', 
    card_price: '#000000', 
    btn_bg: '#000000',     // Botones negros
    btn_text: '#ffffff', 
    promo: '#fff3e0',      // Fondo naranja muy suave para promo
    promo_text: '#000000',
    banner: true,
    // --- NUEVOS CAMPOS HERO ---
    hero_badge_bg: '#FFD700',
    hero_badge_color: '#000000',
    hero_title_color: '#ffffff',
    hero_price_color: '#FFD700'
  },
  'icecream-v1': { 
    theme: '#00bcd4', 
    bg: '#f0faff', 
    card: '#ffffff', 
    text: '#000000', 
    desc: '#666666', 
    promo: '#e0f7fa', 
    banner: true 
  },
 'alterna-pro': { 
    theme: '#ea580c', 
    bg: '#fafaf9',  // <--- CAMBIADO DE NEGRO A CREMA
    card: '#ffffff', 
    text: '#111827', 
    desc: '#94a3b8', 
    promo: '#ffffff', 
    banner: false 
}
};

// --- CSS IDÉNTICO A TU HTML DE REFERENCIA ---
const GALLERY_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700&family=Patrick+Hand&family=Lato:wght@400;700;900&display=swap');

  :root {
      --primary: #FF4500;
      --border-color: #e5e7eb;
      --text-dark: #1a1a1a;
      --text-gray: #666666;
  }

  /* 1. GRID COMPACTO (4 por fila) */
  .templates-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(205px, 1fr)); 
      gap: 1.5rem; 
      padding-bottom: 2rem; 
  }

  /* TARJETA */
  .template-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-color);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
  }
  .template-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.08);
      border-color: var(--text-dark);
  }
  .template-card.active-card {
      border: 2px solid #000;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
  }

  /* BADGES */
  .tags-container { position: absolute; top: 10px; left: 10px; z-index: 10; display: flex; gap: 4px; }
  .tag { padding: 3px 8px; border-radius: 20px; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; }
  .tag.new { background: #22c55e; color: white; }
  .tag.premium { background: #1a1a1a; color: #ffd700; border: 1px solid #ffd700; }
  
  .badge-selected { 
      position: absolute; top: 10px; right: 10px; 
      background: #000; color: white; 
      padding: 4px 8px; border-radius: 20px; 
      font-size: 0.65rem; font-weight: 600; z-index: 10; 
      display: flex; align-items: center; gap: 4px; 
      box-shadow: 0 2px 5px rgba(0,0,0,0.2); 
  }

  /* 2. CELULAR (PREVIEW) */
  .phone-preview {
      height: 330px; 
      background: #f3f4f6;
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid var(--border-color);
      display: flex; justify-content: center; align-items: flex-start;
      padding-top: 25px; /* Espacio para que la hora no tape el diseño */
  }
  
  .preview-content {
      width: 100%; height: 100%;
      background: white; 
      overflow: hidden; 
      position: relative;
      display: flex; 
      flex-direction: column; 
  }
  
  .status-bar-fake { 
      position: absolute; top: 0; left: 0; width: 100%; height: 25px; 
      display: flex; justify-content: space-between; padding: 0 10px; 
      align-items: center; font-size: 9px; font-weight: bold; z-index: 20;
      margin-top: -25px; /* Sube al padding del padre */
  }

  /* INFO FOOTER */
  .card-info { padding: 1rem; flex: 1; display: flex; flex-direction: column; background: white; position: relative; z-index: 2; }
  .card-title { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.2rem; display: flex; justify-content: space-between; align-items: center; color: var(--text-dark); }
  .card-desc { font-size: 0.75rem; color: var(--text-gray); margin-bottom: 0.8rem; line-height: 1.3; flex: 1; }

  .btn-select {
      width: 100%; padding: 8px; border: none; border-radius: 6px;
      background: #000; color: white; font-weight: 600; font-size: 0.8rem;
      cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 5px;
  }
  .btn-select:hover { background: #333; }
  .btn-select:disabled { background: #e5e7eb; color: #9ca3af; cursor: default; }
  .btn-select.locked-btn { background: #333; }

  .btn-personalize { display: block; text-align: center; margin-top: 8px; font-size: 0.7rem; font-weight: 700; color: #2563eb; text-decoration: none; }
  .btn-personalize:hover { text-decoration: underline; }

  /* --- ESTILOS DE TUS PLANTILLAS (EXACTOS) --- */

  /* URBANO DARK */
  .urbano-dark { background: #121212; color: white; padding: 12px; font-family: 'Inter', sans-serif; height: 100%; display: flex; flex-direction: column; }
  .urbano-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .urbano-brand { display: flex; gap: 8px; align-items: center; }
  .urbano-logo { width: 32px; height: 32px; background: #333; border-radius: 50%; border: 2px solid white; background-size: cover; background-position: center; }
  .urbano-names h4 { font-size: 12px; font-weight: 800; margin: 0; line-height: 1.1; }
  .urbano-names span { font-size: 8px; color: #aaa; }
  .urbano-status { background: #22c55e; color: #000; font-size: 7px; font-weight: 800; padding: 2px 5px; border-radius: 12px; }
  .urbano-msg { background: #1E1E1E; padding: 6px; border-radius: 6px; font-size: 8px; color: #ddd; margin-bottom: 12px; border-left: 3px solid #ea580c; }
  .urbano-item { background: #1E1E1E; padding: 8px; border-radius: 10px; display: flex; gap: 8px; margin-bottom: 8px; position: relative; }
  .urbano-img { width: 50px; height: 50px; background-size: cover; border-radius: 6px; background-position: center; flex-shrink: 0; }
  .urbano-info { flex: 1; padding-right: 15px; }
  .urbano-tit { font-weight: 700; font-size: 10px; margin-bottom: 2px; }
  .urbano-desc { font-size: 7px; color: #888; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .urbano-price { color: #ea580c; font-weight: 800; font-size: 10px; margin-top: 2px; }
  .urbano-add-btn { position: absolute; bottom: 6px; right: 6px; width: 18px; height: 18px; background: white; color: black; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: none; font-size: 12px; }

  /* VISUAL GRID (CON HOVER) */
  .sushi-visual { background: #1a1a1a; color: white; padding: 12px; font-family: 'Inter', sans-serif; height: 100%; display: flex; flex-direction: column; }
  .sushi-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .sushi-brand { display: flex; align-items: center; gap: 8px; }
  .sushi-logo { width: 30px; height: 30px; border-radius: 50%; background-size: cover; border: 2px solid #ea580c; flex-shrink: 0; }
  .sushi-name { font-size: 11px; font-weight: 800; line-height: 1.2; }
  .sushi-desc-local { font-size: 7px; color: #bbb; }
  .sushi-status { font-size: 6px; font-weight: bold; background: #22c55e; color: black; padding: 2px 4px; border-radius: 4px; }
  .sushi-msg { font-size: 8px; color: #ccc; margin-bottom: 10px; border-left: 2px solid #ea580c; padding-left: 6px; }
  .sushi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; flex: 1; overflow-y: auto; padding-bottom: 10px; }
  .sushi-item { height: 110px; border-radius: 8px; position: relative; overflow: hidden; background-size: cover; background-position: center; cursor: pointer; }
  .sushi-overlay { 
      position: absolute; bottom: 0; left: 0; width: 100%; height: 40%; 
      background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); 
      padding: 6px; display: flex; flex-direction: column; justify-content: flex-end;
      transition: all 0.3s ease;
  }
  .sushi-title { font-weight: bold; font-size: 9px; text-shadow: 0 1px 2px black; }
  .sushi-price { color: #ea580c; font-size: 9px; font-weight: bold; text-shadow: 0 1px 2px black; }
  /* HOVER EFFECTS */
  .sushi-desc { font-size: 8px; color: #ddd; margin: 4px 0; display: none; text-align: center; }
  .sushi-btn { background: #ea580c; color: white; border: none; padding: 3px 8px; border-radius: 10px; font-size: 7px; font-weight: bold; margin-top: 3px; display: none; }
  .sushi-item:hover .sushi-overlay { height: 100%; background: rgba(0,0,0,0.85); justify-content: center; align-items: center; }
  .sushi-item:hover .sushi-desc { display: block; }
  .sushi-item:hover .sushi-btn { display: block; }

  /* CLASSIC */
  .classic-del { background: white; font-family: Arial, sans-serif; height: 100%; display: flex; flex-direction: column; }
  .classic-header { background: #d32f2f; padding: 12px; color: white; text-align: center; position: relative; }
  .classic-logo { width: 26px; height: 26px; background: white; border-radius: 50%; color: #d32f2f; display: grid; place-items: center; font-size: 9px; margin: 0 auto 4px; font-weight: bold; }
  .classic-title { font-size: 11px; font-weight: bold; }
  .classic-status { position: absolute; top: 8px; right: 8px; background: white; color: #d32f2f; font-size: 6px; padding: 1px 3px; border-radius: 2px; font-weight: bold; }
  .classic-msg { background: #ffebee; color: #b71c1c; font-size: 8px; padding: 5px; text-align: center; border-bottom: 1px solid #ffcdd2; }
  .classic-list { padding: 8px; flex: 1; overflow-y: auto; }
  .classic-item { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 6px 0; align-items: center; }
  .classic-info { flex: 1; }
  .classic-prod { font-weight: bold; font-size: 10px; color: #333; }
  .classic-desc { font-size: 8px; color: #777; }
  .classic-price { font-weight: bold; font-size: 10px; color: #d32f2f; margin-right: 6px; }
  .classic-btn { width: 18px; height: 18px; border: 1px solid #ddd; background: white; color: #555; display: flex; align-items: center; justify-content: center; font-size: 10px; border-radius: 3px; }

  /* MINIMAL */
  .minimal-white { background: white; padding: 15px 10px; text-align: center; font-family: 'Lato', sans-serif; color: #222; height: 100%; display: flex; flex-direction: column; }
  .minimal-header { margin-bottom: 15px; }
  .minimal-logo { width: 34px; height: 34px; background: #111; color: white; border-radius: 50%; margin: 0 auto 6px; display: grid; place-items: center; }
  .minimal-title { font-weight: 900; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
  .minimal-status { position: absolute; top: 12px; right: 12px; font-size: 6px; font-weight: bold; text-transform: uppercase; border: 1px solid #222; padding: 1px 3px; border-radius: 2px; }
  .minimal-msg { border: 1px solid #eee; background: #fafafa; padding: 6px; font-size: 7px; margin: 10px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
  .minimal-list { text-align: left; flex: 1; overflow-y: auto; }
  .minimal-item { padding: 8px 0; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; }
  .minimal-prod { font-weight: 700; font-size: 10px; }
  .minimal-desc { font-size: 7px; color: #999; margin-top: 1px; }
  .minimal-price { font-weight: 900; font-size: 9px; }
  .minimal-btn { width: 16px; height: 16px; background: #222; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; border: none; }

  /* POP VIBRANT */
  .pop-vibrant { background: #fffbe6; padding: 12px; font-family: 'Inter', sans-serif; height: 100%; display: flex; flex-direction: column; }
  .pop-header { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; background: #fff; border: 2px solid #000; padding: 6px; border-radius: 8px; box-shadow: 3px 3px 0 #000; position: relative; }
  .pop-logo { width: 30px; height: 30px; background: #FF1493; border: 2px solid #000; border-radius: 50%; display: grid; place-items: center; font-weight: 900; color: white; font-size: 7px; }
  .pop-title { font-weight: 900; font-size: 11px; text-transform: uppercase; color: #000; line-height: 1; }
  .pop-status { background: #00CED1; color: black; border: 2px solid #000; font-size: 6px; font-weight: 900; padding: 1px 4px; transform: rotate(-5deg); position: absolute; top: -6px; right: -4px; }
  .pop-msg { background: #FFD700; border: 2px solid #000; padding: 5px; margin-bottom: 12px; font-weight: 700; font-size: 8px; text-align: center; box-shadow: 2px 2px 0 rgba(0,0,0,0.2); transform: rotate(1deg); }
  .pop-list { flex: 1; overflow-y: auto; padding: 2px; }
  .pop-item { background: white; border: 2px solid #000; border-radius: 8px; padding: 8px; margin-bottom: 8px; box-shadow: 2px 2px 0 #FF1493; }
  .pop-item-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3px; }
  .pop-prod { font-weight: 900; font-size: 10px; text-transform: uppercase; color: #FF1493; }
  .pop-price { background: #000; color: #fff; padding: 1px 5px; font-size: 8px; font-weight: 700; border-radius: 3px; transform: rotate(2deg); }
  .pop-desc { font-size: 8px; color: #444; line-height: 1.1; margin-bottom: 6px; }
  .pop-btn { width: 100%; background: #fff; border: 2px solid #000; padding: 3px; border-radius: 20px; font-weight: 900; font-size: 7px; text-transform: uppercase; text-align: center; }

  /* SPOTLIGHT */
  .spot-hero { background: white; font-family: 'Inter', sans-serif; height: 100%; display: flex; flex-direction: column; text-align: left; }
  
  /* Header con Status Pill */
  .spot-header-mini { padding: 8px 10px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f8f8f8; }
  .spot-logo-mini { width: 22px; height: 22px; background: #000; border-radius: 50%; display: grid; place-items: center; color: white; font-size: 7px; font-weight: bold; background-size: cover; }
  .spot-status-mini { background: #22c55e; color: white; font-size: 6px; font-weight: 800; padding: 2px 5px; border-radius: 10px; }
  
  /* Banner con Botón + */
  .spot-banner-mini { height: 130px; background-size: cover; background-position: center; position: relative; display: flex; flex-direction: column; justify-content: flex-end; padding: 12px; }
  .spot-overlay-mini { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.85), transparent 70%); }
  .spot-info-mini { position: relative; z-index: 2; color: white; }
  .spot-badge-mini { background: #FFD700; color: black; padding: 2px 5px; font-size: 6px; font-weight: 900; border-radius: 4px; display: inline-block; margin-bottom: 3px; text-transform: uppercase; }
  .spot-title-mini { font-size: 14px; font-weight: 900; line-height: 1; text-transform: uppercase; font-style: italic; }
  .spot-price-mini { font-size: 11px; font-weight: 800; color: #FFD700; margin-top: 2px; }
  .spot-hero-btn-mini { position: absolute; bottom: 12px; right: 12px; width: 28px; height: 28px; background: white; color: black; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 5; }

  /* Lista con Botones + */
  .spot-list-mini { padding: 10px; flex: 1; overflow-y: auto; background: white; }
  .spot-item-mini { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
  .spot-thumb-mini { width: 40px; height: 40px; background-size: cover; border-radius: 8px; background-color: #eee; flex-shrink: 0; }
  .spot-details-mini { flex: 1; }
  .spot-details-mini h5 { font-size: 9px; font-weight: 800; margin: 0; text-transform: uppercase; }
 .spot-details-mini p { 
    font-size: 7px; 
    color: #999; 
    margin: 1px 0; 
    /* Borramos: line-clamp, display: -webkit-box, etc. */
}
  .spot-add-mini { width: 20px; height: 20px; background: #000; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; }

  /* ELEGANT */
  .elegant-serif { background: #f9f5f0; padding: 15px; font-family: 'Playfair Display', serif; color: #333; text-align: center; height: 100%; display: flex; flex-direction: column; }
  .elegant-logo { width: 28px; height: 28px; margin: 0 auto 4px; border: 1px solid #D4AF37; border-radius: 50%; display: grid; place-items: center; color: #D4AF37; }
  .elegant-title { font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .elegant-msg { background: #f0e8dc; border: 1px solid #e0d0b8; padding: 6px; font-size: 8px; color: #5c4b30; margin: 12px 0; font-style: italic; }
  .elegant-list { text-align: left; flex: 1; overflow-y: auto; }
  .elegant-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eaddc5; }
  .elegant-prod { font-weight: 700; font-size: 10px; }
  .elegant-price { color: #D4AF37; font-weight: 700; font-size: 9px; }

  /* BISTRO */
  .bistro-chalk { background: #222; color: #eee; padding: 12px; font-family: 'Patrick Hand', cursive; height: 100%; display: flex; flex-direction: column; }
  .bistro-border { border: 2px dashed #555; height: 100%; padding: 8px; border-radius: 8px; display: flex; flex-direction: column; }
  .bistro-header { text-align: center; margin-bottom: 12px; }
  .bistro-logo { width: 32px; height: 32px; margin: 0 auto 4px; border: 2px solid #e6c87e; border-radius: 50%; display: grid; place-items: center; color: #e6c87e; font-size: 12px; }
  .bistro-list { flex: 1; overflow-y: auto; }
  .bistro-item { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  .bistro-name { font-size: 11px; color: #fff; }
  .bistro-dots { flex: 1; border-bottom: 1px dotted #555; margin: 0 4px; }
  .bistro-price { font-size: 11px; color: #e6c87e; }
  
  /* --- ESTILOS MARKET PRO --- */
  .market-pro { background: white; font-family: 'Inter', sans-serif; height: 100%; display: flex; flex-direction: column; padding: 10px; }
  .market-logo-wrap { width: 35px; height: 35px; background: #eee; border-radius: 50%; margin: 5px auto 8px; overflow: hidden; border: 1px solid #f0f0f0; }
  .market-logo-wrap img { width: 100%; height: 100%; object-fit: cover; }
  .market-search-fake { background: #f3f4f6; border-radius: 12px; height: 25px; margin-bottom: 12px; display: flex; align-items: center; padding: 0 8px; font-size: 7px; color: #999; }
  .market-banner { width: 100%; height: 60px; background: #eee; border-radius: 12px; margin-bottom: 15px; position: relative; overflow: hidden; }
  .market-banner img { width: 100%; height: 100%; object-fit: cover; }
  .market-cats { display: flex; gap: 5px; margin-bottom: 15px; overflow: hidden; }
  .market-cat-pill { padding: 4px 10px; background: #eee; border-radius: 20px; font-size: 6px; font-weight: 900; text-transform: uppercase; white-space: nowrap; }
  .market-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .market-item { display: flex; flex-direction: column; gap: 3px; }
  .market-img { aspect-ratio: 1/1; background: #f9f9f9; border-radius: 8px; overflow: hidden; }
  .market-img img { width: 100%; height: 100%; object-fit: cover; }
  .market-name { font-size: 6px; font-weight: 800; line-height: 1.1; color: #333; }
  .market-price { font-size: 6px; font-weight: 900; color: #999; }
  
`


;

// --- DATA ---
const TEMPLATES = [
  { id: 'classic', name: 'Classic Delivery', desc: 'Simple y efectivo.', premium: false, type: 'classic', category: 'minimal', sale_type: 'unidad' },
  { id: 'urban', name: 'Urbano Dark', desc: 'Impacto visual oscuro.', premium: false, type: 'urban', category: 'basicas', sale_type: 'unidad' },
  { id: 'minimal', name: 'Minimalista', desc: 'Limpio y moderno.', premium: false, type: 'minimal', category: 'minimal', sale_type: 'unidad' },
  { id: 'visualgrid', name: 'Visual Grid', desc: 'Grilla de fotos grande.', premium: true, type: 'visualgrid', category: 'basicas', sale_type: 'unidad' },
  { id: 'pop', name: 'Pop Vibrante', desc: 'Estilo cómic colorido.', premium: true, type: 'pop', category: 'basicas', sale_type: 'unidad' },
  { id: 'spotlight', name: 'Spotlight Hero', desc: 'Banner gigante.', premium: true, type: 'spotlight', category: 'basicas', sale_type: 'unidad' },
  { id: 'elegant', name: 'Elegante Serif', desc: 'Para alta cocina.', premium: true, type: 'elegant', category: 'minimal', sale_type: 'unidad' },
  { id: 'bistro', name: 'Bistro Chalk', desc: 'Estilo pizarra.', premium: true, type: 'bistro', category: 'minimal', sale_type: 'unidad' },
  { id: 'marketpro', name: 'Market Pro', desc: 'Diseño estilo Tienda App.', premium: true, type: 'marketpro', category: 'completas', sale_type: 'unidad' },
 { 
    id: 'icecream-v1', 
    name: 'Heladería Soft', 
    desc: 'Diseño fresco con selector de peso (kg/gr).', 
    premium: true, 
    type: 'icecream', 
    category: ['basicas'], 
    sale_type: 'peso' 
  },
  {
    id: 'alterna-pro',
    name: 'Alterna Pro',
    desc: 'Diseño Zig-Zag premium con foco en imágenes circulares y burbujas de impacto.',
    premium: true,
    type: 'alterna-pro', 
    category: ['completas'], 
   
    sale_type: ['unidad', 'peso'],  
    preview: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
  },
];

function GalleryContent() {
  const [isOpen, setIsOpen] = useState(true);
  const searchParams = useSearchParams();
  const isNewlyActivated = searchParams.get('activated')
  const [isOnboardingMandatory, setIsOnboardingMandatory] = useState(true);
const router = useRouter();
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState('classic');
  const [userPlan, setUserPlan] = useState('free');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('todas');
  const [saleType, setSaleType] = useState<string | null>(null); 
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const [step, setStep] = useState(1); 
  const [tempType, setTempType] = useState<string | null>(null); 
  const [isUpdatingType, setIsUpdatingType] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

useEffect(() => {
    const load = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session) {
            const { data } = await supabase
                .from('restaurants')
               .select('template_id, subscription_plan, sale_type, is_open, onboarding_completed') // <--- UN SOLO SELECT // <--- UN SOLO SELECT
                .eq('user_id', session.user.id)
                .maybeSingle();
if(data) {
                setCurrentTemplate(data.template_id || 'classic');
                setUserPlan(data.subscription_plan ? 'paid' : 'free');
                setIsOpen(data.is_open ?? true);
                setSaleType(data.sale_type); // Guardamos el rubro actual si existe

if (data.onboarding_completed) {
    setShowOnboarding(false);
    setIsOnboardingMandatory(false); // <--- AGREGÁ ESTO: Ya no es obligatorio
    setStep(3); 
} else {
    setStep(1);
    setShowOnboarding(true);
    setIsOnboardingMandatory(true); // <--- AGREGÁ ESTO: Es la primera vez
}
            }
        }
        setIsInitialLoading(false); 
    };
    load();
}, [supabase]);

const handleSaveBusinessInfo = async (subType: string) => {
    setIsUpdatingType(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && tempType) {
        // Guardamos que ya completó el paso inicial
        const { error } = await supabase.from('restaurants').update({ 
            business_type: tempType === 'unidad' ? 'gastronomico' : 'fraccionado',
            business_subtype: subType,
            sale_type: tempType, 
            onboarding_completed: true // <--- Marcamos como terminado
        }).eq('user_id', user.id);

        if (error) {
            console.error("Error DB:", error);
            setIsUpdatingType(false);
            return;
        }
        
        // Actualizamos estados locales para que React dibuje la galería
        setSaleType(tempType);
        setShowOnboarding(false);
        setStep(3); 
        
        // Avisamos al Layout para que refresque si hay bloqueos
        window.dispatchEvent(new Event('profile-updated'));
        router.refresh(); 
    }
    setIsUpdatingType(false);
};
  // --- LOGICA DE SELECCIÓN CORREGIDA (HARD RESET) ---
 const handleSelect = async (id: string, premium: boolean) => {
    if (premium && userPlan === 'free') return alert("Esta es una plantilla Premium. Actualizá tu plan para usarla.");
    
    setSavingId(id);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const defaults = TEMPLATE_DEFAULTS[id] || TEMPLATE_DEFAULTS['classic'];

      // HARD RESET: Mandamos todos los colores por defecto de la galería a la DB
    await supabase.from('restaurants').update({ 
          template_id: id,
          theme_color: defaults.theme,
          bg_color: defaults.bg,
          text_color: defaults.text,
          description_color: defaults.desc,
          card_color: defaults.card || defaults.bg,
          card_name_color: defaults.card_name,
          card_desc_color: defaults.card_desc,
          card_price_color: defaults.card_price,
          card_btn_bg: defaults.btn_bg,
          card_btn_text: defaults.btn_text,
          promo_bg_color: defaults.promo,
          promo_text_color: defaults.promo_text || defaults.theme,
          show_banner: defaults.banner
      }).eq('user_id', user.id);
      
      setCurrentTemplate(id);
      toast.success(`¡Diseño ${id.toUpperCase()} activado con sus colores originales!`);
    }
    setSavingId(null);
  };

  const renderPreview = (type: string) => {
    switch (type) {
      case 'urban': return (
        <div className="urbano-dark">
          <div className="urbano-top"><div className="urbano-brand"><div className="urbano-logo" style={{backgroundImage: "url('https://placehold.co/100/333/fff?text=BK')"}}></div><div className="urbano-names"><h4>Burger King</h4><span>La mejor hamburguesa</span></div></div><div className="urbano-status">ABIERTO</div></div>
          <div className="urbano-msg">🔥 PROMO: Envío gratis {'>'} $15.000</div>
          <div className="urbano-list">
            <div className="urbano-item"><div className="urbano-img" style={{backgroundImage: "url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=100')"}}></div><div className="urbano-info"><div className="urbano-tit">Doble Black</div><div className="urbano-desc">Medallón de carne 180g.</div><div className="urbano-price">$8.500</div></div><button className="urbano-add-btn">+</button></div>
            <div className="urbano-item"><div className="urbano-img" style={{backgroundImage: "url('https://images.unsplash.com/photo-1573080496987-a199f8cd4054?auto=format&fit=crop&w=100')"}}></div><div className="urbano-info"><div className="urbano-tit">Papas Cheddar</div><div className="urbano-desc">Con abundante queso.</div><div className="urbano-price">$4.200</div></div><button className="urbano-add-btn">+</button></div>
          </div>
        </div>
      );
      case 'visualgrid': return (
        <div className="sushi-visual">
          <div className="sushi-header"><div className="sushi-brand"><div className="sushi-logo" style={{backgroundImage: "url('https://placehold.co/100/000/fff?text=OS')"}}></div><div><div className="sushi-name">OSAKA SUSHI</div><div className="sushi-desc-local">Cocina Nikkei</div></div></div><div className="sushi-status">ABIERTO</div></div>
          <div className="sushi-msg">🍣 Happy Hour: 2x1 en Rolls.</div>
          <div className="sushi-grid">
            <div className="sushi-item" style={{backgroundImage: "url('https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=150')"}}><div className="sushi-overlay"><div className="sushi-title">Niguiri</div><div className="sushi-price">$12.500</div><div className="sushi-desc">Premium.</div><button className="sushi-btn">AGREGAR</button></div></div>
            <div className="sushi-item" style={{backgroundImage: "url('https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=150')"}}><div className="sushi-overlay"><div className="sushi-title">California</div><div className="sushi-price">$14.000</div><div className="sushi-desc">Con palta.</div><button className="sushi-btn">AGREGAR</button></div></div>
          </div>
        </div>
      );
      case 'classic': return (
        <div className="classic-del">
          <div className="classic-header"><div className="classic-status">ABIERTO</div><div className="classic-logo">LT</div><div className="classic-title">Pizzería Los Tíos</div><div style={{fontSize:'8px', opacity:0.8}}>Pizza a la piedra</div></div>
          <div className="classic-msg">🛵 Envío GRATIS primera compra</div>
          <div className="classic-list">
            <div className="classic-item"><div className="classic-info"><div className="classic-prod">Muzzarella</div><div className="classic-desc">Salsa, muzza y orégano.</div></div><div className="classic-price">$8.500</div><div className="classic-btn">+</div></div>
            <div className="classic-item"><div className="classic-info"><div className="classic-prod">Napolitana</div><div className="classic-desc">Con ajo y perejil.</div></div><div className="classic-price">$10.200</div><div className="classic-btn">+</div></div>
            <div className="classic-item"><div className="classic-info"><div className="classic-prod">Fainá</div><div className="classic-desc">Porción individual.</div></div><div className="classic-price">$1.500</div><div className="classic-btn">+</div></div>
            <div className="classic-item"><div className="classic-info"><div className="classic-prod">Coca Cola</div></div><div className="classic-price">$3.000</div><div className="classic-btn">+</div></div>
          </div>
        </div>
      );
      case 'minimal': return (
        <div className="minimal-white">
          <div className="minimal-status">ABIERTO</div><div className="minimal-logo"><Coffee size={16}/></div><div className="minimal-title">CAFÉ CENTRAL</div><div style={{fontSize:'8px', color:'#777'}}>Specialty Coffee</div>
          <div className="minimal-msg">TAKE AWAY: 10% OFF EFECTIVO</div>
          <div className="minimal-list">
            <div className="minimal-item"><div><div className="minimal-prod">Avocado Toast</div><div className="minimal-desc">Masa madre.</div><div className="minimal-price">$5.500</div></div><button className="minimal-btn">+</button></div>
            <div className="minimal-item"><div><div className="minimal-prod">Flat White</div><div className="minimal-desc">Doble shot.</div><div className="minimal-price">$2.800</div></div><button className="minimal-btn">+</button></div>
            <div className="minimal-item"><div><div className="minimal-prod">Croissant</div><div className="minimal-desc">Jamón y Queso</div></div><button className="minimal-btn">+</button></div>
          </div>
        </div>
      );
      case 'pop': return (
        <div className="pop-vibrant">
          <div className="pop-header"><div className="pop-logo">DM!</div><div><div className="pop-title">DONUT MANIA</div><div style={{fontSize:'8px', color:'#555'}}>Donas • Café</div></div><div className="pop-status">OPEN</div></div>
          <div className="pop-msg">⚡ 3x2 en donas rellenas</div>
          <div className="pop-list">
            <div className="pop-item" style={{boxShadow: '2px 2px 0 #FF1493'}}><div className="pop-item-top"><div className="pop-prod" style={{color:'#FF1493'}}>Homer Simpson</div><div className="pop-price">$1.500</div></div><div style={{fontSize:'8px', color:'#555'}}>Glaseado rosa.</div><div className="pop-btn" style={{borderColor:'#FF1493', color:'#FF1493'}}>+ AGREGAR</div></div>
            <div className="pop-item" style={{boxShadow: '2px 2px 0 #00CED1'}}><div className="pop-item-top"><div className="pop-prod" style={{color:'#008B8B'}}>Choco Bomba</div><div className="pop-price">$1.800</div></div><div style={{fontSize:'8px', color:'#555'}}>Dulce de leche.</div><div className="pop-btn" style={{borderColor:'#008B8B', color:'#008B8B'}}>+ AGREGAR</div></div>
          </div>
        </div>
      );
    case 'spotlight': return (
        <div className="spot-hero">
          {/* Header Superior con Descripción */}
          <div className="spot-header-mini">
            <div className="flex items-center gap-2">
              <div className="spot-logo-mini">CM</div>
              <div className="text-left">
                <div style={{fontSize:'9px', fontWeight:'800'}}>CLUB MERCEDES</div>
                <div style={{fontSize:'7px', opacity:0.5, fontWeight:'600'}}>RESTAURANTE</div>
              </div>
            </div>
            <div className="spot-status-mini">ABIERTO</div>
          </div>

          {/* Banner con Imagen de Estofado y Botón + */}
          <div className="spot-banner-mini" style={{backgroundImage: "url('https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=300')"}}>
            <div className="spot-overlay-mini"></div>
            <div className="spot-info-mini">
              <div className="spot-badge-mini">PLATO DEL DIA</div>
              <div className="spot-title-mini">ESTOFADO</div>
              <div className="spot-price-mini">$ 28.000</div>
            </div>
            <div className="spot-hero-btn-mini">+</div>
          </div>

          {/* Mensaje Promo */}
          <div style={{background:'#fff3e0', fontSize:'8px', padding:'6px', textAlign:'center', fontWeight:'700', color: '#000'}}>
             Envios gratis todos los jueves
          </div>

          {/* Lista de Productos con imágenes correspondientes y botones + */}
          <div className="spot-list-mini">
           <div className="spot-item-mini">
    {/* CAMBIÁ EL LINK EN ESTA LÍNEA (Aprox 408) */}
    <div className="spot-thumb-mini" style={{backgroundImage:"url('https://images.unsplash.com/photo-1606471191009-63994c53433b?auto=format&fit=crop&w=100')"}}></div>
    <div className="spot-details-mini text-left">
      <h5>Milanesa Napo</h5>
      <p>Con fritas y ensalada.</p>
      <div style={{fontWeight:'800', fontSize:'9px'}}>$ 16.000</div>
    </div>
    <div className="spot-add-mini">+</div>
  </div>
            <div className="spot-item-mini">
              <div className="spot-thumb-mini" style={{backgroundImage:"url('https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=100')"}}></div>
              <div className="spot-details-mini text-left">
                <h5>Matambre Pizza</h5>
                <p>Muzzarella y jamón.</p>
                <div style={{fontWeight:'800', fontSize:'9px'}}>$ 25.000</div>
              </div>
              <div className="spot-add-mini">+</div>
            </div>
          </div>
        </div>
      );
      case 'elegant': return (
        <div className="elegant-serif">
          <div className="elegant-logo"><Utensils size={14}/></div><div className="elegant-title">LA BOURGOGNE</div><div style={{fontSize:'8px', fontStyle:'italic', color:'#777'}}>Alta Cocina</div>
          <div className="elegant-msg">"Sugerencia del Chef: Maridaje de quesos."</div>
          <div className="elegant-list">
            <div className="elegant-item"><div><div className="elegant-prod">Boeuf Bourguignon</div><div style={{fontSize:'8px', fontStyle:'italic', color:'#888'}}>Estofado al vino.</div></div><div className="elegant-price">$22.000</div></div>
            <div className="elegant-item"><div><div className="elegant-prod">Coq au Vin</div><div style={{fontSize:'8px', fontStyle:'italic', color:'#888'}}>Pollo de campo.</div></div><div className="elegant-price">$19.500</div></div>
            <div className="elegant-item"><div><div className="elegant-prod">Crème Brûlée</div><div style={{fontSize:'8px', fontStyle:'italic', color:'#888'}}>Postre clásico.</div></div><div className="elegant-price">$8.200</div></div>
          </div>
        </div>
      );
      case 'bistro': return (
        <div className="bistro-chalk">
          <div className="bistro-border">
            <div className="bistro-header"><div className="bistro-logo">EB</div><div style={{fontSize:'16px', color:'#e6c87e'}}>El Bodegón</div><div style={{fontSize:'10px', color:'#aaa'}}>Comida Casera</div></div>
            <div className="bistro-list">
              <div className="bistro-item"><div className="bistro-name">Tortilla</div><div className="bistro-dots"></div><div className="bistro-price">$4.500</div></div>
              <div className="bistro-item"><div className="bistro-name">Milanesa</div><div className="bistro-dots"></div><div className="bistro-price">$9.200</div></div>
              <div className="bistro-item"><div className="bistro-name">Vermut</div><div className="bistro-dots"></div><div className="bistro-price">$3.000</div></div>
              <div className="bistro-item"><div className="bistro-name">Picada</div><div className="bistro-dots"></div><div className="bistro-price">$12.000</div></div>
            </div>
          </div>
        </div>
      );
// JUSTO DESPUÉS DE: switch (type) {
  case 'marketpro': return (
    <div className="market-pro">
      <div className="market-logo-wrap"><img src="https://placehold.co/100x100?text=Logo" alt="logo" /></div>
      <div className="market-search-fake"><Search size={8} style={{marginRight: 4}}/> ¿Qué estás buscando hoy?</div>
      <div className="market-banner"><img src="https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=300" alt="banner" /></div>
      <div className="market-cats">
        <div className="market-cat-pill" style={{background: '#000', color: '#fff'}}>TODOS</div>
        <div className="market-cat-pill">BURGERS</div>
        <div className="market-cat-pill">PAPAS</div>
      </div>
      <div className="market-grid">
        {[1,2,3].map(i => (
           <div key={i} className="market-item">
              <div className="market-img"><img src={`https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=100`} /></div>
              <div className="market-name uppercase italic">Bacon Burger</div>
              <div className="market-price">$8.500</div>
           </div>
        ))}
      </div>
    </div>
  );
case 'icecream': return (
  <div className="flex flex-col h-full bg-[#f0faff] font-sans text-left relative">
    <div className="p-3 bg-white border-b flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-cyan-500 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm">
          🍦
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[9px] font-black uppercase tracking-tighter text-gray-800 leading-none">
            Frozen Dreams
          </span>
          <span className="text-[6px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
            Heladería Artesanal
          </span>
        </div>
      </div>

      {/* Cartel Dinámico: Verde si abre, Rojo si cierra */}
      <div className={`${isOpen ? 'bg-green-500' : 'bg-red-500'} text-white text-[5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest transition-colors`}>
        {isOpen ? 'Abierto' : 'Cerrado'}
      </div>
    </div>
    
    <div className="p-3">
      <div className="bg-cyan-100 p-2 rounded-lg text-[7px] text-cyan-800 font-bold mb-3 text-center border border-cyan-200">
          🍦 PROMO: 1/4kg de regalo comprando 1kg
      </div>
      
      <div className="bg-white p-3 rounded-xl shadow-sm border border-cyan-50">
        <div className="flex justify-between items-start mb-2">
          <div className="text-left">
            <h4 className="text-[10px] font-black uppercase leading-tight text-gray-900">Pote de Helado</h4>
            <p className="text-[7px] text-gray-400">Hasta 3 sabores a elección</p>
          </div>
          <div className="text-right">
             <span className="text-[10px] font-black text-cyan-600 block leading-none">$12.500</span>
             <span className="text-[5px] text-gray-400 uppercase font-bold tracking-tighter">precio por kg</span>
          </div>
        </div>
        
        <p className="text-[6px] font-black uppercase text-gray-400 mb-1">Seleccionar cantidad:</p>
        <div className="grid grid-cols-3 gap-1">
          {/* Los selectores de peso también cambian de color si está cerrado */}
          <div className={`border-2 rounded-md py-1 text-[7px] text-center font-black tracking-tighter ${isOpen ? 'border-cyan-500 bg-cyan-50 text-cyan-600' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>1/4 KG</div>
          <div className="border border-gray-100 rounded-md py-1 text-[7px] text-center text-gray-400 font-bold tracking-tighter">1/2 KG</div>
          <div className="border border-gray-100 rounded-md py-1 text-[7px] text-center text-gray-400 font-bold tracking-tighter">1 KG</div>
        </div>
        
        {/* Botón: Se bloquea y se pone gris si está cerrado */}
        <button 
          disabled={!isOpen}
          className={`w-full mt-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-md transition-all ${
            isOpen 
              ? 'bg-cyan-500 text-white active:scale-95 shadow-cyan-100' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isOpen ? 'Agregar al carrito' : 'Local Cerrado'}
        </button>
      </div>
    </div>
  </div>
  
);
case 'alterna-pro':
  return (
    <div className="w-full h-full bg-[#fafaf9] flex flex-col overflow-hidden relative font-sans select-none">
      
      {/* 1. HEADER REALISTA */}
      <div className="pt-3 px-2 pb-1 bg-white relative flex-shrink-0">
        <div className="absolute top-2 right-2 px-1 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-full bg-emerald-500" />
          <span className="text-[3px] font-black text-emerald-600 uppercase">Abierto</span>
        </div>
        
        <div className="w-6 h-6 rounded-full bg-orange-100 border border-orange-200 mx-auto mb-1 flex items-center justify-center overflow-hidden shadow-sm">
           <img src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=50" className="object-cover w-full h-full" />
        </div>
        <div className="text-[6px] font-black uppercase text-gray-900 leading-none text-center">Eco Nature</div>
        <div className="text-[4px] font-bold text-gray-400 uppercase mt-0.5 tracking-tighter text-center leading-none">Productos Orgánicos</div>
      </div>

      {/* 2. BANNER DE PROMOS */}
      <div className="px-2 py-1 flex-shrink-0">
        <div className="bg-orange-50 border border-dashed border-orange-200 rounded-lg p-1 text-center">
          <span className="text-[4px] font-black text-orange-700 uppercase tracking-widest leading-none block">
             Envío Gratis — Compras +$20.000
          </span>
        </div>
      </div>

      {/* 3. BOTONES DE CATEGORÍA */}
      <div className="flex gap-1 px-2 py-1 justify-center flex-shrink-0 border-b border-gray-50">
        {['Mixes', 'Mieles', 'Harinas'].map((cat, i) => (
          <div key={i} className={`px-1.5 py-0.5 rounded-full text-[4px] font-black uppercase border ${i === 0 ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-400 border-gray-100 shadow-sm'}`}>
            {cat}
          </div>
        ))}
      </div>

      {/* 4. LISTADO ZIG-ZAG (Precios pegados ABAJO sin pise) */}
      <div className="p-2 space-y-4 overflow-hidden">
        
        {/* PRODUCTO 1 */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full border-2 border-orange-600 shrink-0 overflow-hidden shadow-md">
             <img src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=80" className="object-cover w-full h-full" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col items-start space-y-0.5">
            <div className="leading-none">
              <span className="inline-block bg-white px-1.5 py-0.5 rounded-lg border border-gray-100 shadow-sm text-[5px] font-black text-gray-900 uppercase">
                 Mix Frutos Secos
              </span>
            </div>
            <div className="inline-block bg-orange-600 text-white text-[5px] font-black px-2 py-0.5 rounded-full shadow-sm leading-none border border-white/20">
              $8.500
            </div>
          </div>
        </div>

        {/* PRODUCTO 2 (INVERTIDO) */}
        <div className="flex items-center gap-2 flex-row-reverse">
          <div className="w-9 h-9 rounded-full border-2 border-orange-600 shrink-0 overflow-hidden shadow-md">
             <img src="https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=80" className="object-cover w-full h-full" />
          </div>
          <div className="flex-1 text-right min-w-0 flex flex-col items-end space-y-0.5">
            <div className="leading-none">
              <span className="inline-block bg-white px-1.5 py-0.5 rounded-lg border border-gray-100 shadow-sm text-[5px] font-black text-gray-900 uppercase">
                 Miel Orgánica
              </span>
            </div>
            <div className="inline-block bg-orange-600 text-white text-[5px] font-black px-2 py-0.5 rounded-full shadow-sm leading-none border border-white/20">
              $4.200
            </div>
          </div>
        </div>

      </div>
    </div>
  );
      default: return null;
    }
  };
const filteredTemplates = TEMPLATES.filter(t => {
  if (!saleType) return false;

  // 1. Verificamos Rubro (Soporta si es texto simple o array)
  const typeMatch = Array.isArray(t.sale_type) 
    ? t.sale_type.includes(saleType) 
    : t.sale_type === saleType;

  if (!typeMatch) return false;

  // 2. Verificamos Filtro de Pestaña (Soporta si es texto simple o array)
  if (activeFilter === 'todas') return true;
  if (activeFilter === 'premium') return t.premium;

  return Array.isArray(t.category)
    ? t.category.includes(activeFilter)
    : t.category === activeFilter;
});
// --- LÓGICA DE RENDERIZADO DIVIDIDA (PARA PANTALLA LIMPIA) ---

  if (!isInitialLoading && userPlan !== 'free' && showOnboarding) {
  return (
    <div className="fixed inset-0 z-[150] bg-white flex flex-col items-center justify-center p-6 overflow-y-auto">
      
      {/* BOTÓN X: Solo aparece si NO es obligatorio (o sea, si ya lo eligió antes) */}
      {!isOnboardingMandatory && (
        <button 
          onClick={() => setShowOnboarding(false)}
          className="absolute top-10 right-10 p-3 text-gray-400 hover:text-black transition-all cursor-pointer z-[200]"
        >
          <X size={30} strokeWidth={3} />
        </button>
      )}
        <style>{GALLERY_STYLES}</style>
        <div className="max-w-2xl w-full space-y-12 py-10 text-center">
          
        {/* PASO 1: DISEÑO PREMIUM MEJORADO */}
{step === 1 && (
  <div className="space-y-10 animate-in zoom-in-95 duration-300">
    <div className="text-center space-y-2">
      <div className="inline-flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full mb-2">
        <span className="text-indigo-600 font-black text-[9px] uppercase tracking-[0.3em]">Paso 01</span>
      </div>
      <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">¿Cómo vendés?</h2>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Seleccioná el formato de tu catálogo</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* BOTÓN UNIDAD */}
      <button 
        onClick={() => { setTempType('unidad'); setStep(2); }} 
        className="group bg-white border-2 border-slate-100 p-8 rounded-[3rem] hover:border-indigo-600 transition-all text-left shadow-lg hover:shadow-indigo-100 relative overflow-hidden"
      >
        <div className="absolute -right-4 -top-4 text-8xl opacity-5 group-hover:scale-110 transition-transform">🍔</div>
        <div className="text-5xl mb-6 relative z-10">🍔</div>
        <h3 className="text-2xl font-black uppercase italic leading-none relative z-10 text-slate-900">Venta por Unidad</h3>
        <p className="text-slate-400 text-[10px] mt-3 font-bold uppercase tracking-widest relative z-10">Burgers, Pizzas, Kioscos y más</p>
      </button>

      {/* BOTÓN PESO */}
      <button 
        onClick={() => { setTempType('peso'); setStep(2); }} 
        className="group bg-white border-2 border-slate-100 p-8 rounded-[3rem] hover:border-cyan-500 transition-all text-left shadow-lg hover:shadow-cyan-100 relative overflow-hidden"
      >
        <div className="absolute -right-4 -top-4 text-8xl opacity-5 group-hover:scale-110 transition-transform">⚖️</div>
        <div className="text-5xl mb-6 relative z-10">⚖️</div>
        <h3 className="text-2xl font-black uppercase italic leading-none relative z-10 text-cyan-600">Venta por Peso</h3>
        <p className="text-slate-400 text-[10px] mt-3 font-bold uppercase tracking-widest relative z-10">Dietéticas, Heladerías y Fraccionados</p>
      </button>
    </div>
  </div>
)}

     {/* PASO 2: SELECCIÓN DE RUBRO ESPECÍFICO */}
{step === 2 && (
  <div className="space-y-10 animate-in slide-in-from-right-8 duration-500">
    <div className="text-center space-y-3">
      <div className="inline-flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
        <span className="text-indigo-600 font-black text-[9px] uppercase tracking-[0.2em]">Configuración Final</span>
      </div>
      <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">¿Cuál es tu rubro?</h2>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Ayudanos a optimizar tu experiencia</p>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {(tempType === 'unidad' 
        ? ['Hamburguesería', 'Pizzería', 'Restaurante', 'Sushi', 'Cafetería', 'Otros']
        : ['Dietética', 'Heladería', 'Fiambrería', 'Carnicería', 'Verdulería', 'Otros']
      ).map(item => (
        <button 
          key={item} 
          onClick={() => handleSaveBusinessInfo(item.toLowerCase())} 
          className="group p-5 rounded-[2rem] border-2 border-slate-100 hover:border-slate-900 font-black text-[10px] uppercase tracking-widest transition-all bg-white hover:shadow-xl active:scale-95 flex flex-col items-center gap-2 text-slate-900"
        >
          <span className="text-xl group-hover:scale-125 transition-transform">
            {item === 'Heladería' ? '🍦' : item === 'Cafetería' ? '☕' : item === 'Sushi' ? '🍣' : '✨'}
          </span>
          {item}
        </button>
      ))}
    </div>
    
    <button 
      onClick={() => setStep(1)} 
      className="text-[10px] font-black uppercase text-slate-300 hover:text-slate-900 mt-8 flex items-center justify-center gap-2 mx-auto transition-colors"
    >
      <RotateCcw size={12}/> Volver atrás
    </button>
  </div>
)}

          {isUpdatingType && (
            <div className="flex flex-col items-center gap-2 mt-8 animate-in fade-in">
              <Loader2 className="animate-spin text-indigo-600"/>
              <span className="text-[10px] font-black uppercase text-slate-400 animate-pulse">Configurando tu panel...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. SI YA COMPLETÓ EL ONBOARDING: Mostramos la Galería normal (Imagen 2)
  return (
    <div className="relative px-4 pt-0 lg:px-8 min-h-[85vh] bg-gray-50/50">
      <style>{GALLERY_STYLES}</style>
      
      <header className="mb-8 pt-20 lg:pt-0 text-left relative z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">Galería de Diseños</h1>
          <p className="text-gray-500 text-xs font-medium leading-tight">Elegí la base para tu menú digital. Todas son personalizables.</p>
        </div>
        
        <button 
          onClick={() => { setStep(1); setTempType(null); setShowOnboarding(true); }}
          className="mt-5 px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 shadow-sm w-fit"
        >
          <ShoppingBag size={14}/> RUBRO: {saleType === 'unidad' ? 'GASTRONOMÍA' : 'VENTA POR PESO'} (CAMBIAR)
        </button>
      </header>

      {/* --- RESTO DE TU GRILLA DE PLANTILLAS (Filtros y Grid) --- */}
      <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar">
        {['todas', 'minimal', 'basicas', 'completas'].map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)} className={`px-4 sm:px-6 py-2 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all border-2 ${activeFilter === f ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="templates-grid">
        {filteredTemplates.map((t) => {
          const isSelected = currentTemplate === t.id;
          const isLocked = t.premium && userPlan === 'free';
          return (
            <article key={t.id} className={`template-card ${isSelected ? 'active-card' : ''}`}>
              <div className="phone-preview">
                <div className="preview-content">{renderPreview(t.type)}</div>
                {isLocked && <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm z-30"><Lock size={24} className="mb-2 opacity-80" /><span className="font-bold text-xs">Diseño Premium</span></div>}
              </div>
              <div className="card-info">
                <h3 className="card-title">{t.name} {t.premium && <Crown size={12} className="text-yellow-500 fill-yellow-500" />}</h3>
             <button
    onClick={() => handleSelect(t.id, t.premium)}
    disabled={savingId === t.id || isSelected}
    className={`btn-select ${isLocked ? 'locked-btn' : ''}`}
  >
    {savingId === t.id
      ? <Loader2 className="animate-spin" size={14} />
      : isSelected
        ? 'En uso'
        : 'Usar Plantilla'}
  </button>
  
  {/* BOTÓN RECUPERADO: Solo aparece si la plantilla está seleccionada */}
  {isSelected && (
    <Link 
      href="/dashboard/personalizar" 
      className="btn-personalize block text-center mt-3 text-[10px] font-black uppercase text-indigo-600 hover:underline"
    >
      Ir a Personalizar →
    </Link>
  )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
export default function GalleryPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-white z-[300]">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40}/>
      </div>
    }>
      <GalleryContent />
    </Suspense>
  );
}