import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Snappy Admin',
    short_name: 'Snappy',
    description: 'Gestión de pedidos gastronómicos',
    start_url: '/dashboard/orders', // Cuando abran la app, van directo a los pedidos
    display: 'standalone', // ESTO ES LA MAGIA: Quita la barra de URL del navegador
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon.ico', // Usamos tu favicon por ahora
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}