import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, Check, Zap, Smartphone, TrendingUp, 
  Layout, Star, QrCode, MessageCircle, HelpCircle, ChevronRight
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-green-100">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
              <Zap size={20} fill="currentColor" />
            </div>
            <span className="font-bold text-xl tracking-tight">Snappy.</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-gray-500 hover:text-black transition hidden sm:block">
              Iniciar Sesión
            </Link>
            <Link 
              href="/login" 
              className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 transition shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              Prueba Gratis <ArrowRight size={16}/>
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-20 px-4 text-center max-w-6xl mx-auto">
        <div className="max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-green-100 animate-in fade-in slide-in-from-bottom-4">
            <Star size={12} fill="currentColor"/> Nuevo: Seguimiento de pedidos en vivo (Plan Plus)
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-gray-900 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-500">
            Tu menú digital, <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-600 to-gray-900">tus reglas, tus ventas.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700">
            Olvídate del PDF. Crea una tienda online profesional en minutos, recibe pedidos organizados por WhatsApp y gestiona tu negocio sin pagar comisiones.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-10 duration-1000">
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

        {/* --- MOCKUP REALISTA HERO --- */}
        <div className="relative mx-auto max-w-[320px] md:max-w-[360px] animate-in fade-in zoom-in duration-1000 delay-200 perspective-1000">
            {/* Sombra y brillo */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-green-500/20 to-purple-500/20 blur-3xl -z-10 rounded-[60px]"></div>
            
            {/* Marco del Teléfono */}
            <div className="relative bg-gray-900 rounded-[50px] p-3 shadow-2xl border-[6px] border-gray-800 overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-6 bg-black z-20 flex justify-center">
                    <div className="w-20 h-4 bg-black rounded-b-2xl"></div>
                </div>
                {/* PANTALLA - Reemplaza el src con una captura real de tu diseño 'Fresh' */}
                <div className="relative rounded-[38px] overflow-hidden aspect-[9/19.5] bg-white">
                     <Image 
                        src="https://placehold.co/600x1200/png?text=Captura+Dise%C3%B1o+Fresh" 
                        alt="App Screenshot" 
                        fill 
                        className="object-cover"
                    />
                     {/* Capa de brillo sobre la pantalla */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none"></div>
                </div>
            </div>
        </div>
      </section>

      {/* --- SECCIÓN: PLANTILLAS --- */}
      <section className="py-20 bg-gray-50 border-t border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4">Diseños que abren el apetito</h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">Elige la plantilla que mejor se adapte a la identidad de tu marca. Personalízala en segundos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-end">
                {/* Template 1: Classic */}
                <div className="text-center">
                    <div className="bg-white p-2 rounded-[40px] shadow-lg border-4 border-gray-200 mb-6 mx-auto max-w-[260px] hover:-translate-y-2 transition-transform duration-300">
                        <div className="relative rounded-[32px] overflow-hidden aspect-[9/16] bg-gray-100">
                           <Image src="https://placehold.co/400x800/png?text=Classic+Template" alt="Classic" fill className="object-cover"/>
                        </div>
                    </div>
                    <h3 className="font-bold text-xl mb-2">Classic</h3>
                    <p className="text-sm text-gray-500">Limpio, eficiente y fácil de navegar. Ideal para menús extensos.</p>
                </div>
                 {/* Template 2: Fresh (Destacado) */}
                <div className="text-center md:-mt-8">
                    <div className="bg-black p-2 rounded-[40px] shadow-xl border-4 border-black mb-6 mx-auto max-w-[280px] hover:-translate-y-2 transition-transform duration-300 relative z-10 scale-105">
                         <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-[32px] z-20">TOP</div>
                        <div className="relative rounded-[32px] overflow-hidden aspect-[9/16] bg-gray-100">
                            <Image src="https://placehold.co/400x800/png?text=Fresh+Template" alt="Fresh" fill className="object-cover"/>
                        </div>
                    </div>
                    <h3 className="font-bold text-xl mb-2">Fresh</h3>
                    <p className="text-sm text-gray-500">Visual y moderno. Perfecto para sushi, hamburguesas y platos visuales.</p>
                </div>
                 {/* Template 3: Urban */}
                <div className="text-center">
                    <div className="bg-gray-800 p-2 rounded-[40px] shadow-lg border-4 border-gray-700 mb-6 mx-auto max-w-[260px] hover:-translate-y-2 transition-transform duration-300">
                        <div className="relative rounded-[32px] overflow-hidden aspect-[9/16] bg-gray-900">
                           <Image src="https://placehold.co/400x800/png?text=Urban+Template" alt="Urban" fill className="object-cover"/>
                        </div>
                    </div>
                    <h3 className="font-bold text-xl mb-2">Urban</h3>
                    <p className="text-sm text-gray-500">Modo oscuro sofisticado. Ideal para bares, cafeterías y cocina nocturna.</p>
                </div>
            </div>
        </div>
      </section>

      {/* --- SECCIÓN: EL ROL DEL CLIENTE (CÓMO FUNCIONA) --- */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
                <span className="text-green-600 font-bold uppercase tracking-wider text-sm">El ciclo del éxito</span>
                <h2 className="text-4xl font-bold mb-4 mt-2">La experiencia simple que tus clientes amarán</h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">Menos fricción para ellos significa más ventas para ti. Así es el proceso.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                {/* Flechas conectoras (solo desktop) */}
                <div className="hidden md:block absolute top-1/2 left-1/3 w-1/3 h-px bg-gray-200 -z-10 text-gray-300 flex justify-end"><ChevronRight size={24} className="translate-x-1/2 -translate-y-1/2"/></div>
                <div className="hidden md:block absolute top-1/2 right-1/3 w-1/3 h-px bg-gray-200 -z-10 text-gray-300 flex justify-end"><ChevronRight size={24} className="translate-x-1/2 -translate-y-1/2"/></div>

                {/* Paso 1 */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center relative z-10">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 mx-auto shadow-sm">
                        <Layout size={32}/>
                    </div>
                    <h3 className="font-bold text-xl mb-3">1. Tú Personalizas</h3>
                    <p className="text-gray-500 leading-relaxed">
                        Subes tu logo, tus productos y eliges un diseño. Obtienes un link único (ej: snappy.uno/tu-bar).
                    </p>
                </div>
                
                {/* Paso 2 */}
                <div className="bg-white p-8 rounded-3xl shadow-md border-2 border-green-100 text-center relative z-20 scale-105">
                    <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center text-white mb-6 mx-auto shadow-lg">
                        <QrCode size={32}/>
                    </div>
                    <h3 className="font-bold text-xl mb-3">2. El Cliente Escanea</h3>
                    <p className="text-gray-500 leading-relaxed">
                        Entran a tu link desde QR o redes. No necesitan descargar nada. Navegan y arman su carrito.
                    </p>
                </div>

                {/* Paso 3 */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center relative z-10">
                    <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6 mx-auto shadow-sm">
                        <MessageCircle size={32}/>
                    </div>
                    <h3 className="font-bold text-xl mb-3">3. Recibes el Pedido</h3>
                    <p className="text-gray-500 leading-relaxed">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* PLAN LIGHT */}
            <div className="bg-white border border-gray-200 rounded-3xl p-8 hover:border-gray-300 transition relative">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Light</h3>
              <p className="text-sm text-gray-500 mb-6">Para empezar a vender online.</p>
              <div className="mb-6">
                <span className="text-4xl font-black">$6.400</span>
                <span className="text-gray-400">/mes</span>
              </div>
              
              <Link href="/login" className="block w-full py-3 rounded-xl border-2 border-gray-900 text-gray-900 font-bold text-center hover:bg-gray-50 transition mb-8">
                Prueba 14 días gratis
              </Link>

              <ul className="space-y-4 text-sm text-gray-600">
                <li className="flex gap-3"><Check size={18} className="text-green-600 flex-shrink-0"/> Catálogo Digital Interactivo</li>
                <li className="flex gap-3"><Check size={18} className="text-green-600 flex-shrink-0"/> Pedidos directos a WhatsApp</li>
                <li className="flex gap-3"><Check size={18} className="text-green-600 flex-shrink-0"/> Mostrar Alias para Transferencias</li>
                <li className="flex gap-3"><Check size={18} className="text-green-600 flex-shrink-0"/> Dominio Personalizable</li>
                <li className="flex gap-3"><Check size={18} className="text-green-600 flex-shrink-0"/> Acceso a plantillas básicas</li>
              </ul>
            </div>

            {/* PLAN PLUS (DESTACADO) */}
            <div className="bg-white border-2 border-green-600 rounded-3xl p-8 relative shadow-xl scale-105 z-10">
              <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                RECOMENDADO
              </div>
              <h3 className="text-xl font-bold text-green-700 mb-2 flex items-center gap-2">Plus <Zap size={18} fill="currentColor"/></h3>
              <p className="text-sm text-gray-500 mb-6">Profesionaliza tu gestión y servicio.</p>
              <div className="mb-6">
                <span className="text-5xl font-black text-gray-900">$13.900</span>
                <span className="text-gray-400">/mes</span>
              </div>
              
              <Link href="/login" className="block w-full py-4 rounded-xl bg-green-600 text-white font-bold text-center hover:bg-green-700 transition shadow-lg mb-8 hover:scale-[1.02]">
                Empezar Prueba Gratis
              </Link>

              <ul className="space-y-4 text-sm text-gray-700 font-medium">
                <li className="flex gap-3"><span className="bg-green-200 text-green-700 rounded-full p-0.5"><Check size={14}/></span> Todo lo del plan Light</li>
                <li className="flex gap-3"><span className="bg-green-200 text-green-700 rounded-full p-0.5"><Check size={14}/></span> <b>Seguimiento de Pedido en Vivo</b> 🚀</li>
                <li className="flex gap-3"><span className="bg-green-200 text-green-700 rounded-full p-0.5"><Check size={14}/></span> Panel de Comandas (Cocina)</li>
                <li className="flex gap-3"><span className="bg-green-200 text-green-700 rounded-full p-0.5"><Check size={14}/></span> Control básico de Caja</li>
                <li className="flex gap-3"><span className="bg-green-200 text-green-700 rounded-full p-0.5"><Check size={14}/></span> Acceso a todas las plantillas</li>
              </ul>
            </div>

            {/* PLAN MAX (COMING SOON) */}
            <div className="bg-white border border-gray-200 rounded-3xl p-8 opacity-70 relative overflow-hidden grayscale-[30%]">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center z-20">
                    <span className="bg-gray-100 border border-gray-300 shadow-sm px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-gray-600">Próximamente</span>
                </div>
                
                <div className="filter blur-[1px] select-none pointer-events-none">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Max</h3>
                    <p className="text-sm text-gray-500 mb-6">Para escalar sin límites.</p>
                    <div className="mb-6">
                        <span className="text-4xl font-black">$21.200</span>
                        <span className="text-gray-400">/mes</span>
                    </div>
                    
                    <button disabled className="block w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-bold text-center mb-8 cursor-not-allowed">
                        Unirse a la lista de espera
                    </button>

                    <ul className="space-y-4 text-sm text-gray-500">
                        <li className="flex gap-3"><Check size={18}/> Todo lo del plan Plus</li>
                        <li className="flex gap-3"><Check size={18}/> Panel Pro para Caja</li>
                        <li className="flex gap-3"><Check size={18}/> Integración con Mercado Pago</li>
                        <li className="flex gap-3"><Check size={18}/> Gestión de hasta 2 sucursales</li>
                        <li className="flex gap-3"><Check size={18}/> Nuevas integraciones (Pronto)</li>
                    </ul>
                </div>
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
                    <p className="text-gray-600 leading-relaxed">
                        <b>Absolutamente no.</b> Solo pagas la suscripción mensual fija de tu plan. El 100% de tus ventas son tuyas.
                    </p>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Check size={18} className="text-green-600"/> ¿Mis clientes deben descargar una app?</h3>
                    <p className="text-gray-600 leading-relaxed">
                        No. Tu menú es una página web rápida que abre al instante en cualquier navegador al escanear un QR o abrir el link.
                    </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Check size={18} className="text-green-600"/> ¿Cómo recibo los pagos?</h3>
                    <p className="text-gray-600 leading-relaxed">
                        Actualmente, acuerdas el pago con el cliente por WhatsApp (Efectivo/Transferencia). Pronto integraremos Mercado Pago en el Plan Max para cobros automáticos.
                    </p>
                </div>

                 <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Check size={18} className="text-green-600"/> ¿Puedo cambiar de plan después?</h3>
                    <p className="text-gray-600 leading-relaxed">
                        Sí, puedes mejorar tu plan (upgrade) o cancelarlo en cualquier momento desde tu panel de control sin ataduras.
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
            <p className="text-gray-400 text-lg mb-10">Únete a los gastronómicos inteligentes que usan Snappy para vender más y simplificar su operación.</p>
            <Link 
                href="/login" 
                className="bg-white text-black px-10 py-4 rounded-full font-bold text-xl hover:bg-gray-200 transition inline-flex items-center gap-2 shadow-xl hover:shadow-2xl hover:scale-105"
            >
                Crear mi cuenta gratis <ArrowRight size={20}/>
            </Link>
            <p className="text-xs text-gray-500 mt-6">Prueba de 14 días. No requiere tarjeta de crédito para empezar.</p>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-10 border-t border-gray-100 text-center text-sm text-gray-500 bg-gray-50">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
            <Zap size={16}/> <b>Snappy</b>
        </div>
        <p>&copy; {new Date().getFullYear()} Snappy. Hecho con 🖤 en Argentina.</p>
        <div className="flex justify-center gap-6 mt-6 font-medium">
            <a href="#" className="hover:text-black transition">Términos</a>
            <a href="#" className="hover:text-black transition">Privacidad</a>
            <a href="https://wa.me/TU_NUMERO" target="_blank" className="hover:text-black transition flex items-center gap-1"><MessageCircle size={14}/> Soporte</a>
        </div>
      </footer>

    </div>
  );
}