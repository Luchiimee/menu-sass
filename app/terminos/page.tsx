import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Snappy',
  description:
    'Condiciones de uso del servicio de menú digital y pedidos de Snappy: cuentas, planes, pagos, cancelación y responsabilidades.',
};

export default function Terminos() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 font-sans text-gray-800 leading-relaxed break-words">
      <Link href="/" className="text-sm font-bold text-gray-500 hover:text-gray-900 transition">
        ← Volver al inicio
      </Link>
      <h1 className="mt-8 text-3xl sm:text-4xl font-black mb-8 uppercase italic tracking-tighter">Términos y Condiciones — Snappy</h1>
      <p className="text-sm text-gray-500 mb-10 italic">Última actualización: 12 de noviembre de 2026</p>

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">1. El servicio</h2>
          <p>Snappy (snappy.uno) es una plataforma que permite a locales gastronómicos y comercios crear un menú digital con un link público, recibir pedidos y gestionarlos desde un panel. Al crear una cuenta o usar Snappy aceptás estos términos. Snappy es operado por Luciano Meza, Mercedes, Buenos Aires, Argentina. Si no estás de acuerdo, no uses el servicio.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">2. Cuentas</h2>
          <p>Para usar Snappy necesitás registrarte con un correo electrónico o con tu cuenta de Google, y ser mayor de edad con capacidad legal para contratar. Tenés que darnos datos verdaderos y mantenerlos actualizados. Sos responsable de la actividad de tu cuenta y de cuidar tu contraseña. Si detectás un uso no autorizado, avisanos cuanto antes.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">3. Planes y prueba gratuita</h2>
          <p className="mb-3">Snappy ofrece distintos planes de suscripción, cuyas características y precios se muestran en la página de inicio y pueden cambiar. Todos los planes incluyen una prueba gratuita de 14 días, sin necesidad de cargar una tarjeta para empezar.</p>
          <p>Al terminar la prueba, para seguir usando Snappy tenés que cargar una tarjeta y suscribirte. Si no lo hacés, el menú público queda pausado para tus clientes y el panel se bloquea, salvo la sección para activar un plan. Tus datos no se borran en ese momento: los conservamos hasta 3 meses desde el vencimiento de la prueba y luego se eliminan o anonimizan, como se explica en la Política de Privacidad.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">4. Pagos y cancelación</h2>
          <p className="mb-3">Las suscripciones se cobran a través de Mercado Pago, con la periodicidad del plan elegido, y se renuevan automáticamente hasta que las canceles. La moneda y los impuestos aplicables se informan al momento de contratar el plan. Los precios pueden modificarse; si eso ocurre, te vamos a avisar con anticipación razonable.</p>
          <p>Podés cancelar tu suscripción cuando quieras. La cancelación evita los cobros futuros. Al cancelar, el menú público y el panel quedan pausados, y podés reactivar el servicio cuando quieras con una nueva suscripción. Los reembolsos se evalúan caso por caso; escribinos a <span className="text-fresco">snappyuno25@gmail.com</span>.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">5. Uso aceptable</h2>
          <p>Te comprometés a usar Snappy de forma lícita. No está permitido:</p>
          <ul className="list-disc ml-6 space-y-2 mt-2">
            <li>Publicar contenido ilegal, engañoso, ofensivo o que infrinja derechos de terceros.</li>
            <li>Vender productos o servicios prohibidos por la ley.</li>
            <li>Intentar acceder sin autorización a cuentas, sistemas o datos de otros usuarios.</li>
            <li>Interferir con el funcionamiento del servicio, sobrecargarlo o usarlo para enviar spam.</li>
          </ul>
          <p className="mt-3">Podemos suspender o dar de baja cuentas que incumplan estos términos; cuando sea posible, te avisaremos antes y te daremos la oportunidad de corregir el incumplimiento.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">6. Responsabilidad de los locales</h2>
          <p>Cada local es el único responsable de su menú: los productos, precios, imágenes, descripciones, horarios, zonas y costos de envío, la disponibilidad del stock, el cumplimiento de las normas aplicables a su actividad (incluidas las bromatológicas y de defensa del consumidor) y la preparación y entrega de los pedidos. Snappy es una herramienta tecnológica: no vende los productos del local ni es parte de la relación entre el local y sus clientes.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">7. Datos personales</h2>
          <p>El tratamiento de datos personales se rige por nuestra <Link href="/privacy" className="font-bold underline">Política de Privacidad</Link>. Respecto de los datos de los clientes que hacen pedidos, cada local es el responsable y Snappy actúa como encargado del tratamiento.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">8. Disponibilidad del servicio</h2>
          <p>Hacemos lo posible para que Snappy funcione de manera continua, pero no garantizamos que esté disponible sin interrupciones ni libre de errores. Puede haber cortes por mantenimiento, fallas técnicas o problemas de proveedores externos (conexión a internet, alojamiento, medios de pago). No asumimos un compromiso de disponibilidad específico.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">9. Limitación de responsabilidad</h2>
          <p>En la medida que lo permita la ley, Snappy no responde por pérdidas indirectas, lucro cesante o ventas perdidas derivadas de interrupciones del servicio, de errores en la información cargada por los locales o de fallas de terceros. Nada de lo dispuesto en estos términos limita los derechos que la ley te reconoce como consumidor o usuario.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">10. Cambios en los términos</h2>
          <p>Podemos modificar estos términos. Si los cambios son importantes, te lo vamos a avisar por la plataforma o por correo. Si seguís usando Snappy después del aviso, se entiende que aceptás la nueva versión.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3 text-gray-900">11. Ley aplicable y jurisdicción</h2>
          <p>Estos términos se rigen por las leyes de la República Argentina. Para cualquier controversia, serán competentes los tribunales ordinarios de Mercedes, Buenos Aires, sin perjuicio de las normas de defensa del consumidor.</p>
        </div>

        <div className="pt-10 border-t border-gray-100">
          <p className="font-bold text-gray-900">Contacto</p>
          <p>Si tenés dudas sobre estos términos, escribinos a: <span className="text-fresco">snappyuno25@gmail.com</span></p>
        </div>
      </section>

      <div className="mt-20 text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
        Snappy Menú Digital — Todos los derechos reservados
      </div>
    </div>
  );
}
