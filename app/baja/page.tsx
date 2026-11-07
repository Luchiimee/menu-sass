// /baja?t=<token> — pide confirmar la baja de los mails de seguimiento.
// GET solo VERIFICA el token y muestra el botón: nunca escribe en la base (la baja la hace
// POST /api/baja cuando la persona confirma). Con un token inválido, mensaje genérico.

import type { Metadata } from 'next';
import { verifyUnsubToken } from '@/lib/email/unsubscribe';
import { whatsappLink } from '@/lib/email/contact';
import BajaForm from './BajaForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Baja de mails — Snappy',
  robots: { index: false, follow: false },
  referrer: 'no-referrer', // el token va en la URL: que no salga en el Referer
};

export default async function BajaPage({ searchParams }: { searchParams: Promise<{ t?: string | string[] }> }) {
  const params = await searchParams;
  const token = typeof params.t === 'string' ? params.t : null;
  const valid = verifyUnsubToken(token, process.env.EMAIL_UNSUB_SECRET) !== null;

  return (
    <div className="max-w-md mx-auto px-6 py-24 font-sans text-gray-800 leading-relaxed">
      <h1 className="text-2xl font-black mb-6 uppercase italic tracking-tighter">Snappy</h1>

      {valid && token ? (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">¿Querés dejar de recibir estos mails?</h2>
          <p className="text-sm text-gray-600">
            Dejaremos de mandarte el mail de seguimiento de la prueba. Los avisos importantes de tu cuenta no se ven afectados.
          </p>
          <BajaForm token={token} />
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Este link no es válido</h2>
          <p className="text-sm text-gray-600">
            No pudimos verificar este link. Si querés dejar de recibir nuestros mails,{' '}
            <a
              href={whatsappLink('Hola, quiero dejar de recibir los mails de Snappy')}
              className="underline"
            >
              escribinos por WhatsApp
            </a>{' '}
            y lo resolvemos.
          </p>
        </div>
      )}
    </div>
  );
}
