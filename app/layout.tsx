import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'; 
import Script from 'next/script';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Snappy | Tu Menú Digital",
  description: "Tu carta digital inteligente.",
  icons: {
    icon: '/icon-192.png',
    // 💡 CAMBIO: iOS ama el tamaño 180x180. 
    // Si no tienes uno de ese tamaño, usa el de 192, pero asegúrate de que esté bien declarado.
    apple: '/icon-192.png', 
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Snappy',
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
    <html lang="es">
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

        {/* --- PIXEL DE META --- */}
        <Script id="fb-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1093678972956224');
            fbq('track', 'PageView');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <noscript>
          <img 
            height="1" width="1" style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1093678972956224&ev=PageView&noscript=1"
          />
        </noscript>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}