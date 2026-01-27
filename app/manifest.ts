import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Snappy Menu',
    short_name: 'Snappy',
    description: 'Gestiona tu menú digital en segundos',
    
    // 1. ESTO ES LO QUE BUSCAS:
    // Aunque la instalen desde la Landing, al abrir el ícono siempre va al Login.
    start_url: '/login', 
    
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    
    // 2. SCOPE GENERAL:
    // Lo ponemos en la raíz para que el botón de "Instalar" aparezca 
    // apenas entran a snappy.uno (la landing).
    scope: '/', 
    
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}