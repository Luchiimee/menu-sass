import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Snappy Menu',
    short_name: 'Snappy',
    description: 'Gestiona tu menú digital en segundos',
    start_url: '/login', // <--- AQUÍ ESTÁ EL TRUCO. Forzamos que arranque en login.
    display: 'standalone', // Esto hace que se vea como App nativa (sin barra de navegador)
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      // Más adelante puedes agregar íconos de 192x192 y 512x512 para que se vea HD en el celu
    ],
  }
}