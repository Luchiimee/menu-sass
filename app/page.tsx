'use client'; 

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, Check, Zap, Star, QrCode, MessageCircle, HelpCircle, ChevronRight, Menu, X, Layout 
} from 'lucide-react';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-green-100">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2">
  <Image 
    src="/logo.svg" 
    alt="Logo Snappy" 
    width={32} 
    height={32} 
    className="w-8 h-8 object-contain" 
  />
  <span className="font-bold text-xl tracking-tight">Snappy.</span>
</div>
          
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-gray-500 hover:text-black transition">
              Iniciar Sesión
            </Link>
            <Link 
              href="/login" 
              className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 transition shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              Prueba Gratis <ArrowRight size={16}/>
            </Link>
          </div>

          <button 
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
            <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-100 shadow-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-5 h-screen bg-white/95 backdrop-blur-xl z-40">
                <Link 
                    href="/login" 
                    className="text-center font-bold text-gray-600 py-4 hover:bg-gray-50 rounded-xl transition text-lg"
                >
                    Iniciar Sesión
                </Link>
                <Link 
                    href="/login" 
                    className="bg-black text-white py-4 rounded-xl font-bold text-center shadow-lg flex items-center justify-center gap-2 text-lg"
                >
                    Prueba Gratis <ArrowRight size={20}/>
                </Link>
            </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-20 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-green-100 animate-in fade-in slide-in-from-bottom-4">
                    <Star size={12} fill="currentColor"/> Nuevo: Seguimiento de pedidos en vivo
                </div>
                
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-gray-900 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-500">
                    Tu menú digital, <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-600 to-gray-900">tus reglas, tus ventas.</span>
                </h1>
                
                <p className="text-lg md:text-xl text-gray-500 mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-lg mx-auto lg:mx-0">
                    Olvídate del PDF. Crea una tienda online profesional en minutos, recibe pedidos por WhatsApp y gestiona tu negocio sin comisiones.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <Link 
                        href="/login" 
                        className="bg-green-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-green-700 transition shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2"
                    >
                        Empezar Gratis <Zap size={20} fill="currentColor"/>
                    </Link>
                    <a 
                        href="#planes" 
                        className="bg-white text-gray-700 border border-gray-200 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                        Ver Planes
                    </a>
                </div>
            </div>

            <div className="relative flex justify-center lg:justify-end animate-in fade-in zoom-in duration-1000 delay-200 perspective-1000 mt-10 lg:mt-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-tr from-green-400/20 to-purple-400/20 blur-3xl rounded-full w-[120%] h-[120%] -z-10"></div>
                
                <div className="relative bg-gray-900 rounded-[45px] p-3 shadow-2xl border-[6px] border-gray-800 w-[300px] h-[600px] md:w-[340px] md:h-[680px]">
                    <div className="relative w-full h-full rounded-[35px] overflow-hidden bg-white">
                         <Image 
                            src="/menu-sushi.jpeg" 
                            alt="App Screenshot" 
                            fill 
                            className="object-cover"
                        />
                         <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none"></div>
                    </div>
                </div>
            </div>

        </div>
      </section>

      {/* --- SECCIÓN: PLANTILLAS --- */}
      <section className="py-24 bg-gray-50 border-t border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4">Diseños que abren el apetito</h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">Elige la plantilla que mejor se adapte a la identidad de tu marca. Personalízala en segundos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end justify-center">
                
                <div className="flex flex-col items-center">
                    <div className="bg-white p-2 rounded-[36px] shadow-xl border-4 border-gray-100 mb-6 w-[240px] h-[480px] relative hover:-translate-y-2 transition-transform duration-300">
                        <div className="relative w-full h-full rounded-[28px] overflow-hidden bg-gray-100">
                           <Image src="/menu-clasic.jpeg" alt="Classic Template" fill className="object-cover"/>
                        </div>
                    </div>
                    <h3 className="font-bold text-xl mb-1">Classic</h3>
                    <p className="text-sm text-gray-500">Limpio y eficiente.</p>
                </div>

                <div className="flex flex-col items-center md:-mt-12 relative z-10">
                    <div className="bg-black p-2.5 rounded-[40px] shadow-2xl border-4 border-black mb-6 w-[280px] h-[560px] relative hover:-translate-y-2 transition-transform duration-300">
                         <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded z-20 shadow-sm">TOP</div>
                        <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-gray-100">
                            <Image src="/menu-sushi.jpeg" alt="Fresh Template" fill className="object-cover"/>
                        </div>
                    </div>
                    <h3 className="font-bold text-2xl mb-1 text-green-700">Fresh</h3>
                    <p className="text-sm text-gray-500 font-medium">Visual y moderno.</p>
                </div>

                <div className="flex flex-col items-center">
                    <div className="bg-gray-900 p-2 rounded-[36px] shadow-xl border-4 border-gray-700 mb-6 w-[240px] h-[480px] relative hover:-translate-y-2 transition-transform duration-300">
                        <div className="relative w-full h-full rounded-[28px] overflow-hidden bg-gray-800">
                           <Image src="/menu-urban.jpeg" alt="Urban Template" fill className="object-cover"/>
                        </div>
                    </div>
                    <h3 className="font-bold text-xl mb-1">Urban</h3>
                    <p className="text-sm text-gray-500">Modo oscuro.</p>
                </div>

            </div>
        </div>
      </section>

      {/* --- CÓMO FUNCIONA --- */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
                <span className="text-green-600 font-bold uppercase tracking-wider text-sm">El ciclo del éxito</span>
                <h2 className="text-4xl font-bold mb-4 mt-2">Experiencia simple, más ventas</h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">Menos fricción para tus clientes significa más pedidos para ti.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                <div className="hidden md:block absolute top-1/2 left-1/3 w-1/3 h-px bg-gray-200 -z-10 text-gray-300 flex justify-end"><ChevronRight size={24} className="translate-x-1/2 -translate-y-1/2"/></div>
                <div className="hidden md:block absolute top-1/2 right-1/3 w-1/3 h-px bg-gray-200 -z-10 text-gray-300 flex justify-end"><ChevronRight size={24} className="translate-x-1/2 -translate-y-1/2"/></div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center relative z-10">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 mx-auto shadow-sm">
                        <Layout size={32}/>
                    </div>
                    <h3 className="font-bold text-xl mb-3">1. Tú Personalizas</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Subes tu logo, tus productos y eliges un diseño. Obtienes un link único (ej: snappy.uno/tu-bar).
                    </p>
                </div>
                
                <div className="bg-white p-8 rounded-3xl shadow-md border-2 border-green-100 text-center relative z-20 scale-105">
                    <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center text-white mb-6 mx-auto shadow-lg">
                        <QrCode size={32}/>
                    </div>
                    <h3 className="font-bold text-xl mb-3">2. El Cliente Escanea</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Entran a tu link desde QR o redes. No necesitan descargar nada. Navegan y piden en segundos.
                    </p>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center relative z-10">
                    <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6 mx-auto shadow-sm">
                        <MessageCircle size={32}/>
                    </div>
                    <h3 className="font-bold text-xl mb-3">3. Recibes el Pedido</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Te llega un WhatsApp con todo el detalle listo para preparar. ¡Sin errores ni malentendidos!
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* --- PRICING --- */}
      <section id="planes" className="py-24 px-4 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Planes transparentes</h2>
            <p className="text-gray-500 text-lg">Sin comisiones por venta. Cancela cuando quieras.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* PLAN LIGHT */}
            <div className="bg-white border border-gray-200 rounded-3xl p-8 hover:border-gray-300 transition relative flex flex-col h-full">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Light</h3>
              <p className="text-sm text-gray-500 mb-6">Para empezar a vender online.</p>
              <div className="mb-6">
                <span className="text-4xl font-black">$7.000</span>
                <span className="text-gray-400">/mes</span>
              </div>
              
              <Link href="/login" className="block w-full py-3 rounded-xl border-2 border-gray-900 text-gray-900 font-bold text-center hover:bg-gray-50 transition mb-8">
                Prueba 14 días gratis
              </Link>

              <ul className="space-y-4 text-sm text-gray-600 flex-1">
                <li className="flex gap-3"><Check size={18} className="text-green-600 flex-shrink-0"/> <b>Hasta 15 Productos</b></li>
                <li className="flex gap-3"><Check size={18} className="text-green-600 flex-shrink-0"/> Catálogo Digital Interactivo</li>
                <li className="flex gap-3"><Check size={18} className="text-green-600 flex-shrink-0"/> Pedidos directos a WhatsApp</li>
                <li className="flex gap-3"><Check size={18} className="text-green-600 flex-shrink-0"/> Mostrar Alias para Transferencias</li>
                <li className="flex gap-3"><Check size={18} className="text-green-600 flex-shrink-0"/> Dominio Personalizable</li>
                <li className="flex gap-3"><Check size={18} className="text-green-600 flex-shrink-0"/> Acceso a plantillas básicas</li>
              </ul>
            </div>

            {/* PLAN PLUS (DESTACADO) */}
            <div className="bg-white border-2 border-green-600 rounded-3xl p-8 relative shadow-xl scale-105 z-10 flex flex-col h-full">
              <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                RECOMENDADO
              </div>
              <h3 className="text-xl font-bold text-green-700 mb-2 flex items-center gap-2">Plus <Zap size={18} fill="currentColor"/></h3>
              <p className="text-sm text-gray-500 mb-6">Profesionaliza tu gestión.</p>
              <div className="mb-6">
                <span className="text-5xl font-black text-gray-900">$15.900</span>
                <span className="text-gray-400">/mes</span>
              </div>
              
              <Link href="/login" className="block w-full py-4 rounded-xl bg-green-600 text-white font-bold text-center hover:bg-green-700 transition shadow-lg mb-8 hover:scale-[1.02]">
                Prueba 14 días gratis
              </Link>

              <ul className="space-y-4 text-sm text-gray-700 font-medium flex-1">
                <li className="flex gap-3"><span className="bg-green-200 text-green-700 rounded-full p-0.5"><Check size={14}/></span> <b>Productos Ilimitados</b> ✨</li>
                <li className="flex gap-3"><span className="bg-green-200 text-green-700 rounded-full p-0.5"><Check size={14}/></span> Todo lo del plan Light</li>
                <li className="flex gap-3"><span className="bg-green-200 text-green-700 rounded-full p-0.5"><Check size={14}/></span> <b>Seguimiento de Pedido en Vivo</b> 🚀</li>
                {/* NUEVO ITEM AGREGADO */}
                <li className="flex gap-3"><span className="bg-green-200 text-green-700 rounded-full p-0.5"><Check size={14}/></span> <b>QR Inteligente</b></li>
                <li className="flex gap-3"><span className="bg-green-200 text-green-700 rounded-full p-0.5"><Check size={14}/></span> Panel de Comandas (Cocina)</li>
                <li className="flex gap-3"><span className="bg-green-200 text-green-700 rounded-full p-0.5"><Check size={14}/></span> Control básico de Caja</li>
                <li className="flex gap-3"><span className="bg-green-200 text-green-700 rounded-full p-0.5"><Check size={14}/></span> Acceso a todas las plantillas</li>
              </ul>
            </div>

            {/* PLAN MAX (AJUSTADO) */}
            <div className="bg-white border border-gray-200 rounded-3xl p-8 relative overflow-hidden flex flex-col h-full">
                <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-300 z-20">
                    PRÓXIMAMENTE
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">Max</h3>
                <p className="text-sm text-gray-500 mb-6">Para escalar sin límites.</p>
                
                <div className="mb-6 filter blur-[6px] opacity-60 select-none">
                    <span className="text-4xl font-black">$28.600</span>
                    <span className="text-gray-400">/mes</span>
                </div>

                {/* BOTÓN DESHABILITADO PARA IGUALAR ALTURA */}
                <button disabled className="block w-full py-4 rounded-xl bg-gray-100 text-gray-400 font-bold text-center mb-8 cursor-not-allowed">
                    Próximamente
                </button>

                <ul className="space-y-4 text-sm text-gray-500 flex-1">
                    <li className="flex gap-3"><Check size={18}/> Todo lo del plan Plus</li>
                    <li className="flex gap-3"><Check size={18}/> Panel Pro para Caja</li>
                    <li className="flex gap-3"><Check size={18}/> Integración con Mercado Pago</li>
                    <li className="flex gap-3"><Check size={18}/> Gestión de hasta 2 sucursales</li>
                </ul>
            </div>

          </div>
        </div>
      </section>

       {/* --- FAQ SECTION --- */}
       <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
                <HelpCircle size={40} className="mx-auto text-green-600 mb-4"/>
                <h2 className="text-4xl font-bold mb-4">Preguntas Frecuentes</h2>
                <p className="text-gray-500 text-lg">Resolvemos tus dudas antes de empezar.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Check size={18} className="text-green-600"/> ¿Cobran comisión por venta?</h3>
                    <p className="text-gray-600 leading-relaxed text-sm">
                        <b>Absolutamente no.</b> Solo pagas la suscripción mensual fija de tu plan. El 100% de tus ventas son tuyas.
                    </p>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Check size={18} className="text-green-600"/> ¿Mis clientes deben bajar una app?</h3>
                    <p className="text-gray-600 leading-relaxed text-sm">
                        No. Tu menú es una página web rápida que abre al instante en cualquier navegador al escanear un QR o abrir el link.
                    </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Check size={18} className="text-green-600"/> ¿Cómo recibo los pagos?</h3>
                    <p className="text-gray-600 leading-relaxed text-sm">
                        Actualmente, acuerdas el pago con el cliente por WhatsApp (Efectivo/Transferencia). Pronto integraremos cobros automáticos.
                    </p>
                </div>

                 <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Check size={18} className="text-green-600"/> ¿Puedo cancelar cuando quiera?</h3>
                    <p className="text-gray-600 leading-relaxed text-sm">
                        Sí, no tenemos contratos de permanencia. Puedes mejorar tu plan o darte de baja desde tu panel cuando lo necesites.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-20 px-4 bg-black text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-green-900/30 via-transparent to-purple-900/30 opacity-50"></div>
        <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">¿Listo para modernizar tu local hoy mismo?</h2>
            <p className="text-gray-400 text-lg mb-10">Únete a los gastronómicos que usan Snappy para vender más.</p>
            <Link 
                href="/login" 
                className="bg-white text-black px-10 py-4 rounded-full font-bold text-xl hover:bg-gray-200 transition inline-flex items-center gap-2 shadow-xl hover:shadow-2xl hover:scale-105"
            >
                Crear mi cuenta gratis <ArrowRight size={20}/>
            </Link>
            <p className="text-xs text-gray-500 mt-6">Prueba de 14 días sin compromiso.</p>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-10 border-t border-gray-100 text-center text-sm text-gray-500 bg-gray-50">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
    <Image 
      src="/logo.svg" 
      alt="Logo Snappy" 
      width={20} 
      height={20} 
      className="w-5 h-5 object-contain" 
    />
    <b>Snappy</b>
</div>
        <p>&copy; {new Date().getFullYear()} Snappy.</p>
        <div className="flex justify-center gap-6 mt-6 font-medium">
            <a href="#" className="hover:text-black transition">Términos</a>
            <a href="#" className="hover:text-black transition">Privacidad</a>
            <a href="https://wa.me/2324694045" target="_blank" className="hover:text-black transition flex items-center gap-1"><MessageCircle size={14}/> Soporte</a>
        </div>
      </footer>

    </div>
  );
}