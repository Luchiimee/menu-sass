import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Usamos /login como identidad y punto de inicio, pero LIMPIO
    id: '/login', 
    start_url: '/login', 
    
    name: 'Snappy - Menú Digital',
    short_name: 'Snappy',
    description: 'Gestiona tu menú digital sin comisiones en segundos',
    display: 'standalone',
    display_override: ['standalone', 'fullscreen'],
    background_color: '#000000',
    theme_color: '#000000',
    scope: '/', // Esto es lo que permite navegar a /dashboard sin que salgan barras
    orientation: 'portrait',
    
    icons: [
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
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        form_factor: 'narrow' 
      }
    ]
  }
}