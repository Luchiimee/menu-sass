'use client'; 

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, Check, Zap, Star, QrCode, MessageCircle, Menu, X, Layout, Smartphone, MousePointer2, HelpCircle, CreditCard // <-- AGREGADO AQUÍ
} from 'lucide-react';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-green-100 overflow-x-hidden">
      
      {/* --- BOTÓN WHATSAPP FLOTANTE --- */}
      <a 
        href="https://wa.me/2324694045" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[60] bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-90 flex items-center justify-center group"
      >
        <MessageCircle size={28} fill="currentColor" />
        <span className="absolute right-full mr-3 bg-white text-gray-800 px-3 py-1 rounded-lg text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-gray-100">
          ¿Necesitas ayuda?
        </span>
      </a>

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8">
               <Image 
                 src="/logo.svg" 
                 alt="Logo Snappy" 
                 fill
                 className="object-contain" 
               />
            </div>
            <span className="font-bold text-2xl tracking-tight text-gray-900">Snappy.</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-black transition">
              Iniciar Sesión
            </Link>
            <Link 
              href="/login" 
              className="bg-black text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-gray-800 transition shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2"
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
            <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-100 shadow-xl p-6 flex flex-col gap-4 animate-in slide-in-from-top-5 h-screen bg-white/95 backdrop-blur-xl z-40">
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
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-green-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 -z-10"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="text-center lg:text-left z-10 order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm px-4 py-1.5 rounded-full text-xs font-bold mb-8 text-gray-600 animate-in fade-in slide-in-from-bottom-4">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Nuevo: Seguimiento en vivo
                </div>
                
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-gray-900 leading-[1.05] animate-in fade-in slide-in-from-bottom-6 duration-500">
                    Tu menú digital,<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-gray-900">listo en segundos.</span>
                </h1>
                
                <p className="text-lg md:text-xl text-gray-500 mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    Sin PDFs aburridos. Crea una experiencia de compra increíble para tus clientes y recibe pedidos directo a WhatsApp.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-in fade-in slide-in-from-bottom-10 duration-1000">
                    <Link 
                        href="/login" 
                        className="bg-black text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-800 transition shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2"
                    >
                        Empezar Ahora <Zap size={20} fill="currentColor"/>
                    </Link>
                    <a 
                        href="#demo" 
                        className="bg-white text-gray-700 border border-gray-200 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                        Ver Demo
                    </a>
                </div>
            </div>

            <div className="relative animate-in fade-in zoom-in duration-1000 delay-200 group order-1 lg:order-2 flex justify-center lg:justify-end">
                <div className="absolute inset-0 bg-gradient-to-tr from-green-500 to-purple-600 rounded-[45px] blur-2xl opacity-20 group-hover:opacity-30 transition duration-500 mx-auto w-full max-w-[280px] md:max-w-[320px] translate-y-4"></div>
                
                <div className="relative rounded-[40px] overflow-hidden shadow-2xl border-4 border-white bg-white aspect-[9/16] w-full max-w-[280px] md:max-w-[320px]">
                     <Image 
                        src="/menu-burguer.jpeg" 
                        alt="Vista del Menú Digital en Celular" 
                        fill 
                        className="object-cover hover:scale-105 transition duration-700 ease-in-out"
                    />
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-max bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-lg border border-white/50 flex items-center gap-2">
                        <div className="bg-green-100 p-1.5 rounded-full text-green-700">
                            <QrCode size={16}/>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">Escanea y pide</p>
                            <p className="text-sm font-bold text-gray-900 leading-none mt-0.5">Sin App</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </section>

      {/* --- SECCIÓN: DASHBOARD VS MENU --- */}
      <section id="demo" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
                <div className="order-2 lg:order-1 relative">
                    <div className="relative rounded-3xl shadow-2xl border border-gray-200 overflow-hidden group hover:-translate-y-2 transition-transform duration-500 bg-white">
                        <Image 
                            src="/panel-control.gif" 
                            alt="Panel de Control Snappy" 
                            width={800} 
                            height={600}
                            className="w-full h-auto object-cover"
                        />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <MousePointer2 size={18}/> Panel de Control
                        </div>
                    </div>
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-200 rounded-full blur-3xl -z-10"></div>
                </div>

                <div className="order-1 lg:order-2">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                        <Layout size={24}/>
                    </div>
                    <h2 className="text-4xl font-bold mb-6">Ahorra tiempo con <br/> actualizaciones masivas</h2>
                    <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                        ¿Se acabó la palta? ¿Cambiaste el precio de la hamburguesa? 
                        Edita tu menú desde el celular o la computadora y se actualiza al instante en todos los QR. 
                        Lo que antes tomaba días de diseño, ahora toma segundos.
                    </p>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-gray-700 font-medium"><Check size={20} className="text-blue-500"/> Cambios en tiempo real</li>
                        <li className="flex items-center gap-3 text-gray-700 font-medium"><Check size={20} className="text-blue-500"/> Sin necesidad de reimprimir QRs</li>
                        <li className="flex items-center gap-3 text-gray-700 font-medium"><Check size={20} className="text-blue-500"/> Pausa productos sin stock</li>
                    </ul>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-6">
                        <Smartphone size={24}/>
                    </div>
                    <h2 className="text-4xl font-bold mb-6">Tus clientes piden <br/> más fácil y rápido</h2>
                    <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                        Una interfaz diseñada para vender. Fotos grandes, carga rápida y un proceso de compra 
                        sin fricción que aumenta tu ticket promedio.
                    </p>
                    <Link href="/login" className="text-green-600 font-bold hover:underline flex items-center gap-2">
                        Ver ejemplo en vivo <ArrowRight size={16}/>
                    </Link>
                </div>

                <div className="relative flex justify-center lg:justify-end">
                    <div className="relative rounded-[30px] overflow-hidden shadow-2xl border-4 border-white w-full max-w-[320px] transform rotate-2 hover:rotate-0 transition duration-500 bg-white">
                         <Image 
                            src="/menu-cliente-burguer.gif" 
                            alt="Menú Móvil" 
                            width={400} 
                            height={711} 
                            className="w-full h-auto block"
                        />
                    </div>
                    <div className="absolute top-10 -right-4 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce duration-[3000ms] z-10 border border-gray-100">
                        <div className="bg-green-100 p-2 rounded-full text-green-600"><Check size={16}/></div>
                        <div className="text-xs font-bold text-gray-900">¡Pedido Enviado!</div>
                    </div>
                </div>
            </div>
        </div>
      </section>
{/* BLOQUE 3: PAGOS (ALIAS) */}
<section className="py-24 bg-white">
    <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* IMAGEN: Aquí suplantarás por tu captura del carrito con el Alias */}
            <div className="relative flex justify-center lg:justify-start order-2 lg:order-1">
                <div className="absolute inset-0 bg-purple-100 rounded-[40px] blur-3xl opacity-30 -z-10"></div>
                <div className="relative rounded-[30px] overflow-hidden shadow-2xl border-4 border-white w-full max-w-[320px] bg-white transition-transform hover:scale-[1.02] duration-500">
                    <Image 
                        src="/boton-transferencia.jpeg" 
                        alt="Botón copiar Alias en el pedido" 
                        width={400} 
                        height={711} 
                        className="w-full h-auto block"
                    />
                    {/* Badge de Copiado (Simulado) */}
                    <div className="absolute bottom-10 right-4 bg-purple-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
                        <Check size={16}/> <span className="text-xs font-bold">¡Alias Copiado!</span>
                    </div>
                </div>
            </div>

            {/* TEXTO EXPLICATIVO */}
            <div className="order-1 lg:order-2">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6">
                    <CreditCard size={24}/>
                </div>
                <h2 className="text-4xl font-bold mb-6 text-gray-900 leading-tight">
                    Cobros más rápidos, <br/> sin idas y vueltas
                </h2>
                <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                    Tus clientes pueden copiar tu <b>Alias o CBU</b> directamente desde el resumen del pedido. 
                    Así, cuando te envían el WhatsApp, ya adjuntan el comprobante de transferencia al instante.
                </p>
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="bg-green-100 p-1 rounded-full text-green-600 mt-1"><Check size={16}/></div>
                        <p className="text-gray-700 font-medium text-sm">Botón de copiado con un solo toque.</p>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="bg-green-100 p-1 rounded-full text-green-600 mt-1"><Check size={16}/></div>
                        <p className="text-gray-700 font-medium text-sm">Menos tiempo respondiendo datos bancarios.</p>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="bg-green-100 p-1 rounded-full text-green-600 mt-1"><Check size={16}/></div>
                        <p className="text-gray-700 font-medium text-sm">Recibes pedido y comprobante en el mismo mensaje.</p>
                    </div>
                </div>
            </div>

        </div>
    </div>
