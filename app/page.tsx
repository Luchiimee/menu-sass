'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, Check, Zap, QrCode, MessageCircle, Menu, X, Layout, 
  Smartphone, MousePointer2, HelpCircle, CreditCard, PlayCircle, 
  BarChart3, PlusCircle, Globe, Copy, ExternalLink, Layers, Settings, ListChecks
} from 'lucide-react';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [aliasCopied, setAliasCopied] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // --- LÓGICA COPIAR ALIAS ---
  const handleCopyAlias = () => {
    navigator.clipboard.writeText('luciano.mp');
    setAliasCopied(true);
    setTimeout(() => setAliasCopied(false), 2000);
  };

  // --- LÓGICA SLIDER GALERÍA (DESVANECIMIENTO) ---
  const galleryImages = [
    { id: 1, title: 'Urbano Dark' },
    { id: 2, title: 'Classic Delivery' },
    { id: 3, title: 'Pop Vibrante' },
    { id: 4, title: 'Sushi Visual' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [galleryImages.length]);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-green-100 overflow-x-hidden">
      
      {/* --- BOTÓN WHATSAPP FLOTANTE --- */}
      <a 
        href="https://wa.me/2324694045" 
        target="_blank" 
        className="fixed bottom-6 right-6 z-[60] bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center group"
      >
        <MessageCircle size={28} fill="currentColor" />
      </a>

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Snappy" width={32} height={32} />
            <span className="font-bold text-2xl tracking-tight">Snappy.</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-black transition">Iniciar Sesión</Link>
            <Link href="/login" className="bg-black text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-gray-800 transition shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
              Prueba Gratis <ArrowRight size={16}/>
            </Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION (TABLET + CELULAR) --- */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm px-4 py-1.5 rounded-full text-xs font-bold mb-8 text-gray-600">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Nuevo: Seguimiento en vivo
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.05]">
                Tu menú digital,<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-gray-900">listo en segundos.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Sin PDFs aburridos. Crea una experiencia de compra increíble para tus clientes y recibe pedidos directo a WhatsApp.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/login" className="bg-black text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-800 transition shadow-xl flex items-center justify-center gap-2">
                Empezar Ahora <Zap size={20} fill="currentColor"/>
              </Link>
              <a href="#demo" className="bg-white text-gray-700 border border-gray-200 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition flex items-center justify-center gap-2">Ver Demo</a>
            </div>
          </div>

        <div className="relative flex justify-center lg:justify-end h-[300px] md:h-[500px] mt-10 lg:mt-0">
    
    {/* --- Captura Tablet / Dashboard (Sin borde negro) --- */}
<div className="absolute top-0 right-0 md:right-10 w-[95%] md:w-[520px] aspect-[16/10] bg-white rounded-[30px] shadow-2xl overflow-hidden z-0 border border-gray-100">
    <Image 
        src="/tablett-header.gif" 
        alt="Dashboard View" 
        fill 
        priority
        className="object-fill"
    />
