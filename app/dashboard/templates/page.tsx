'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, Lock, Check, Crown, Coffee, Utensils } from 'lucide-react';
import Link from 'next/link';

// --- 1. AGREGAMOS ESTO: COLORES POR DEFECTO PARA EL RESET ---
const TEMPLATE_DEFAULTS: any = {
  classic: { theme: '#d32f2f', bg: '#ffffff', card: '#ffffff', text: '#000000', desc: '#666666', promo: '#ffebee', banner: false },
  urban:   { theme: '#ea580c', bg: '#121212', card: '#1E1E1E', text: '#ffffff', desc: '#888888', promo: '#1E1E1E', banner: false },
  minimal: { theme: '#000000', bg: '#ffffff', card: '#ffffff', text: '#222222', desc: '#999999', promo: '#fafafa', banner: false },
  visualgrid: { theme: '#ea580c', bg: '#1a1a1a', card: '#2a2a2a', text: '#ffffff', desc: '#bbbbbb', promo: '#1a1a1a', banner: false }, // Limpio
  pop:     { theme: '#FF1493', bg: '#fffbe6', card: '#ffffff', text: '#000000', desc: '#444444', promo: '#FFD700', banner: false },
  spotlight:{ theme: '#FFD700', bg: '#ffffff', card: '#ffffff', text: '#000000', desc: '#666666', promo: '#fff3e0', banner: true },
  elegant: { theme: '#D4AF37', bg: '#f9f5f0', card: '#f9f5f0', text: '#333333', desc: '#777777', promo: '#f0e8dc', banner: false },
  bistro:  { theme: '#e6c87e', bg: '#222222', card: '#222222', text: '#eeeeee', desc: '#aaaaaa', promo: '#333333', banner: false }
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
  .spot-hero { background: white; font-family: 'Inter', sans-serif; height: 100%; display: flex; flex-direction: column; }
  .spot-banner { height: 100px; background-size: cover; background-position: center; position: relative; display: flex; flex-direction: column; justify-content: flex-end; padding: 8px; }
  .spot-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.8)); }
  .spot-info { position: relative; z-index: 2; color: white; }
  .spot-badge { background: #FFD700; color: black; padding: 1px 5px; font-size: 6px; font-weight: 800; border-radius: 6px; display: inline-block; margin-bottom: 2px; }
  .spot-title { font-size: 12px; font-weight: 800; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
  .spot-list { padding: 8px; flex: 1; overflow-y: auto; }
  .spot-item { display: flex; align-items: center; gap: 6px; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
  .spot-thumb { width: 35px; height: 35px; background-size: cover; border-radius: 5px; background-color: #eee; }
  
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
`;

// --- DATA ---
const TEMPLATES = [
  { id: 'classic', name: 'Classic Delivery', desc: 'Simple y efectivo.', premium: false, type: 'classic' },
  { id: 'urban', name: 'Urbano Dark', desc: 'Impacto visual oscuro.', premium: false, type: 'urban' },
  { id: 'minimal', name: 'Minimalista', desc: 'Limpio y moderno.', premium: false, type: 'minimal' },
  { id: 'visualgrid', name: 'Visual Grid', desc: 'Grilla de fotos grande.', premium: true, type: 'visualgrid' },
  { id: 'pop', name: 'Pop Vibrante', desc: 'Estilo cómic colorido.', premium: true, type: 'pop' },
  { id: 'spotlight', name: 'Spotlight Hero', desc: 'Banner gigante.', premium: true, type: 'spotlight' },
  { id: 'elegant', name: 'Elegante Serif', desc: 'Para alta cocina.', premium: true, type: 'elegant' },
  { id: 'bistro', name: 'Bistro Chalk', desc: 'Estilo pizarra.', premium: true, type: 'bistro' },
];

export default function GalleryPage() {
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState('classic');
  const [userPlan, setUserPlan] = useState('free');
  const [savingId, setSavingId] = useState<string | null>(null);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if(session) {
        const { data } = await supabase.from('restaurants').select('template_id, subscription_plan').eq('user_id', session.user.id).single();
        if(data) {
          setCurrentTemplate(data.template_id || 'classic');
          setUserPlan(data.subscription_plan ? 'paid' : 'free');
        }
      }
    };
    load();
  }, []);

  // --- LOGICA DE SELECCIÓN CORREGIDA (HARD RESET) ---
  const handleSelect = async (id: string, premium: boolean) => {
    const proximamente = ['pop', 'spotlight', 'elegant', 'bistro'];
   if (['pop', 'spotlight', 'elegant', 'bistro'].includes(id)) {
    setShowUpcomingModal(true);
    return;
  }
    if(premium && userPlan === 'free') return alert("Plantilla Premium");
    setSavingId(id);
    
    const { data: { user } } = await supabase.auth.getUser();
    if(user) {
      // 1. Obtenemos los defaults de la plantilla seleccionada
      const defaults = TEMPLATE_DEFAULTS[id] || TEMPLATE_DEFAULTS['classic'];

      // 2. Sobrescribimos ABSOLUTAMENTE TODOS los campos de diseño en la DB
      // Esto elimina cualquier personalización anterior que tuviera el usuario
      await supabase.from('restaurants').update({ 
          template_id: id,
          theme_color: defaults.theme,
          bg_color: defaults.bg,
          card_color: defaults.card,
          text_color: defaults.text,
          description_color: defaults.desc,
          promo_bg_color: defaults.promo,
          show_banner: defaults.banner
      }).eq('user_id', user.id);
      
      setCurrentTemplate(id);
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
          <div style={{padding:'8px', display:'flex', alignItems:'center', gap:'5px'}}><div style={{width:'20px', height:'20px', background:'#000', borderRadius:'50%', display:'grid', placeItems:'center', color:'white', fontSize:'8px', fontWeight:'bold'}}>BK</div><div style={{fontSize:'10px', fontWeight:'bold'}}>BURGER KING</div></div>
          <div className="spot-banner" style={{backgroundImage: "url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200')"}}><div className="spot-overlay"></div><div className="spot-info"><div className="spot-badge">DESTACADO</div><div className="spot-title">Súper Doble</div><div style={{fontSize:'12px', fontWeight:'bold', color:'#FFD700'}}>$8.500</div></div></div>
          <div className="spot-list">
            <div className="spot-item"><div className="spot-thumb" style={{backgroundImage:"url('https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=50')"}}></div><div style={{flex:1}}><div style={{fontWeight:'bold', fontSize:'10px'}}>Doble Queso</div><div style={{fontSize:'8px', color:'#888'}}>Con panceta.</div></div><div style={{fontWeight:'bold', fontSize:'10px'}}>$9.000</div></div>
            <div className="spot-item"><div className="spot-thumb" style={{backgroundImage:"url('https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=50')"}}></div><div style={{flex:1}}><div style={{fontWeight:'bold', fontSize:'10px'}}>Aros Cebolla</div><div style={{fontSize:'8px', color:'#888'}}>12 unidades.</div></div><div style={{fontWeight:'bold', fontSize:'10px'}}>$7.500</div></div>
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
      default: return null;
    }
  };

  return (
    <div className="relative px-4 pt-20 lg:px-8 min-h-[85vh] bg-gray-50/50">
      <style>{GALLERY_STYLES}</style>
      
      <header className="mb-8">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Galería de Diseños</h1>
        <p className="text-gray-500 text-sm">Elige la base para tu menú digital. Todas son personalizables.</p>
      </header>

      <div className="templates-grid">
        {TEMPLATES.map((t) => {
          const isSelected = currentTemplate === t.id;
          const isLocked = t.premium && userPlan === 'free';

          return (
            <article key={t.id} className={`template-card ${isSelected ? 'active-card' : ''}`}>
              <div className="tags-container">
                {t.premium && <span className="tag premium">Premium</span>}
                {t.type === 'fresh' && <span className="tag new">Nuevo</span>}
              </div>

              {isSelected && <div className="badge-selected"><Check size={10} strokeWidth={4} /> Seleccionado</div>}

              <div className="phone-preview">
                <div className="preview-content">
                   <div className="status-bar-fake" style={{ color: ['urban','fresh','bistro'].includes(t.type) ? 'white' : 'black' }}><span>9:41</span><span>📶</span></div>
                   {renderPreview(t.type)}
                </div>
                {isLocked && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm z-30">
                    <Lock size={24} className="mb-2 opacity-80"/>
                    <span className="font-bold text-xs">Diseño Premium</span>
                  </div>
                )}
              </div>

              <div className="card-info">
                <h3 className="card-title">
                  {t.name} {t.premium && <Crown size={12} className="text-yellow-500 fill-yellow-500"/>}
                </h3>
                <p className="card-desc">{t.desc}</p>
                <button 
  onClick={() => handleSelect(t.id, t.premium)}
  // Se deshabilita solo si se está guardando o si ya está seleccionada (pero no para las "Próximamente")
  disabled={savingId === t.id || (isSelected && !['pop', 'spotlight', 'elegant', 'bistro'].includes(t.id))}
  className={`btn-select ${isLocked ? 'locked-btn' : ''}`}
>
  {['pop', 'spotlight', 'elegant', 'bistro'].includes(t.id) 
    ? 'Próximamente' 
    : savingId === t.id 
      ? <Loader2 className="animate-spin" size={14}/> 
      : isSelected 
        ? 'En uso' 
        : isLocked 
          ? <><Lock size={12}/> Usar Plantilla</> 
          : 'Usar Plantilla'}
</button>
                {isSelected && <Link href="/dashboard/personalizar" className="btn-personalize">Ir a Personalizar →</Link>}
              </div>
            </article>
          );
        })}
      </div>
      {/* --- MODAL PRÓXIMAMENTE --- */}
{showUpcomingModal && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
      
      {/* Decoración de fondo sutil */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-100 rounded-full opacity-50 blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
          <span className="text-4xl">🚀</span>
        </div>
        
        <h3 className="text-2xl font-black text-gray-900 mb-2 leading-tight">
          ¡Casi listo!
        </h3>
        
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Estamos puliendo los últimos detalles de este diseño para que tu menú se vea increíble. <b>¡Estará disponible muy pronto!</b>
        </p>
        
        <button 
          onClick={() => setShowUpcomingModal(false)}
          className="w-full bg-black text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-gray-200 hover:scale-[1.02] active:scale-95 transition-all"
        >
          Entendido
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}