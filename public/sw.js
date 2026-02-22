/// <reference lib="webworker" />

// Service Worker para Push Notifications - Snappy

self.addEventListener('push', (event) => {
  let data = {
    title: 'Nuevo Pedido',
    body: 'Tienes un pedido nuevo.',
    orderType: '',
    customerName: '',
    total: '',
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    // Si no es JSON valido, usar defaults
  }

const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // Vibración más larga: [vibrar, pausa, vibrar, pausa, vibrar largo]
    vibrate: [500, 100, 500, 100, 1000], 
    tag: 'new-order-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    priority: 2,
    silent: false, // <--- AGREGÁ ESTO PARA ASEGURAR QUE NO ESTÉ MUDO
    actions: [
      { action: 'view', title: 'Ver pedido' },
      { action: 'dismiss', title: 'Ignorar' },
    ],
    data: {
      url: '/dashboard/orders',
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Si tocó "Ignorar", no hacer nada
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/dashboard/orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una ventana abierta, enfocarla y navegar
      for (const client of windowClients) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Si no hay ventana, abrir una nueva
      return clients.openWindow(targetUrl);
    })
  );
});
