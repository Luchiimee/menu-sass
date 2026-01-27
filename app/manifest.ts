import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Snappy Menu',
    short_name: 'Snappy',
    description: 'Gestiona tu menú digital en segundos',
    // CAMBIO CLAVE: start_url debe coincidir con el scope
    start_url: '/dashboard', 
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    // Esto expulsa todo lo que NO sea /dashboard/ al navegador
    scope: '/dashboard/', 
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}