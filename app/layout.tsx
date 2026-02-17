import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 1. IMPORTAMOS LA LIBRERÍA
import { Toaster } from 'sonner'; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Snappy | Tu Menú Digital",
  description: "Tu carta digital inteligente.",
  // --- AHORA SÍ ESTÁ ADENTRO ---
  icons: {
    icon: '/icon-192.png', 
    apple: '/icon-512.png',
  },
  // Agregamos esto para que WhatsApp y Google no usen lo de Vercel
  openGraph: {
    title: 'Snappy | Tu Menú Digital',
    description: 'La plataforma más rápida para tu carta digital.',
    images: ['/icon-512.png'], 
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
      <body className={inter.className}>
        {children}
        {/* 2. AGREGAMOS EL COMPONENTE DE NOTIFICACIONES AQUÍ */}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}