import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Snappy Menu',
    short_name: 'Snappy',
    description: 'Gestiona tu menú digital en segundos',
    // Usamos la URL completa para ser muy específicos
    start_url: 'https://snappy.uno/dashboard', 
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    // ESTO ES LO MÁS IMPORTANTE:
    // Le decimos al celular: "Solo lo que empiece por /dashboard es la app.
    // Lo demás (como /pizzeria) NO es la app".
    scope: 'https://snappy.uno/dashboard/', 
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}