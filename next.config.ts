import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok-free.dev', '*.ngrok.io'],
  async headers() {
    return [
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
    ];
  },
  images: {
    // Sin hosts remotos: next/image solo se usa con logos locales (/logo.svg, /logo-snappy.svg).
    // Antes había { hostname: '**' }, que dejaba pasar CUALQUIER sitio https por el optimizador
    // (/_next/image?url=...), aunque la app no lo usara: es la superficie de varios avisos de
    // seguridad de Next (SSRF, DoS y ejecución de código en Image Optimization). Las imágenes de
    // Supabase y Cloudinary se muestran con <img> común y no pasan por acá. Si algún día un
    // <Image> usa un src remoto, agregar SOLO ese host exacto con protocol 'https'.
    remotePatterns: [],
  },
  // Borramos las secciones de 'eslint' y 'typescript' para no ignorar nada.
};

export default nextConfig;