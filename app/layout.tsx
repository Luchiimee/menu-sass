import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'; 
import Script from 'next/script'; // 1. Importamos el componente de Scripts

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Snappy | Tu Menú Digital",
  description: "Tu carta digital inteligente.",
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-512.png',
  },
  openGraph: {
    title: 'Snappy | Tu Menú Digital',
    description: 'La plataforma más rápida para tu carta digital.',
    images: ['/icon-512.png'],
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
        {/* --- CÓDIGO DEL PIXEL DE META (CECI) --- */}
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
        {/* --- RESPALDO PARA NAVEGADORES SIN JS --- */}
        <noscript>
          <img 
            height="1" 
            width="1" 
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1093678972956224&ev=PageView&noscript=1"
          />
        </noscript>

        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}