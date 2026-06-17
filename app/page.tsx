"use client";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Check, Zap, QrCode, MessageCircle, Menu, X, Layout,
  Smartphone, MousePointer2, HelpCircle, CreditCard, PlayCircle,
  BarChart3, PlusCircle, Globe, Copy, ExternalLink, Layers,
  Settings, ListChecks, Printer, Bell, ShieldCheck, ShoppingBag,
  Utensils, Carrot, Candy, Ticket, Percent, SmartphoneNfc,
  Store, Monitor, Wallet, Fish, Coffee, Pizza, CheckCircle2,
  UtensilsCrossed, Search, Link2, Palette, Share2
} from "lucide-react";


// 1. Tipamos el objeto de las galerías
interface GalleryItem {
  title: string;
  image: string;
  offset: string;
}

const galleries: GalleryItem[] = [
  { title: 'Hamburguesería', image: '/galeria/01.png', offset: 'lg:mt-0' },
  { title: 'Sushi Bar', image: '/galeria/02.png', offset: 'lg:mt-16' },
  { title: 'Cafeteria', image: '/galeria/03.png', offset: 'lg:mt-8' },
  { title: 'Pizeria', image: '/galeria/04.png', offset: 'lg:mt-24' },
  { title: 'Kiosco', image: '/galeria/05.png', offset: 'lg:mt-24' },
  { title: 'Restaurante', image: '/galeria/06.png', offset: 'lg:mt-24' }
];

// 2. Tipamos las Props del componente PhoneFrame
interface PhoneFrameProps {
  image: string;
  title: string;
  className?: string;
}

const PhoneFrame = ({ image, title, className = '' }: PhoneFrameProps) => (
  <div className={`group flex flex-col items-center ${className}`}>
    <div className="relative w-[220px] lg:w-[260px] transition-all duration-500 hover:-translate-y-3">
      <div className="mordisco-screen-modern relative aspect-[9/18.5] bg-gray-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none z-10" />
        <div className="mordisco-screen-modern absolute inset-0 border-[1px] border-white/10 pointer-events-none z-20" />
      </div>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[80%] h-6 bg-gray-200 blur-2xl rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
    <div className="mt-8">
      <span className="px-5 py-2 bg-white border border-gray-100 rounded-full text-[10px] font-black tracking-[0.2em] text-gray-800 shadow-sm uppercase italic">
        {title}
      </span>
    </div>
  </div>
);

interface Tutorial {
  title: string;
  duration: string;
  videoPath: string;
  thumbnail: string;
  isAvailable: boolean;
}

const TUTORIALS: Tutorial[] = [
  {
    title: "Primeros pasos snappy",
    duration: "4:22",
    videoPath: "/videos/primeros-pasos.mp4",
    thumbnail: "/thumbnails/paso1-cover.png",
    isAvailable: true 
  },
  {
    title: "Configura tus Extras",
    duration: "0:55",
    videoPath: "/videos/extras.mp4",
    thumbnail: "/thumbnails/extras-cover.png",
    isAvailable: false 
  },
  {
    title: "Panel de Comandas",
    duration: "1:45",
    videoPath: "/videos/comandas.mp4",
    thumbnail: "/thumbnails/comandas-cover.png",
    isAvailable: false 
  },
];
// --- 1. DATA DE DISEÑOS ---
const DISENOS_INFO: any = {
  marketpro: { label: 'Market Pro', color: 'bg-emerald-500', desc: 'Diseño tipo App nativa. Ideal para catálogos con muchos productos.' },
  urban: { label: 'Urban Dark', color: 'bg-zinc-900', desc: 'Estilo nocturno y premium. Resalta la fotografía.' },
  visualgrid: { label: 'Visual Grid', color: 'bg-orange-500', desc: 'Grilla visual impactante. Ideal para videos y fotos XL.' },
 elegant: { label: 'Minimal', color: 'bg-stone-200', desc: 'Estilo limpio, centrado y tipografía moderna. La opción más elegante.' }
};

// --- 2. DATA DE CONTENIDO (LO QUE ME PEDISTE) ---
const PREVIEW_STYLES = `
  .preview-viewport { width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden; text-align: left; position: relative; }
  .preview-viewport::-webkit-scrollbar { display: none; }

  /* --- ESPACIADO DE SEGURIDAD PARA LA ISLA (NOTCH) --- */
  .safe-top { padding-top: 45px !important; }

  /* MARKET PRO & URBAN (Grid) */
  .m-header { padding: 45px 10px 10px; text-align: center; } /* <-- Aumentado a 45px */
  .m-logo { width: 45px; height: 45px; border-radius: 50%; border: 1.5px solid #000; margin: 0 auto 8px; background-size: cover; background-position: center; }
  .m-search { margin: 0 12px 10px; background: #f3f4f6; border-radius: 8px; padding: 6px 10px; display: flex; align-items: center; gap: 6px; color: #9ca3af; font-size: 8px; }
  .m-banner { width: calc(100% - 24px); margin: 0 12px 12px; aspect-ratio: 16/8; border-radius: 12px; object-fit: cover; }
  .m-cats { display: flex; gap: 5px; padding: 0 12px 12px; overflow-x: hidden; }
  .m-pill { padding: 4px 10px; background: #f3f4f6; border-radius: 15px; font-size: 7px; font-weight: 900; text-transform: uppercase; white-space: nowrap; }
  .m-pill.active { background: #000; color: #fff; }
  
  .m-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; padding: 0 12px 20px; }
  .m-card { background: #fff; border: 1px solid #f3f4f6; border-radius: 10px; padding: 4px; text-align: center; display: flex; flex-direction: column; justify-content: space-between; }
  .m-img-box { aspect-ratio: 3/4; border-radius: 6px; overflow: hidden; margin-bottom: 4px; background: #eee; }
  .m-tit { font-size: 7px; font-weight: 900; text-transform: uppercase; line-height: 1.1; height: 16px; display: flex; align-items: center; justify-content: center; color: #111; }
  .m-price { font-size: 8px; font-weight: 900; color: #059669; margin: 2px 0; }
  .m-btn { width: 100%; background: #000; color: #fff; font-size: 6px; font-weight: 900; text-transform: uppercase; padding: 5px; border-radius: 5px; }

  /* URBAN DARK (Filas) */
  .u-container { background: #121212; color: #ffffff; padding: 45px 12px 12px; height: 100%; display: flex; flex-direction: column; } /* <-- Agregado 45px */
  .u-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
  .u-brand { display: flex; gap: 8px; align-items: center; }
  .u-logo { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; background-size: cover; background-position: center; }
  .u-names h4 { font-size: 13px; font-weight: 800; margin: 0; line-height: 1.1; color: #fff; }
  .u-names span { font-size: 9px; color: #888; display: block; }
  .u-status { background: #22c55e; color: #000; font-size: 8px; font-weight: 800; padding: 3px 6px; border-radius: 12px; }
  .u-msg { background: #1E1E1E; padding: 8px; border-radius: 8px; font-size: 9px; color: #fff; margin-bottom: 15px; border-left: 3px solid #ea580c; font-weight: 700; }
  .u-item { background: #1E1E1E; padding: 10px; border-radius: 14px; display: flex; gap: 10px; margin-bottom: 10px; position: relative; border: 1px solid rgba(255,255,255,0.05); }
  .u-img { width: 65px; height: 65px; background-size: cover; border-radius: 10px; background-position: center; flex-shrink: 0; background-color: #333; }
  .u-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .u-tit { font-weight: 800; font-size: 12px; color: #fff; margin-bottom: 2px; }
  .u-desc { font-size: 8px; color: #888; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .u-price { color: #ea580c; font-weight: 900; font-size: 12px; margin-top: 4px; }
  .u-add-btn { position: absolute; bottom: 10px; right: 10px; width: 24px; height: 24px; background: #ffffff; color: #121212; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }

  /* VISUAL GRID (Sushi) */
  .s-visual { background: #121212; color: white; min-height: 100%; padding-top: 45px; } /* ✅ Margen de seguridad */
  .s-header { padding: 0 12px 15px; display: flex; align-items: center; gap: 8px; }
  .s-logo { width: 35px; height: 35px; border-radius: 50%; border: 1.5px solid #ea580c; flex-shrink: 0; }
  .s-promo-capsule { background: #1a1a1a; border-left: 4px solid #ea580c; border-radius: 30px; padding: 8px 15px; margin: 0 12px 15px; display: flex; align-items: center; gap: 6px; font-size: 8px; font-weight: 800; color: white; }
  .s-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 0 12px 20px; }
  .s-item { aspect-ratio: 1/1.2; border-radius: 15px; position: relative; overflow: hidden; }
  .s-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%); padding: 8px; display: flex; flex-direction: column; justify-content: flex-end; }
  .s-tit { font-size: 10px; font-weight: 900; line-height: 1.1; text-transform: uppercase; color: white; margin-bottom: 2px; }
  .s-price { font-size: 11px; font-weight: 900; color: #ea580c; }

  /* MINIMAL (Minimalist) */
  .minimal-container { background: #ffffff; padding: 45px 15px 20px; text-align: center; font-family: 'Inter', sans-serif; color: #111; height: 100%; display: flex; flex-direction: column; } /* <-- Aumentado a 45px */
  .minimal-header { margin-bottom: 12px; position: relative; flex-shrink: 0; }
  .minimal-logo { width: 36px; height: 36px; background: #111; color: #fff; border-radius: 50%; margin: 0 auto 8px; display: grid; place-items: center; background-size: cover; border: 1px solid rgba(0,0,0,0.05); }
  .minimal-title { font-weight: 900; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; color: #111; }
  .minimal-desc { font-size: 8px; color: #777; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; }
  .minimal-msg { border: 1px solid rgba(0,0,0,0.05); background: #fafafa; padding: 8px; font-size: 9px; margin: 15px 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color: #111; flex-shrink: 0; }
  .minimal-item { padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.05); background: #fff; display: flex; justify-content: space-between; align-items: center; }
  .minimal-text-group { flex: 1; text-align: left; padding-right: 10px; }
  .minimal-prod { font-weight: 700; font-size: 13px; color: #111; line-height: 1.2; }
  .minimal-prod-desc { font-size: 9px; color: #999; margin-top: 2px; opacity: 0.7; line-height: 1.3; }
  .minimal-price { font-weight: 900; font-size: 11px; color: #000; }
  .minimal-btn { width: 24px; height: 24px; background-color: #111; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; border: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
`;

