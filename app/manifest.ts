import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Snappy - Menú Digital',
    short_name: 'Snappy',
    description: 'Gestiona tu menú digital sin comisiones en segundos',
    
    // Al abrir la app desde el celular, va directo al login (ideal para los dueños de locales)
    start_url: '/login', 
    
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    scope: '/', 
    
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable', // <-- ESTO ES OBLIGATORIO PARA GOOGLE PLAY
      },
    ],
  }
}