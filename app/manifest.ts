import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    // 1. Identidad en la RAÍZ (Fundamental para iOS)
    id: '/', 
    start_url: '/login', // Pero que arranque en el login
    
    name: 'Snappy - Menú Digital',
    short_name: 'Snappy',
    description: 'Gestiona tu menú digital sin comisiones en segundos',
    display: 'standalone', 
    // Quitamos display_override para evitar conflictos en versiones viejas de iOS
    background_color: '#000000',
    theme_color: '#000000',
    scope: '/', 
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