import type { NextConfig } from "next";

// ALERTA: Usamos ': any' aquí para que TypeScript no se queje de la configuración de ESLint
const nextConfig: any = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;