</section>
      {/* --- SECCIÓN: PLANTILLAS --- */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-4">
                    <h2 className="text-4xl font-bold mb-6">Diseños que abren <br/> el apetito 🍔</h2>
                    <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                        No necesitas ser diseñador. Elige una plantilla, sube tu logo y listo. 
                        Adaptables a cualquier estilo: Sushi, Hamburguesas, Cafetería o Alta Cocina.
                    </p>
                    <div className="flex flex-col gap-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">1</div>
                            <p className="font-medium text-gray-700">Elige tu estilo visual</p>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">2</div>
                            <p className="font-medium text-gray-700">Sube tus fotos</p>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">3</div>
                            <p className="font-bold text-gray-900">¡A vender!</p>
                         </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        <div className="group relative h-[400px] rounded-[30px] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300">
                            <Image src="/menu-clasic.jpeg" alt="Classic" fill className="object-cover group-hover:scale-110 transition duration-700"/>
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition"></div>
                            <div className="absolute bottom-6 left-6 text-white">
                                <h3 className="font-bold text-xl">Classic</h3>
                                <p className="text-xs opacity-80">Simple y limpio</p>
                            </div>
                        </div>

                        <div className="group relative h-[400px] rounded-[30px] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 -mt-0 md:-mt-12">
                            <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full z-20">POPULAR</div>
                            <Image src="/menu-sushi.jpeg" alt="Fresh" fill className="object-cover group-hover:scale-110 transition duration-700"/>
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition"></div>
                            <div className="absolute bottom-6 left-6 text-white">
                                <h3 className="font-bold text-xl">Fresh</h3>
                                <p className="text-xs opacity-80">Ideal gastronomía visual</p>
                            </div>
                        </div>

                        <div className="group relative h-[400px] rounded-[30px] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300">
                            <Image src="/menu-urban.jpeg" alt="Urban" fill className="object-cover group-hover:scale-110 transition duration-700"/>
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition"></div>
                            <div className="absolute bottom-6 left-6 text-white">
                                <h3 className="font-bold text-xl">Urban</h3>
                                <p className="text-xs opacity-80">Modo oscuro elegante</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- PRICING --- */}
      <section id="planes" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Planes transparentes</h2>
            <p className="text-gray-500 text-lg">Sin comisiones por venta. Cancela cuando quieras.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-200 rounded-3xl p-8 hover:border-gray-300 transition relative flex flex-col h-full hover:-translate-y-1 hover:shadow-lg duration-300">
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
              </ul>
            </div>

            <div className="bg-gray-900 text-white border-2 border-gray-900 rounded-3xl p-8 relative shadow-2xl scale-105 z-10 flex flex-col h-full">
              <div className="absolute top-0 right-0 bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                MÁS ELEGIDO
              </div>
              <h3 className="text-xl font-bold text-green-400 mb-2 flex items-center gap-2">Plus <Zap size={18} fill="currentColor"/></h3>
              <p className="text-sm text-gray-400 mb-6">Profesionaliza tu gestión.</p>
              <div className="mb-6">
                <span className="text-5xl font-black text-white">$15.900</span>
                <span className="text-gray-400">/mes</span>
              </div>
              <Link href="/login" className="block w-full py-4 rounded-xl bg-green-500 text-black font-bold text-center hover:bg-green-400 transition shadow-lg mb-8 hover:scale-[1.02]">
                Prueba 14 días gratis
              </Link>
              <ul className="space-y-4 text-sm text-gray-300 font-medium flex-1">
                <li className="flex gap-3"><span className="bg-green-900 text-green-400 rounded-full p-0.5"><Check size={14}/></span> <b>Productos Ilimitados</b> ✨</li>
                <li className="flex gap-3"><span className="bg-green-900 text-green-400 rounded-full p-0.5"><Check size={14}/></span> Todo lo del plan Light</li>
                <li className="flex gap-3"><span className="bg-green-900 text-green-400 rounded-full p-0.5"><Check size={14}/></span> <b>Seguimiento de Pedido en Vivo</b> 🚀</li>
                <li className="flex gap-3"><span className="bg-green-900 text-green-400 rounded-full p-0.5"><Check size={14}/></span> <b>QR Inteligente</b></li>
                <li className="flex gap-3"><span className="bg-green-900 text-green-400 rounded-full p-0.5"><Check size={14}/></span> Panel de Comandas (Cocina)</li>
                <li className="flex gap-3"><span className="bg-green-900 text-green-400 rounded-full p-0.5"><Check size={14}/></span> Acceso a todas las plantillas</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-8 relative overflow-hidden flex flex-col h-full opacity-70 hover:opacity-100 transition duration-300">
                <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-300 z-20">
                    PRÓXIMAMENTE
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Max</h3>
                <p className="text-sm text-gray-500 mb-6">Para escalar sin límites.</p>
                <div className="mb-6 filter blur-[4px] select-none">
                    <span className="text-4xl font-black">$28.600</span>
                    <span className="text-gray-400">/mes</span>
                </div>
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

      {/* --- SECCIÓN: PREGUNTAS FRECUENTES --- */}
      <section className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <HelpCircle size={48} className="mx-auto text-green-600 mb-4" />
            <h2 className="text-4xl font-bold mb-4">Preguntas Frecuentes</h2>
            <p className="text-gray-500 text-lg italic">Resolvemos tus dudas antes de empezar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:border-green-200 transition-colors">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <span className="text-green-600">01.</span> ¿Cobran comisión?
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                <b>Absolutamente no.</b> Solo pagas la suscripción mensual fija. El 100% de tus ventas va directo a tu bolsillo.
              </p>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:border-green-200 transition-colors">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <span className="text-green-600">02.</span> ¿Necesitan una App?
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                No. Tus clientes acceden escaneando un QR. Abre al instante en cualquier navegador, sin descargas molestas.
              </p>
            </div>

           <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:border-green-200 transition-colors">
  <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
    <span className="text-green-600">03.</span> ¿Cómo recibo pagos?
  </h3>
  <p className="text-gray-600 leading-relaxed text-sm">
    El cliente puede <b>copiar tu Alias de Mercado Pago</b> directamente desde el carrito de compras. Así, al enviarte el pedido por WhatsApp, ya puede adjuntar el comprobante de transferencia al instante.
  </p>
