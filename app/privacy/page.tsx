import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Snappy',
  description:
    'Cómo Snappy recolecta, usa y protege los datos personales de los dueños de locales y de los clientes que hacen pedidos.',
};

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 font-sans text-gray-800 leading-relaxed break-words">
      <Link href="/" className="text-sm font-bold text-gray-500 hover:text-gray-900 transition">
        ← Volver al inicio
      </Link>
      <h1 className="mt-8 text-3xl sm:text-4xl font-black mb-8 uppercase italic tracking-tighter">Política de Privacidad — Snappy</h1>
      <p className="text-sm text-gray-500 mb-10 italic">Última actualización: 12 de noviembre de 2026</p>

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">1. Quiénes somos</h2>
          <p>Snappy (snappy.uno) es una plataforma de menú digital y pedidos para locales gastronómicos y comercios. Para los datos de los dueños de locales que se registran en Snappy, el responsable del tratamiento es Snappy. Podés escribirnos a <span className="text-fresco">snappyuno25@gmail.com</span>. [REVISAR: razón social, CUIT y domicilio legal del responsable]</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">2. Información que recolectamos</h2>
          <p className="mb-3"><span className="font-bold">De los dueños de locales:</span> nombre, apellido, correo electrónico, teléfono/WhatsApp, los datos de tu local (nombre, dirección, horarios, productos, precios e imágenes) y los datos de tu cuenta. Si iniciás sesión con Google, recibimos de Google los datos básicos de tu cuenta, como tu nombre y tu correo.</p>
          <p><span className="font-bold">De los clientes finales:</span> cuando una persona hace un pedido en el menú de un local, se cargan su nombre, teléfono, dirección de entrega (si corresponde) y el detalle del pedido.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">3. Roles: responsable y encargado</h2>
          <p className="mb-3">Respecto de los datos de los dueños de locales, Snappy es el responsable del tratamiento.</p>
          <p>Respecto de los datos de los clientes finales que hacen pedidos, el responsable es cada local. Snappy actúa como encargado del tratamiento: los guarda y los procesa solo para prestar el servicio al local y siguiendo sus instrucciones, y no los usa para fines propios. Si sos cliente de un local y querés ejercer tus derechos sobre esos datos, dirigite primero al local.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">4. Uso de la información</h2>
          <p>Utilizamos los datos para:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li>Gestionar tu cuenta y el acceso al panel de control.</li>
            <li>Mostrar tu menú digital y el link público (slug), y hacer llegar los pedidos al local.</li>
            <li>Procesar tus suscripciones a través de Mercado Pago.</li>
            <li>Enviarte notificaciones importantes sobre tus pedidos o el estado del servicio.</li>
            <li>Enviarte mails de servicio: bienvenida, recupero de contraseña, avisos de la prueba y de tu cuenta, y un agradecimiento cuando cargás tu tarjeta. Si te registraste y no te suscribiste, te mandamos una sola vez un mail de seguimiento para ofrecerte ayuda; ese mail incluye un link para darte de baja y no recibir más este tipo de mails.</li>
            <li>Brindarte soporte y mantener la seguridad del servicio.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">5. Pagos</h2>
          <p>Los cobros de las suscripciones se procesan a través de Mercado Pago. Snappy no almacena los números completos de tarjeta; los datos de pago los maneja Mercado Pago bajo sus propias políticas. Snappy guarda solo referencias para gestionar tu suscripción: el estado de la suscripción, los identificadores de cliente, tarjeta y suscripción en Mercado Pago, y la marca y los últimos cuatro dígitos de la tarjeta para que puedas reconocerla.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">6. Servicios de terceros</h2>
          <p className="mb-3">Para brindar el servicio usamos proveedores que procesan datos por nuestra cuenta:</p>
          <ul className="list-disc ml-6 space-y-2">
            <li><span className="font-bold">Supabase:</span> base de datos y autenticación.</li>
            <li><span className="font-bold">Vercel:</span> alojamiento y funcionamiento de la aplicación.</li>
            <li><span className="font-bold">Mercado Pago:</span> cobro de suscripciones y pagos.</li>
            <li><span className="font-bold">Google:</span> inicio de sesión con tu cuenta de Google.</li>
            <li><span className="font-bold">Resend:</span> envío de correos electrónicos.</li>
            <li><span className="font-bold">Meta Platforms:</span> píxel de Meta para medir visitas y mejorar nuestra publicidad (ver sección 9).</li>
          </ul>
          <p className="mt-3">Cada uno tiene sus propias políticas de privacidad y solo accede a los datos necesarios para su función. Algunos de estos proveedores pueden almacenar datos en servidores fuera de Argentina. [REVISAR: confirmar regiones de los servidores y las garantías para transferencias internacionales]</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">7. Seguridad de los datos</h2>
          <p>Aplicamos medidas de seguridad técnicas y organizativas razonables, como conexiones cifradas (SSL) y control de acceso a la base de datos, para proteger la información contra acceso no autorizado, pérdida o alteración. Ningún sistema es completamente infalible, por lo que no podemos garantizar una seguridad absoluta. No vendemos tus datos a terceros.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">8. Conservación</h2>
          <p>Conservamos los datos mientras tu cuenta esté activa y mientras sean necesarios para prestar el servicio, cumplir obligaciones legales o resolver reclamos. Después de ese período los eliminamos o los anonimizamos. [REVISAR: definir plazos concretos de conservación, si los hubiera]</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">9. Cookies, almacenamiento local y píxel de Meta</h2>
          <p className="mb-3">Usamos cookies y almacenamiento local del navegador que son necesarios para que el servicio funcione: mantener tu sesión iniciada y recordar el carrito y los datos de tus pedidos en el dispositivo.</p>
          <p className="mb-3">Además, Snappy usa el píxel de Meta (Facebook e Instagram), que se carga solo en la página principal, en el inicio de sesión, en el registro y en las páginas legales (esta política y los términos). No se carga en los menús públicos de los locales ni en el panel. Registra únicamente el evento de visita de página (PageView). Meta puede asociar esa visita con tu navegador o con tu cuenta de Facebook o Instagram, usar cookies propias y usar esa información para medir y optimizar la publicidad. Snappy no envía a Meta, a través del píxel, los datos de pedidos ni de pagos.</p>
          <p>Para desactivar la personalización de anuncios podés ajustar tus preferencias de anuncios en tu cuenta de Facebook o Instagram, bloquear las cookies de terceros o usar un bloqueador de rastreadores en tu navegador. Si preferís que no se cargue en tus visitas, escribinos a <span className="text-fresco">snappyuno25@gmail.com</span>.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">10. Tus derechos</h2>
          <p className="mb-3">Según la Ley 25.326 de Protección de Datos Personales de la República Argentina, tenés derecho a acceder a tus datos, rectificarlos, actualizarlos y solicitar su supresión. Podés ver y corregir gran parte de tu información desde la sección "Configuración" de tu panel, o escribiéndonos a <span className="text-fresco">snappyuno25@gmail.com</span>.</p>
          <p className="mb-3">Podés solicitar la eliminación de tu cuenta y de tus datos personales escribiéndonos a ese correo; algunos datos pueden conservarse el tiempo que exija la ley, por ejemplo registros de pagos [REVISAR]. La opción "Eliminar cuenta" del panel cancela tu suscripción; para borrar tus datos, enviá la solicitud por correo.</p>
          <p>La Agencia de Acceso a la Información Pública (AAIP) es el órgano de control de la Ley 25.326 y tiene la atribución de atender las denuncias y reclamos de quienes consideren afectados sus derechos.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">11. Cambios en esta política</h2>
          <p>Podemos actualizar esta política. Cuando haya cambios importantes los vamos a avisar por la plataforma o por correo, y la fecha de "Última actualización" va a reflejar la versión vigente.</p>
        </div>

        <div className="pt-10 border-t border-gray-100">
          <p className="font-bold text-gray-900">Contacto</p>
          <p>Si tenés dudas sobre esta política, escribinos a: <span className="text-fresco">snappyuno25@gmail.com</span></p>
          <p className="mt-3">Consultá también nuestros <Link href="/terminos" className="font-bold underline">Términos y Condiciones</Link>.</p>
        </div>
      </section>

      <div className="mt-20 text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
        Snappy Menú Digital — Todos los derechos reservados
      </div>
    </div>
  );
}
