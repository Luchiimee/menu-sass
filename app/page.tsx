"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  Zap,
  QrCode,
  MessageCircle,
  Menu,
  X,
  Layout,
  Smartphone,
  MousePointer2,
  HelpCircle,
  CreditCard,
  PlayCircle,
  BarChart3,
  PlusCircle,
  Globe,
  Copy,
  ExternalLink,
  Layers,
  Settings,
  ListChecks,
  Printer,
  Bell,
  ShieldCheck,
  ShoppingBag,
  Utensils,
  Carrot,
  Candy,
  Ticket,
  Percent,
  SmartphoneNfc,
  Store,
  Monitor,
  Wallet,
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
  { title: 'Pizeria', image: '/galeria/04.png', offset: 'lg:mt-24' }
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
export default function LandingPage() {
  const [tutorialToast, setTutorialToast] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('visualgrid');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [aliasCopied, setAliasCopied] = useState(false);
  const [videoStep, setVideoStep] = useState<'idle' | 'choosing' | 'playing'>('idle');
  const [videoSource, setVideoSource] = useState('');
  const [activeTutorialData, setActiveTutorialData] = useState<any>(null);
  
  // Nuevo estado para controlar el mensaje de "Próximamente"
  const [showSoonToast, setShowSoonToast] = useState(false);

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
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.05]">
              Tu menú digital,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-gray-900">
                listo en segundos.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Sin PDFs aburridos. Crea una experiencia de compra increíble para
              tus clientes y recibe pedidos directo a WhatsApp.
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

          <div className="relative flex justify-center lg:justify-end h-[300px] md:h-[500px] mt-10 lg:mt-0">
            <div className="absolute top-0 right-0 md:right-10 w-[95%] md:w-[520px] aspect-[16/10] bg-white rounded-[30px] shadow-2xl overflow-hidden z-0 border border-gray-100">
              <Image
                src="/header-tablet.gif"
                alt="Dashboard View"
                fill
                priority
                className="object-fill"
              />
            </div>
            <div className="absolute -bottom-4 right-10 md:right-15 w-[130px] md:w-[160px] aspect-[9/19] bg-white rounded-2xl shadow-2xl overflow-hidden z-20 border">
              <Image
                src="/mobile-headerr.gif"
                alt="Phone View"
                fill
                className="object-cover"
              />
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
          desc: "Restaurantes, bares, cafeterías y food trucks.",
          icon: <Utensils className="text-orange-500" />,
          bg: "bg-orange-50",
        },
        {
          title: "KIOSCOS",
          desc: "Almacenes, despensas y tiendas de conveniencia.",
          icon: <Store className="text-blue-500" />,
          bg: "bg-blue-50",
        },
        {
          title: "VERDULERÍAS",
          desc: "Fruterías, dietéticas y productos orgánicos.",
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
            <br /> <b>iOS Chrome:</b> Compartir {`>`} Mas {`>`}"Agregar al inicio".
            <br /> <b>iOS Safari:</b> 3 puntitos {`>`} Compartir {`>`} Mas {`>`} "Agregar a inicio".
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

  {/* --- SECCIÓN: DISEÑOS QUE ENAMORAN (ESPACIO PARA GIFS COMPLETOS) --- */}
      <section id="disenos" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight uppercase mb-4">
              DISEÑOS QUE ENAMORAN
            </h2>
            <p className="text-gray-500 text-lg">
              Menús interactivos que reflejan la identidad de tu marca.
            </p>
          </div>

          {/* SELECTOR DE PLANTILLA */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {[
              { id: 'visualgrid', label: 'Visual Grid', color: 'bg-orange-500' },
              { id: 'classic', label: 'Classic List', color: 'bg-red-600' },
              { id: 'minimal', label: 'Minimal', color: 'bg-black' },
              { id: 'urban', label: 'Urban Dark', color: 'bg-[#121212]' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border-2 
                  ${activeTab === tab.id 
                    ? `${tab.color} text-white border-transparent shadow-md scale-105` 
                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8 relative">
            {/* MOCKUP DE CELULAR (Borde fino 6px) */}
            <div className="relative border-gray-900 bg-black border-[6px] rounded-[2.8rem] h-[600px] w-[300px] shadow-2xl overflow-hidden">
              
              {/* Dynamic Island */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[70px] h-[18px] bg-black rounded-full z-30"></div>

              {/* Pantalla interior */}
              <div className="w-full h-full bg-white rounded-[2.4rem] overflow-hidden relative z-20">
                
                {/* --- ESPACIO PARA TUS GIFS --- */}
                <div className="h-full w-full">
                  {activeTab === 'visualgrid' && (
                    <img 
                      src="/02.png" 
                      alt="Visual Grid Demo" 
                      className="w-full h-full object-cover animate-in fade-in duration-500"
                    />
                  )}

                  {activeTab === 'classic' && (
                    <img 
                      src="/classic.png" 
                      alt="Classic List Demo" 
                      className="w-full h-full object-cover animate-in fade-in duration-500"
                    />
                  )}

                  {activeTab === 'minimal' && (
                    <img 
                      src="/minimal.png" 
                      alt="Minimal Demo" 
                      className="w-full h-full object-cover animate-in fade-in duration-500"
                    />
                  )}

                  {activeTab === 'urban' && (
                    <img 
                      src="/01.png" 
                      alt="Urban Dark Demo" 
                      className="w-full h-full object-cover animate-in fade-in duration-500"
                    />
                  )}
                </div>

              </div>
            </div>

            {/* BOTÓN FLOTANTE */}
            <Link 
              href="/demo" 
              className="md:absolute md:left-[calc(50%+170px)] bg-white text-black border-2 border-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black hover:text-white transition-all flex items-center gap-2 group"
            >
              Probar Demo <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* MAS PLANTILLAS */}
          <div className="mt-16 text-center">
            <div className="inline-block bg-gray-50 border border-gray-100 px-6 py-4 rounded-3xl">
              <p className="text-gray-500 text-sm font-medium">
                ¿Buscás un estilo diferente? Tenemos <span className="text-black font-extrabold">+10 plantillas exclusivas</span>.
              </p>
              <Link href="/login" className="text-orange-600 font-black text-xs uppercase tracking-wider mt-2 inline-block hover:underline">
                Creá tu cuenta gratis para verlas todas →
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto items-end">
            {/* Light */}

            <div className="bg-white border border-gray-200 rounded-3xl p-8 transition flex flex-col h-full hover:shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Light</h3>

              <p className="text-xs text-gray-400 mb-6 uppercase font-bold tracking-wider">
                Para empezar
              </p>

              <div className="mb-6">
                <span className="text-3xl font-black">$7.400</span>

                <span className="text-gray-400 text-sm">/mes</span>
              </div>

              <ul className="space-y-4 text-sm text-gray-600 flex-1 mb-8">
                <li className="flex gap-3">
                  <Check
                    size={16}
                    className="text-green-600 mt-0.5 flex-shrink-0"
                  />{" "}
                  <b>Hasta 15 Productos</b>
                </li>

                <li className="flex gap-3">
                  <Check
                    size={16}
                    className="text-green-600 mt-0.5 flex-shrink-0"
                  />{" "}
                  Catálogo Digital Interactivo
                </li>

                <li className="flex gap-3">
                  <Check
                    size={16}
                    className="text-green-600 mt-0.5 flex-shrink-0"
                  />{" "}
                  Pedidos directos a WhatsApp
                </li>

                <li className="flex gap-3">
                  <Check
                    size={16}
                    className="text-green-600 mt-0.5 flex-shrink-0"
                  />{" "}
                  Mostrar Alias para Transferencias
                </li>

                <li className="flex gap-3">
                  <Check
                    size={16}
                    className="text-green-600 mt-0.5 flex-shrink-0"
                  />{" "}
                  Dominio Personalizable
                </li>
              </ul>

              <Link
  href="/login"
  className="block w-full py-3 rounded-xl border-2 border-black text-center font-bold hover:bg-black hover:text-white transition text-sm"
>
  Prueba 14 días gratis
</Link>
            </div>

            {/* Plus */}

            <div className="bg-gray-900 text-white border-2 border-gray-900 rounded-[35px] p-8 relative shadow-2xl scale-105 z-10 flex flex-col h-full">
              <div className="absolute top-0 right-0 bg-green-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-xl rounded-tr-xl">
                MÁS ELEGIDO
              </div>

              <h3 className="text-xl font-bold text-green-400 mb-1 flex items-center gap-2">
                Plus <Zap size={18} fill="currentColor" />
              </h3>

              <p className="text-xs text-gray-400 mb-6 uppercase font-bold tracking-wider tracking-tighter">
                Profesional
              </p>

              <div className="mb-6">
                <span className="text-4xl font-black text-white">$15.900</span>

                <span className="text-gray-400 text-sm">/mes</span>
              </div>

              <ul className="space-y-4 text-sm text-gray-300 flex-1 font-medium mb-8">
                <li className="flex gap-3">
                  <Check
                    size={16}
                    className="text-green-400 mt-0.5 flex-shrink-0"
                  />{" "}
                  <b>Productos Ilimitados</b> ✨
                </li>

                <li className="flex gap-3">
                  <Check
                    size={16}
                    className="text-green-400 mt-0.5 flex-shrink-0"
                  />{" "}
                  Todo lo del plan Light
                </li>

                <li className="flex gap-3">
                  <Check
                    size={16}
                    className="text-green-400 mt-0.5 flex-shrink-0"
                  />{" "}
                  <b>Seguimiento de Pedido en Vivo</b> 🚀
                </li>

                <li className="flex gap-3">
                  <Check
                    size={16}
                    className="text-green-400 mt-0.5 flex-shrink-0"
                  />{" "}
                  <b>QR Inteligente</b>
                </li>

                <li className="flex gap-3">
                  <Check
                    size={16}
                    className="text-green-400 mt-0.5 flex-shrink-0"
                  />{" "}
                  Panel de Comandas (Cocina)
                </li>

                <li className="flex gap-3">
                  <Check
                    size={16}
                    className="text-green-400 mt-0.5 flex-shrink-0"
                  />{" "}
                  Acceso a todas las plantillas
                </li>
              </ul>

              <Link
                href="/login"
                className="block w-full py-4 rounded-xl bg-green-500 text-black font-black text-center hover:bg-green-400 transition text-sm"
              >
                Prueba 14 días gratis
              </Link>
            </div>

            {/* Max (BORROSO) */}

            <div className="bg-white border border-gray-200 rounded-3xl p-8 flex flex-col h-full opacity-60 grayscale-[0.5]">
              <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-1 rounded-lg mb-4 w-fit">
                PRÓXIMAMENTE
              </span>

              <h3 className="text-lg font-bold text-gray-900 mb-1">Max</h3>

              <p className="text-xs text-gray-400 mb-6 font-bold uppercase">
                Escalabilidad
              </p>

              <div className="mb-8 blur-[4px] select-none">
                <span className="text-3xl font-black">$28.600</span>

                <span className="text-gray-400 text-sm">/mes</span>
              </div>

              <ul className="space-y-4 text-sm text-gray-500 flex-1 mb-8 font-medium">
                <li className="flex gap-3">
                  <Check size={16} /> Todo lo del plan Plus
                </li>

                <li className="flex gap-3">
                  <Check size={16} /> Panel Pro para Caja
                </li>

                <li className="flex gap-3">
                  <Check size={16} /> Integración Mercado Pago
                </li>

                <li className="flex gap-3">
                  <Check size={16} /> Gestión de hasta 2 sucursales
                </li>
              </ul>

              <button
                disabled
                className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-bold cursor-not-allowed"
              >
                Próximamente
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
                href="#"
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
