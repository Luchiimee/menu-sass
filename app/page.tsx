import Link from "next/link";
import { Rocket, CheckCircle, Smartphone, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      
      {/* --- NAVBAR --- */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="bg-black text-white p-1.5 rounded-lg">
            <Rocket size={20} />
          </div>
          Snappy
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/login" className="text-sm font-medium hover:text-gray-600 transition">
            Ingresar
          </Link>
          <Link 
            href="/login" 
            className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 transition"
          >
            Crear Cuenta
          </Link>
        </div>
      </nav>

      {/* --- HERO SECTION (La venta principal) --- */}
      <main className="max-w-4xl mx-auto px-6 pt-20 pb-32 text-center">
        <span className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase mb-6 inline-block">
          Sin comisiones por venta
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Tu menú digital <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">
            listo en 60 segundos.
          </span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          Olvídate de los PDFs. Crea una tienda online profesional, recibe pedidos por WhatsApp y gestiona tus precios al instante.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            href="/login" 
            className="flex items-center justify-center gap-2 bg-black text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-800 hover:scale-105 transition shadow-xl"
          >
            Empezar Gratis <ArrowRight size={20} />
          </Link>
          <a 
            href="#demo" 
            className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-900 px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-50 transition"
          >
            Ver Demo
          </a>
        </div>
      </main>

      {/* --- FEATURES (Beneficios) --- */}
      <section className="bg-gray-50 py-24 border-t">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-12">
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 text-green-700 rounded-xl flex items-center justify-center mb-6">
              <Smartphone size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Pedidos por WhatsApp</h3>
            <p className="text-gray-500">Tus clientes eligen, el sistema arma el mensaje y te llega el pedido listo al WhatsApp. Sin intermediarios.</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center mb-6">
              <CheckCircle size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Autogestionable</h3>
            <p className="text-gray-500">Cambia precios, pausa productos sin stock o actualiza fotos desde tu celular en tiempo real.</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center mb-6">
              <Rocket size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Tu propia URL</h3>
            <p className="text-gray-500">Consigue un enlace profesional (snappy.uno/tu-marca) para poner en tu biografía de Instagram.</p>
          </div>

        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t py-12 text-center text-gray-500 text-sm">
        <p>© 2024 Snappy. Hecho para gastronómicos.</p>
      </footer>

    </div>
  );
}