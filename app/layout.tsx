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

export const metadata: Metadata = {
  title: "Snappy | Tu Menú Digital",
  description: "Tu carta digital inteligente.",
  icons: {
    icon: '/logo-snappy192.svg',
    apple: '/logo-snappy192.svg',
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
        <MetaPixel />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
