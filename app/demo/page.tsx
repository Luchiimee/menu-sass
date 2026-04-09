'use client';


import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft, ArrowRight, Pizza, Utensils, Fish, Coffee, 
  Clock, ChefHat, Bike, Check, Zap, ShoppingBag,
  Store, Plus, Minus, X, ChevronDown, 
  Wallet, Landmark, Copy, MessageSquare, Loader2, Send,
  Monitor, Smartphone, SmartphoneNfc, CheckCircle2, HelpCircle, Search, MapPin,Instagram,Facebook, Phone,
  Hamburger
} from 'lucide-react';

// --- ESTILOS EXACTOS DE TU ARCHIVO TEMPLATES ---
const REAL_TEMPLATES_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700&family=Patrick+Hand&family=Lato:wght@400;700;900&display=swap');

 .demo-phone-viewport::-webkit-scrollbar { display: none; }
  .demo-phone-viewport { 
    max-width: 450px; 
    margin: 0 auto; 
    background: white; 
    min-height: 100vh; 
    position: relative; 
    box-shadow: 0 0 60px rgba(0,0,0,0.1);
    -ms-overflow-style: none;  /* IE y Edge */
    scrollbar-width: none;  /* Firefox */
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* Ocultar scroll en contenedores internos (como el menú o el carrito) */
  .overflow-y-auto::-webkit-scrollbar,
  .scrollbar-hide::-webkit-scrollbar { 
    display: none; 
  }
  .overflow-y-auto,
  .scrollbar-hide { 
    -ms-overflow-style: none; 
    scrollbar-width: none; 
  }
  
/* --- MARKET PRO DEMO --- */
.market-pro { background: #ffffff; min-height: 100vh; font-family: 'Inter', sans-serif; color: #000; text-align: left; }
.market-header { padding: 30px 20px 10px; text-align: center; }
.market-logo { width: 65px; height: 65px; border-radius: 50%; border: 2px solid #000; margin: 0 auto 10px; background-size: cover; background-position: center; }
.market-banner-img { width: 100%; aspect-ratio: 16/8; border-radius: 20px; object-fit: cover; margin-bottom: 20px; }
.market-search { margin: 15px 20px; background: #f3f4f6; border-radius: 12px; padding: 10px 15px; display: flex; align-items: center; gap: 10px; color: #9ca3af; }
.market-cats { display: flex; gap: 8px; overflow-x: auto; padding: 0 20px 20px; scrollbar-width: none; }
.market-pill { padding: 6px 15px; background: #f3f4f6; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase; white-space: nowrap; }
.market-pill.active { background: #000; color: #fff; }
.market-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding: 0 15px; }
.market-card { background: #fff; border: 1px solid #f3f4f6; border-radius: 15px; padding: 6px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.market-img-box { 
    /* ✅ CAMBIAMOS DE 16/13 A 3/4 (MÁS VERTICAL) */
    aspect-ratio: 3/4; 
    border-radius: 10px; 
    overflow: hidden; 
    margin-bottom: 5px; 
    position: relative; /* Necesario para que el video absoluto se posicione bien */
}
.market-img { width: 100%; height: 100%; object-fit: cover; }
.market-tit { font-size: 9px; font-weight: 900; text-transform: uppercase; line-height: 1.1; height: 22px; display: flex; align-items: center; justify-content: center; }
.market-price { font-size: 10px; font-weight: 900; color: #059669; margin: 4px 0; }
.market-btn { width: 100%; background: #000; color: #fff; font-size: 8px; font-weight: 900; text-transform: uppercase; padding: 7px; border-radius: 8px; }

/* MODAL INFO DEMO */
.demo-modal-overlay { position: absolute; inset: 0; z-index: 500; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.demo-modal-content { background: white; width: 100%; max-width: 350px; border-radius: 2.5rem; overflow: hidden; animation: popIn 0.3s ease; }
@keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

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
 .sushi-promo-banner { 
  background: #1a1a1a; /* Fondo oscuro */
  border-left: 6px solid #ea580c; /* El borde grueso naranja */
  border-radius: 50px; /* Hace que sea una cápsula */
  padding: 12px 20px; 
  margin: 10px 5px 25px; 
  display: flex;
  align-items: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4); /* Sombra para profundidad */
  border-top: 1px solid rgba(255,255,255,0.05);
  border-right: 1px solid rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
  .sushi-promo-text { 
  color: white; 
  font-size: 11px; 
  font-weight: 800; 
  display: flex;
  align-items: center;
  gap: 8px; /* Espacio entre el emoji y el texto */
  letter-spacing: -0.01em;
}

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

  /* --- IDEAL KIOSCO (POP VIBRANT) --- */
.pop-kiosco { background: #f5f2e8; padding: 20px; font-family: 'Inter', sans-serif; min-height: 100vh; text-align: left; }
.pop-header { background: white; border: 3px solid black; border-radius: 12px; margin-bottom: 20px; padding: 15px; display: flex; align-items: center; gap: 12px; box-shadow: 4px 4px 0 black; position: relative; }
.pop-logo { width: 50px; height: 50px; border-radius: 50%; border: 2px solid black; background-size: cover; flex-shrink: 0; }
.pop-status { position: absolute; top: -10px; right: 10px; background: #00CED1; border: 2px solid black; padding: 2px 8px; font-size: 8px; font-weight: 900; transform: rotate(3deg); color: black; }
.pop-promo { background: #FFD700; border: 3px solid black; margin: 0 0 20px; padding: 10px; text-align: center; font-weight: 900; font-size: 12px; box-shadow: 3px 3px 0 rgba(0,0,0,0.2); }
.pop-card { background: white; border: 3px solid black; border-radius: 15px; margin-bottom: 15px; padding: 15px; box-shadow: 4px 4px 0 #d32f2f; display: flex; justify-content: space-between; align-items: center; }
.pop-prod-title { font-weight: 900; font-size: 18px; text-transform: uppercase; color: #d32f2f; margin-bottom: 4px; }
.pop-price-tag { background: black; color: white; padding: 4px 10px; border-radius: 4px; font-weight: 900; display: inline-block; margin-top: 8px; }
.pop-add-btn { width: 35px; height: 35px; border: 2px solid black; background: white; border-radius: 50%; display: grid; place-items: center; font-weight: 900; font-size: 20px; }

/* --- IDEAL RESTAURANTE (SPOTLIGHT HERO) --- */
.spot-restaurante { background: white; font-family: 'Inter', sans-serif; min-height: 100vh; text-align: left; }
.spot-header { padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; background: white; }
.spot-logo-box { display: flex; align-items: center; gap: 10px; }
.spot-logo { width: 40px; height: 40px; border-radius: 50%; background-size: cover; border: 1px solid #eee; }
.spot-status { background: #2ecc71; color: white; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 800; }
.spot-banner { position: relative; height: 260px; width: 100%; background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; }
.spot-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent 60%); }
.spot-info { position: relative; z-index: 2; color: white; }
.spot-badge { background: #FFD700; color: black; padding: 4px 10px; font-size: 10px; font-weight: 900; border-radius: 6px; display: inline-block; margin-bottom: 6px; }
.spot-hero-title { font-size: 32px; font-weight: 900; text-transform: uppercase; font-style: italic; line-height: 1; }
.spot-hero-price { font-size: 20px; font-weight: 900; color: #FFD700; margin-top: 5px; }
.spot-hero-btn { position: absolute; bottom: 20px; right: 20px; width: 45px; height: 45px; background: white; color: black; border-radius: 50%; display: grid; place-items: center; font-size: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 5; }
.spot-promo-bar { background: #fff3e0; color: #000; padding: 12px; text-align: center; font-size: 13px; font-weight: 700; }
.spot-item { display: flex; align-items: center; gap: 15px; padding: 15px 20px; border-bottom: 1px solid #f8f8f8; }
.spot-thumb { width: 75px; height: 75px; border-radius: 12px; background-size: cover; background-position: center; flex-shrink: 0; }
.spot-item h4 { font-bold; text-[15px]; margin-bottom: 4px; text-align: left; }
.spot-item p { 
    text-[11px]; 
    color: #9ca3af; 
    margin-top: 2px; 
    text-align: left; 
    line-height: 1.3; 
    
}
.spot-product-price { font-weight: 900; font-size: 16px; margin-top: 4px; }
.spot-add-btn { width: 32px; height: 32px; border: 1px solid #eee; border-radius: 50%; display: grid; place-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
`;
export default function DemoPage() {
  const [showInfo, setShowInfo] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedExtrasDemo, setSelectedExtrasDemo] = useState<any[]>([]);
  const [quantityDemo, setQuantityDemo] = useState(1);
  const [showHeroModalDemo, setShowHeroModalDemo] = useState(false);
const [heroQtyDemo, setHeroQtyDemo] = useState(1);
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
               { id: 'urban', label: 'Ideal Hamburguesería', icon: <Hamburger/>, template: 'urban', color: 'text-orange-600' },
      
              { id: 'spotlight', label: 'Ideal Restaurante', icon: <ChefHat/>, template: 'spotlight', color: 'text-amber-600' },
              { id: 'classic', label: 'Ideal Pizzería', icon: <Pizza/>, template: 'classic', color: 'text-red-600' },
              { id: 'pop', label: 'Ideal Kiosco', icon: <Store/>, template: 'pop', color: 'text-pink-600' },
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
        {template !== 'urban' && (
  <button 
    onClick={() => { setView('selector'); setIsCartOpen(false); setCart({}); }} 
    className="absolute bottom-10 left-4 z-[100] bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-xl border border-gray-100 hover:scale-110 active:scale-95 transition-all text-gray-900"
  >
    <ArrowLeft size={22} />
  </button>
)}
          
          {view === 'menu' ? (
            <div className="flex flex-col h-screen overflow-hidden">
              <div className="flex-1 overflow-y-auto">

{template === 'pop' && (
  <div className="pop-kiosco">
    <div className="pop-header">
      <div className="pop-status">OPEN</div>
      <div className="pop-logo" style={{backgroundImage: "url('https://placehold.co/100/d32f2f/fff?text=SNAPPY')"}}></div>
      <div>
        <h2 className="pop-title font-black text-2xl">SNAPPY</h2>
        <p className="text-[10px] font-bold opacity-60">KIOSCO 24HS</p>
      </div>
    </div>
    <div className="pop-promo">Envios gratis todos los jueves</div>
    <div className="flex flex-col">
      {DEMO_PRODUCTS.pop.map(p => (
        <div key={p.id} className="pop-card">
          <div className="flex-1 text-left">
            <div className="pop-prod-title">{p.n}</div>
            <p className="text-[11px] font-bold text-gray-500">{p.d}</p>
            <div className="pop-price-tag">${p.p}</div>
          </div>
          <button onClick={() => addToCart(p.id)} className="pop-add-btn active:scale-90 transition-transform">+</button>
        </div>
      ))}
    </div>
  </div>
)}

{template === 'spotlight' && (
  <div className="spot-restaurante">
    <div className="spot-header">
      <div className="spot-logo-box">
        <div className="spot-logo" style={{backgroundImage: "url('https://placehold.co/100/111/fff?text=CLUB')"}}></div>
        <div>
          <h2 className="font-black text-sm uppercase">CLUB MERCEDES</h2>
          <p className="text-[10px] font-bold opacity-40 uppercase">Restaurante</p>
        </div>
      </div>
      <div className="spot-status">ABIERTO</div>
    </div>
    <div className="spot-banner" style={{backgroundImage: "url('https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600')"}}>
      <div className="spot-overlay"></div>
      <div className="spot-info">
        <div className="spot-badge">PLATO DEL DIA</div>
        <h3 className="spot-hero-title">ESTOFADO</h3>
        <div className="spot-hero-price">$28.000</div>
      </div>
     <button 
  onClick={() => {
    setHeroQtyDemo(1); // Reiniciamos cantidad
    setShowHeroModalDemo(true); // Abrimos el modal
  }} 
  className="spot-hero-btn active:scale-90 transition-transform"
>
  <Plus/>
</button>
    </div>
    <div className="spot-promo-bar">Envios gratis todos los jueves</div>
    <div className="flex flex-col">
      {DEMO_PRODUCTS.spotlight.map(p => (
        <div key={p.id} className="spot-item">
          <div className="spot-thumb" style={{backgroundImage: `url(${p.i})`}}></div>
          <div className="flex-1 text-left">
            <h4 className="font-bold text-[15px]">{p.n}</h4>
            <p className="text-[11px] text-gray-400 mt-0.5">{p.d}</p>
            <div className="spot-product-price">${p.p}</div>
          </div>
          <button onClick={() => addToCart(p.id)} className="spot-add-btn active:scale-90 transition-transform"><Plus size={18}/></button>
        </div>
      ))}
    </div>
  </div>
)}

{template === 'urban' && (
  <div className="market-pro relative pb-10">
    
    {/* --- BOTÓN VOLVER ATRÁS (FIJO ARRIBA A LA IZQUIERDA) --- */}
    <button 
      onClick={() => { setView('selector'); setIsCartOpen(false); setCart({}); }} 
      className="absolute top-6 left-6 z-[50] p-2 bg-white/80 backdrop-blur-md rounded-full shadow-md border border-gray-100 active:scale-90 transition-all"
    >
      <ArrowLeft size={20} className="text-gray-900"/>
    </button>

    {/* --- MODAL INFO --- */}
    {showInfo && (
      <div className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-[350px] p-8 rounded-[2.5rem] text-left relative animate-in zoom-in-95 duration-200">
          <button onClick={() => setShowInfo(false)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full"><X size={18}/></button>
          <div className="flex items-center gap-2 mb-8 text-gray-900"><Store size={20}/><h3 className="text-lg font-black uppercase italic tracking-tighter">Información</h3></div>
          
          <div className="space-y-6">
            <div className="flex gap-4"><MapPin className="text-blue-600"/><div className="text-sm font-bold text-gray-800">Calle 25 num. 1111</div></div>
            <div className="flex gap-4"><Clock className="text-blue-600"/><div className="text-sm font-bold text-gray-800">Lun a Dom: 11:00 - 23:00</div></div>
            <div className="flex gap-4"><Phone className="text-blue-600"/><div className="text-sm font-bold text-gray-800">1131694099</div></div>
            
            <div className="pt-6 border-t flex gap-4">
              <Instagram className="text-blue-600" strokeWidth={1.5} size={24}/>
              <Facebook className="text-blue-600" strokeWidth={1.5} size={24}/>
            </div>
          </div>
          <button onClick={() => setShowInfo(false)} className="w-full mt-8 py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest">Entendido</button>
        </div>
      </div>
    )}

    {/* --- MODAL DE PRODUCTO (DISEÑO MARKET PRO EXACTO) --- */}
    {selectedProduct && (
      <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-end justify-center sm:items-center p-0 sm:p-4">
        <div className="relative w-full max-w-sm bg-white overflow-hidden shadow-2xl flex flex-col max-h-[90vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] animate-in slide-in-from-bottom-20 sm:zoom-in-95">
          <div className="relative aspect-[16/12] w-full bg-gray-50">
            {selectedProduct.v ? (
    <video 
      src={selectedProduct.v} 
      autoPlay 
      loop 
      muted 
      playsInline 
      preload="auto"
      className="w-full h-full object-cover"
    />
  ) : (
    <img 
      src={selectedProduct.i || '/placeholder.png'} 
      alt={selectedProduct.n} 
      className="w-full h-full object-cover" 
    />
  )}
            <button onClick={() => { setSelectedProduct(null); setQuantityDemo(1); setSelectedExtrasDemo([]); }} className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-lg border border-gray-100 z-10">
              <X size={18} className="text-gray-900" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto scrollbar-hide pb-24 text-left">
            <h2 className="text-2xl font-black italic uppercase leading-none text-gray-900 mb-2">{selectedProduct.n}</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase leading-relaxed mb-6">{selectedProduct.d}</p>
            
            {/* SELECTOR DE UNIDADES */}
            <div className="flex items-center justify-between p-3 rounded-2xl mb-8 bg-gray-50 border border-gray-100 shadow-sm">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">Unidades</span>
              <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                <button onClick={() => setQuantityDemo(Math.max(1, quantityDemo - 1))} className="text-red-500 active:scale-75 transition-transform"><Minus size={16} strokeWidth={3}/></button>
                <span className="font-black text-sm w-5 text-center text-gray-900">{quantityDemo}</span>
                <button onClick={() => setQuantityDemo(quantityDemo + 1)} className="text-emerald-600 active:scale-75 transition-transform"><Plus size={16} strokeWidth={3}/></button>
              </div>
            </div>

            {/* SECCIÓN DE ADICIONALES */}
            {selectedProduct.extras && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-1 text-left">
                  ¿Querés sumar algo más?
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {selectedProduct.extras.map((ex: any) => {
                    const isSelected = selectedExtrasDemo.some((s) => s.id === ex.id);
                    return (
                      <div
                        key={ex.id}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          isSelected ? "border-emerald-500 bg-emerald-50" : "border-gray-100 bg-white"
                        }`}
                        onClick={() => setSelectedExtrasDemo(prev => 
                          isSelected ? prev.filter(s => s.id !== ex.id) : [...prev, ex]
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-200"
                          }`}>
                            {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                          </div>
                          <span className={`text-xs font-black uppercase ${isSelected ? "text-emerald-900" : "text-gray-500"}`}>
                            {ex.n}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600">
                          +${ex.p}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* BOTÓN CONFIRMAR FIJO ABAJO */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
            <button 
              onClick={() => { 
                for(let i=0; i<quantityDemo; i++) addToCart(selectedProduct.id);
                selectedExtrasDemo.forEach(extra => {
                   for(let i=0; i<quantityDemo; i++) addToCart(extra.id);
                });
                setSelectedProduct(null); 
                setSelectedExtrasDemo([]);
                setQuantityDemo(1);
              }} 
              className="w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-[0.98] transition-all bg-black text-white" 
            >
              Confirmar — ${ (selectedProduct.p * quantityDemo) + (selectedExtrasDemo.reduce((acc, e) => acc + Number(e.p), 0) * quantityDemo) }
            </button>
          </div>
        </div>
      </div>
    )}

    {/* --- HEADER MARKET PRO --- */}
    <header className="pt-8 pb-4 px-5 text-center relative">
        <button onClick={() => setShowInfo(true)} className="absolute top-6 right-6 p-2.5 rounded-full border shadow-sm bg-white text-gray-900 active:scale-90 transition-all">
          <Store size={18} strokeWidth={2.5} />
        </button>
        <div className="flex justify-center mb-3"><span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">● Abierto ahora</span></div>
        <div className="market-logo" style={{backgroundImage: "url('https://placehold.co/100/000/fff?text=MK')"}}></div>
        <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none text-gray-900">KRUSTY BURGER</h1>
        <p className="mt-1 max-w-[220px] mx-auto leading-tight text-gray-400 text-[10px] font-bold uppercase tracking-widest">Hamburguesería Premium</p>
    </header>

    <div className="market-search"><Search size={14}/><span className="text-xs">Buscar producto...</span></div>
    <div className="px-5 mb-4"><img src="https://images.unsplash.com/photo-1550547660-d9450f859349?w=600" className="market-banner-img" alt="Portada" /></div>

    <div className="market-cats no-scrollbar">
      <div className="market-pill active">Todos</div>
      <div className="market-pill">Hamburguesas</div>
      <div className="market-pill">Bebidas</div>
    </div>

    {/* --- GRILLA 3 COLUMNAS --- */}
    <div className="market-grid">
      {DEMO_PRODUCTS.urban.filter((p: any) => !p.isExtra).map(p => {
        const qty = cart[p.id] || 0; 
        
        return (
          <div key={p.id} className="market-card flex flex-col justify-between">
            <div>
              <div className="market-img-box">
  {p.v ? (
    <video 
      src={p.v} 
      autoPlay loop muted playsInline 
      className="market-img"
    />
  ) : (
    <img src={p.i} className="market-img" alt={p.n} />
  )}
</div>
              <div className="market-tit text-gray-900">{p.n}</div>
              <div className="market-price">${p.p}</div>
            </div>
            
            {/* LÓGICA DE CARRITO SIMPLE ( - 1 + ) */}
            {qty > 0 ? (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-1 mt-1 border border-gray-100 shadow-inner">
                <button onClick={() => removeFromCart(p.id)} className="w-6 h-6 flex items-center justify-center text-red-500 font-bold active:scale-75 transition-transform"><Minus size={14} strokeWidth={3}/></button>
                <span className="text-[10px] font-black text-gray-900">{qty}</span>
                <button onClick={() => addToCart(p.id)} className="w-6 h-6 flex items-center justify-center text-emerald-600 font-bold active:scale-75 transition-transform"><Plus size={14} strokeWidth={3}/></button>
              </div>
            ) : (
              <button onClick={() => setSelectedProduct(p)} className="market-btn active:scale-95 transition-all mt-1">Elegir</button>
            )}
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
  <p className="sushi-promo-text">
    <span>🍣</span> 
    {template === 'visualgrid' ? 'Happy Hour: 2x1 en Rolls.' : 'Lunes de promo muzzarella la 2da al 50%'}
  </p>
</div>

    <div className="grid grid-cols-2 gap-[10px]">
      {DEMO_PRODUCTS.visualgrid.map(p => {
        const isExpanded = expandedId === p.id;
        const qty = cart[p.id] || 0;

       return (
  <div 
    key={p.id} 
    className="sushi-item" 
    style={{ position: 'relative', overflow: 'hidden' }} // Aseguramos que nada se escape
    onClick={() => !isExpanded && setExpandedId(p.id)}
  >
    {/* --- NUEVA CAPA DE FONDO (IMAGEN O VIDEO) --- */}
    <div 
      className="absolute inset-0 transition-all duration-500"
      style={{ filter: isExpanded ? 'brightness(0.3) blur(4px)' : 'none' }}
    >
      {p.v ? (
        <video 
          src={p.v} 
          autoPlay 
          loop 
          muted 
          playsInline 
          preload="auto"
          className="w-full h-full object-cover"
        />
      ) : (
        <div 
          className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${p.i})` }} 
        />
      )}
    </div>
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
  <h2 className="text-xl font-black italic uppercase mb-4 text-gray-900">Tu Pedido</h2>
  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
    {/* Filtramos !p.isExtra para no renderizar el extra como un producto suelto */}
    {DEMO_PRODUCTS[template]?.filter((p: any) => !p.isExtra && cart[p.id] > 0).map((item: any) => (
      <div key={item.id} className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 flex flex-col shadow-sm">
        
        {/* FILA PRINCIPAL: HAMBURGUESA */}
        <div className="flex justify-between items-center w-full">
          <div className="flex-1 text-left pr-2">
            <span className="text-sm font-black block leading-none uppercase text-gray-900">{item.n}</span>
            <span className="text-emerald-600 font-bold text-xs">${item.p}</span>
          </div>
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border shadow-sm">
            <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 flex items-center justify-center text-red-500 active:scale-90 transition-transform"><Minus size={16} strokeWidth={3}/></button>
            <span className="font-black text-sm w-4 text-center text-gray-900">{cart[item.id]}</span>
            <button onClick={() => addToCart(item.id)} className="w-7 h-7 flex items-center justify-center text-emerald-600 active:scale-90 transition-transform"><Plus size={16} strokeWidth={3}/></button>
          </div>
        </div>

        {/* FILA ANIDADA: ADICIONALES CHICOS (SIN LÍNEA NI FONDO BLANCO) */}
        {item.extras && item.extras.some((ex: any) => cart[ex.id] > 0) && (
          <div className="mt-3 space-y-2">
            {item.extras.filter((ex: any) => cart[ex.id] > 0).map((ex: any) => (
              <div key={ex.id} className="flex justify-between items-center">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">+ {ex.n}</p>
                  <p className="text-[10px] font-black text-emerald-600">${ex.p}</p>
                </div>
                
                {/* BOTONES MÁS CHICOS PARA EXTRAS */}
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                  <button onClick={() => removeFromCart(ex.id)} className="w-5 h-5 flex items-center justify-center text-red-500 active:scale-90 transition-transform"><Minus size={10} strokeWidth={4}/></button>
                  <span className="text-[11px] font-black w-3 text-center text-gray-900">{cart[ex.id]}</span>
                  <button onClick={() => addToCart(ex.id)} className="w-5 h-5 flex items-center justify-center text-emerald-600 active:scale-90 transition-transform"><Plus size={10} strokeWidth={4}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

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
{/* --- MODAL PLATO DEL DÍA (SOLO PARA DEMO RESTAURANTE) --- */}
{showHeroModalDemo && (
  <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
    {/* Fondo oscuro con desenfoque */}
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowHeroModalDemo(false)}></div>
    
    <div className="bg-white w-full max-w-sm rounded-[2.5rem] relative z-10 overflow-hidden animate-in slide-in-from-bottom-10 duration-300 shadow-2xl">
      {/* Imagen del plato */}
      <div className="h-52 bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600')" }}>
          <button onClick={() => setShowHeroModalDemo(false)} className="absolute top-4 right-4 w-9 h-9 bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-md">
            <X size={20} strokeWidth={3} />
          </button>
      </div>
      
      <div className="p-6 text-left">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none mb-1">ESTOFADO</h3>
            <div className="text-xl font-black text-orange-600">$ 28.000</div>
          </div>
          
          {/* Selector de cantidad */}
          <div className="flex items-center gap-3 bg-gray-100 p-1.5 rounded-2xl">
            <button onClick={() => setHeroQtyDemo(Math.max(1, heroQtyDemo - 1))} className="w-7 h-7 flex items-center justify-center font-bold">-</button>
            <span className="font-bold w-4 text-center">{heroQtyDemo}</span>
            <button onClick={() => setHeroQtyDemo(heroQtyDemo + 1)} className="w-7 h-7 flex items-center justify-center font-bold">+</button>
          </div>
        </div>
        
        {/* Descripción completa */}
        <p className="text-gray-400 text-[11px] leading-relaxed mb-6 border-t pt-4">
          Estofado con tuco incluye una cocca de 250cc y postre
        </p>
        
        {/* Botón de acción final */}
        <button 
          className="w-full py-4 rounded-2xl font-black text-white text-center uppercase tracking-widest shadow-lg transition-transform active:scale-95" 
          style={{ backgroundColor: '#FFD700', color: '#000' }}
          onClick={() => {
            // Lógica para sumar al carrito N veces según la cantidad elegida
            for(let i=0; i < heroQtyDemo; i++) {
                addToCart('s_hero');
            }
            setShowHeroModalDemo(false);
            // Aseguramos que el producto exista en la data para el carrito
            if(!DEMO_PRODUCTS.spotlight.find(x => x.id === 's_hero')) {
                DEMO_PRODUCTS.spotlight.push({ id: 's_hero', n: 'ESTOFADO DEL DIA', p: 28000 });
            }
          }}
        >
          Sumar al pedido — {formatPrice(28000 * heroQtyDemo)}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}


// --- DATA DE PRODUCTOS (VA AL FINAL DEL ARCHIVO) ---
const DEMO_PRODUCTS: Record<string, any[]> = {
urban: [
    { 
      id: 'u1', 
      n: 'Cheese Lover', 
      d: 'Medallón de carne, triple queso (cheddar, mozzarella y azul), cebolla caramelizada y salsa suave. Ideal para los fanáticos del queso.', 
      p: 8500, 
      i: '/videos/cheese-lover.mp4', // <--- Poné el nombre de tu archivo
      v: '/videos/cheese-lover.mp4', // <--- USAMOS 'v' PARA EL VIDEO
      extras: [{id:'e1', n:'Extra Bacon', p:1500}, {id:'e2', n:'Cheddar Fundido', p:1200}] 
    },
    { id: 'u2', n: 'Papas King Cheddar', d: 'Panceta y verdeo crunchy', p: 4200, i: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=300', extras: [{id:'e3', n:'Doble Porción', p:2000}] },
    { id: 'u3', n: 'Crispy Chicken', d: 'Pollo frito + Alioli', p: 7800, i: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=300' },
    { 
      id: 'u4', 
      n: 'Hamburguesa completa', 
      d: 'Medallon de carne lechuga, tomate y queso', 
      p: 3500, 
      i: '/videos/hambur-completa.mp4', 
      v: '/videos/hambur-completa.mp4', // <--- VIDEO 2
      extras: [{id:'e4', n:'Salsa Picante', p:500}] 
    },
    { id: 'e1', n: 'Extra Bacon', p: 1500, isExtra: true },
    { id: 'e2', n: 'Cheddar Fundido', p: 1200, isExtra: true },
    { id: 'e3', n: 'Doble Porción', p: 2000, isExtra: true },
    { id: 'e4', n: 'Salsa Picante', p: 500, isExtra: true }
  ],
visualgrid: [
    { 
      id: 's1', 
      n: 'Dragon Roll', 
      p: 12500, 
      i: '/videos/dragon-sushi.mp4', 
      v: '/videos/dragon-sushi.mp4', // <--- VIDEO SUSHI
      d: 'Roll relleno de langostinos tempura y pepino, cubierto con palta en láminas y salsa teriyaki.' 
    },
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
  ],
  pop: [
  { id: 'p1', n: 'PROMO FERNET 750CC', d: 'Coca cola 2.5lts + Fernet 750cc + Bolsa hielo', p: 21000 },
  { id: 'p2', n: 'PROMO FERNET 1LTS', d: 'Coca cola 1ltrs + Fernet 1lts + Hielo', p: 25000 },
  { id: 'p3', n: 'PACK IMPERIAL', d: 'Imperial x6 473cc', p: 16000 }
],
spotlight: [
  // Eliminamos el id 's0' de la lista
  { 
    id: 's1', 
    n: 'POLLO AL CHAMPIGNON', 
    d: 'Pollo con salsa de champignon lo puede acompañar con pure, papa rustica, ens. de rúcula con parmesano', 
    p: 18000, 
    i: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=300' // Imagen corregida
  },
  { 
    id: 's2', 
    n: 'MATAMBRE A LA PIZA', 
    d: 'Matambre a la pizza de cerdo, Muzarella jamon y tomate', 
    p: 25000, 
    i: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300' 
  },
  { 
    id: 's3', 
    n: 'MILANESA A LA NAPOLITANA', 
    d: 'Milanesa ( pollo o ternera ), salsa, jamon, muzarella y tomate', 
    p: 16000, 
    i: 'https://images.unsplash.com/photo-1606471191009-63994c53433b?w=300' 
  }
],
};