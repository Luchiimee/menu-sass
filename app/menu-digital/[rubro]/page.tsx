import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { RUBROS, FEATURES, PASOS, rubroBySlug, RUBRO_PATH } from '@/lib/rubros';
import { PLAN_PRICES, formatARS } from '@/lib/plans';

const SITE_URL = 'https://snappy.uno';

// Solo existen los rubros de la lista: cualquier otra cosa es 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return RUBROS.map((r) => ({ rubro: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ rubro: string }> }): Promise<Metadata> {
  const { rubro } = await params;
  const r = rubroBySlug(rubro);
  if (!r) return {};
  const path = RUBRO_PATH(r.slug);
  return {
    title: r.metaTitle,
    description: r.metaDescription,
    alternates: { canonical: path },
    openGraph: { type: 'website', url: `${SITE_URL}${path}`, title: r.metaTitle, description: r.metaDescription, locale: 'es_AR', siteName: 'Snappy' },
    twitter: { card: 'summary_large_image', title: r.metaTitle, description: r.metaDescription },
  };
}

export default async function RubroPage({ params }: { params: Promise<{ rubro: string }> }) {
  const { rubro } = await params;
  const r = rubroBySlug(rubro);
  if (!r) notFound();

  const desde = formatARS(PLAN_PRICES.light);
  const faqs = [
    { q: `¿Cuánto cuesta el menú digital para ${r.nombre}?`, a: `Podés probar Snappy gratis 14 días. Después, los planes arrancan en ${desde} por mes.` },
    { q: '¿Cobran comisión por mis ventas?', a: 'No. Snappy no cobra comisión por ventas: pagás tu plan y los pedidos son tuyos.' },
    { q: '¿Mis clientes tienen que descargar una app?', a: 'No. Tus clientes abren tu menú desde el celular con un link o un QR, sin apps ni PDFs.' },
    { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. Podés cancelar tu suscripción cuando quieras y seguís usando Snappy hasta el final del período pagado.' },
  ];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Snappy', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: r.h1, item: `${SITE_URL}${RUBRO_PATH(r.slug)}` },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };
  const otros = RUBROS.filter((x) => x.slug !== r.slug);

  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-snappy.svg" alt="Snappy" width={32} height={32} />
          <span className="font-bold text-2xl tracking-tight">Snappy.</span>
        </Link>
        <Link href="/login" className="text-sm font-bold uppercase tracking-widest text-gray-600 hover:text-black transition">Iniciar sesión</Link>
      </header>

      <main>
        <section className="max-w-4xl mx-auto px-6 pt-12 pb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6">{r.h1}</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">{r.intro}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="bg-fresco text-white font-bold px-8 py-4 rounded-2xl hover:opacity-90 transition">Probá gratis 14 días</Link>
            <Link href="/demo" className="bg-white border border-border font-bold px-8 py-4 rounded-2xl hover:bg-surface transition">Ver la demo</Link>
          </div>
          <p className="mt-4 text-xs text-graphite font-medium">Sin comisión por ventas.</p>
        </section>

        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="bg-white border border-border rounded-[2rem] p-8 md:p-10">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">{r.dolor.title}</h2>
            <p className="text-gray-600 leading-relaxed">{r.dolor.text}</p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-20">
          <h2 className="text-3xl font-extrabold tracking-tight text-center mb-10">Todo lo que tu negocio necesita</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {r.features.map((k) => (
              <div key={k} className="bg-white border border-border rounded-[2rem] p-7">
                <h3 className="text-lg font-bold mb-2">{FEATURES[k].title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{FEATURES[k].text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 pb-20">
          <h2 className="text-3xl font-extrabold tracking-tight text-center mb-10">Empezá en tres pasos</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PASOS.map((p, i) => (
              <li key={p.title} className="bg-surface rounded-[2rem] p-7">
                <span className="inline-flex w-9 h-9 items-center justify-center rounded-full bg-ink text-white font-bold mb-4">{i + 1}</span>
                <h3 className="font-bold mb-1">{p.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="max-w-3xl mx-auto px-6 pb-20">
          <h2 className="text-3xl font-extrabold tracking-tight text-center mb-8">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="bg-white border border-border rounded-2xl p-6">
                <h3 className="font-bold mb-1">{f.q}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 pb-20 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">Armá tu menú hoy</h2>
          <p className="text-gray-600 mb-8">Probá Snappy gratis 14 días y mirá cómo queda el menú de tus {r.nombre}.</p>
          <Link href="/register" className="inline-block bg-fresco text-white font-bold px-8 py-4 rounded-2xl hover:opacity-90 transition">Crear mi menú gratis</Link>
        </section>

        <nav aria-label="Otros rubros" className="max-w-5xl mx-auto px-6 pb-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-graphite mb-4">Snappy también es para</p>
          <ul className="flex flex-wrap justify-center gap-3">
            {otros.map((o) => (
              <li key={o.slug}>
                <Link href={RUBRO_PATH(o.slug)} className="inline-block bg-white border border-border rounded-full px-4 py-2 text-sm font-semibold hover:bg-surface transition">
                  {o.h1.replace('Menú digital para ', '')}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-graphite font-medium">
        <Link href="/" className="hover:text-ink">snappy.uno</Link>
        <span className="mx-3">·</span>
        <Link href="/terminos" className="hover:text-ink">Términos</Link>
        <span className="mx-3">·</span>
        <Link href="/privacy" className="hover:text-ink">Privacidad</Link>
      </footer>
    </div>
  );
}
