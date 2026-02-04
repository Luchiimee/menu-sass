# Push Notifications - Documentacion Completa

**Proyecto:** Snappy (menu-sass)
**Fecha:** Febrero 2026
**Commit base:** "ajustes inicio" (f7bd533)

---

## Resumen

Se implemento un sistema completo de Push Notifications para que el dueno del restaurante reciba alertas en tiempo real en su celular (incluso con la app cerrada o el celular bloqueado) cada vez que un cliente realiza un nuevo pedido.

---

## 1. Dependencias Instaladas

### package.json

Se agrego la dependencia `web-push`:

```json
"dependencies": {
  "web-push": "^3.6.7"
}
```

**Que hace:** Libreria para enviar push notifications desde el servidor usando el protocolo Web Push con autenticacion VAPID.

**Instalacion:**
```bash
npm install web-push
```

---

## 2. Variables de Entorno

### .env.local

Se requieren estas variables (ya existian en el proyecto):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Web Push (VAPID Keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEiw40ODOlMOPmNPOd7d...
VAPID_PRIVATE_KEY=XmbhzoPijGFSeEyZksByjhTkja46R...
```

| Variable | Tipo | Descripcion |
|----------|------|-------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Publica | Clave publica VAPID para identificar la app ante servicios de push |
| `VAPID_PRIVATE_KEY` | Privada | Clave privada VAPID para firmar solicitudes (nunca exponer al cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Privada | Clave admin de Supabase para bypass de RLS |

**Importante:** Estas variables deben estar configuradas en Vercel para produccion.

---

## 3. Tabla en Supabase

### push_subscriptions

Ejecutar este SQL en Supabase (SQL Editor):

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);
```

**Que guarda:**
- `user_id`: ID del usuario dueno del restaurante
- `endpoint`: URL unica del servicio push del navegador
- `p256dh`: Clave publica del cliente para encriptar mensajes
- `auth`: Token de autenticacion del cliente

---

## 4. Archivos Nuevos

### 4.1 types/web-push.d.ts

**Ubicacion:** `types/web-push.d.ts`
**Proposito:** Declaracion de tipos TypeScript para la libreria `web-push` que no incluye tipos por defecto.

```typescript
declare module 'web-push' {
  // Interfaz que define la estructura de una suscripcion push
  export interface PushSubscription {
    endpoint: string;      // URL del servicio push del navegador
    keys: {
      p256dh: string;      // Clave publica del cliente
      auth: string;        // Token de autenticacion
    };
  }

  // Resultado de enviar una notificacion
  export interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }

  // Configura las credenciales VAPID para autenticar con servicios push
  export function setVapidDetails(
    subject: string,       // Email de contacto (mailto:email@example.com)
    publicKey: string,     // Clave publica VAPID
    privateKey: string     // Clave privada VAPID
  ): void;

  // Envia una notificacion push a un suscriptor
  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: object
  ): Promise<SendResult>;

  // Genera un par de claves VAPID (solo para desarrollo)
  export function generateVAPIDKeys(): {
    publicKey: string;
    privateKey: string;
  };
}
```

---

### 4.2 public/sw.js

**Ubicacion:** `public/sw.js`
**Proposito:** Service Worker que se ejecuta en segundo plano en el navegador, incluso cuando la app esta cerrada.

```javascript
/// <reference lib="webworker" />

// Service Worker para Push Notifications - Snappy

// Escucha cuando llega una notificacion push
self.addEventListener('push', (event) => {
  // Datos por defecto si no viene payload
  let data = {
    title: 'Nuevo Pedido',
    body: 'Tienes un pedido nuevo.',
    orderType: '',
    customerName: '',
    total: '',
  };

  // Intenta parsear el payload JSON
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    // Si no es JSON valido, usar defaults
  }

  // Opciones de la notificacion nativa
  const options = {
    body: data.body,                    // Texto del cuerpo
    icon: '/icon-192.png',              // Icono de la notificacion
    badge: '/icon-192.png',             // Badge en Android
    vibrate: [200, 100, 200, 100, 300], // Patron de vibracion
    tag: 'new-order-' + Date.now(),     // Tag unico para no pisar notificaciones
    renotify: true,                     // Vibrar aunque ya haya notificacion con mismo tag
    requireInteraction: true,           // No descartar automaticamente
    actions: [                          // Botones de accion
      { action: 'view', title: 'Ver pedido' },
      { action: 'dismiss', title: 'Ignorar' },
    ],
    data: {
      url: '/dashboard/orders',         // URL a abrir al tocar
    },
  };

  // Muestra la notificacion
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Escucha cuando el usuario toca la notificacion
self.addEventListener('notificationclick', (event) => {
  event.notification.close();  // Cierra la notificacion

  // Si toco "Ignorar", no hacer nada
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/dashboard/orders';

  // Busca si ya hay una ventana abierta del dashboard
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si hay ventana abierta, enfocarla y navegar
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
```

---

### 4.3 public/icon-192.png y public/icon-512.png

**Ubicacion:** `public/icon-192.png` y `public/icon-512.png`
**Proposito:** Iconos PNG para las notificaciones push y el manifest de la PWA.

- `icon-192.png` (192x192): Icono de la notificacion
- `icon-512.png` (512x512): Icono para splash screen de la PWA

**Generados desde:** `public/logo.svg` usando la libreria `sharp`

---

### 4.4 app/api/push/subscribe/route.ts

**Ubicacion:** `app/api/push/subscribe/route.ts`
**Proposito:** API para guardar y eliminar suscripciones push en Supabase.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase con permisos de admin (bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Headers CORS para permitir requests desde cualquier origen (necesario para ngrok/desarrollo)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// OPTIONS - Responde a preflight requests de CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST - Guardar nueva suscripcion
export async function POST(req: NextRequest) {
  try {
    // Extrae datos del body
    const { subscription, userId } = await req.json();

    // Valida que vengan los datos requeridos
    if (!subscription || !userId) {
      return NextResponse.json(
        { error: 'Missing data' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { endpoint, keys } = subscription;

    // Upsert: si el endpoint ya existe, actualiza; si no, inserta
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }  // Si el endpoint existe, actualiza
      );

    if (error) {
      console.error('Error saving subscription:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE - Eliminar suscripcion
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint, userId } = await req.json();

    if (!endpoint || !userId) {
      return NextResponse.json(
        { error: 'Missing data' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Elimina la suscripcion que coincida con endpoint Y userId
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting subscription:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
```

---

### 4.5 app/api/push/send/route.ts

**Ubicacion:** `app/api/push/send/route.ts`
**Proposito:** API para enviar notificaciones push al dueno del restaurante cuando llega un pedido.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Configura las credenciales VAPID
webpush.setVapidDetails(
  'mailto:push@snappy.app',                    // Email de contacto
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,   // Clave publica
  process.env.VAPID_PRIVATE_KEY!               // Clave privada
);

export async function POST(req: NextRequest) {
  try {
    // Datos del pedido que vienen del frontend
    const { restaurantId, customerName, total, orderType } = await req.json();

    if (!restaurantId) {
      return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 });
    }

    // Cliente Supabase con permisos admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Buscar el user_id del dueno del restaurante
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('user_id')
      .eq('id', restaurantId)
      .single();

    if (!restaurant?.user_id) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // 2. Buscar TODAS las suscripciones push del dueno
    //    (puede tener PC + celular + tablet, etc.)
    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', restaurant.user_id);

    // Si no tiene suscripciones, no hay a quien notificar
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    // 3. Preparar el payload de la notificacion
    // Texto segun tipo de entrega
    const orderTypeLabel =
      orderType === 'delivery' ? 'Delivery' :
      orderType === 'retiro' ? 'Retiro' :
      'Mesa';

    // Emoji segun tipo de entrega
    const orderTypeEmoji =
      orderType === 'delivery' ? '🛵' :
      orderType === 'retiro' ? '🏃' :
      '🍽️';

    // Payload que recibira el Service Worker
    const payload = JSON.stringify({
      title: `${orderTypeEmoji} Nuevo Pedido - ${orderTypeLabel}`,
      body: `${customerName} • $${Number(total).toLocaleString('es-AR')}\nTocá para ver el detalle`,
      orderType,
      customerName,
      total,
    });

    // 4. Enviar a TODAS las suscripciones del usuario
    const expiredEndpoints: string[] = [];  // Guardar endpoints expirados
    let sentCount = 0;

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
          sentCount++;
        } catch (err: unknown) {
          const error = err as { statusCode?: number };
          // 410 Gone o 404 = suscripcion expirada o invalida
          if (error.statusCode === 410 || error.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint);
          } else {
            console.error('Push send error:', error);
          }
        }
      })
    );

    // 5. Limpiar suscripciones expiradas de la BD
    if (expiredEndpoints.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }

    return NextResponse.json({
      ok: true,
      sent: sentCount,                    // Cuantas se enviaron
      cleaned: expiredEndpoints.length    // Cuantas se limpiaron
    });
  } catch (err) {
    console.error('Push send route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

---

### 4.6 components/PushNotificationManager.tsx

**Ubicacion:** `components/PushNotificationManager.tsx`
**Proposito:** Componente React que muestra el boton para activar/desactivar notificaciones push.

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Bell, BellOff, Loader2, Download } from 'lucide-react';

// Componente que recibe prop "mobile" para mostrar version compacta o completa
export default function PushNotificationManager({ mobile = false }: { mobile?: boolean }) {
  // Estados del componente
  const [status, setStatus] = useState<'loading' | 'ios-install' | 'not-supported' | 'ready'>('loading');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Cliente Supabase para obtener la sesion
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Inicializacion al montar el componente
  useEffect(() => {
    const init = async () => {
      try {
        // Detectar si es iOS
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        // Detectar si es PWA instalada
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true;

        // iOS requiere que la PWA este instalada para push
        if (isIOS && !isStandalone) {
          setStatus('ios-install');  // Mostrar icono de descarga
          return;
        }

        // Verificar que el navegador soporte las APIs necesarias
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          setStatus('not-supported');
          return;
        }

        // Obtener sesion del usuario
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('not-supported');
          return;
        }
        setUserId(session.user.id);

        // Registrar el Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Verificar si ya tiene una suscripcion activa
        const existing = await registration.pushManager.getSubscription();
        setIsSubscribed(!!existing);  // true si existe, false si no
        setStatus('ready');
      } catch (err) {
        console.error('Push init error:', err);
        setStatus('not-supported');
      }
    };

    init();
  }, []);

  // Funcion para suscribirse a notificaciones
  const subscribe = async () => {
    if (!userId) return;
    setStatus('loading');

    try {
      // Pedir permiso al usuario
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('ready');
        return;  // Usuario denego el permiso
      }

      // Crear suscripcion push
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,  // Requerido: solo notificaciones visibles
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      });

      // Guardar suscripcion en el servidor
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON(), userId }),
      });

      if (res.ok) setIsSubscribed(true);
      setStatus('ready');
    } catch (err) {
      console.error('Subscribe error:', err);
      setStatus('ready');
    }
  };

  // Funcion para desuscribirse
  const unsubscribe = async () => {
    if (!userId) return;
    setStatus('loading');

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Eliminar del servidor
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint, userId }),
        });
        // Eliminar del navegador
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setStatus('ready');
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setStatus('ready');
    }
  };

  // Si no hay soporte, no mostrar nada
  if (status === 'not-supported') return null;

  // VERSION MOBILE (icono circular)
  if (mobile) {
    if (status === 'loading') {
      return (
        <div className="p-2 bg-gray-100 rounded-full border border-gray-200">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      );
    }

    if (status === 'ios-install') {
      return (
        <div
          className="p-2 bg-orange-50 rounded-full border border-orange-200"
          title="Abre en Safari e instala la app para notificaciones"
        >
          <Download size={20} className="text-orange-500" />
        </div>
      );
    }

    return (
      <button
        onClick={isSubscribed ? unsubscribe : subscribe}
        className={`p-2 rounded-full transition active:scale-95 border ${
          isSubscribed
            ? 'bg-green-50 text-green-700 border-green-200'   // Verde si activo
            : 'bg-gray-100 text-gray-700 border-gray-200'     // Gris si inactivo
        }`}
      >
        {isSubscribed ? <Bell size={20} /> : <BellOff size={20} />}
      </button>
    );
  }

  // VERSION DESKTOP (boton con texto)
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-400">
        <Loader2 size={14} className="animate-spin" />
        <span>Cargando...</span>
      </div>
    );
  }

  if (status === 'ios-install') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-orange-50 text-orange-700 w-full">
        <Download size={16} />
        <span>Instala la app para notificaciones</span>
      </div>
    );
  }

  return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all w-full ${
        isSubscribed
          ? 'text-green-700 bg-green-50 hover:bg-green-100'
          : 'text-gray-500 bg-gray-50 hover:bg-gray-100'
      }`}
    >
      {isSubscribed ? <Bell size={16} /> : <BellOff size={16} />}
      <span>{isSubscribed ? 'Notificaciones activas' : 'Activar notificaciones'}</span>
    </button>
  );
}
```

---

## 5. Archivos Modificados

### 5.1 next.config.ts

**Cambio:** Se agrego `allowedDevOrigins` para permitir desarrollo con ngrok.

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGREGADO: Permite requests desde ngrok durante desarrollo
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok-free.dev', '*.ngrok.io'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
```

**Nota:** Esto solo afecta en desarrollo. En produccion no tiene efecto.

---

### 5.2 components/CartFooter.tsx

**Cambio:** Se agrego la llamada a `/api/push/send` despues de crear un pedido exitosamente.

**Ubicacion del cambio:** Dentro de `handleSendOrder`, despues de crear el pedido en Supabase.

**Codigo agregado (lineas ~84-96):**

```typescript
if (!error && newOrder) {
    orderIdCreated = newOrder.id;
    setActiveOrderId(newOrder.id);

    // AGREGADO: Push notification al dueno (fire-and-forget)
    // Se ejecuta en background, si falla no afecta el pedido
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId,
        customerName,
        total: finalTotal,
        orderType: deliveryType,
      }),
    }).catch(() => {});  // Ignorar errores silenciosamente
}
```

**Por que fire-and-forget:** Si la notificacion falla, el pedido no debe verse afectado. El cliente ya envio el pedido por WhatsApp, la notificacion push es un extra.

---

### 5.3 app/dashboard/layout.tsx

**Cambios:**

1. **Se agrego el import:**
```typescript
import PushNotificationManager from '@/components/PushNotificationManager';
```

2. **Se agrego el componente en el sidebar (version desktop):**

Ubicacion: Dentro del `<aside>`, en el `<div>` del footer que contiene "Cerrar Sesion".

```typescript
<div className="p-4 border-t mt-auto space-y-2">
  <PushNotificationManager />  {/* AGREGADO */}
  <button onClick={handleLogout} className="...">
      <LogOut size={18} /> Cerrar Sesión
  </button>
</div>
```

---

### 5.4 components/MobileNav.tsx

**Cambios:**

1. **Se agrego el import:**
```typescript
import PushNotificationManager from '@/components/PushNotificationManager';
```

2. **Se agrego el componente en el header mobile:**

Ubicacion: En el header superior, al lado del boton de Settings (la personita).

**Antes:**
```typescript
<Link href="/dashboard/settings" className="p-2 bg-gray-100 ...">
   <User size={20} />
</Link>
```

**Despues:**
```typescript
<div className="flex items-center gap-2">
   <PushNotificationManager mobile />  {/* AGREGADO */}
   <Link href="/dashboard/settings" className="p-2 bg-gray-100 ...">
      <User size={20} />
   </Link>
</div>
```

---

### 5.5 app/manifest.ts

**Cambio:** Se agregaron los iconos PNG al manifest de la PWA.

**Antes:**
```typescript
icons: [
  {
    src: '/favicon.ico',
    sizes: 'any',
    type: 'image/x-icon',
  },
],
```

**Despues:**
```typescript
icons: [
  {
    src: '/favicon.ico',
    sizes: 'any',
    type: 'image/x-icon',
  },
  {
    src: '/icon-192.png',      // AGREGADO
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/icon-512.png',      // AGREGADO
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
],
```

---

## 6. Flujo Completo

```
CLIENTE hace un pedido en el menu
        ↓
CartFooter.tsx crea el pedido en Supabase
        ↓
CartFooter.tsx llama a POST /api/push/send
        ↓
API busca el user_id del dueno del restaurante
        ↓
API busca TODAS las suscripciones push del dueno
        ↓
API arma el payload con emoji y formato de moneda
        ↓
API envia notificacion a TODOS los dispositivos (PC, celular, etc.)
        ↓
Service Worker (sw.js) recibe el push en cada dispositivo
        ↓
Muestra notificacion nativa del sistema operativo
(vibra, suena, incluso con app cerrada o celular bloqueado)
        ↓
Usuario toca la notificacion → Abre /dashboard/orders
```

---

## 7. Resumen de Archivos

| Archivo | Estado | Funcion |
|---------|--------|---------|
| `types/web-push.d.ts` | NUEVO | Tipos TypeScript para web-push |
| `public/sw.js` | NUEVO | Service Worker para recibir y mostrar notificaciones |
| `public/icon-192.png` | NUEVO | Icono 192x192 para notificaciones |
| `public/icon-512.png` | NUEVO | Icono 512x512 para PWA |
| `app/api/push/subscribe/route.ts` | NUEVO | API para guardar/eliminar suscripciones |
| `app/api/push/send/route.ts` | NUEVO | API para enviar notificaciones |
| `components/PushNotificationManager.tsx` | NUEVO | Boton para activar/desactivar notificaciones |
| `next.config.ts` | MODIFICADO | Agregado allowedDevOrigins para ngrok |
| `components/CartFooter.tsx` | MODIFICADO | Llama a /api/push/send al crear pedido |
| `app/dashboard/layout.tsx` | MODIFICADO | Agrega PushNotificationManager al sidebar |
| `components/MobileNav.tsx` | MODIFICADO | Agrega PushNotificationManager al header mobile |
| `app/manifest.ts` | MODIFICADO | Agrega iconos PNG |
| `package.json` | MODIFICADO | Agrega dependencia web-push |

---

## 8. Notas de Compatibilidad

### Android (Chrome)
- Funciona en todos los escenarios (app abierta, cerrada, pantalla bloqueada)
- Verificar que Chrome no tenga restriccion de bateria

### iOS (Safari)
- Requiere iOS 16.4 o superior
- OBLIGATORIO usar Safari (Chrome/Firefox en iOS no soportan push)
- OBLIGATORIO instalar la PWA desde Safari
- Abrir la app desde el icono instalado (no desde Safari)

### Importante para Login con Google
- En desarrollo con ngrok, el callback de Google OAuth redirige a produccion
- Para testing usar login con email/password
- En produccion funciona normal con Google

---

## 9. Comandos Utiles

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Desarrollo con ngrok (en otra terminal)
ngrok http 3000

# Build para produccion
npm run build
```

---

Documentacion generada para el proyecto Snappy - Push Notifications Feature