</div>

    {/* --- Captura Celular (Más chico y sin borde negro) --- */}
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

      {/* --- GESTIÓN TOTAL (ANIMACIONES Y ICONOS RECUPERADOS) --- */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight">Gestión total, cero estrés</h2>
            <p className="text-gray-500 mt-4 text-lg">Todo lo necesario para digitalizar tu negocio hoy mismo.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm group hover:-translate-y-2 transition-all duration-300 hover:shadow-xl">
                <BarChart3 size={32} className="text-violet-600 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold mb-4 text-gray-900">Caja y Métricas</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">Controla tus ventas diarias y descubre qué es lo que más piden tus clientes desde tu panel.</p>
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <CreditCard size={32} className="text-green-600 group-hover:scale-110 transition-transform" />
                  <div 
                    onClick={handleCopyAlias}
                    className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 cursor-pointer hover:bg-violet-50 transition relative group/alias"
                  >
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">luciano.mp</span>
                    <Copy size={12} className="text-gray-400 group-hover/alias:text-violet-600" />
                    {aliasCopied && (
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded shadow-xl animate-in fade-in zoom-in whitespace-nowrap font-bold">
                        ¡Alias copiado!
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">Integración de Pagos</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">Tus clientes copian tu Alias con un toque, facilitando las transferencias sin errores.</p>
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm group hover:-translate-y-2 transition-all duration-300 hover:shadow-xl">
                <Globe size={32} className="text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold mb-4 text-gray-900">Link para Redes</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">Un solo enlace profesional para tu Bio de Instagram que centraliza todos tus pedidos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECCIÓN: ADICIONALES (SIN IMAGEN) --- */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="grid grid-cols-2 gap-4">
              <div className="bg-violet-50 p-8 rounded-[35px] text-center border border-violet-100">
                  <PlusCircle size={40} className="text-violet-600 mx-auto mb-4"/>
                  <p className="font-bold text-gray-900">Doble Carne</p>
                  <p className="text-violet-600 font-black text-sm">+$1.500</p>
              </div>
              <div className="bg-orange-50 p-8 rounded-[35px] text-center border border-orange-100 mt-8">
                  <Layers size={40} className="text-orange-600 mx-auto mb-4"/>
                  <p className="font-bold text-gray-900">Extra Queso</p>
                  <p className="text-orange-600 font-black text-sm">+$800</p>
              </div>
              <div className="bg-blue-50 p-8 rounded-[35px] text-center border border-blue-100 -mt-4">
                  <Settings size={40} className="text-blue-600 mx-auto mb-4"/>
                  <p className="font-bold text-gray-900">Combo XL</p>
                  <p className="text-blue-600 font-black text-sm">+$2.200</p>
              </div>
              <div className="bg-green-50 p-8 rounded-[35px] text-center border border-green-100 mt-4">
                  <ListChecks size={40} className="text-green-600 mx-auto mb-4"/>
                  <p className="font-bold text-gray-900">Sin Cebolla</p>
                  <p className="text-green-600 font-black text-sm">GRATIS</p>
              </div>
          </div>
          <div>
            <h2 className="text-4xl font-extrabold mb-6 leading-tight">Vende más con <br/><span className="text-violet-600">Adicionales e Ingredientes</span></h2>
            <p className="text-lg text-gray-500 mb-8 font-medium">
              Sube tu ticket promedio dejando que el cliente personalice su pedido. 
              Configura opciones obligatorias, extras con precio o notas de cocina en un par de clics.
            </p>
            <Link href="/login" className="bg-gray-900 text-white px-8 py-4 rounded-full font-bold hover:bg-black transition inline-flex items-center gap-2 shadow-lg">
               Probar Gestión de Extras <ArrowRight size={18}/>
            </Link>
          </div>
        </div>
      </section>

      {/* --- SECCIÓN: CLIENTE (MOCKUP CELULAR REALISTA) --- */}
    {/* --- SECCIÓN: EXPERIENCIA CLIENTE (TABLET ANCHA + CELULAR MINI) --- */}
<section className="py-24 bg-gray-50">
  <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
    <div>
      <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-6">
          <Smartphone size={24}/>
      </div>
      <h2 className="text-4xl font-extrabold mb-6 leading-tight text-gray-900">
        Experiencia fluida <br/>
        <span className="text-green-600">para tus comensales</span>
      </h2>
      <p className="text-lg text-gray-500 mb-8 leading-relaxed">
        Una interfaz diseñada para vender. Fotos grandes, carga rápida y un proceso de compra 
        sin fricción que aumenta tu ticket promedio.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transition-transform hover:scale-105 cursor-default">
              <div className="bg-green-100 p-2 rounded-full text-green-600"><Check size={16}/></div>
              <span className="font-bold text-sm text-gray-700">Panel de Comanda</span>
          </div>
          <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transition-transform hover:scale-105 cursor-default">
              <div className="bg-green-100 p-2 rounded-full text-green-600"><Check size={16}/></div>
              <span className="font-bold text-sm text-gray-700">Estado en vivo</span>
          </div>
      </div>
    </div>

    {/* Lado de las Imágenes */}
    <div className="relative flex justify-center lg:justify-end h-[450px] md:h-[550px] items-center">
      {/* Tablet (Más ancha y larga) */}
      <div className="absolute top-0 right-0 md:right-10 w-[95%] md:w-[580px] aspect-[16/10] bg-white rounded-[30px] shadow-2xl overflow-hidden z-0 border border-gray-100">
          <Image 
            src="/tablet-cliente.png" 
            alt="Tablet Cliente Vista Larga" 
            fill 
            className="object-full" 
          />
          
      </div>
      
      {/* Celular (Más pequeño y superpuesto al frente) */}
      <div className="absolute -bottom-4 right-4 md:right-4 w-[140px] md:w-[190px] aspect-[9/19] bg-white rounded-[35px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden z-10 border border-gray-100 transition-transform hover:scale-110 duration-500">
          <Image 
            src="/celular-cliente.png" 
            alt="Celular Cliente Vista Chica" 
            fill 
            className="object-cover" 
          />
          
      </div>
    </div>
  </div>
</section>

{/* --- GALERÍA SLIDER INFINITO (SMALL, SOFT FADE & NO BORDERS) --- */}
<section id="galeria" className="py-32 bg-white overflow-hidden relative">
  <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative">
    
    {/* 1. Texto (Z-index alto para quedar sobre el desvanecimiento) */}
    <div className="text-center lg:text-left relative z-20">
      <h2 className="text-5xl font-black mb-8 tracking-tighter uppercase leading-none">
        Diseños que se adaptan <br/> a tu negocio 🎨
      </h2>
      <p className="text-xl text-gray-500 mb-10 leading-relaxed font-medium">
        Desde cafeterías minimalistas hasta hamburgueserías vibrantes. 
        <br className="hidden md:block"/>
        Además, <b>¡subimos nuevos diseños todos los meses!</b> para que siempre estés a la vanguardia.
      </p>
      <Link href="/login" className="bg-black text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-800 transition shadow-xl inline-flex items-center gap-2">
        Ver Demo <ExternalLink size={20}/>
      </Link>
    </div>

    {/* 2. Contenedor del Carrusel Infinito */}
    <div className="relative w-full h-[450px] flex items-center group">
      
      {/* MASCARA DE DESVANECIMIENTO IZQUIERDA (Fade para no pisar el texto) */}
    <div className="absolute inset-y-0 -left-5 z-10 pointer-events-none bg-gradient-to-r from-white via-white/20 to-transparent w-20"></div>

      <div className="flex w-full overflow-hidden">
        {/* Contenedor que se mueve solo (Marquee) */}
        <div className="flex gap-8 animate-infinite-scroll group-hover:pause-animation">
          {/* Duplicamos los elementos para el loop infinito */}
          {[1, 2, 3, 4, 1, 2, 3, 4].map((id, idx) => (
            <div 
              key={idx} 
              className="relative w-[180px] md:w-[220px] aspect-[9/18] flex-shrink-0"
            >
               {/* Celular Limpio (Sin bordes negros, sombra súper suave) */}
               <div className="w-full h-full bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 overflow-hidden relative">
                   <Image 
                     src={`/galeria-${id}.png`} 
                     alt="Diseño Snappy" 
                     fill 
                     className="object-cover" 
                   />
                   {/* Reflejo sutil para dar realismo sin bordes */}
                   <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>

  <style jsx>{`
    @keyframes infiniteScroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .animate-infinite-scroll {
      display: flex;
      animation: infiniteScroll 40s linear infinite;
    }
    .pause-animation {
      animation-play-state: paused;
    }
  `}</style>
</section>

      {/* --- TUTORIALES (YOUTUBE) --- */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter">Aprende en 60 segundos</h2>
              <p className="text-gray-500 font-medium">Tutoriales rápidos para configurar tu Snappy hoy mismo.</p>
            </div>
            <a href="https://youtube.com/@snappy" target="_blank" className="text-green-600 font-bold flex items-center gap-2 hover:underline">Ver todos en YouTube <ArrowRight size={18}/></a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Crea tu primer menú", duration: "1:20", yt: "VIDEO_ID_1" },
              { title: "Configura tus Extras", duration: "0:55", yt: "VIDEO_ID_2" },
              { title: "Panel de Comandas", duration: "1:45", yt: "VIDEO_ID_3" },
            ].map((v, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="relative aspect-video bg-gray-800 rounded-[30px] overflow-hidden mb-4 border border-white shadow-lg">
                  {/* Para usar YouTube real: src={`https://img.youtube.com/vi/${v.yt}/maxresdefault.jpg`} */}
                  <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition duration-500">
                    <PlayCircle size={50} className="text-white drop-shadow-2xl" fill="rgba(0,0,0,0.3)"/>
                  </div>
                  <span className="absolute bottom-4 right-4 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-bold">{v.duration}</span>
                </div>
                <h4 className="font-bold text-gray-900 group-hover:text-green-600 transition ml-2">{v.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PLANES (INFO ORIGINAL + PRECIO BLUR) --- */}
      <section id="planes" className="py-24 px-6 bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4">Planes transparentes</h2>
            <p className="text-gray-500 text-lg">Sin comisiones por venta. Cancela cuando quieras.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto items-end">
            {/* Light */}
            <div className="bg-white border border-gray-200 rounded-3xl p-8 transition flex flex-col h-full hover:shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Light</h3>
              <p className="text-xs text-gray-400 mb-6 uppercase font-bold tracking-wider">Para empezar</p>
              <div className="mb-6">
                <span className="text-3xl font-black">$7.400</span>
                <span className="text-gray-400 text-sm">/mes</span>
              </div>
              <ul className="space-y-4 text-sm text-gray-600 flex-1 mb-8">
                <li className="flex gap-3"><Check size={16} className="text-green-600 mt-0.5 flex-shrink-0"/> <b>Hasta 15 Productos</b></li>
                <li className="flex gap-3"><Check size={16} className="text-green-600 mt-0.5 flex-shrink-0"/> Catálogo Digital Interactivo</li>
                <li className="flex gap-3"><Check size={16} className="text-green-600 mt-0.5 flex-shrink-0"/> Pedidos directos a WhatsApp</li>
                <li className="flex gap-3"><Check size={16} className="text-green-600 mt-0.5 flex-shrink-0"/> Mostrar Alias para Transferencias</li>
                <li className="flex gap-3"><Check size={16} className="text-green-600 mt-0.5 flex-shrink-0"/> Dominio Personalizable</li>
              </ul>
              <Link href="/login" className="block w-full py-3 rounded-xl border-2 border-black text-center font-bold hover:bg-black hover:text-white transition text-sm">Empezar ahora</Link>
            </div>

            {/* Plus */}
            <div className="bg-gray-900 text-white border-2 border-gray-900 rounded-[35px] p-8 relative shadow-2xl scale-105 z-10 flex flex-col h-full">
              <div className="absolute top-0 right-0 bg-green-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-xl rounded-tr-xl">MÁS ELEGIDO</div>
              <h3 className="text-xl font-bold text-green-400 mb-1 flex items-center gap-2">Plus <Zap size={18} fill="currentColor"/></h3>
              <p className="text-xs text-gray-400 mb-6 uppercase font-bold tracking-wider tracking-tighter">Profesional</p>
              <div className="mb-6">
                <span className="text-4xl font-black text-white">$15.900</span>
                <span className="text-gray-400 text-sm">/mes</span>
              </div>
              <ul className="space-y-4 text-sm text-gray-300 flex-1 font-medium mb-8">
                <li className="flex gap-3"><Check size={16} className="text-green-400 mt-0.5 flex-shrink-0"/> <b>Productos Ilimitados</b> ✨</li>
                <li className="flex gap-3"><Check size={16} className="text-green-400 mt-0.5 flex-shrink-0"/> Todo lo del plan Light</li>
                <li className="flex gap-3"><Check size={16} className="text-green-400 mt-0.5 flex-shrink-0"/> <b>Seguimiento de Pedido en Vivo</b> 🚀</li>
                <li className="flex gap-3"><Check size={16} className="text-green-400 mt-0.5 flex-shrink-0"/> <b>QR Inteligente</b></li>
                <li className="flex gap-3"><Check size={16} className="text-green-400 mt-0.5 flex-shrink-0"/> Panel de Comandas (Cocina)</li>
                <li className="flex gap-3"><Check size={16} className="text-green-400 mt-0.5 flex-shrink-0"/> Acceso a todas las plantillas</li>
              </ul>
              <Link href="/login" className="block w-full py-4 rounded-xl bg-green-500 text-black font-black text-center hover:bg-green-400 transition text-sm">Prueba 14 días gratis</Link>
            </div>

            {/* Max (BORROSO) */}
            <div className="bg-white border border-gray-200 rounded-3xl p-8 flex flex-col h-full opacity-60 grayscale-[0.5]">
                <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-1 rounded-lg mb-4 w-fit">PRÓXIMAMENTE</span>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Max</h3>
                <p className="text-xs text-gray-400 mb-6 font-bold uppercase">Escalabilidad</p>
                <div className="mb-8 blur-[4px] select-none">
                   <span className="text-3xl font-black">$28.600</span>
                   <span className="text-gray-400 text-sm">/mes</span>
                </div>
                <ul className="space-y-4 text-sm text-gray-500 flex-1 mb-8 font-medium">
                   <li className="flex gap-3"><Check size={16}/> Todo lo del plan Plus</li>
                   <li className="flex gap-3"><Check size={16}/> Panel Pro para Caja</li>
                   <li className="flex gap-3"><Check size={16}/> Integración Mercado Pago</li>
                   <li className="flex gap-3"><Check size={16}/> Gestión de hasta 2 sucursales</li>
                </ul>
                <button disabled className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-bold cursor-not-allowed">Próximamente</button>
            </div>
          </div>
        </div>
      </section>

      {/* --- PREGUNTAS FRECUENTES (RESTAURADAS) --- */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <HelpCircle size={48} className="mx-auto text-green-600 mb-4" />
            <h2 className="text-4xl font-extrabold mb-4 uppercase tracking-tighter italic">Preguntas Frecuentes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { q: "¿Cobran comisión?", a: "Absolutamente no. Solo pagas la suscripción mensual fija. El 100% de tus ventas va directo a tu bolsillo." },
              { q: "¿Necesitan una App?", a: "No. Tus clientes acceden escaneando un QR. Abre al instante en cualquier navegador, sin descargas molestas." },
              { q: "¿Cómo recibo pagos?", a: "El cliente puede copiar tu Alias de Mercado Pago directamente desde el carrito de compras. Así, al enviarte el pedido por WhatsApp, ya puede adjuntar el comprobante." },
              { q: "¿Puedo cancelar?", a: "Sí, en cualquier momento desde tu panel. No tenemos contratos de permanencia ni letras chicas." }
            ].map((faq, i) => (
              <div key={i} className="bg-gray-50 p-8 rounded-[35px] border border-gray-100 group hover:border-green-200 transition-all duration-300">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-3">
                  <span className="text-green-600 font-black">0{i+1}.</span> {faq.q}
                </h3>
                <p className="text-gray-500 leading-relaxed text-sm font-medium">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER OSCURO (PREVIO REESTABLECIDO) --- */}
      <footer className="py-20 bg-black text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px]"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center md:text-left grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Image src="/logo.svg" alt="Snappy" width={32} height={32} className="invert" />
              <span className="font-bold text-3xl tracking-tight">Snappy.</span>
            </div>
            <p className="text-gray-500 max-w-sm mb-8">Transformando la forma en que los restaurantes conectan con sus clientes a través de la tecnología digital.</p>
            <div className="flex gap-6 justify-center md:justify-start">
               <a href="#" className="hover:text-green-500 transition font-bold uppercase text-xs tracking-widest">Instagram</a>
               <a href="#" className="hover:text-green-500 transition font-bold uppercase text-xs tracking-widest">Facebook</a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 text-green-500 uppercase text-[10px] tracking-[3px]">Producto</h4>
            <ul className="space-y-4 text-gray-500 text-sm font-medium">
              <li><a href="#" className="hover:text-white transition">Funcionalidades</a></li>
              <li><a href="#" className="hover:text-white transition">Plantillas</a></li>
              <li><a href="#" className="hover:text-white transition">Precios</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-green-500 uppercase text-[10px] tracking-[3px]">Soporte</h4>
            <ul className="space-y-4 text-gray-500 text-sm font-medium">
              <li><a href="#" className="hover:text-white transition">Centro de Ayuda</a></li>
              <li><a href="#" className="hover:text-white transition">Preguntas Frecuentes</a></li>
              <li><a href="https://wa.me/2324694045" className="hover:text-white transition">WhatsApp</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between gap-6 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-center md:text-left">
           <p>&copy; {new Date().getFullYear()} Snappy Menu. Todos los derechos reservados.</p>
           <div className="flex gap-8 justify-center">
              <a href="#" className="hover:text-white transition">Privacidad</a>
              <a href="#" className="hover:text-white transition">Términos</a>
           </div>
        </div>
      </footer>

    </div>
  );
}