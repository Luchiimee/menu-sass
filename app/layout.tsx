import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from 'sonner';
import Script from 'next/script';
import MetaPixel from '@/components/MetaPixel';

// Space Grotesk variable (subset latin, @fontsource-variable/space-grotesk 5.3.0, SIL OFL: fonts/OFL.txt).
// Local para que el build no dependa de bajarla de Google. Pesos 400-700, los mismos que se cargaban antes.
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin-wght-normal.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-space-grotesk",
});

const SITE_URL = "https://snappy.uno";
const SITE_DESCRIPTION =
  "Creá el menú digital de tu negocio en minutos: pedidos, reservas y SnappyLinks desde un solo lugar. Para restaurantes, kioscos, dietéticas y más. Sin comisión por ventas. Probá gratis 14 días.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Snappy | Tu Menú Digital",
  description: SITE_DESCRIPTION,
  // Siempre la dirección sin www: así Google junta todo en una sola versión del sitio
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Snappy",
    locale: "es_AR",
    title: "Snappy | Tu Menú Digital",
    description: SITE_DESCRIPTION,
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Snappy" }],
  },
  twitter: {
    card: "summary",
    title: "Snappy | Tu Menú Digital",
    description: SITE_DESCRIPTION,
    images: ["/icon-512.png"],
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Snappy',
  },
};

export const viewport: Viewport = {

  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={spaceGrotesk.variable}>
      <head>
        {/* --- FIX ANTIBARRAS iOS (Dentro del Head y corregido) --- */}
        <Script id="ios-pwa-fix" strategy="beforeInteractive">
          {`
            (function(document,navigator,standalone) {
                if ((standalone in navigator) && navigator[standalone]) {
                    var cnode, remNodes = document.querySelectorAll('link[rel=stylesheet], style');
                    document.addEventListener('click', function(e) {
                        cnode = e.target;
                        while (cnode.tagName !== 'A' && cnode.parentElement) {
                            cnode = cnode.parentElement;
                        }
                        if ('href' in cnode && cnode.href.indexOf('http') !== -1 && (cnode.href.indexOf(document.location.host) !== -1 || cnode.pathname !== document.location.pathname)) {
                            e.preventDefault();
                            window.location.assign(cnode.href);
                        }
                    }, false);
                }
            })(document,window.navigator,'standalone');
          `}
        </Script>

        <Script id="block-android-install" strategy="afterInteractive">
          {`
            window.addEventListener('beforeinstallprompt', (e) => {
              e.preventDefault();
            });
          `}
        </Script>
      </head>
      <body>
        {/* Datos estructurados (schema.org): le dicen a Google qué es Snappy. No se ven en la página. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  name: "Snappy",
                  url: SITE_URL,
                  logo: `${SITE_URL}/icon-512.png`,
                  email: "snappyuno25@gmail.com",
                  areaServed: "AR",
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: "Snappy",
                  inLanguage: "es-AR",
                  publisher: { "@id": `${SITE_URL}/#organization` },
                },
                {
                  "@type": "SoftwareApplication",
                  name: "Snappy",
                  applicationCategory: "BusinessApplication",
                  operatingSystem: "Web",
                  url: SITE_URL,
                  description: SITE_DESCRIPTION,
                  inLanguage: "es-AR",
                  offers: { "@type": "AggregateOffer", priceCurrency: "ARS", lowPrice: "20000", highPrice: "47000", offerCount: "3" },
                },
              ],
            }),
          }}
        />
        <MetaPixel />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
