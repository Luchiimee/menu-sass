import { MetadataRoute } from 'next'


export default function manifest(): MetadataRoute.Manifest {
  return {
    id: 'snappy-pwa', // Un ID fijo ayuda a Chrome a identificar la app
    start_url: '/login', // <--- Mantenemos el inicio en login como pediste
    scope: '/',          // <--- Abarcamos todo para que el Dashboard no sea "externo"
    name: 'Snappy - Menú Digital',
    short_name: 'Snappy',
    display: 'standalone', 
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'portrait',
    
    icons: [
  {
    src: '/logo-snappy192.svg',
    sizes: '192x192',
    type: 'image/svg+xml',
    purpose: 'any',
  },
  {
    src: '/logo-snappy512.svg',
    sizes: '512x512',
    type: 'image/svg+xml',
    purpose: 'any',
  },
  {
    src: '/logo-snappy512.svg',
    sizes: '512x512',
    type: 'image/svg+xml',
    purpose: 'maskable',
  },
],
screenshots: [
  {
    src: '/logo-snappy512.svg',
    sizes: '512x512',
    type: 'image/svg+xml',
    form_factor: 'narrow'
  }
]
  }
}