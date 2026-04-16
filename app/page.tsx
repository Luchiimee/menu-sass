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
  UtensilsCrossed, Search
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

  return (
    <div className="min-h-screen bg-[#f5f2e8] font-sans text-gray-900 selection:bg-green-100 overflow-x-hidden">
     {/* --- NAVBAR RESPONSIVE CON LINKS --- */}
      <nav className="fixed top-0 w-full z-[100] bg-[#f5f2e8]/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Snappy" width={32} height={32} />
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
              Nuevo: Seguimiento en vivo
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-8 leading-[1.05]">
              Recibí tus pedidos por WhatsApp 
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-gray-900">
                o en tu Panel de Snappy.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0">
              "Sin PDFs, imagenes ni mensajes desordenados. Tus clientes eligen, compran y recibís el pedido listo para despachar directamente en tu WP o panel de snappy.
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

      
          {/* --- MOCKUP TRIPLE CELULAR: VERSIÓN MOBILE GRANDE Y ESTILIZADA --- */}
          {/* Aumenté la altura base a h-[600px] para que sea más largo en mobile */}
          <div className="relative flex justify-center lg:justify-end items-center h-[600px] md:h-[650px] mt-12 lg:mt-0"
               style={{ perspective: '1500px' }}>

            {/* Quitamos el scale reducido. Ahora está en scale-100 (tamaño real) en mobile */}
            <div className="relative flex items-center justify-center scale-100 md:scale-100 transition-transform duration-500">

              {/* CELULAR IZQUIERDA */}
              <div
            
                className="w-[145px] md:w-[170px] aspect-[9/20] bg-gray-900 rounded-[1.8rem] md:rounded-[2rem] border-[3px] md:border-[4px] border-gray-800 shadow-xl overflow-hidden transition-all duration-700 ease-out"
                style={{
                  transform: 'translateX(60px) translateZ(-100px) rotateY(25deg)', // Ajusté la posición para el nuevo tamaño
                  zIndex: 10
                }}
              >
                <div className="relative w-full h-full bg-white">
                  <Image
                    src="/02.png"
                    alt="Vista Izquierda"
                    fill
                    className="object-full"
                  />
                </div>
              </div>

              {/* CELULAR CENTRO (El protagonista) */}
              <div
                // Aumenté el ancho base (w-[165px])
                // Borde de 4px y esquinas de 2.2rem para mobile
                className="w-[165px] md:w-[205px] aspect-[9/20] bg-black rounded-[2.2rem] md:rounded-[2.5rem] border-[4px] md:border-[6px] border-gray-950 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden transition-all duration-500 hover:scale-105"
                style={{
                  zIndex: 30,
                  transform: 'translateZ(50px)'
                }}
              >
                {/* Dynamic Island ajustada */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[80px] md:w-[80px] h-[15px] md:h-[20px] bg-black rounded-full z-40"></div>
                <div className="relative w-full h-full bg-white">
                  <Image
                    src="/013.svg"
                    alt="Panel Principal"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>

               {/* CELULAR DERECHA */}
              <div
                // Mismos ajustes que el izquierdo
                className="w-[145px] md:w-[170px] aspect-[9/20] bg-gray-900 rounded-[1.8rem] md:rounded-[2rem] border-[3px] md:border-[4px] border-gray-800 shadow-xl overflow-hidden transition-all duration-700 ease-out"
                style={{
                  transform: 'translateX(-60px) translateZ(-100px) rotateY(-25deg)',
                  zIndex: 10
                }}
              >
                <div className="relative w-full h-full bg-white">
                  <Image
                    src="/galeria/05.png"
                    alt="Vista Derecha"
                    fill
                    className="object-full"
                  />
                </div>
              </div>

              {/* Sombra de piso más grande */}
              <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 w-[350px] md:w-[450px] h-[40px] bg-black/20 rounded-[100%] blur-[40px] -z-10"></div>
            </div>
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

     {/* --- SECCIÓN WEBAPP PRO: PARA EL DUEÑO --- */}
<section className="py-24 bg-black text-white overflow-hidden border-y border-gray-800">
  <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
    
    {/* PARTE IZQUIERDA: ICONOS Y PRÓXIMAMENTE */}
    <div className="flex flex-col items-center justify-center">
      <div className="relative mb-12">
        <Monitor size={200} className="text-gray-800 opacity-40" />
        <Smartphone
          size={100}
          className="text-green-500 absolute -bottom-4 -right-4 drop-shadow-2xl"
        />
      </div>

      {/* DISTINTIVOS DE STORES (PRÓXIMAMENTE) */}
      <div className="flex flex-col items-center gap-4">
        <span className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase italic">
          Próximamente en
        </span>
        <div className="flex items-center gap-4 opacity-30 grayscale hover:opacity-50 transition-opacity">
          {/* Badge Play Store */}
          <div className="flex items-center gap-2 border border-gray-700 px-4 py-2 rounded-xl">
            <div className="w-5 h-5 bg-white/10 rounded flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[7px] uppercase font-bold text-gray-400">Disponible en</span>
              <span className="text-xs font-black">Google Play</span>
            </div>
          </div>

          {/* Badge App Store */}
          <div className="flex items-center gap-2 border border-gray-700 px-4 py-2 rounded-xl">
            <Smartphone size={14} className="text-white" />
            <div className="flex flex-col leading-none">
              <span className="text-[7px] uppercase font-bold text-gray-400">Consíguelo en el</span>
              <span className="text-xs font-black">App Store</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* PARTE DERECHA: TEXTOS E INSTRUCCIONES */}
    <div>
      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-8">
        <SmartphoneNfc size={32} className="text-green-500" />
      </div>
      <h2 className="text-4xl font-extrabold tracking-tight mb-6 uppercase">
        WebApp Pro <br />{" "}
        <span className="text-green-500">Tu panel siempre a mano</span>
      </h2>
      <p className="text-gray-400 text-lg mb-8 leading-relaxed italic font-medium">
        No pierdas tiempo abriendo el navegador. Instala Snappy en tu
        **PC, Tablet o Celular** y gestiona tu local como una App nativa.
        Más rápido, más cómodo y sin descargas de ninguna Store.
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-4 text-green-500 font-black text-xs uppercase tracking-widest">
            <Monitor size={18} /> EN TU PC
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Desde Chrome, haz clic en el icono de <b>"Instalar"</b> en la
            barra de direcciones.
          </p>
        </div>
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-3 mb-4 text-green-500 font-black text-xs uppercase tracking-widest">
            <Smartphone size={18} /> EN TU MÓVIL
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            <b>Android Chrome:</b> 3 puntitos {`>`} "Agregar a inicio".
            <br /> <b>iOS Chrome:</b> No compatible.
            <br /> <b>iOS Safari:</b> 3 puntitos {`>`} Compartir {`>`} Mas {`>`} "Agregar a inicio".
          </p>
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
        Elegí un diseño y un rubro para ver la experiencia real.
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
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><CheckCircle2 className="text-green-500" size={22}/> Carga instantánea</div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><CheckCircle2 className="text-green-500" size={22}/> Navegación táctil</div>
          <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><CheckCircle2 className="text-green-500" size={22}/> Optimizado para móviles</div>
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
      

    {/* --- SECCIÓN TUTORIALES (CON SISTEMA DE AVISOS) --- */}
<section className="py-24 bg-gray-50 relative">
  {/* AVISO FLOTANTE (TOAST) - Aparece cuando algo no está listo */}
  {showSoonToast && (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[600] bg-black text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
      <Zap size={18} className="text-yellow-400 fill-current" />
      <span className="font-bold text-sm uppercase tracking-widest">Próximamente: Estamos grabando el contenido</span>
    </div>
  )}

  <div className="max-w-7xl mx-auto px-6">
    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
      <div>
        <h2 className="text-4xl font-extrabold tracking-tight uppercase italic leading-none">
          Aprende en <span className="text-green-600">60 segundos</span>
        </h2>
        <p className="text-gray-500 font-medium mt-2">
          Tutoriales rápidos para configurar tu Snappy hoy mismo.
        </p>
      </div>
      {/* LINK DE YOUTUBE: Ahora llama a handleYoutubeClick */}
      <a
        href="#"
        onClick={handleYoutubeClick}
        className="text-gray-400 font-bold flex items-center gap-2 hover:text-black transition-colors"
      >
        Ver todos en YouTube <ArrowRight size={18} />
      </a>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {TUTORIALS.map((v, i) => (
        <div
          key={i}
          className={`group cursor-pointer relative ${!v.isAvailable ? 'opacity-70' : ''}`}
          onClick={() => openTutorial(v)}
        >
          <div className="relative aspect-video bg-gray-900 rounded-[30px] overflow-hidden mb-4 border border-white shadow-lg transition-all duration-500 group-hover:shadow-2xl group-hover:border-green-200">
            
            <Image
              src={v.thumbnail}
              alt={`Portada del tutorial ${v.title}`}
              fill
              className={`object-cover transition-all duration-500 ${!v.isAvailable ? 'grayscale group-hover:grayscale-0' : 'opacity-80 group-hover:opacity-100'}`}
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>

            <div className="absolute inset-0 flex items-center justify-center">
              {!v.isAvailable ? (
                /* Icono para videos no disponibles */
                <div className="bg-black/40 backdrop-blur-sm p-4 rounded-full text-white font-black text-[10px] uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                  Grabando...
                </div>
              ) : (
                /* Icono Play para video disponible */
                <PlayCircle
                  size={64}
                  className="text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-110 group-hover:text-green-400"
                  fill="rgba(255,255,255,0.2)"
                />
              )}
            </div>

            <span className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md text-white text-[10px] px-3 py-1 rounded-full font-bold border border-white/10">
              {v.isAvailable ? v.duration : 'PRÓX.'}
            </span>
          </div>

          <h4 className="font-black uppercase italic transition-colors ml-2 text-gray-900 group-hover:text-green-600">
            {v.title} {!v.isAvailable && <span className="text-[10px] text-gray-400 normal-case ml-2">(Próximamente)</span>}
          </h4>
        </div>
      ))}
    </div>
  </div>

  {/* REPRODUCTOR DE VIDEO (Mantenemos esta lógica para que el video 1 funcione) */}
  {(videoStep === 'choosing' || videoStep === 'playing') && (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
      <button onClick={() => setVideoStep('idle')} className="absolute top-6 right-6 text-white/50 hover:text-white">
        <X size={32} />
      </button>

      <div className="w-full max-w-4xl text-center">
        {videoStep === 'playing' && (
          <div className="animate-in fade-in duration-500">
            <p className="text-green-500 font-black uppercase italic text-xs mb-4 tracking-widest">
              Tutorial: {activeTutorialData?.title}
            </p>
            <div className="relative aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
              <video
                src={videoSource}
                controls
                autoPlay
                className="absolute inset-0 w-full h-full object-cover"
              >
                Tu navegador no soporta videos.
              </video>
            </div>
            <p className="mt-4 text-[10px] text-white/30 uppercase tracking-widest">
              Reproduciendo desde el servidor de Snappy
            </p>
          </div>
        )}
      </div>
    </div>
  )}
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
          <span className="text-3xl font-black text-gray-900">$10.000</span>
          <span className="text-gray-400 text-sm">/mes</span>
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
          <span className="text-3xl font-black text-gray-900">$16.900</span>
          <span className="text-gray-400 text-sm">/mes</span>
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
    <span className="text-4xl font-black text-white">$27.000</span>
    <span className="text-gray-400 text-sm">/mes</span>
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

{/* --- SECCIÓN GALERÍA: ANIMACIÓN AUTOMÁTICA ASIMÉTRICA --- */}
      <section className="py-24 bg-white overflow-hidden border-b border-gray-50">
        <style dangerouslySetInnerHTML={{ __html: `
          .mordisco-screen-modern { clip-path: url(#mordisco-clip-modern); }
          
          /* Animación de desplazamiento infinito */
          @keyframes infiniteScrollGallery {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          
          .animate-gallery {
            display: flex;
            width: max-content;
            animation: infiniteScrollGallery 40s linear infinite;
          }

          .animate-gallery:hover {
            animation-play-state: paused;
          }
        `}} />

        {/* SVG del Notch */}
        <svg width="0" height="0" className="absolute">
          <defs>
            <clipPath id="mordisco-clip-modern" clipPathUnits="objectBoundingBox">
              <path d="M 0,0.06 C 0,0.02 0.04,0 0.08,0 L 0.25,0 C 0.28,0 0.3,0 0.3,0.01 L 0.3,0.02 C 0.3,0.035 0.35,0.04 0.5,0.04 C 0.65,0.04 0.7,0.035 0.7,0.02 L 0.7,0.01 C 0.7,0 0.72,0 0.75,0 L 0.92,0 C 0.96,0 1,0.02 1,0.06 L 1,0.94 C 1,0.98 0.96,1 0.92,1 L 0.08,1 C 0.04,1 0,0.98 0,0.94 Z" />
            </clipPath>
          </defs>
        </svg>

        <div className="relative w-full">
          {/* Contenedor Animado */}
          <div className="animate-gallery gap-12 py-10">
  {/* Triplicamos el contenido para que el bucle sea perfecto */}
  {[...galleries, ...galleries, ...galleries].map((item, i) => (
    <div 
      key={i} 
      className={`flex-shrink-0 ${item.offset}`}
    >
                <div className="group flex flex-col items-center">
                  {/* CELULAR COMPACTO: w-[180px] */}
                  <div className="relative w-[180px] transition-all duration-500 hover:-translate-y-3">
                    <div className="mordisco-screen-modern relative aspect-[9/18.5] bg-gray-900 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden">
                      <img 
                        src={item.image} 
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none z-10" />
                      <div className="mordisco-screen-modern absolute inset-0 border-[1.2px] border-white/5 pointer-events-none z-20" />
                    </div>
                    {/* Sombra de piso */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-gray-200 blur-xl rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  
                  {/* Etiqueta de Rubro */}
                  <div className="mt-6">
                    <span className="px-4 py-1.5 bg-white border border-gray-100 rounded-full text-[9px] font-black tracking-[0.2em] text-gray-400 shadow-sm uppercase italic">
                      {item.title}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Gradientes a los costados para que no corte en seco (Efecto difuminado) */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none"></div>
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none"></div>
        </div>

        {/* Decoración de puntitos */}
        <div className="flex flex-col items-center mt-4">
          <div className="flex items-center gap-2 opacity-20">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-gray-400" />
            ))}
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
