'use client';


import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, ArrowRight, Pizza, Utensils, Fish, Coffee, 
  Clock, ChefHat, Bike, Check, Zap, ShoppingBag,
  Store, Plus, Minus, X, ChevronDown, 
  Wallet, Landmark, Copy, MessageSquare, Loader2, Send,
  Monitor, Smartphone, SmartphoneNfc, CheckCircle2, HelpCircle
} from 'lucide-react';

// --- ESTILOS EXACTOS DE TU ARCHIVO TEMPLATES ---
const REAL_TEMPLATES_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700&family=Patrick+Hand&family=Lato:wght@400;700;900&display=swap');

  .demo-phone-viewport { max-width: 450px; margin: 0 auto; background: white; min-height: 100vh; position: relative; box-shadow: 0 0 60px rgba(0,0,0,0.1); }
/* --- URBANO DARK COMPLETO --- */
  .urbano-dark { background: #121212; color: white; padding: 20px; font-family: 'Inter', sans-serif; min-height: 100vh; text-align: left; }
  
  /* CABECERA */
  .urbano-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .urbano-logo { width: 50px; height: 50px; background: #333; border-radius: 50%; border: 2px solid white; background-size: cover; background-position: center; flex-shrink: 0; }
  .urbano-names h4 { font-size: 24px; font-weight: 900; margin: 0; line-height: 0.9; text-transform: uppercase; font-style: italic; }
  .urbano-names span { font-size: 10px; color: #888; display: block; font-weight: 700; margin-top: 4px; text-transform: uppercase; }
  
  /* BOTÓN ABIERTO */
  .urbano-status { background: white; color: black; font-size: 10px; font-weight: 900; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; }

  /* BANNER CON ACENTO NARANJA (Recuperado) */
  .urbano-promo-banner { border-left: 3px solid #ea580c; padding-left: 12px; margin: 15px 0 25px; }
  .urbano-promo-text { color: white; font-size: 12px; font-weight: 600; opacity: 0.9; }

  /* ITEMS Y SELECTORES */
  .urbano-item { background: #1E1E1E; padding: 12px; border-radius: 16px; display: flex; gap: 15px; margin-bottom: 12px; border: 1px solid #2a2a2a; align-items: center; }
  .urbano-img { width: 80px; height: 80px; background-size: cover; border-radius: 12px; background-position: center; flex-shrink: 0; }
  .urbano-tit { font-weight: 800; font-size: 16px; margin-bottom: 2px; }
  .urbano-desc { font-size: 10px; color: #666; font-weight: 600; line-height: 1.2; text-transform: uppercase; }
  .urbano-price { color: #ea580c; font-weight: 900; font-size: 15px; font-style: italic; }
  
  .urbano-qty-row { display: flex; align-items: center; gap: 8px; background: #2a2a2a; padding: 3px 5px; border-radius: 50px; }
  .urbano-qty-btn { width: 26px; height: 26px; background: #ea580c; color: white; border-radius: 50%; display: grid; place-items: center; }
  .urbano-add-btn { width: 32px; height: 32px; background: white; color: black; border-radius: 50%; display: grid; place-items: center; }

  /* --- CLASSIC DELIVERY (PIZZERÍA) - RESTAURADO Y AGRANDADO --- */
  .classic-del { background: white; font-family: Arial, sans-serif; min-height: 100vh; text-align: left; }
  
  .classic-header { background: #d32f2f; padding: 25px 15px; color: white; text-align: center; position: relative; }
  
  .classic-logo { 
    width: 45px; height: 45px; background: white; border-radius: 50%; 
    color: #d32f2f; display: grid; place-items: center; 
    font-size: 15px; margin: 0 auto 8px; font-weight: bold; 
    box-shadow: 0 4px 10px rgba(0,0,0,0.1); 
  }
  
  .classic-title { font-size: 22px; font-weight: bold; }
  
  /* BANNER DE PROMO */
  .classic-banner { 
    background: #ffebee; color: #b71c1c; font-size: 13px; 
    padding: 12px; text-align: center; border-bottom: 1px solid #ffcdd2; 
    font-weight: bold; 
  }
  
  .classic-item { 
    display: flex; justify-content: space-between; border-bottom: 1px solid #eee; 
    padding: 18px 15px; align-items: center; 
  }
  
  .classic-prod { font-weight: bold; font-size: 16px; color: #333; margin-bottom: 2px; }
  .classic-desc { font-size: 12px; color: #777; line-height: 1.3; }
  .classic-price { font-weight: bold; font-size: 17px; color: #d32f2f; margin-right: 8px; }
  
  .classic-btn { 
    width: 35px; height: 35px; border: 1px solid #ddd; background: white; 
    color: #555; display: flex; align-items: center; justify-content: center; 
    font-size: 16px; border-radius: 6px; font-weight: bold; 
  }
    /* SELECTOR DE CANTIDAD CLASSIC (- 1 +) */
  .classic-qty-row { 
    display: flex; 
    align-items: center; 
    gap: 10px; 
    background: #f8f8f8; 
    border: 1px solid #eee; 
    border-radius: 8px; 
    padding: 2px 6px; 
  }
  
  .classic-qty-btn { 
    color: #d32f2f; 
    font-size: 18px; 
    font-weight: bold; 
    width: 28px; 
    height: 28px; 
    display: grid; 
    place-items: center; 
  }
  
  .classic-qty-num { 
    font-weight: bold; 
    font-size: 16px; 
    color: #333; 
    min-width: 15px; 
    text-align: center; 
  }

/* --- DISEÑO FINAL VISUAL GRID (FIDELIDAD TOTAL) --- */
  .sushi-visual { background: #121212; color: white; padding: 15px; font-family: 'Inter', sans-serif; min-height: 100vh; text-align: left; }
  .sushi-brand { display: flex; align-items: center; gap: 15px; text-align: left; } /* <--- ESTO ARREGLA EL ALINEADO */
  
  /* HEADER Y BANNER (image_a5d423.jpg, image_a5df83.png) */
  .sushi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .sushi-logo { width: 50px; height: 50px; border-radius: 50%; border: 2px solid #ea580c; background-size: cover; background-position: center; }
  .sushi-name { font-size: 24px !important; font-weight: 900; font-style: italic; text-transform: uppercase; line-height: 0.8; }
  .sushi-status-btn { background: white; color: black; font-size: 10px; font-weight: 900; padding: 4px 10px; border-radius: 4px; }

  /* BANNER PROMO (UN SOLO ACENTO NARANJA) */
  .sushi-promo-banner { border-left: 3px solid #ea580c; padding-left: 12px; margin: 10px 0 25px; }
  .sushi-promo-text { color: white; font-size: 12px; font-weight: 600; }

  /* CARDS SIN BORDES NARANJAS */
  .sushi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px !important; }
  .sushi-item { height: 190px; border-radius: 20px; position: relative; overflow: hidden; background-size: cover; background-position: center; border: none !important; }
  
  .sushi-card-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px); padding: 15px; display: flex; flex-direction: column; overflow-y: auto; scrollbar-width: none; }
  .sushi-card-overlay::-webkit-scrollbar { display: none; }

  /* SELECTOR DE CANTIDAD: Círculos blancos, iconos negros (image_a5cbec.png) */
  .sushi-qty-selector { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.1); border-radius: 100px; padding: 4px; margin-top: 10px; }
  .sushi-white-circle { width: 28px; height: 28px; background: white; color: black; border-radius: 50%; display: grid; place-items: center; transition: transform 0.1s; }
  .sushi-white-circle:active { transform: scale(0.9); }
  .sushi-qty-num { font-size: 18px; font-weight: 900; color: white; min-width: 25px; text-align: center; }

  /* MENSAJE EXTRA SUMADO (FLOTANTE AFUERA) */
  .extra-sumado-floating { position: absolute; top: 15px; left: 50%; transform: translateX(-50%); background: rgba(255, 255, 255, 0.95); color: black; padding: 10px 20px; border-radius: 15px; font-size: 11px; font-weight: 900; display: flex; align-items: center; gap: 8px; z-index: 200; box-shadow: 0 10px 30px rgba(0,0,0,0.5); animation: slideDown 0.3s ease; }
  @keyframes slideDown { from { top: -50px; opacity: 0; } to { top: 15px; opacity: 1; } }

  .sushi-opcionales-text { font-size: 10px; font-weight: 800; color: #444; text-transform: uppercase; margin-top: 20px; }
  .sushi-extra-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .sushi-extra-add { width: 22px; height: 22px; background: #222; border-radius: 4px; display: grid; place-items: center; color: white; }


/* --- MINIMAL CAFÉ (DISEÑO CENTRADO) --- */
  .minimal-cafe { background: white; color: black; padding: 25px 20px; font-family: 'Lato', sans-serif; min-height: 100vh; }
  
  /* CABECERA CENTRADA (image_a7217f.png) */
  .minimal-header-top { display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 25px; position: relative; }
  .minimal-status-tag { position: absolute; top: 0; right: 0; border: 1.5px solid black; font-size: 10px; font-weight: 900; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
  
  .minimal-logo-cent { width: 80px; height: 80px; background: #e11d48; border-radius: 50%; background-size: cover; background-position: center; margin-bottom: 20px; border: 2px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
  .minimal-title-cent { font-size: 28px !important; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; line-height: 1; margin-bottom: 8px; }
  .minimal-desc-cent { font-size: 11px; color: #888; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; }

  /* BANNER GRIS CENTRADO (image_a728c8.png) */
  .minimal-banner-gray { background: #f4f4f4; padding: 20px 30px; border-radius: 4px; margin: 25px 0; text-align: center; }
  .minimal-banner-text { font-size: 13px; font-weight: 900; color: #1a1a1a; text-transform: uppercase; line-height: 1.4; letter-spacing: 0.5px; }

  /* LISTADO */
  .minimal-item { display: flex; align-items: center; justify-content: space-between; padding: 20px 0; border-bottom: 1px solid #f0f0f0; text-align: left; }
  .minimal-info { flex: 1; padding-right: 15px; }
  .minimal-name { font-size: 17px; font-weight: 800; color: #1a1a1a; }
  .minimal-prod-desc { font-size: 11px; color: #999; line-height: 1.4; margin: 4px 0; }
  .minimal-price { font-size: 16px; font-weight: 900; color: #000; }

  /* BOTONES DINÁMICOS (- 1 +) */
  .minimal-plus-btn { width: 38px; height: 38px; border: 1.5px solid #eee; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #333; }
  .minimal-qty-box { display: flex; align-items: center; gap: 12px; background: #f9f9f9; padding: 4px 10px; border-radius: 100px; border: 1px solid #eee; }
  .minimal-qty-btn { color: #000; font-weight: 900; }
`;
export default function DemoPage() {
  const [selectedPlan, setSelectedPlan] = useState<'light' | 'plus'>('light');
const [showWhatsAppSim, setShowWhatsAppSim] = useState(false);
  const [view, setView] = useState<'selector' | 'menu' | 'tracking'>('selector');
  const [template, setTemplate] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [status, setStatus] = useState('pendiente');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // NUEVO: Para el cartel de "EXTRA SUMADO" del video
  const [showExtraToast, setShowExtraToast] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [nombre, setNombre] = useState('');
  const [telCliente, setTelCliente] = useState('');
  const [direccion, setDireccion] = useState('');
  const [metodoEnvio, setMetodoEnvio] = useState('delivery');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [nroMesa, setNroMesa] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const COSTO_ENVIO = 1500;
const [couponInput, setCouponInput] = useState('SNAPPYDEMO');
const [appliedCoupon, setAppliedCoupon] = useState(false);

const applyCoupon = () => {
  if (couponInput.toUpperCase() === 'SNAPPYDEMO') {
    setAppliedCoupon(true);
  } else {
    alert("Cupón inválido. Prueba con SNAPPYDEMO");
  }
};

  const addToCart = (id: string) => {
    setCart(prev => {
      const currentQty = prev[id] || 0;
      // DISPARADOR DE SCROLL: Al pasar de 0 a 1 (como en el video 00:06)
      if (currentQty === 0 && expandedId === id) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({ top: 120, behavior: 'smooth' });
        }, 100);
      }
      return { ...prev, [id]: currentQty + 1 };
    });
  };

  const addExtra = () => {
    setShowExtraToast(true);
    setTimeout(() => setShowExtraToast(false), 2000);
  };
  
  const removeFromCart = (id: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[id] > 1) newCart[id] -= 1; 
      else delete newCart[id];
      return newCart;
    });
  };

  const handleCopyAlias = () => {
    setCopied(true);
    if (typeof navigator !== 'undefined') navigator.clipboard.writeText('snappy.demo.mp');
    setTimeout(() => setCopied(false), 2000);
  };

  // --- REEMPLAZAR TU BLOQUE POR ESTE ---
const { totalProductos, descuento, totalFinal } = useMemo(() => {
  const products = DEMO_PRODUCTS[template] || [];
  const rawTotal = products.reduce((acc, p) => acc + (p.p * (cart[p.id] || 0)), 0);
  
  const discount = appliedCoupon ? rawTotal * 0.15 : 0; // 15% de descuento
  const shipping = metodoEnvio === 'delivery' ? COSTO_ENVIO : 0;
  
  return {
    totalProductos: rawTotal,
    descuento: Math.round(discount),
    totalFinal: rawTotal + shipping - Math.round(discount)
  };
}, [cart, template, appliedCoupon, metodoEnvio]);

const cartCount = useMemo(() => Object.values(cart).reduce((acc: number, val: number) => acc + val, 0), [cart]);
const formatPrice = (p: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(p);

 const startSimulation = () => {
  if (!nombre.trim()) return alert("Ingresá tu nombre.");
  setIsSending(true);

  setTimeout(() => {
    setIsSending(false);
    if (selectedPlan === 'light') {
      // SI ES LIGHT: Mostramos la burbuja de WhatsApp
      setShowWhatsAppSim(true);
    } else {
      // SI ES PLUS: Seguimiento en vivo
      setIsCartOpen(false);
      setView('tracking');
      setStatus('pendiente');
      setTimeout(() => setStatus('en_proceso'), 3000);
      setTimeout(() => setStatus('en_camino'), 7000);
      setTimeout(() => setStatus('completado'), 10000);
    }
  }, 1500);
};
  // ... Aquí sigue el return de tu componente

  return (
    <div className="min-h-screen bg-[#f5f2e8] font-sans">
      <style>{REAL_TEMPLATES_CSS}</style>
      
      {view === 'selector' ? (
        <div className="max-w-7xl mx-auto px-6 pt-32 pb-20">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold mb-8 hover:text-blue-600 transition-colors">
            <ArrowLeft size={16}/> Volver al inicio
          </Link>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase mb-4 leading-none italic">
  PRUEBA LA DEMO
</h1>
<p className="text-gray-500 font-medium mb-8 max-w-2xl mx-auto">
  Elegí un plan para ver la experiencia: el <b>Plan Light</b> simula el pedido por WhatsApp, 
  mientras que el <b>Plan Plus</b> activa el seguimiento en tiempo real.
</p>
          {/* SELECTOR DE PLANES - AGREGAR DEBAJO DEL TÍTULO */}
<div className="flex justify-center gap-4 mb-12">
  <button 
    onClick={() => setSelectedPlan('light')}
    className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 border-2 ${selectedPlan === 'light' ? 'bg-white border-black text-black shadow-lg scale-105' : 'bg-transparent border-gray-200 text-gray-400'}`}
  >
    <MessageSquare size={16}/> Plan Light
  </button>
  <button 
    onClick={() => setSelectedPlan('plus')}
    className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 border-2 ${selectedPlan === 'plus' ? 'bg-black border-black text-white shadow-lg scale-105' : 'bg-transparent border-gray-200 text-gray-400'}`}
  >
    <Zap size={16} fill="currentColor"/> Plan Plus
  </button>
</div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: 'classic', label: 'Ideal Pizzería', icon: <Pizza/>, template: 'classic', color: 'text-red-600' },
              { id: 'urban', label: 'Ideal Hamburguesería', icon: <Utensils/>, template: 'urban', color: 'text-orange-600' },
              { id: 'visualgrid', label: 'Ideal Sushi', icon: <Fish/>, template: 'visualgrid', color: 'text-blue-600' },
              { id: 'minimal', label: 'Ideal Cafetería', icon: <Coffee/>, template: 'minimal', color: 'text-stone-800' },
            ].map((opt) => (
              <button key={opt.id} onClick={() => { setTemplate(opt.template); setView('menu'); setCart({}); }}
                className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group text-left">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 bg-gray-50 ${opt.color} group-hover:scale-110 transition-transform`}>{opt.icon}</div>
                <h3 className="font-black text-xl uppercase italic tracking-tighter mb-4">{opt.label}</h3>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 tracking-widest">Entrar Ahora <ArrowRight size={14}/></div>
              </button>
            ))}
          </div>
        </div>
      ) : (

        <div 
        className="demo-phone-viewport">
         <button 
  onClick={() => { setView('selector'); setIsCartOpen(false); setCart({}); }} 
  className="absolute bottom-10 left-4 z-[100] bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-xl border border-gray-100 hover:scale-110 active:scale-95 transition-all text-gray-900"
>
  <ArrowLeft size={22} />
</button>
          
          {view === 'menu' ? (
            <div className="flex flex-col h-screen overflow-hidden">
              <div className="flex-1 overflow-y-auto">
        {template === 'urban' && (
  <div className="urbano-dark">
    {/* CABECERA: Logo + Nombres + Botón Abierto */}
    <div className="urbano-top">
      <div className="flex items-center gap-4">
        <div className="urbano-logo" style={{backgroundImage: "url('https://placehold.co/100/111/fff?text=BURGER')"}}></div>
        <div className="urbano-names">
          <h4>Burger KRUSTY</h4>
          <span>A la parrilla desde 1954</span>
        </div>
      </div>
      <div className="urbano-status">Abierto</div>
    </div>

    {/* BANNER CON ACENTO NARANJA RECUPERADO */}
    <div className="urbano-promo-banner">
      <p className="urbano-promo-text">Lunes de promo : 2x1 en papas con cheddar</p>
    </div>

    <div className="flex flex-col gap-3">
      {DEMO_PRODUCTS.urban.map(p => {
        const qty = cart[p.id] || 0;
        return (
          <div key={p.id} className="urbano-item">
            <div className="urbano-img" style={{backgroundImage: `url(${p.i})`}}></div>
            <div className="flex-1">
              <div className="urbano-tit uppercase">{p.n}</div>
              <div className="urbano-desc mb-3">{p.d}</div>
              <div className="flex justify-between items-center">
                <span className="urbano-price">${p.p}</span>
                
                {qty > 0 ? (
                  <div className="urbano-qty-row">
                    <button onClick={() => removeFromCart(p.id)} className="urbano-qty-btn">
                      <Minus size={14} strokeWidth={3}/>
                    </button>
                    <span className="font-black text-sm w-5 text-center">{qty}</span>
                    <button onClick={() => addToCart(p.id)} className="urbano-qty-btn">
                      <Plus size={14} strokeWidth={3}/>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => addToCart(p.id)} className="urbano-add-btn">
                    <Plus size={18} strokeWidth={3}/>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
        {template === 'classic' && (
  <div className="classic-del">
    {/* ... Header y Banner se mantienen igual ... */}
    <div className="classic-header">
      <div className="classic-logo" style={{backgroundImage: "url('https://placehold.co/100/d32f2f/fff?text=PIZZA')", backgroundSize: 'cover'}}></div>
      <h2 className="classic-title">Pizzería Los Tíos</h2>
    </div>
    <div className="classic-banner">🛵 Envío GRATIS en tu primera compra</div>

    <div className="flex flex-col">
      {DEMO_PRODUCTS.classic.map(p => {
        const qty = cart[p.id] || 0;
        return (
          <div key={p.id} className="classic-item">
            <div className="flex-1 pr-4">
              <div className="classic-prod">{p.n}</div>
              <div className="classic-desc">{p.d}</div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="classic-price">${p.p}</span>
              
              {/* LÓGICA DE SELECTOR DINÁMICO */}
              {qty > 0 ? (
                <div className="classic-qty-row shadow-sm">
                  <button onClick={() => removeFromCart(p.id)} className="classic-qty-btn active:scale-90">
                    <Minus size={16} strokeWidth={3}/>
                  </button>
                  <span className="classic-qty-num">{qty}</span>
                  <button onClick={() => addToCart(p.id)} className="classic-qty-btn active:scale-90">
                    <Plus size={16} strokeWidth={3}/>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => addToCart(p.id)} 
                  className="classic-btn active:bg-red-50 transition-colors"
                >
                  <Plus size={20}/>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
{template === 'visualgrid' && (
  <div className="sushi-visual relative">
    
    {/* MENSAJE EXTRA SUMADO: AHORA AFUERA Y CENTRADO */}
    {showExtraToast && (
      <div className="extra-sumado-floating">
        <CheckCircle2 size={16} className="text-green-600"/> EXTRA SUMADO
      </div>
    )}

   <div className="sushi-header">
  <div className="sushi-brand">
    {/* Logo circular con texto adentro */}
    <div className="sushi-logo flex items-center justify-center bg-[#ea580c] text-white font-black text-[10px] italic">
      SUSHI
    </div>
    {/* Título y descripción al costado */}
    <div className="flex flex-col">
      <h2 className="sushi-name">SUSHI BAR</h2>
      <p className="text-[10px] font-black opacity-40 uppercase tracking-tighter">
        EL MEJOR SUSHI DE LA CIUDAD
      </p>
    </div>
  </div>
  <div className="sushi-status-btn">Abierto</div>
</div>

    <div className="sushi-promo-banner">
      <p className="sushi-promo-text">Lunes de promo muzzarella la 2da al 50%</p>
    </div>

    <div className="grid grid-cols-2 gap-[10px]">
      {DEMO_PRODUCTS.visualgrid.map(p => {
        const isExpanded = expandedId === p.id;
        const qty = cart[p.id] || 0;

        return (
          <div key={p.id} className="sushi-item" style={{backgroundImage: `url(${p.i})`}} onClick={() => !isExpanded && setExpandedId(p.id)}>
            {!isExpanded ? (
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent p-4 flex flex-col justify-end text-left">
                <span className="font-black italic uppercase text-sm">{p.n}</span>
                <span className="text-[#ea580c] font-black italic text-sm">${p.p}</span>
                {qty > 0 && <div className="absolute top-3 right-3 bg-[#ea580c] text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">{qty}</div>}
              </div>
            ) : (
              <div ref={scrollRef} className="sushi-card-overlay" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setExpandedId(null)} className="absolute top-3 right-3 text-white/40"><X size={18}/></button>
                
                <div className="min-h-[170px] flex flex-col text-left">
                  <h4 className="font-black italic uppercase text-base leading-tight">{p.n}</h4>
                  <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">{p.d}</p>
                  <div className="text-[#ea580c] font-black italic text-lg mt-auto">${p.p}</div>
                  
                  {/* SELECTOR CON CÍRCULOS BLANCOS */}
                  <div className="sushi-qty-selector">
                    <button onClick={() => removeFromCart(p.id)} className="sushi-white-circle"><Minus size={18} strokeWidth={3}/></button>
                    <span className="sushi-qty-num">{qty}</span>
                    <button onClick={() => addToCart(p.id)} className="sushi-white-circle"><Plus size={18} strokeWidth={3}/></button>
                  </div>

                  <div className="sushi-opcionales-text">Opcionales</div>
                  <div className="sushi-extra-row">
                    <div>
                      <p className="text-[11px] font-bold">Extra Calabresa</p>
                      <p className="text-[10px] text-[#ea580c] font-black">+$2.000</p>
                    </div>
                    <button onClick={addExtra} className="sushi-extra-add"><Plus size={14}/></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}

   {template === 'minimal' && (
  <div className="minimal-cafe">
    {/* CABECERA CENTRADA TAL CUAL LA CAPTURA */}
    <div className="minimal-header-top">
      <div className="minimal-status-tag">Abierto</div>
      <div className="minimal-logo-cent" style={{backgroundImage: "url('https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&h=300&fit=crop')"}}></div>
      <h2 className="minimal-title-cent">MINIMAL CAFÉ</h2>
      <p className="minimal-desc-cent">Specialty Coffee & Bakery</p>
    </div>

    {/* BANNER GRIS (image_a728c8.png) */}
    <div className="minimal-banner-gray">
      <p className="minimal-banner-text">Lunes de promo muzzarella la 2da al 50%</p>
    </div>

    <div className="flex flex-col">
      {DEMO_PRODUCTS.minimal.map(p => {
        const qty = cart[p.id] || 0;
        return (
          <div key={p.id} className="minimal-item">
            <div className="minimal-info">
              <div className="minimal-name">{p.n}</div>
              <p className="minimal-prod-desc">{p.d}</p>
              <div className="minimal-price">${p.p}</div>
            </div>
            
            <div className="flex items-center">
              {qty > 0 ? (
                <div className="minimal-qty-box animate-in zoom-in duration-200">
                  <button onClick={() => removeFromCart(p.id)} className="minimal-qty-btn"><Minus size={18} strokeWidth={3}/></button>
                  <span className="font-black text-base w-5 text-center">{qty}</span>
                  <button onClick={() => addToCart(p.id)} className="minimal-qty-btn"><Plus size={18} strokeWidth={3}/></button>
                </div>
              ) : (
                <button onClick={() => addToCart(p.id)} className="minimal-plus-btn active:bg-gray-50 transition-colors">
                  <Plus size={20} strokeWidth={2}/>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
              </div>

            {/* BARRA CARRITO FLOTANTE (MODO FLOATING ISLAND) */}
{cartCount > 0 && (
  <div className="absolute bottom-6 left-0 right-0 px-4 z-50 animate-in slide-in-from-bottom-10">
    <button 
      onClick={() => setIsCartOpen(true)} 
      className={`w-full ${selectedPlan === 'plus' ? 'bg-black' : 'bg-blue-600'} text-white p-4 rounded-2xl flex justify-between items-center font-bold text-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] active:scale-95 transition-all hover:scale-[1.02]`}
    >
      <div className="flex items-center gap-3">
        <div className="bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center">
          {cartCount}
        </div>
        <span className="tracking-tight uppercase">Ver mi pedido</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="opacity-60 font-medium text-xs">Total:</span>
        <span className="text-base">${totalFinal}</span>
      </div>
    </button>
  </div>
)}

              {/* CHECKOUT FORM (CARTFOOTER) */}
              {isCartOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center">
                  <div className="w-full max-w-[450px] bg-white rounded-t-[2.5rem] p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-20 shadow-2xl text-left">
                    <div className="flex justify-between items-center mb-6">
                      <button onClick={()=>setIsCartOpen(false)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><ChevronDown size={18}/> Seguir pidiendo</button>
                      <button onClick={()=>setIsCartOpen(false)} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
                    </div>
<div className="mb-8">
  <h2 className="text-xl font-black italic uppercase mb-4">Tu Pedido</h2>
  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
    {DEMO_PRODUCTS[template]?.filter(p => cart[p.id] > 0).map(item => (
      <div key={item.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
        <div className="flex-1">
          <span className="text-sm font-black block leading-none">{item.n}</span>
          <span className="text-blue-600 font-bold text-xs">${item.p}</span>
        </div>
        <div className="flex items-center gap-3 bg-white p-1 rounded-xl border">
          <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 flex items-center justify-center text-red-500"><Minus size={14} strokeWidth={3}/></button>
          <span className="font-black text-sm w-4 text-center">{cart[item.id]}</span>
          <button onClick={() => addToCart(item.id)} className="w-7 h-7 flex items-center justify-center text-green-600"><Plus size={14} strokeWidth={3}/></button>
        </div>
      </div>
    ))}
  </div>
</div>
                    <div className="space-y-4 mb-8">
    
                      <h2 className="text-xl font-black italic uppercase">Tus Datos</h2>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Tu Nombre" value={nombre} onChange={(e)=>setNombre(e.target.value)} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs outline-none" />
                        <input type="tel" placeholder="WhatsApp" value={telCliente} onChange={(e)=>setTelCliente(e.target.value)} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs outline-none" />
                      </div>
                     <div className="space-y-1">
  <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Método de Entrega</label>
  <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
    {['delivery', 'retiro', 'mesa'].map(m => {
      // LÓGICA: Desactivar "mesa" si el plan es Light
      const isMesaDisabled = m === 'mesa' && selectedPlan === 'light';
      
      return (
        <button 
          key={m} 
          disabled={isMesaDisabled}
          onClick={() => setMetodoEnvio(m)} 
          className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all relative
            ${metodoEnvio === m ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}
            ${isMesaDisabled ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:bg-white/50'}
          `}
        >
          {m}
          {/* Badge de "Plus" chiquito para tentar al cliente */}
          {isMesaDisabled && (
            <span className="absolute -top-1 -right-1 bg-black text-white text-[6px] px-1 rounded-full">
              PLUS
            </span>
          )}
        </button>
      );
    })}
  </div>
  {metodoEnvio === 'delivery' && (
    <p className="text-[15px] font-bold text-gray-900 mt-2 ml-2 flex items-center gap-1 animate-in slide-in-from-top-1 duration-300">
      <Bike size={12} className="text-blue-600"/> 
      Costo de envío: <span className="text-blue-600">${COSTO_ENVIO}</span>
    </p>
  )}

  {metodoEnvio === 'retiro' && (
    <p className="text-[10px] font-bold text-green-600 mt-2 ml-2 animate-in slide-in-from-top-1">
      ✓ Retiro sin cargo por el local
    </p>
  )}
 
</div>
                      {metodoEnvio === 'delivery' && (
                        <input type="text" placeholder="Dirección de envío" value={direccion} onChange={(e)=>setDireccion(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs" />
                      )}
                     {metodoEnvio === 'mesa' && (
  <div className="grid grid-cols-4 gap-2">
    {[
      { n: 'Mesa 1', s: 'libre' },
      { n: 'Mesa 2', s: 'reservada' }, // Esta aparecerá bloqueada
      { n: 'Mesa 3', s: 'libre' },
      { n: 'Mesa 4', s: 'libre' }
    ].map(m => (
      <button 
        key={m.n} 
        disabled={m.s === 'reservada'}
        onClick={()=>setNroMesa(m.n)} 
        className={`p-2 border-2 rounded-xl text-[8px] font-black flex flex-col items-center gap-1 transition-all ${
          m.s === 'reservada' 
            ? 'bg-gray-50 border-gray-50 text-gray-300 opacity-60 cursor-not-allowed' 
            : nroMesa === m.n 
              ? 'border-green-600 bg-green-50 text-green-600 shadow-sm' 
              : 'border-gray-100 bg-white'
        }`}
      >
        <span>{m.s === 'reservada' ? '🔒' : '🍽️'}</span>
        {m.n}
      </button>
    ))}
  </div>
)}
                    </div>

                    <div className="space-y-3 mb-8">
                      <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Medio de Pago</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={()=>setMetodoPago('efectivo')} className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-[10px] ${metodoPago === 'efectivo' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-100'}`}><Wallet size={16}/> EFECTIVO</button>
                        <button onClick={()=>setMetodoPago('transferencia')} className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-[10px] ${metodoPago === 'transferencia' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100'}`}><Landmark size={16}/> TRANSFERENCIA</button>
                      </div>
                    </div>
                    {metodoPago === 'transferencia' && (
  <div className="space-y-2 mt-2">
    <div 
      onClick={handleCopyAlias} 
      className={`p-4 rounded-xl border-2 flex justify-between items-center cursor-pointer transition-all ${copied ? 'border-blue-600 bg-blue-50' : 'border-gray-100 bg-white'}`}
    >
      <div className="text-left">
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">snappy.demo.mp</p>
        <p className="text-[9px] font-bold text-gray-400">Toca para copiar alias</p>
      </div>
      {copied ? <CheckCircle2 size={18} className="text-blue-600" /> : <Copy size={18} className="text-gray-400" />}
    </div>

    {/* EL MENSAJE QUE FALTABA */}
    {copied && (
      <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold animate-in fade-in slide-in-from-top-1 duration-300">
        ¡Alias copiado! No olvides enviarme el comprobante.
      </div>
    )}
  </div>
)}
<div className="mt-8 mb-6 p-4 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
  <label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">
    ¿Tenés un cupón?
  </label>
  <div className="flex gap-2 mt-1">
    <input 
      type="text" 
      placeholder="Ej: SNAPPYDEMO" 
      value={couponInput}
      onChange={(e) => setCouponInput(e.target.value)}
      disabled={appliedCoupon}
      className="flex-1 p-3 bg-white rounded-xl border border-gray-100 text-xs outline-none uppercase font-bold" 
    />
    <button 
      onClick={applyCoupon}
      disabled={appliedCoupon}
      className={`px-4 rounded-xl font-black text-[10px] transition-all ${
        appliedCoupon ? 'bg-green-600 text-white' : 'bg-black text-white'
      }`}
    >
      {appliedCoupon ? 'APLICADO' : 'APLICAR'}
    </button>
  </div>
</div>
            <div className="pt-6 border-t border-gray-100 space-y-2 pb-24"> {/* Agregamos pb-24 para que no lo tape nada abajo */}
  <div className="flex justify-between text-[11px] font-bold text-gray-500 px-2">
    <span>Subtotal productos</span>
    <span>${totalProductos}</span>
  </div>

  {metodoEnvio === 'delivery' && (
    <div className="flex justify-between text-[11px] font-bold text-gray-800 px-2 animate-in fade-in slide-in-from-left-2">
      <span className="flex items-center gap-1"><Bike size={12}/> Costo de envío</span>
      <span>+${COSTO_ENVIO}</span>
    </div>
  )}

  {appliedCoupon && (
    <div className="flex justify-between text-[11px] font-black text-green-600 px-2 animate-in zoom-in-95">
      <span>Descuento Snappy (15%)</span>
      <span>-${descuento}</span>
    </div>
  )}

  <div className="flex justify-between items-center pt-4 mb-8 border-t border-gray-50">
    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Final</span>
    <span className="text-3xl font-black text-gray-900">${totalFinal}</span>
  </div>

  {/* EL BOTÓN QUE FALTABA */}
  <button 
    onClick={startSimulation} 
    disabled={isSending} 
    className="w-full bg-green-600 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 text-lg shadow-xl active:scale-95 transition-all hover:bg-green-700"
  >
    {isSending ? (
      <Loader2 className="animate-spin" size={24}/>
    ) : (
      <><Send size={24}/> ENVIAR PEDIDO</>
    )}
  </button>
</div>         </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`h-screen flex flex-col items-center justify-center p-10 text-center relative transition-colors duration-1000 ${status === 'pendiente' ? 'bg-yellow-50' : status === 'en_proceso' ? 'bg-orange-50' : status === 'en_camino' ? 'bg-blue-50' : 'bg-green-50'}`}>
              <div className="relative z-10">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl border-[6px] border-white">
                    {status === 'pendiente' && <Clock size={40} className="text-yellow-600 animate-pulse"/>}
                    {status === 'en_proceso' && <ChefHat size={40} className="text-orange-600 animate-bounce"/>}
                    {status === 'en_camino' && <Bike size={40} className="text-blue-600 animate-bounce"/>}
                    {status === 'completado' && <Check size={40} className="text-green-600 scale-125 transition-transform"/>}
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2 leading-none">
                    {status === 'pendiente' ? 'Confirmando...' : status === 'en_proceso' ? 'Cocinando 🔥' : status === 'en_camino' ? 'En camino 🛵' : '¡Entregado! 🎉'}
                </h2>
              </div>
              <button onClick={() => setView('selector')} className="absolute bottom-10 bg-gray-900 text-white px-8 py-4 rounded-full font-bold uppercase text-[10px] tracking-widest">Finalizar Demo</button>
            </div>
          )}
        </div>
      )}
      {/* SIMULACIÓN WHATSAPP (PLAN LIGHT) */}
{showWhatsAppSim && (
  <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-left">
    <div className="bg-[#e5ddd5] w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
      <div className="bg-[#075e54] p-4 text-white flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><Utensils size={20}/></div>
        <div>
          <p className="font-bold text-sm">Tu Local (WhatsApp)</p>
          <p className="text-[10px] opacity-70">en línea</p>
        </div>
      </div>
      <div className="p-4 space-y-4 min-h-[300px]">
        <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm relative max-w-[85%]">
          <p className="text-[11px] leading-relaxed whitespace-pre-wrap text-black">
            *¡Hola! Nuevo Pedido* 🍔{"\n"}
            ------------------{"\n"}
            👤 *Nombre:* {nombre}{"\n"}
            🛵 *Entrega:* {metodoEnvio.toUpperCase()}{"\n"}
            💳 *Pago:* {metodoPago.toUpperCase()}{"\n\n"}
            *Pedido:*{"\n"}
            {Object.entries(cart).map(([id, qty]) => {
                const p = DEMO_PRODUCTS[template]?.find(x => x.id === id);
                return `✅ ${qty}x ${p?.n}\n`;
            })}
            {"\n"}💰 *TOTAL: ${totalFinal}*
          </p>
          <span className="text-[9px] text-gray-400 block text-right mt-1">12:45</span>
        </div>
        <div className="bg-blue-100 border border-blue-200 p-4 rounded-2xl mt-10">
          <p className="text-blue-800 text-xs font-bold flex items-center gap-2">
            <HelpCircle size={14}/> ESTO TE LLEGARÁ A VOS
          </p>
          <p className="text-blue-700 text-[10px] mt-1 leading-tight">
            En el <b>Plan Light</b>, el cliente te envía este mensaje detallado para que vos lo gestiones manualmente.
          </p>
        </div>
      </div>
      <button onClick={() => { setShowWhatsAppSim(false); setIsCartOpen(false); setView('selector'); }} className="w-full bg-white p-4 font-black text-xs uppercase tracking-widest border-t border-gray-200">Entendido, volver</button>
    </div>
  </div>
)}

{/* AVISO PLAN PLUS (DENTRO DEL TRACKING) */}
{view === 'tracking' && (
  <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[80%] max-w-xs">
    <div className="bg-black text-white p-4 rounded-2xl shadow-2xl border border-white/10">
      <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1 flex items-center gap-2">
        <Zap size={12} fill="currentColor"/> Esto verá tu cliente
      </p>
      <p className="text-[10px] leading-tight opacity-70">
        Mientras tanto, vos manejás los estados (Cocinando, En camino) desde tu panel de gestión Snappy.
      </p>
    </div>
  </div>
)}
    </div>
  );
}


// --- DATA DE PRODUCTOS (VA AL FINAL DEL ARCHIVO) ---
const DEMO_PRODUCTS: Record<string, any[]> = {
urban: [
    { id: 'u1', n: 'Doble Black Bacon', d: 'Medallón 180g + Cheddar', p: 8500, i: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300' },
    // IMAGEN CAMBIADA AQUÍ:
    { id: 'u2', n: 'Papas King Cheddar', d: 'Panceta y verdeo crunchy', p: 4200, i: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=300&q=80' },
    { id: 'u3', n: 'Crispy Chicken', d: 'Pollo frito + Alioli', p: 7800, i: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=300' },
    { id: 'u4', n: 'Aros de Cebolla', d: 'X10 unidades con BBQ', p: 3500, i: 'https://images.unsplash.com/photo-1639146174825-df8551817a01?w=300' }
  ],
  visualgrid: [
    { id: 's1', n: 'Niguiri Salmón', p: 12500, i: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400', d: 'Fina lámina de salmón sobre arroz shari.' },
    { 
      id: 's2', 
      n: 'Roll California', 
      p: 14000, 
      i: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400', 
      d: 'Kanikama, palta y pepino envuelto en sésamo.',
      extras: [
        { id: 'e1', n: 'Wasabi Extra', p: 500 },
        { id: 'e2', n: 'Salsa de Soja', p: 0 },
        { id: 'e3', n: 'Jengibre', p: 300 },
        { id: 'e4', n: 'Palitos extra', p: 100 }
      ]
    },
    { id: 's3', n: 'Sashimi Salmón', p: 15500, i: 'https://images.unsplash.com/photo-1582450871972-ab5ca641643d?w=400', d: 'Cortes de salmón rosado fresco (5 piezas).' },
    { id: 's4', n: 'Temaki Ebi', p: 11000, i: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400', d: 'Cono de alga nori con langostinos y palta.' }
  ],
  classic: [
    { id: 'c1', n: 'Muzzarella Familiar', d: 'Salsa y muzza', p: 8500 },
    { id: 'c2', n: 'Napolitana Special', d: 'Tomate y ajo', p: 10200 },
    { id: 'c3', n: 'Fugazzeta Rellena', d: 'Cebolla y mucho queso', p: 12500 },
    { id: 'c4', n: 'Calabresa Hot', d: 'Longaniza y morrón', p: 11000 }
  ],
  minimal: [
    { id: 'm1', n: 'Flat White', d: 'Doble espresso', p: 2800 },
    { id: 'm2', n: 'Avocado Toast', d: 'Masa madre', p: 5500 },
    { id: 'm3', n: 'Cappuccino XL', d: 'Espuma de leche y canela', p: 3200 },
    { id: 'm4', n: 'Croissant Almendras', d: 'Relleno de crema pastelera', p: 2500 }
  ]
};