const PREVIEW_CONTENT: any = {
  hamburgueseria: {
    title: "KRUSTY BURGER",
    description: "Hamburguesería Premium", // <-- Agregado
    accent: "#ea580c",
    banner: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600", // <-- Foto de portada
    products: [
      { id: 'u1', n: "Cheese Lover", p: "9000", v: "/videos/cheese-lover.mp4" },
      { id: 'u4', n: "Hambur Completa", p: "7500", v: "/videos/hambur-completa.mp4" },
      { id: 'u2', n: "Papas King", p: "4200", i: "https://images.unsplash.com/photo-1585109649139-366815a0d713?w=200" }
    ]
  },
  sushi: {
    title: "SUSHI BAR",
    description: "El mejor sushi de la ciudad",
    accent: "#ea580c",
    banner: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600", // <-- Foto de portada
    products: [
      { id: 's1', n: "Dragon Roll", p: "12000", v: "/videos/dragon-sushi.mp4" },
      { id: 's2', n: "California Roll", p: "11500", i: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400" },
      { id: 's3', n: "Sashimi Mix", p: "9500", i: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400" }
    ]
  },
  cafeteria: {
    title: "CAFE CHICAGO",
    description: "Specialty Coffee & Bakery",
    accent: "#a855f7",
    banner: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600", // <-- Foto de portada
    products: [
      { id: 'm1', n: "Flat White", p: "3200", v: "/videos/cafeteria.mp4" },
      { id: 'm2', n: "Croissant", p: "2500", i: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200" },
      { id: 'm3', n: "Latte Art", p: "3500", i: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200" }
    ]
  },
  pizeria: {
    title: "DON CORLEONE",
    description: "Auténtica Pizza Napolitana",
    accent: "#d32f2f",
    banner: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600", // <-- Foto de portada
    products: [
      { id: 'p1', n: "Muzza Familiar", p: "11000", i: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200" },
      { id: 'p2', n: "Napolitana", p: "13500", v: "/videos/pizzeria.mp4" }
    ]
  }
};
const MenuPreview = ({ template, rubro }: { template: string, rubro: string }) => {
  const data = PREVIEW_CONTENT[rubro] || PREVIEW_CONTENT.hamburgueseria;
  
  return (
    <div className="w-full h-full relative">
      <style>{PREVIEW_STYLES}</style>
      
      {/* 1. DISEÑO VISUAL GRID (SUSHI) */}
{template === 'visualgrid' && (
        <div className="preview-viewport s-visual">
          <div className="s-header">
            <div className="s-logo bg-[#ea580c] flex items-center justify-center text-[8px] font-black italic">SUSHI</div>
            <div className="text-left leading-none">
              <h4 className="font-black italic text-sm text-white">SUSHI BAR</h4>
              <p className="text-[7px] opacity-40 uppercase">Premium Sushi</p>
            </div>
          </div>
          <div className="s-promo-capsule">
            <span>🍣</span> Happy Hour: 2x1 en Rolls.
          </div>
          <div className="s-grid">
            {data.products.map((p: any, i: number) => (
              <div key={i} className="s-item">
                 {p.v ? <video src={p.v} autoPlay loop muted playsInline className="w-full h-full object-cover" /> : <img src={p.i} className="w-full h-full object-cover" />}
                 <div className="s-overlay">
                   <div className="s-tit text-white">{p.n}</div>
                   <div className="s-price">${p.p}</div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. DISEÑO URBAN DARK (FILAS HORIZONTALES) */}
      {template === 'urban' && (
        <div className="preview-viewport u-container">
          <div className="u-top">
            <div className="u-brand">
              <div className="u-logo" style={{backgroundImage: "url('https://placehold.co/100/000/fff?text=MK')"}}></div>
              <div className="u-names">
                <h4>{data.title}</h4>
                <span>{data.description}</span>
              </div>
            </div>
            <div className="u-status">ABIERTO</div>
          </div>
          
          <div className="u-msg">PROMO: Envío gratis {rubro === 'hamburgueseria' ? '> $15.000' : 'en tu primera compra'}</div>
          
          <div className="flex-1">
            {data.products.map((p: any, i: number) => (
              <div key={i} className="u-item">
                <div className="u-img">
                   {p.v ? <video src={p.v} autoPlay loop muted playsInline className="w-full h-full object-cover rounded-[10px]" /> : <img src={p.i} className="w-full h-full object-cover rounded-[10px]" />}
                </div>
                <div className="u-info">
                  <div className="u-tit">{p.n}</div>
                  <div className="u-desc">{p.d || 'Delicioso producto preparado con los mejores ingredientes...'}</div>
                  <div className="u-price">${p.p}</div>
                </div>
                <button className="u-add-btn">+</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. DISEÑO MARKET PRO (GRILLA 3 COLUMNAS) */}
      {template === 'marketpro' && (
        <div className="preview-viewport bg-white">
          <div className="m-header">
             <div className="m-logo" style={{backgroundImage: "url('https://placehold.co/100/000/fff?text=MK')"}}></div>
             <h4 className="font-black italic uppercase text-xs text-gray-900">{data.title}</h4>
             <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-gray-400">{data.description}</p>
          </div>
          
          <div className="m-search">
            <Search size={10}/> <span>Buscar producto...</span>
          </div>

          <img src={data.banner} className="m-banner shadow-sm" alt="Portada" />

          <div className="m-cats">
            <div className="m-pill active">Todos</div>
            <div className="m-pill">Favoritos</div>
          </div>

          <div className="m-grid">
            {data.products.map((p: any, i: number) => (
              <div key={i} className="m-card">
                <div className="m-img-box shadow-inner">
                   {p.v ? <video src={p.v} autoPlay loop muted playsInline className="w-full h-full object-cover" /> : <img src={p.i} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <div className="m-tit text-gray-900">{p.n}</div>
                  <div className="m-price">${p.p}</div>
                  <button className="m-btn mt-1">Elegir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

  {/* ✅ 4. DISEÑO MINIMAL (REEMPLAZA A ELEGANT) */}
      {template === 'elegant' && (
        <div className="preview-viewport minimal-container">
          <div className="minimal-header">
            <div className="minimal-logo">
               <Coffee size={16}/>
            </div>
            <div className="minimal-title">{data.title}</div>
            <div className="minimal-desc">{data.description}</div>
          </div>

          <div className="minimal-msg">
            {rubro === 'cafeteria' ? 'CAFÉ DE ESPECIALIDAD' : 'ENVÍOS GRATIS'}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {data.products.map((p: any, i: number) => (
              <div key={i} className="minimal-item">
                <div className="minimal-text-group">
                  <div className="minimal-prod">{p.n}</div>
                  <div className="minimal-prod-desc">{p.d || 'Preparado con ingredientes frescos del día...'}</div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="minimal-price">${p.p}</div>
                  <button className="minimal-btn">+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function LandingPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- ESTADOS CORREGIDOS (SIN DUPLICADOS) ---
  const [activeTab, setActiveTab] = useState('marketpro'); 
  const [activeRubro, setActiveRubro] = useState('hamburgueseria');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [aliasCopied, setAliasCopied] = useState(false);
  const [videoStep, setVideoStep] = useState<'idle' | 'choosing' | 'playing'>('idle');
  const [videoSource, setVideoSource] = useState('');
  const [activeTutorialData, setActiveTutorialData] = useState<any>(null);
  const [showSoonToast, setShowSoonToast] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'light' | 'plus'>('light');
  const [showWhatsAppSim, setShowWhatsAppSim] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [activeMode, setActiveMode] = useState<'delivery' | 'takeaway' | 'mesa'>('delivery');

  // 2. Agregá este useEffect al principio del componente
  useEffect(() => {
    const checkPWAFlow = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

 if (isStandalone) {
        // Si es la App y no está logueado, al login
        router.replace('/login');
      }
    };
    checkPWAFlow();
  }, [router, supabase]);

  useEffect(() => {
    setActiveStep(0);
    const stepCount = activeMode === 'mesa' ? 4 : 5;
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % stepCount);
    }, 2000);
    return () => clearInterval(interval);
  }, [activeMode]);

  // Función para manejar la apertura de tutoriales con validación de disponibilidad
  const openTutorial = (video: any) => {
    if (!video.isAvailable) {
      setShowSoonToast(true);
      setTimeout(() => setShowSoonToast(false), 3000); // El aviso desaparece en 3 segundos
      return;
    }
    
    setActiveTutorialData(video);
    setVideoSource(video.videoPath); 
    setVideoStep('playing');
  };

  // Función para el link de YouTube que todavía no está listo
  const handleYoutubeClick = (e: React.MouseEvent) => {
    e.preventDefault(); 
    setShowSoonToast(true);
    setTimeout(() => setShowSoonToast(false), 3000);
  };

  const handleCopyAlias = () => {
    navigator.clipboard.writeText("luciano.mp");
    setAliasCopied(true);
    setTimeout(() => setAliasCopied(false), 2000);
  };

  const seguimientoModes = {
    delivery: {
      headerSub: 'PEDIDO #4f2a',
      headerMain: 'Delivery',
      steps: [
        { icon: ShoppingBag,  label: 'Enviado',         desc: 'Pedido recibido' },
        { icon: CheckCircle2, label: 'Confirmado',       desc: 'El local aceptó' },
        { icon: Utensils,     label: 'En preparación',   desc: 'Cocina trabajando' },
        { icon: Zap,          label: 'En camino',        desc: 'El repartidor salió' },
        { icon: CheckCircle2, label: 'Entregado',        desc: '¡Llegó tu pedido!' },
      ],
      leftSteps: [
        { icon: ShoppingBag,  label: 'Enviado',         desc: 'El cliente hace el pedido desde el menú' },
        { icon: CheckCircle2, label: 'Confirmado',       desc: 'Vos aceptás el pedido desde el panel' },
        { icon: Utensils,     label: 'En preparación',   desc: 'La cocina está trabajando' },
        { icon: Zap,          label: 'En camino',        desc: 'El repartidor salió' },
        { icon: CheckCircle2, label: 'Entregado',        desc: '¡Llegó el pedido!' },
      ],
    },
    takeaway: {
      headerSub: 'RETIRO #4f2a',
      headerMain: 'Takeaway',
      steps: [
        { icon: ShoppingBag,  label: 'Enviado',             desc: 'Pedido recibido' },
        { icon: CheckCircle2, label: 'Confirmado',           desc: 'El local aceptó' },
        { icon: Utensils,     label: 'En preparación',       desc: 'Cocina trabajando' },
        { icon: Zap,          label: 'Listo para retirar',   desc: 'Pasá a buscarlo' },
        { icon: CheckCircle2, label: 'Retirado',             desc: '¡Hasta la próxima!' },
      ],
      leftSteps: [
        { icon: ShoppingBag,  label: 'Enviado',             desc: 'El cliente hace el pedido desde el menú' },
        { icon: CheckCircle2, label: 'Confirmado',           desc: 'Vos aceptás el pedido desde el panel' },
        { icon: Utensils,     label: 'En preparación',       desc: 'La cocina está trabajando' },
        { icon: Zap,          label: 'Listo para retirar',   desc: 'El cliente pasa a buscarlo' },
        { icon: CheckCircle2, label: 'Retirado',             desc: '¡Hasta la próxima!' },
      ],
    },
    mesa: {
      headerSub: 'MESA 1',
      headerMain: 'Mesa 1',
      steps: [
        { icon: ShoppingBag,  label: 'Enviado',           desc: 'Pedido recibido' },
        { icon: CheckCircle2, label: 'Confirmado',         desc: 'El local aceptó' },
        { icon: Utensils,     label: 'En preparación',     desc: 'Cocina trabajando' },
        { icon: Zap,          label: 'Entregado en mesa',  desc: '¡Buen provecho!' },
      ],
      leftSteps: [
        { icon: ShoppingBag,  label: 'Enviado',           desc: 'El cliente pide desde la mesa' },
        { icon: CheckCircle2, label: 'Confirmado',         desc: 'Vos aceptás el pedido desde el panel' },
        { icon: Utensils,     label: 'En preparación',     desc: 'La cocina está trabajando' },
        { icon: Zap,          label: 'Entregado en mesa',  desc: 'El mozo lleva el pedido a la mesa' },
      ],
    },
  };
  const currentMode = seguimientoModes[activeMode];
  const badgeColors = [
    'bg-blue-500/20 text-blue-400',
    'bg-yellow-500/20 text-yellow-400',
    'bg-orange-500/20 text-orange-400',
    'bg-green-500/20 text-green-400',
    'bg-green-500/20 text-green-400',
  ];

  return (
    <div className="min-h-screen bg-[#f5f2e8] font-sans text-gray-900 selection:bg-green-100 overflow-x-hidden">
     {/* --- NAVBAR RESPONSIVE CON LINKS --- */}
      <nav className="fixed top-0 w-full z-[100] bg-[#f5f2e8]/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-snappy.svg" alt="Snappy" width={32} height={32} />
            <span className="font-bold text-2xl tracking-tight">Snappy.</span>
          </Link>

          {/* Menú Escritorio */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#negocios" className="text-sm font-bold text-gray-500 hover:text-black transition uppercase tracking-widest">Funcionalidades</Link>
            <Link href="#planes" className="text-sm font-bold text-gray-500 hover:text-black transition uppercase tracking-widest">Precios</Link>
            <Link href="/login" className="text-sm font-bold text-gray-600 hover:text-black transition uppercase tracking-widest">Iniciar Sesión</Link>
            <Link
              href="/login"
              className="bg-black text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-gray-800 transition shadow-lg flex items-center gap-2"
            >
              Prueba Gratis <ArrowRight size={16} />
            </Link>
          </div>

          {/* Botón Hamburguesa (Móvil) */}
          <button 
            className="md:hidden p-2 text-gray-900"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Menú Desplegable Móvil (Centrado) */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#f5f2e8] border-b border-gray-100 p-8 flex flex-col items-center gap-6 animate-in fade-in slide-in-from-top-5">
            <Link href="#negocios" className="text-sm font-black uppercase tracking-[0.2em] text-gray-500" onClick={() => setIsMenuOpen(false)}>
              Funcionalidades
            </Link>
            <Link href="#planes" className="text-sm font-black uppercase tracking-[0.2em] text-gray-500" onClick={() => setIsMenuOpen(false)}>
              Precios
            </Link>
            <hr className="w-full border-gray-200" />
            <Link href="/login" className="text-lg font-black uppercase tracking-widest text-gray-900 text-center" onClick={() => setIsMenuOpen(false)}>
              Iniciar Sesión
            </Link>
            <Link 
              href="/login" 
              className="w-full bg-black text-white text-center py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl"
              onClick={() => setIsMenuOpen(false)}
            >
              Empezar Ahora
            </Link>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm px-4 py-1.5 rounded-full text-xs font-bold mb-8 text-gray-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>{" "}
              🚀 Para gastronomía, kioscos, dietéticas y más
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-8 leading-[1.05]">
              Tu negocio digital,
              <br />
              en minutos.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-gray-900">
                Para gastronomía, kioscos y más.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Menú digital, pedidos por WhatsApp o panel propio, QR de mesa, reservas y SnappyLinks. Todo desde un solo lugar, para cualquier tipo de negocio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/login"
                className="bg-black text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-800 transition shadow-xl flex items-center justify-center gap-2"
              >
                Empezar Ahora <Zap size={20} fill="currentColor" />
              </Link>
              <Link
                href="/demo"
                className="bg-white text-gray-700 border border-gray-200 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                Ver Demo
              </Link>
            </div>
          </div>

      
          <div className="relative flex justify-center lg:justify-end items-center h-[600px] md:h-[650px] mt-12 lg:mt-0">
            <img src="/mockup-hero.svg" alt="Snappy en acción" className="w-full h-auto max-h-[600px] object-contain" />
          </div>
        </div>
      </section>

   {/* --- SECCIÓN RUBROS (DISEÑO IMG 1) --- */}
<section
  id="negocios"
  className="py-24 bg-white border-y border-gray-100"
>
  <div className="max-w-7xl mx-auto px-6 text-center">
    <h2 className="text-4xl font-extrabold tracking-tight mb-4 uppercase">
      PARA TODO TIPO DE COMERCIO
    </h2>
    <p className="text-gray-500 text-lg mb-16">
      Una solución adaptable que crece con tu negocio, sin importar el rubro.
    </p>

    {/* Centrado: Cambiamos a grid-cols-3 y limitamos el ancho máximo */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {[
        {
          title: "GASTRONOMÍA",
          desc: "Eliminá el error de comanda y ahorrá comisiones. ",
          icon: <Utensils className="text-orange-500" />,
          bg: "bg-orange-50",
        },
        {
          title: "KIOSCOS",
          desc: "Vendé 24/7 sin estar pegado al teléfono.",
          icon: <Store className="text-blue-500" />,
          bg: "bg-blue-50",
        },
        {
          title: "VERDULERÍAS",
          desc: "Fruterías, dietéticas y productos orgánicos. Actualizá precios y stock del día en un clic",
          icon: <Carrot className="text-green-500" />,
          bg: "bg-green-50",
        },
      ].map((item, i) => (
        <div
          key={i}
          className="bg-white p-8 rounded-3xl text-left border border-gray-100 shadow-sm hover:shadow-xl transition-all"
        >
          <div
            className={`${item.bg} w-12 h-12 rounded-2xl flex items-center justify-center mb-6`}
          >
            {item.icon}
          </div>
          <h3 className="font-bold text-lg mb-4">{item.title}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            {item.desc}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>

{/* --- SECCIÓN: 3 PILARES --- */}
<section className="py-24 bg-gray-50 border-b border-gray-100">
  <div className="max-w-7xl mx-auto px-6">
    <div className="text-center mb-16">
      <h2 className="text-4xl font-extrabold tracking-tight mb-4">
        Todo lo que necesita tu negocio
      </h2>
      <p className="text-gray-500 text-lg">
        Desde el menú digital hasta la reserva de mesa — para restaurantes, kioscos, dietéticas, heladerías y cualquier negocio que venda por unidad o por peso.
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
        <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
          <Smartphone size={20} className="text-orange-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-3">Tu menú, siempre actualizado</h3>
        <p className="text-gray-500 text-xs leading-relaxed">
          Creá y editá tu catálogo desde el panel. Tus clientes la ven desde el celular, sin apps ni PDFs. Categorizá, agregá fotos y precios en minutos.
        </p>
      </div>
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          <QrCode size={20} className="text-blue-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-3">Escaneán el QR y piden al instante</h3>
        <p className="text-gray-500 text-xs leading-relaxed">
          Cada punto de venta tiene su propio QR. El cliente escanea, elige lo que quiere y el pedido llega directo al panel. Sin esperar a nadie.
        </p>
      </div>
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
        <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
          <Bell size={20} className="text-green-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-3">Reservas sin llamadas</h3>
        <p className="text-gray-500 text-xs leading-relaxed">
          Tus clientes reservan su turno o mesa desde el menú. Vos confirmás o rechazás desde el panel, y ellos reciben la confirmación al instante.
        </p>
      </div>
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
        <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center mb-4">
          <Percent size={20} className="text-purple-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-3">Descuentos y cupones</h3>
        <p className="text-gray-500 text-xs leading-relaxed">
          Creá códigos de descuento para fidelizar a tus clientes. Porcentaje o monto fijo, con fecha de vencimiento y límite de usos. Disponible en plan Go en adelante.
        </p>
      </div>
    </div>
  </div>
</section>

{/* --- SECCIÓN: GESTIÓN DE SALÓN EN TIEMPO REAL --- */}
<section className="py-24 bg-black text-white overflow-hidden">
  <div className="max-w-7xl mx-auto px-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

      {/* TEXTO */}
      <div>
        <span className="inline-block px-3 py-1 bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-white/10 mb-6">
          Panel de gestión en tiempo real
        </span>
        <h2 className="text-4xl font-extrabold tracking-tight mb-6 leading-tight">
          Sabés exactamente qué pasa en tu negocio
        </h2>
        <p className="text-gray-400 text-lg leading-relaxed mb-10 font-medium">
          Pedido nuevo, en preparación, listo para entregar — todo visible desde tu panel sin recargar la página.
        </p>

        <ul className="space-y-5 mb-10">
          {[
            { icon: Zap,          text: 'Pedidos actualizados en tiempo real, sin recargar' },
            { icon: Bell,         text: 'Alerta inmediata cuando entra un pedido nuevo' },
            { icon: CheckCircle2, text: 'Aceptá pedidos y gestioná el estado desde el panel' },
            { icon: QrCode,       text: 'Cada punto de venta tiene su propio QR' },
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <item.icon size={16} className="text-gray-300" />
              </div>
              <span className="text-gray-300 font-medium">{item.text}</span>
            </li>
          ))}
        </ul>

      </div>

      {/* MOCKUP PANEL — MESAS + COMANDAS */}
      <div className="relative flex justify-center items-start lg:items-center">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[400px] h-[350px] bg-white/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative w-full max-w-[700px] bg-gray-950 rounded-3xl border border-white/10 shadow-[0_0_60px_-10px_rgba(255,255,255,0.08)] p-4 flex flex-col md:flex-row gap-4">

          {/* COLUMNA IZQUIERDA — Mesas */}
          <div className="md:w-[38%] shrink-0 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-white">Gestión de Salón</p>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full text-[8px] font-black text-green-400 uppercase tracking-widest">
                <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" /> En vivo
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">

              {/* Mesa 1 — LIBRE */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col gap-1">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Mesa 1</p>
                <span className="text-[7px] font-black text-gray-600 uppercase">Disponible</span>
                <button className="mt-1 w-full py-1 rounded-lg bg-white/5 border border-white/10 text-[7px] font-black text-gray-600 uppercase cursor-default">Abrir</button>
              </div>

              {/* Mesa 2 — NUEVO PEDIDO */}
              <div className="bg-amber-500/5 border border-amber-400/50 rounded-xl p-2 flex flex-col gap-1">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Mesa 2</p>
                <span className="text-[7px] font-black text-amber-400 uppercase animate-bounce">🆕 Nuevo</span>
                <span className="text-[9px] font-black text-white">$25.000</span>
                <button className="mt-1 w-full py-1 rounded-lg bg-amber-500/10 border border-amber-400/40 text-[7px] font-black text-amber-400 uppercase cursor-default">Abrir</button>
              </div>

              {/* Mesa 3 — OCUPADA */}
              <div className="bg-white border border-orange-400/60 rounded-xl p-2 flex flex-col gap-1">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Mesa 3</p>
                <span className="text-[7px] font-black text-orange-500 uppercase">Ocupada</span>
                <span className="text-[9px] font-black text-gray-800">$18.500</span>
                <button className="mt-1 w-full py-1 rounded-lg bg-orange-50 border border-orange-300 text-[7px] font-black text-orange-500 uppercase cursor-default">Abrir</button>
              </div>

              {/* Mesa 4 — LLAMANDO AL MOZO */}
              <div className="bg-red-500/5 border-2 border-red-500/60 rounded-xl p-2 flex flex-col gap-1 animate-pulse">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Mesa 4</p>
                <span className="text-[7px] font-black text-red-400 uppercase">🚨 ¡Llama!</span>
                <span className="text-[9px] font-black text-white">$31.000</span>
                <button className="mt-1 w-full py-1 rounded-lg bg-red-500/10 border border-red-500/40 text-[7px] font-black text-red-400 uppercase cursor-default">Abrir</button>
              </div>

              {/* Mesa 5 — PAGO PENDIENTE */}
              <div className="bg-purple-500/5 border border-purple-500/40 rounded-xl p-2 flex flex-col gap-1">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Mesa 5</p>
                <span className="text-[7px] font-black text-purple-400 uppercase">Pago Pend.</span>
                <span className="text-[9px] font-black text-white">$14.200</span>
                <button className="mt-1 w-full py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-[7px] font-black text-purple-400 uppercase cursor-default">Abrir</button>
              </div>

              {/* Mesa 6 — LIBRE */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col gap-1">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Mesa 6</p>
                <span className="text-[7px] font-black text-gray-600 uppercase">Disponible</span>
                <button className="mt-1 w-full py-1 rounded-lg bg-white/5 border border-white/10 text-[7px] font-black text-gray-600 uppercase cursor-default">Abrir</button>
              </div>

            </div>
          </div>

          {/* COLUMNA DERECHA — Comandas (oculta en mobile) */}
          <div className="hidden md:flex flex-col flex-1 min-w-0 gap-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-white">Pedidos</p>
              <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[8px] font-black text-gray-400 uppercase tracking-widest">3 activos</span>
            </div>

            {/* Comanda 1 — Pendiente */}
            <div className="bg-amber-500/5 border border-amber-400/30 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-400/30 rounded-full text-[7px] font-black text-amber-400 uppercase tracking-widest">⏳ Pendiente</span>
                <span className="text-[11px] font-black text-white">$25.000</span>
              </div>
              <p className="text-[10px] font-black text-white uppercase tracking-wide">Luciano</p>
              <div className="flex gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-[7px] font-black text-blue-400 uppercase">🛵 Delivery</span>
                <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[7px] font-black text-gray-400 uppercase">Efectivo</span>
              </div>
              <p className="text-[8px] text-gray-600">Av. San Martín 1234</p>
              <p className="text-[8px] text-gray-500">x1 Milanesa a la napolitana · $25.000</p>
              <button className="w-full py-1.5 bg-green-700 rounded-xl text-[8px] font-black text-white uppercase tracking-wide cursor-default">✓ Aceptar Pedido</button>
            </div>

            {/* Comanda 2 — En cocina */}
            <div className="bg-orange-500/5 border border-orange-400/30 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-400/30 rounded-full text-[7px] font-black text-orange-400 uppercase tracking-widest">🍳 En cocina</span>
                <span className="text-[11px] font-black text-white">$18.500</span>
              </div>
              <p className="text-[10px] font-black text-white uppercase tracking-wide">Martina</p>
              <div className="flex gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded text-[7px] font-black text-orange-400 uppercase">🏪 Retiro</span>
                <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[7px] font-black text-gray-400 uppercase">Transferencia</span>
              </div>
              <p className="text-[8px] text-gray-500">x2 Empanadas $12.000 · x1 Coca 500cc $6.500</p>
              <button className="w-full py-1.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-[8px] font-black text-amber-400 uppercase tracking-wide cursor-default">⚡ Marcar Entregado</button>
            </div>

            {/* Comanda 3 — Finalizado */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-2 opacity-60">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full text-[7px] font-black text-green-500 uppercase tracking-widest">✓ Finalizado</span>
                <span className="text-[11px] font-black text-white">$31.000</span>
              </div>
              <p className="text-[10px] font-black text-white uppercase tracking-wide">Carlos</p>
              <div className="flex gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-[7px] font-black text-purple-400 uppercase">🪑 Mesa 4</span>
                <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[7px] font-black text-gray-400 uppercase">Efectivo</span>
              </div>
              <p className="text-[8px] text-gray-500">x1 Bife de chorizo · $31.000</p>
              <button className="w-full py-1.5 bg-transparent border border-white/20 rounded-xl text-[8px] font-black text-gray-400 uppercase tracking-wide cursor-default">Chat Directo</button>
            </div>

          </div>

        </div>
      </div>

    </div>
  </div>
</section>

      {/* --- GESTIÓN TOTAL: RESTAURADA + QR/TICKETS --- */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight">
              Gestión total, cero estrés
            </h2>
            <p className="text-gray-500 mt-4 text-lg">
              Todo lo necesario para digitalizar tu negocio hoy mismo.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm group hover:-translate-y-2 transition-all duration-300 hover:shadow-xl">
              <BarChart3
                size={32}
                className="text-violet-600 mb-6 group-hover:scale-110 transition-transform"
              />
              <h3 className="text-xl font-bold mb-4 text-gray-900">
                Caja y Métricas
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">
                Controla tus ventas diarias y descubre qué es lo que más piden
                tus clientes.
              </p>
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <CreditCard
                  size={32}
                  className="text-green-600 group-hover:scale-110 transition-transform"
                />
                <div
                  onClick={handleCopyAlias}
                  className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 cursor-pointer hover:bg-violet-50 transition relative group/alias"
                >
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">
                    luciano.mp
                  </span>
                  <Copy
                    size={12}
                    className="text-gray-400 group-hover/alias:text-violet-600"
                  />
                  {aliasCopied && (
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded shadow-xl font-bold">
                      ¡Copiado!
                    </span>
                  )}
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">
                Copiado de Alias
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">
                El cliente copia tu Alias con un toque. Facilita transferencias
                sin errores.
              </p>
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm group hover:-translate-y-2 transition-all duration-300 hover:shadow-xl">
              <QrCode
                size={32}
                className="text-blue-600 mb-6 group-hover:scale-110 transition-transform"
              />
              <h3 className="text-xl font-bold mb-4 text-gray-900">
                QR por Mesa
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">
                Pedidos directos desde la mesa con identificación automática en
                tu panel.
              </p>
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm group hover:-translate-y-2 transition-all duration-300 hover:shadow-xl">
              <Store
                size={32}
                className="text-orange-600 mb-6 group-hover:scale-110 transition-transform"
              />
              <h3 className="text-xl font-bold mb-4 text-gray-900">
                Gestión de Salón
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">
                Controla el estado de tus mesas (Libre/Reservada) en tiempo
                real.
              </p>
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm group hover:-translate-y-2 transition-all duration-300 hover:shadow-xl">
              <Printer
                size={32}
                className="text-gray-700 mb-6 group-hover:scale-110 transition-transform"
              />
              <h3 className="text-xl font-bold mb-4 text-gray-900">
                Impresión de Tickets
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">
                Imprime comandas para cocina o tickets para clientes con un solo
                clic.
              </p>
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm group hover:-translate-y-2 transition-all duration-300 hover:shadow-xl">
              <Globe
                size={32}
                className="text-blue-600 mb-6 group-hover:scale-110 transition-transform"
              />
              <h3 className="text-xl font-bold mb-4 text-gray-900">
                Link para Redes
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">
                Un solo enlace profesional para tu Bio que centraliza todos tus
                pedidos.
              </p>
            </div>
          </div>
        </div>
      </section>

{/* --- SECCIÓN: SEGUIMIENTO DEL PEDIDO --- */}
<section className="py-24 bg-gray-900 text-white overflow-hidden">
  <div className="max-w-7xl mx-auto px-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

      {/* TEXTO + PILLS + STEPPER */}
      <div>
        <h2 className="text-4xl font-extrabold tracking-tight mb-6 leading-tight">
          El cliente sabe exactamente<br /> dónde está su pedido
        </h2>
        <p className="text-gray-400 text-lg leading-relaxed font-medium">
          Desde que confirma el pedido hasta que llega, ve el estado en tiempo real. Sin llamadas, sin mensajes de WhatsApp preguntando &quot;¿cuánto falta?&quot;.
        </p>

        {/* PILLS */}
        <div className="flex gap-3 mt-8 mb-10">
          {([
            { id: 'delivery', label: '🛵 Delivery' },
            { id: 'takeaway', label: '🏪 Takeaway' },
            { id: 'mesa', label: '🪑 Mesa' },
          ] as const).map(mode => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`px-5 py-2 rounded-full text-sm font-black uppercase tracking-wide transition-all ${
                activeMode === mode.id
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* STEPPER TEXTO */}
        <div className="space-y-0">
          {currentMode.leftSteps.map((step, i, arr) => (
            <div key={i} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-green-500">
                  <step.icon size={18} className="text-white" />
                </div>
                {i < arr.length - 1 && <div className="w-0.5 h-8 bg-white/10 mt-1" />}
              </div>
              <div className="pt-1.5 pb-8">
                <p className="font-black text-sm uppercase tracking-wide text-white">{step.label}</p>
                <p className="text-gray-500 text-xs mt-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MOCKUP TELÉFONO ANIMADO */}
      <div className="relative flex justify-center items-center">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[220px] h-[440px] bg-green-500/10 rounded-full blur-[60px]" />
        </div>

        <div className="relative w-[260px] bg-gray-950 rounded-[3rem] border-[3px] border-gray-800 shadow-[0_0_60px_-10px_rgba(34,197,94,0.3)] overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90px] h-[22px] bg-gray-950 rounded-b-2xl z-20" />

          <div className="pt-10 pb-4 px-4 flex flex-col min-h-[520px]">
            {/* Header */}
            <div className="flex items-center justify-between pt-2 mb-3">
              <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{currentMode.headerSub}</p>
                <p className="text-white font-black text-sm uppercase tracking-tight">{currentMode.headerMain}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-500 ${badgeColors[Math.min(activeStep, badgeColors.length - 1)]}`}>
                {currentMode.steps[activeStep]?.label ?? currentMode.steps[currentMode.steps.length - 1].label}
              </span>
            </div>

            <div className="h-px bg-white/5 mb-4" />

            {/* Stepper */}
            <div className="flex flex-col flex-1">
              {currentMode.steps.map((step, i, arr) => {
                const isDone   = i < activeStep;
                const isActive = i === activeStep;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                        isDone   ? 'bg-green-500' :
                        isActive ? 'bg-green-500 ring-4 ring-green-500/20 animate-pulse' :
                                   'bg-white/10'
                      }`}>
                        <step.icon size={14} className={isDone || isActive ? 'text-white' : 'text-gray-600'} />
                      </div>
                      {i < arr.length - 1 && (
                        <div className={`w-0.5 h-7 mt-1 transition-all duration-700 ${isDone ? 'bg-green-500/60' : 'bg-white/10'}`} />
                      )}
                    </div>
                    <div className="pt-1 pb-7">
                      <p className={`text-[11px] font-black uppercase tracking-wide transition-colors duration-300 ${
                        isActive ? 'text-green-400' : isDone ? 'text-white' : 'text-gray-600'
                      }`}>{step.label}</p>
                      <p className="text-gray-600 text-[9px] mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer botones (solo Mesa) */}
            {activeMode === 'mesa' && (
              <>
                <div className="h-px bg-white/5 mb-3" />
                <div className="flex gap-2">
                  <button className="flex-1 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-default">
                    <Bell size={13} /> Llamar Mozo
                  </button>
                  <button className="flex-1 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-default">
                    <CreditCard size={13} /> Pagar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

  {/* --- SECCIÓN: DISEÑOS QUE ENAMORAN (CON VIDEOS DINÁMICOS) --- */}
<section id="disenos" className="py-24 bg-white relative border-y border-gray-100">
  <div className="max-w-7xl mx-auto px-6">
    <div className="text-center mb-16">
      <h2 className="text-4xl font-extrabold tracking-tight uppercase mb-4 italic">
        DISEÑOS QUE ENAMORAN
      </h2>
      <p className="text-gray-500 text-lg font-medium">
        Tu menú, tu estilo. Elegí un diseño y probalo con tu tipo de negocio — ves exactamente cómo lo ven tus clientes.
      </p>
    </div>

    {/* SELECTORES COMBINADOS */}
    <div className="flex flex-col items-center gap-8 mb-16">
      {/* 1. ELEGIR PLANTILLA */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">1. Seleccioná el Estilo</span>
        <div className="flex flex-wrap justify-center gap-3 bg-gray-50 p-2 rounded-3xl border border-gray-100">
          {['marketpro', 'urban', 'visualgrid', 'elegant'].map((id) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all 
                ${activeTab === id ? 'bg-black text-white shadow-lg scale-105' : 'text-gray-400 hover:text-black'}`}
            >
              {DISENOS_INFO[id].label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. ELEGIR RUBRO */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">2. Seleccioná el Rubro</span>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { id: 'hamburgueseria', label: 'Hamburguesería', icon: UtensilsCrossed },
            { id: 'sushi', label: 'Sushi Bar', icon: Fish },
            { id: 'cafeteria', label: 'Cafetería', icon: Coffee },
            { id: 'pizeria', label: 'Pizzería', icon: Pizza }
          ].map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.id}
                onClick={() => setActiveRubro(r.id)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase flex items-center gap-2 transition-all border-2
                  ${activeRubro === r.id 
                    ? 'bg-green-500 text-white border-green-500 shadow-md scale-105' 
                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
              >
                <Icon size={14}/> {r.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>

    <div className="flex flex-col md:flex-row items-center justify-center gap-16">
      {/* MOCKUP CELULAR DINÁMICO */}
      <div className="relative border-gray-950 bg-black border-[12px] rounded-[3.5rem] h-[640px] w-[320px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden group transition-all duration-500 hover:scale-[1.02]">
        {/* Dynamic Island */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-b-3xl z-40 shadow-sm"></div>
        
        {/* Pantalla con el Video */}
        <div className="w-full h-full bg-white rounded-[2.6rem] overflow-hidden relative z-20">
        <MenuPreview 
    key={`${activeTab}-${activeRubro}`} 
    template={activeTab} 
    rubro={activeRubro} 
  />
          {/* Overlay de brillo para que parezca cristal */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
        </div>
      </div>

      {/* TEXTO INFORMATIVO DINÁMICO */}
      <div className="max-w-sm text-left space-y-8 animate-in slide-in-from-right-10 duration-700">
        <div className="space-y-4">
          <div className={`w-14 h-2 rounded-full ${DISENOS_INFO[activeTab].color}`}></div>
          <h3 className="text-5xl font-black uppercase italic tracking-tighter leading-none text-gray-900">
            {DISENOS_INFO[activeTab].label}
          </h3>
          <p className="text-gray-500 text-lg font-medium leading-relaxed">
            {DISENOS_INFO[activeTab].desc} <br/> 
            Diseño adaptado para resaltar lo mejor de tu <b>{activeRubro}</b>.
          </p>
        </div>
        
        <div className="space-y-4 border-l-4 border-gray-100 pl-6">
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><CheckCircle2 className="text-green-500" size={22}/> El cliente pide desde el celular, sin descargas</div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><CheckCircle2 className="text-green-500" size={22}/> Actualizá la carta en tiempo real</div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><CheckCircle2 className="text-green-500" size={22}/> Pedidos y reservas integrados desde el menú</div>
        </div>

        <Link href="/login" className="inline-flex items-center gap-1 bg-black text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-lg hover:bg-gray-800 hover:-translate-y-1 transition-all active:scale-95">
          QUIERO ESTE DISEÑO <Zap size={18} fill="currentColor"/>
        </Link>
        <Link href="/demo" className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-400 px-10 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:border-black hover:text-black transition-all w-full">
     VER DEMO COMPLETA <ArrowRight size={16} />
  </Link>
      </div>
    </div>
  </div>
</section>
      


      {/* --- PLANES (INFO ORIGINAL + PRECIO BLUR) --- */}

      <section
        id="planes"
        className="py-24 px-6 bg-white border-y border-gray-100"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4">
              Planes transparentes
            </h2>

            <p className="text-gray-500 text-lg">
              Sin comisiones por venta. Cancela cuando quieras.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-end">
  
{/* Plan 1: Light */}
      <div className="bg-white border border-gray-200 rounded-3xl p-8 transition flex flex-col hover:shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Light</h3>
        <p className="text-xs text-gray-400 mb-6 uppercase font-bold tracking-wider">Para empezar</p>
        <div className="mb-6">
          <span className="line-through text-gray-400 text-sm font-medium">$19.500</span>
          <div>
            <span className="text-3xl font-black text-gray-900">$15.000</span>
            <span className="text-gray-400 text-sm">/mes</span>
          </div>
        </div>
        <ul className="space-y-4 text-sm text-gray-600 flex-1 mb-8">
          <li className="flex items-start gap-3 text-left">
            <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" /> 
            <span><b>Hasta 15 Productos</b></span>
          </li>
          <li className="flex items-start gap-3 text-left">
            <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" /> 
            <span>Catálogo Digital Interactivo</span>
          </li>
          <li className="flex items-start gap-3 text-left group relative cursor-help">
      <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" /> 
      <div className="flex items-center gap-1.5">
        <span><b>Snapplink:</b> Hasta 2 enlaces</span>
        <HelpCircle size={13} className="text-gray-400 group-hover:text-green-600 transition-colors" />
        
        <div className="absolute bottom-full left-0 mb-2 w-64 p-4 bg-white text-gray-800 text-[10px] leading-relaxed rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gray-100 z-50">
          <p className="font-black uppercase text-green-600 mb-1">Bio-Link Esencial</p>
          Mantené tu perfil organizado. Un solo link para tu biografía con botones directos a tu <b>Menú Digital y tu WhatsApp</b>.
        </div>
      </div>
    </li>
          <li className="flex items-start gap-3 text-left">
            <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" /> 
            <span><b>Código QR</b> para tu local</span>
          </li>
          <li className="flex items-start gap-3 text-left">
            <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" /> 
            <span>Link para <b>Redes Sociales</b></span>
          </li>
          <li className="flex items-start gap-3 text-left">
            <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" /> 
            <span>Configuración de <b>Horarios</b></span>
          </li>
          <li className="flex items-start gap-3 text-left">
            <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" /> 
            <span>Pedidos directos a WhatsApp</span>
          </li>
        </ul>
        <Link href="/login" className="block w-full py-3 rounded-xl border-2 border-black text-center font-bold hover:bg-black hover:text-white transition text-sm">Prueba 14 días gratis</Link>
      </div>

      {/* Plan 2: GO */}
      <div className="bg-white border-2 border-blue-500 rounded-[35px] p-8 transition flex flex-col shadow-lg relative z-20">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase whitespace-nowrap">Ideal Crecimiento</div>
        <h3 className="text-lg font-bold text-blue-600 mb-1">GO</h3>
        <p className="text-xs text-gray-400 mb-6 uppercase font-bold tracking-wider">Más Potencia</p>
        <div className="mb-6">
          <span className="line-through text-gray-400 text-sm font-medium">$28.600</span>
          <div>
            <span className="text-3xl font-black text-gray-900">$22.000</span>
            <span className="text-gray-400 text-sm">/mes</span>
          </div>
        </div>
        <ul className="space-y-4 text-sm text-gray-600 flex-1 mb-8">
          <li className="flex items-start gap-3 text-left">
            <Check size={16} className="text-blue-500 flex-shrink-0 mt-0.5"/> 
            <span><b>Hasta 60 Productos</b></span>
          </li>
          <li className="flex items-start gap-3 text-left">
            <Check size={16} className="text-blue-500 flex-shrink-0 mt-0.5"/> 
            <span>Sube <b>Imágenes o Videos</b> 🎥</span>
          </li>
          <li className="flex items-start gap-3 text-left group relative cursor-help">
    <Check size={16} className="text-blue-500 flex-shrink-0 mt-0.5"/> 
    <div className="flex items-center gap-1.5">
      <span><b>Snapplink:</b> Hasta 4 enlaces</span>
      <HelpCircle size={13} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
      
      <div className="absolute bottom-full left-0 mb-2 w-64 p-4 bg-white text-gray-800 text-[10px] leading-relaxed rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gray-100 z-50">
        <p className="font-black uppercase text-blue-600 mb-1">Bio-Link</p>
        Un solo link para tu biografía que contiene botones para tus enlaces más importantes (<b>Menú, WhatsApp y Redes</b>). <br/><i>Límite: 4 botones.</i>
      </div>
    </div>
  </li>
          <li className="flex items-start gap-3 text-left">
            <Check size={16} className="text-blue-500 flex-shrink-0 mt-0.5"/> 
            <span>Pedidos al <b>Panel o WhatsApp</b></span>
          </li>
          <li className="flex items-start gap-3 text-left">
            <Check size={16} className="text-blue-500 flex-shrink-0 mt-0.5"/> 
            <span><b>Seguimiento en vivo</b> (Dueño y Cliente)</span>
          </li>
         <li className="flex items-start gap-3 text-left group relative cursor-help">
  <Check size={16} className="text-blue-500 flex-shrink-0 mt-0.5"/> 
  <div className="flex items-center gap-1.5">
    <span><b>Descuentos automáticos</b> por monto</span>
    <HelpCircle size={13} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
    
    {/* TOOLTIP EXPLICATIVO */}
    <div className="absolute bottom-full left-0 mb-2 w-64 p-4 bg-white text-gray-800 text-[10px] leading-relaxed rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gray-100 z-50">
      <p className="font-black uppercase text-blue-600 mb-1">Ventas inteligentes</p>
      Puedes crear reglas automáticas: por ejemplo, si superan cierto monto el <b>envío es gratis</b> o se <b>descuenta un monto/porcentaje</b> del total. Una experiencia de compra superior para tu cliente.
    </div>
  </div>
</li>
          <li className="flex items-start gap-3 text-left">
            <Check size={16} className="text-blue-500 flex-shrink-0 mt-0.5"/> 
            <span>Gestión de Cupones y Promos</span>
          </li>
        </ul>
        <Link href="/login" className="block w-full py-3 rounded-xl bg-blue-500 text-white text-center font-bold hover:bg-blue-600 transition text-sm">Prueba 14 días gratis</Link>
      </div>

 
{/* Plan 3: Plus */}
<div className="bg-gray-900 text-white border-2 border-gray-900 rounded-[35px] p-8 relative shadow-2xl flex flex-col z-10 transition hover:scale-[1.02]">
  <div className="absolute top-0 right-0 bg-green-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase">
    Más Elegido
  </div>
  
  <h3 className="text-xl font-bold text-green-400 mb-1 flex items-center gap-2">
    Plus <Zap size={18} fill="currentColor" />
  </h3>
  <p className="text-xs text-gray-400 mb-6 uppercase font-bold tracking-wider">Profesional</p>
  
  <div className="mb-6">
    <span className="line-through text-gray-500 text-sm font-medium">$45.500</span>
    <div>
      <span className="text-4xl font-black text-white">$35.000</span>
      <span className="text-gray-400 text-sm">/mes</span>
    </div>
  </div>

  <ul className="space-y-4 text-sm text-gray-300 flex-1 mb-8">
    <li className="flex items-start gap-3 text-left">
      <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5"/> 
      <span><b>Productos Ilimitados</b> ✨</span>
    </li>

    {/* --- SNAPPLINK: EXPLICACIÓN MEJORADA --- */}
    <li className="flex items-start gap-3 text-left group relative cursor-help">
  <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5"/> 
  <div className="flex items-center gap-1.5">
    <span><b>Snapplink:</b> Enlaces ilimitados</span>
    <HelpCircle size={13} className="text-gray-500 group-hover:text-green-400 transition-colors" />
    
    <div className="absolute bottom-full left-0 mb-2 w-64 p-4 bg-white text-gray-800 text-[10px] leading-relaxed rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gray-100 z-50">
      <p className="font-black uppercase text-green-600 mb-1">Bio-Link Premium</p>
      Centralizá todos tus enlaces sin límites. Agregá botones para cada red social, canales de atención y múltiples menús en una sola página profesional.
    </div>
  </div>
</li>

    <li className="flex items-start gap-3 text-left">
      <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5"/> 
      <span><b>Panel Pro</b> y Gestión de Caja</span>
    </li>
    <li className="flex items-start gap-3 text-left">
      <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5"/> 
      <span><b>Gestión de 2 Sucursales</b> (PRÓX.)</span>
    </li>
    <li className="flex items-start gap-3 text-left">
      <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5"/> 
      <span>Impresión de Tickets y <b>Mesas</b></span>
    </li>
    <li className="flex items-start gap-3 text-left">
      <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5"/> 
      <span>Gestión del <b>Salón</b></span>
    </li>
    <li className="flex items-start gap-3 text-left">
      <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5"/> 
      <span><b>Seguimiento en Vivo</b> 🚀</span>
    </li>
    <li className="flex items-start gap-3 text-left">
      <Check size={16} className="text-green-400 flex-shrink-0 mt-0.5"/> 
      <span>Acceso a todas las plantillas</span>
    </li>
  </ul>

  <Link 
    href="/login" 
    className="block w-full py-4 rounded-xl bg-green-500 text-black font-black text-center hover:bg-green-400 transition text-sm shadow-lg"
  >
    Prueba 14 días gratis
  </Link>
</div>

{/* Plan 4: Max */}
<div className="bg-white border border-gray-200 rounded-3xl p-8 flex flex-col h-full relative overflow-hidden transition hover:shadow-2xl">
  {/* BADGE DE PRÓXIMAMENTE */}
  <div className="absolute top-4 -right-8 bg-gray-100 text-gray-500 text-[8px] font-black px-10 py-1 rotate-45 uppercase tracking-widest border-b border-gray-200">
    Próximamente
  </div>

  <h3 className="text-lg font-bold text-gray-900 mb-1">Max</h3>
  <p className="text-xs text-gray-400 mb-6 uppercase font-bold tracking-wider">Escalabilidad Total</p>
  
  {/* PRECIO BORROSO */}
  <div className="mb-6 select-none">
    <span className="text-3xl font-black text-gray-900 blur-[5px]">$38.000</span>
    <span className="text-gray-400 text-sm ml-1">/mes</span>
  </div>

  <ul className="space-y-4 text-sm text-gray-600 flex-1 mb-8">
    <li className="flex items-start gap-3 text-left">
      <Check size={16} className="text-gray-400 flex-shrink-0 mt-0.5"/> 
      <span><b>Gestión de hasta 4 sucursales</b></span>
    </li>

    {/* --- INTEGRACIÓN CON BILLETERAS CON TOOLTIP --- */}
    <li className="flex items-start gap-3 text-left group relative cursor-help">
      <Check size={16} className="text-gray-400 flex-shrink-0 mt-0.5"/> 
      <div className="flex items-center gap-1.5">
        <span><b>Integración con billeteras virtuales</b></span>
        <HelpCircle size={13} className="text-gray-300 group-hover:text-black transition-colors" />
        
        {/* TOOLTIP EXPLICATIVO */}
        <div className="absolute bottom-full left-0 mb-2 w-64 p-4 bg-white text-gray-800 text-[10px] leading-relaxed rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gray-100 z-50">
          <p className="font-black uppercase text-blue-600 mb-1">Cobros Automatizados</p>
          Vinculá tu cuenta de <b>Mercado Pago o Ualá</b> para que tus clientes paguen directamente desde tu catálogo digital. Cobros rápidos, seguros y automáticos.
        </div>
      </div>
    </li>

    <li className="flex items-start gap-3 text-left group relative cursor-help">
      <Check size={16} className="text-gray-400 flex-shrink-0 mt-0.5"/> 
      <div className="flex items-center gap-1.5">
        <span><b>Envíos por rango geográfico</b></span>
        <HelpCircle size={13} className="text-gray-300 group-hover:text-black transition-colors" />
        
        <div className="absolute bottom-full left-0 mb-2 w-64 p-4 bg-white text-gray-800 text-[10px] leading-relaxed rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gray-100 z-50">
          <p className="font-black uppercase text-black mb-1">Logística Inteligente</p>
          Calculá el costo de envío exacto según la ubicación del cliente por radios de distancia (km).
        </div>
      </div>
    </li>

    <li className="flex items-start gap-3 text-left">
      <Check size={16} className="text-gray-400 flex-shrink-0 mt-0.5"/> 
      <span><b>Snapplink Premium:</b> Diseños exclusivos</span>
    </li>
  </ul>

  <button 
    disabled 
    className="w-full py-3 rounded-xl bg-gray-50 text-gray-400 font-bold cursor-not-allowed uppercase text-[10px] tracking-widest border border-gray-100"
  >
    Muy pronto
  </button>
</div>

</div>
        </div>
      </section>

{/* --- SECCIÓN: SNAPPYLINKS --- */}
      <section className="py-24 bg-gray-950 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* TEXTO */}
            <div>
              <span className="inline-block px-3 py-1 bg-green-600/10 text-green-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-600/20 mb-6">
                SnappyLinks
              </span>
              <h2 className="text-4xl font-extrabold tracking-tight mb-6 leading-tight">
                Todos tus links, en una sola página de Snappy
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-10 font-medium">
                Además de tu menú digital, Snappy te da una página de links personalizada: snappy.uno/tu-negocio-bio. Agregá tu WhatsApp, tus redes, tus plataformas de delivery y lo que quieras — todo con tus colores y tu logo, sin salir de Snappy.
              </p>

              <ul className="space-y-5 mb-6">
                {[
                  { icon: Link2,      text: 'Dos links propios: tu menú y tu página de links' },
                  { icon: Share2,     text: 'Agregá todos tus enlaces con un botón por link' },
                  { icon: Palette,    text: 'Personalizala con tus colores, logo y fondo' },
                  { icon: Smartphone, text: 'Se ve perfecto en cualquier celular' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <item.icon size={16} className="text-green-500" />
                    </div>
                    <span className="text-gray-300 font-medium">{item.text}</span>
                  </li>
                ))}
              </ul>

              <p className="text-green-500 font-semibold text-sm mb-10">
                ¿Ya usás una herramienta externa para agrupar tus links? Con SnappyLinks lo tenés incluido — sin cuentas extras, sin pagar otro servicio.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-green-700 text-white font-black text-sm uppercase tracking-wide rounded-2xl hover:bg-green-600 transition-colors shadow-lg shadow-green-900/40">
                  Crear mi SnappyLinks <ArrowRight size={16} />
                </Link>
                <a
                  href="https://wa.me/542324313123?text=Hola%2C%20quiero%20m%C3%A1s%20info%20sobre%20SnappyLinks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-transparent text-gray-300 font-black text-sm uppercase tracking-wide rounded-2xl border border-white/20 hover:border-white/40 hover:text-white transition-colors"
                >
                  Quiero más info
                </a>
              </div>
            </div>

            {/* MOCKUP TELÉFONO - BIO PAGE */}
            <div className="relative flex justify-center items-center">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[220px] h-[440px] bg-green-700/10 rounded-full blur-[60px]" />
              </div>

              <div className="relative w-[260px] bg-gray-950 rounded-[3rem] border-[3px] border-gray-800 shadow-[0_0_60px_-10px_rgba(34,197,94,0.3)] overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90px] h-[22px] bg-gray-950 rounded-b-2xl z-20" />

                <div className="pt-10 pb-6 px-4 flex flex-col min-h-[520px] bg-[#0d1117]">
                  {/* Header: avatar + nombre */}
                  <div className="flex flex-col items-center pt-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gray-700 border-2 border-green-600/30 mb-3 flex items-center justify-center">
                      <span className="text-2xl">🍔</span>
                    </div>
                    <p className="text-white font-black text-sm uppercase tracking-tight text-center leading-tight">
                      Mi Negocio
                    </p>
                    <p className="text-gray-500 text-[10px] mt-1">Mercedes, Buenos Aires</p>
                  </div>

                  {/* Links */}
                  <div className="flex flex-col gap-3 flex-1">
                    {[
                      { label: '🍔  Ver Menú', accent: true },
                      { label: '💬  WhatsApp', accent: false },
                      { label: '🛵  Pedidos Ya', accent: false },
                      { label: '📸  Instagram', accent: false },
                      { label: '📍  Cómo llegar', accent: false },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={`w-full py-2.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-wide text-center cursor-default border ${
                          item.accent
                            ? 'bg-green-700/20 border-green-600/40 text-green-500'
                            : 'bg-white/5 border-white/10 text-gray-300'
                        }`}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>

                  {/* Footer URL */}
                  <div className="mt-4 flex justify-center">
                    <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">snappy.uno/mi-negocio-bio</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- PREGUNTAS FRECUENTES --- */}
      <section className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <HelpCircle size={48} className="mx-auto text-green-600 mb-4" />
            <h2 className="text-4xl font-extrabold mb-4 uppercase tracking-tighter italic">
              Preguntas Frecuentes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: "¿Cobran comisión?",
                a: "No. Solo pagas la suscripción mensual fija. El 100% de tus ventas es para vos.",
              },
              {
                q: "¿Necesito una App?",
                a: "No. Snappy es una Webapp que se abre en cualquier navegador y se instala en el inicio.",
              },
              {
                q: "¿Cómo recibo pedidos?",
                a: "Directo a tu panel de gestión y un mensaje detallado a tu WhatsApp.",
              },
              {
                q: "¿Puedo cancelar?",
                a: "Sí, en cualquier momento desde tu panel de ajustes sin complicaciones.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-gray-50 p-8 rounded-[35px] border border-gray-100 hover:border-green-200 transition-all"
              >
                <h3 className="font-bold text-lg mb-3 flex items-center gap-3">
                  <span className="text-green-600 font-black">0{i + 1}.</span>{" "}
                  {faq.q}
                </h3>
                <p className="text-gray-500 leading-relaxed text-sm font-medium">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

{/* --- SECCIÓN: LO QUE VIENE (PRÓXIMAMENTE) --- */}
      <section className="py-32 bg-[#0a0a0a] text-white overflow-hidden relative border-t border-white/5">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic mb-6">
              LO QUE <span className="text-green-500">VIENE</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
              Estamos cocinando nuevas herramientas para que lleves tu negocio al siguiente nivel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: "Múltiples Sucursales", 
                desc: "Gestioná todos tus locales desde un solo panel centralizado. Ideal para franquicias y cadenas.", 
                icon: <Layers size={24}/> 
              },
              { 
                title: "Pagos con Tarjeta", 
                desc: "Aceptá crédito y débito directamente en el menú. Una experiencia de compra fluida y profesional.", 
                icon: <CreditCard size={24}/> 
              },
              { 
                title: "Billeteras Virtuales", 
                desc: "Vinculá tu cuenta de Mercado Pago o Ualá para recibir cobros automáticos y acreditación inmediata.", 
                icon: <Wallet size={24}/> 
              }
            ].map((item, i) => (
              <div key={i} className="group p-10 rounded-[40px] border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-all backdrop-blur-sm relative overflow-hidden">
                <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center mb-8 text-green-500 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-xl font-black uppercase italic mb-4">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                  {item.desc}
                </p>
                
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">En desarrollo</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-24 text-center">
            <p className="text-gray-500 text-sm font-bold uppercase tracking-[0.2em]">
              ¿Tenés una sugerencia? <a href="https://wa.me/542324313123" className="text-white hover:text-green-500 transition-colors underline decoration-green-500 underline-offset-4">Contanos por WhatsApp</a>
            </p>
          </div>
        </div>
      </section>




      {/* --- FOOTER: RESTAURADO EXACTAMENTE --- */}
      <footer className="py-20 bg-black text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px]"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center md:text-left grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6 justify-center md:justify-start">
              <Image
                src="/logo.svg"
                alt="Snappy"
                width={32}
                height={32}
                className="invert"
              />
              <span className="font-bold text-3xl tracking-tight">Snappy.</span>
            </div>
            <p className="text-gray-500 max-w-sm mb-8 mx-auto md:mx-0">
              Transformando la forma en que los comercios conectan con sus
              clientes a través de tecnología digital.
            </p>
            <div className="flex gap-6 justify-center md:justify-start">
              <a
                href="https://www.instagram.com/snappypedidos/"
                className="hover:text-green-500 transition font-bold uppercase text-xs tracking-widest"
              >
                Instagram
              </a>
           
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-green-500 uppercase text-[10px] tracking-[3px]">
              Producto
            </h4>
            <ul className="space-y-4 text-gray-500 text-sm font-medium">
              <li>
                <Link href="#funcionalidades">Funcionalidades</Link>
              </li>
              <li>
                <Link href="#planes">Precios</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-green-500 uppercase text-[10px] tracking-[3px]">
              Soporte
            </h4>
            <ul className="space-y-4 text-gray-500 text-sm font-medium">
              <li>
                <a href="https://wa.me/2324313123">WhatsApp</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/10 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-center md:text-left">
          <p>
            &copy; {new Date().getFullYear()} Snappy Menu. Todos los derechos
            reservados.
          </p>
        </div>
      </footer>
      {/* --- WHATSAPP FLOTANTE --- */}
      <a
        href="https://wa.me/542324313123?text=Hola%20necesito%20ayuda%20con%20snappy.."
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-[150] bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center group"
      >
        <MessageCircle size={32} fill="currentColor" className="text-white" />
        
        {/* Tooltip opcional que aparece al hacer hover */}
        <span className="absolute right-full mr-4 bg-white text-black text-xs font-bold px-4 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-gray-100 pointer-events-none">
          ¿Necesitás ayuda? 💬
        </span>
      </a>
    </div>
  );
}
