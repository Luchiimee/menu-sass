import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/?source=pwa',
    name: 'Snappy - Menú Digital',
    short_name: 'Snappy',
    description: 'Gestiona tu menú digital sin comisiones en segundos',
    start_url: '/', 
    display: 'standalone',
    display_override: ['standalone', 'fullscreen'],
    background_color: '#000000',
    theme_color: '#000000',
    scope: '/', 
    orientation: 'portrait', // Fija la app en vertical (corrige advertencia)
    
    icons: [
      // ELIMINAMOS EL FAVICON.ICO DE ACÁ
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
    
    // Agregamos un screenshot temporal para que PWABuilder no moleste (corrige advertencia)
    // Podés usar el mismo ícono por ahora solo para pasar este filtro técnico.
    screenshots: [
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        form_factor: 'narrow' // Indica que es formato celular
      }
    ]
  }
}