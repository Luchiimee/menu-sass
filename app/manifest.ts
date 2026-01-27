import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Snappy Menu',
    short_name: 'Snappy',
    description: 'Gestiona tu menú digital en segundos',
    start_url: '/login', 
    display: 'standalone', 
    background_color: '#ffffff',
    theme_color: '#000000',
    // ESTA ES LA LÍNEA CLAVE QUE FALTABA:
    // Define que el "territorio" de la app es solo el panel de administración.
    scope: '/dashboard/', 
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      // Más adelante puedes agregar íconos de 192x192 y 512x512
    ],
  }
}