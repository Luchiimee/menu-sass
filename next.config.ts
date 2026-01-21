import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Esto permite cargar imágenes de Supabase y Google
      },
    ],
  },
  // Borramos las secciones de 'eslint' y 'typescript' para no ignorar nada.
};

export default nextConfig;