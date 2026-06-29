import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 font-sans text-gray-800 leading-relaxed">
      <h1 className="text-4xl font-black mb-8 uppercase italic tracking-tighter">Política de Privacidad — Snappy</h1>
      <p className="text-sm text-gray-500 mb-10 italic">Última actualización: 10 de abril de 2026</p>

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">1. Información que recolectamos</h2>
          <p>En Snappy, recolectamos información personal que tú nos proporcionas directamente al registrarte, como tu nombre, dirección de correo electrónico y número de teléfono de contacto (WhatsApp). También almacenamos la información de tu negocio (productos, precios e imágenes) para la correcta prestación del servicio.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">2. Uso de la información</h2>
          <p>Utilizamos tus datos para:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li>Gestionar tu cuenta y el acceso al panel de control.</li>
            <li>Procesar tus suscripciones a través de Mercado Pago.</li>
            <li>Enviarte notificaciones importantes sobre tus pedidos o estado del servicio.</li>
            <li>Personalizar tu menú digital y el link público (slug).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">3. Seguridad de los datos</h2>
          <p>Implementamos medidas de seguridad técnicas (vía Supabase y protocolos SSL) para proteger tu información contra acceso no autorizado, pérdida o alteración. No vendemos tus datos a terceros bajo ninguna circunstancia.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">4. Servicios de terceros</h2>
          <p>Snappy utiliza servicios externos como Mercado Pago (para cobros) y Supabase (para base de datos y autenticación). Estos servicios tienen sus propias políticas de privacidad y solo acceden a los datos necesarios para su función específica.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">5. Derechos del usuario</h2>
          <p>Puedes acceder, corregir o eliminar tu información personal en cualquier momento desde la sección de "Configuración" en tu panel de Snappy. La eliminación definitiva de la cuenta conlleva el borrado total de tus datos de nuestros servidores.</p>
        </div>

        <div className="pt-10 border-t border-gray-100">
          <p className="font-bold text-gray-900">Contacto</p>
          <p>Si tienes dudas sobre esta política, puedes escribirnos a: <span className="text-fresco">snappyuno25@gmail.com</span></p>
        </div>
      </section>

      <div className="mt-20 text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
        Snappy Menú Digital — Todos los derechos reservados
      </div>
    </div>
  );
}