</div>

            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:border-green-200 transition-colors">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <span className="text-green-600">04.</span> ¿Puedo cancelar?
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                Sí, en cualquier momento desde tu panel. No tenemos contratos de permanencia ni letras chicas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-24 px-6 bg-black text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/20 rounded-full blur-[100px]"></div>
        
        <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight tracking-tight">¿Listo para vender más?</h2>
            <p className="text-gray-400 text-xl mb-12">Únete a los gastronómicos que usan Snappy.</p>
            <Link 
                href="/login" 
                className="bg-white text-black px-12 py-5 rounded-full font-bold text-xl hover:bg-gray-200 transition inline-flex items-center gap-3 shadow-xl hover:shadow-white/20 hover:scale-105"
            >
                Crear mi cuenta gratis <ArrowRight size={24}/>
            </Link>
            <p className="text-sm text-gray-500 mt-8">Prueba de 14 días sin compromiso. No se requiere tarjeta.</p>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-gray-100 text-center text-sm text-gray-500 bg-white">
        <div className="flex items-center justify-center gap-2 mb-6 opacity-80">
           <Image 
             src="/logo.svg" 
             alt="Logo Snappy" 
             width={24} 
             height={24} 
             className="w-6 h-6 object-contain" 
           />
           <b className="text-lg text-gray-900">Snappy.</b>
        </div>
        <p className="mb-6">&copy; {new Date().getFullYear()} Snappy Menu. Todos los derechos reservados.</p>
        <div className="flex justify-center gap-8 font-medium">
            <a href="#" className="hover:text-black transition">Términos</a>
            <a href="#" className="hover:text-black transition">Privacidad</a>
            <a href="https://wa.me/2324694045" target="_blank" className="hover:text-black transition flex items-center gap-2"><MessageCircle size={16}/> Soporte</a>
        </div>
      </footer>

    </div>
  );
}