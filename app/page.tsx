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
} from "lucide-react";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [aliasCopied, setAliasCopied] = useState(false);

  const handleCopyAlias = () => {
    navigator.clipboard.writeText("luciano.mp");
    setAliasCopied(true);
    setTimeout(() => setAliasCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f5f2e8] font-sans text-gray-900 selection:bg-green-100 overflow-x-hidden">
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-[#f5f2e8]/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Snappy" width={32} height={32} />
            <span className="font-bold text-2xl tracking-tight">Snappy.</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/login"
              className="text-sm font-semibold text-gray-600 hover:text-black transition"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/login"
              className="bg-black text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-gray-800 transition shadow-lg flex items-center gap-2"
            >
              Prueba Gratis <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION: TIPOGRAFÍA ORIGINAL --- */}
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
                src="/tablett-header.gif"
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
            Una solución adaptable que crece con tu negocio, sin importar el
            rubro.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              {
                title: "SHOWROOMS",
                desc: "Catálogos de productos y tiendas online.",
                icon: <ShoppingBag className="text-purple-500" />,
                bg: "bg-purple-50",
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
          <div className="relative aspect-video lg:aspect-square flex items-center justify-center">
            <div className="relative">
              <Monitor size={200} className="text-gray-800 opacity-40" />
              <Smartphone
                size={100}
                className="text-green-500 absolute -bottom-4 -right-4 drop-shadow-2xl"
              />
            </div>
          </div>
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
                  <b>Android Chrome:</b> 3 puntitos  {`>`} "Agregar a inicio". <br />{" "}
                  <b>iOS Chrome:</b> Compartir {`>`} Mas {`>`}"Agregar al inicio".<br />{" "}
                  <b>iOS Safari:</b> 3 puntitos {`>`} Compartir {`>`} Mas {`>`} "Agregar a inicio".

                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- GALERÍA: DISEÑOS QUE ENAMORAN (TAMAÑO UNIFORME) --- */}
      <section id="galeria" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold tracking-tight uppercase mb-4">
              DISEÑOS QUE ENAMORAN
            </h2>
            <p className="text-gray-500 text-lg">
              Menús que reflejan la personalidad de cada negocio.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "HAMBURGUESERÍA", img: "/galeria-1.png" },
              { label: "SUSHI BAR", img: "/galeria-2.png" },
              { label: "PIZZERÍA", img: "/galeria-3.png" },
              { label: "KIOSCO 24HS", img: "/galeria-4.png" },
            ].map((item, i) => (
              <div key={i} className="space-y-4">
                <div className="relative aspect-[9/16] rounded-3xl overflow-hidden shadow-lg border border-gray-100 bg-gray-50">
                  <Image
                    src={item.img}
                    alt={item.label}
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-center text-[10px] font-black text-gray-400 tracking-widest uppercase">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- TUTORIALES --- */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight uppercase">
                Aprende en 60 segundos
              </h2>
              <p className="text-gray-500 font-medium">
                Tutoriales rápidos para configurar tu Snappy hoy mismo.
              </p>
            </div>
            <a
              href="https://youtube.com/@snappy"
              target="_blank"
              className="text-green-600 font-bold flex items-center gap-2 hover:underline"
            >
              Ver todos en YouTube <ArrowRight size={18} />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Crea tu primer menú", duration: "1:20" },
              { title: "Configura tus Extras", duration: "0:55" },
              { title: "Panel de Comandas", duration: "1:45" },
            ].map((v, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="relative aspect-video bg-gray-800 rounded-[30px] overflow-hidden mb-4 border border-white shadow-lg">
                  <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition duration-500">
                    <PlayCircle
                      size={50}
                      className="text-white drop-shadow-2xl"
                      fill="rgba(0,0,0,0.3)"
                    />
                  </div>
                  <span className="absolute bottom-4 right-4 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-bold">
                    {v.duration}
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 group-hover:text-green-600 transition ml-2">
                  {v.title}
                </h4>
              </div>
            ))}
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
                Empezar ahora
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
{/* --- PREGUNTAS FRECUENTES --- */}
      <section className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <HelpCircle size={48} className="mx-auto text-green-600 mb-4" />
            <h2 className="text-4xl font-extrabold mb-4 uppercase tracking-tighter italic">Preguntas Frecuentes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { q: "¿Cobran comisión?", a: "No. Solo pagas la suscripción mensual fija. El 100% de tus ventas es para vos." },
              { q: "¿Necesito una App?", a: "No. Snappy es una Webapp que se abre en cualquier navegador y se instala en el inicio." },
              { q: "¿Cómo recibo pedidos?", a: "Directo a tu panel de gestión y un mensaje detallado a tu WhatsApp." },
              { q: "¿Puedo cancelar?", a: "Sí, en cualquier momento desde tu panel de ajustes sin complicaciones." }
            ].map((faq, i) => (
              <div key={i} className="bg-gray-50 p-8 rounded-[35px] border border-gray-100 hover:border-green-200 transition-all">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-3">
                  <span className="text-green-600 font-black">0{i+1}.</span> {faq.q}
                </h3>
                <p className="text-gray-500 leading-relaxed text-sm font-medium">{faq.a}</p>
              </div>
            ))}
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
              <a
                href="#"
                className="hover:text-green-500 transition font-bold uppercase text-xs tracking-widest"
              >
                Facebook
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
                <a href="https://wa.me/2324694045">WhatsApp</a>
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
    </div>
  );
}
