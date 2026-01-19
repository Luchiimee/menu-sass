import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kbmsohzalgoulysnkher.supabase.co', // Tu proyecto Supabase
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Para las fotos de ejemplo de las plantillas
      },
    ],
  },
};

export default nextConfig;