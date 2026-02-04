# Guia para Personalizar las Notificaciones Push

Esta guia te explica como modificar el aspecto y contenido de las notificaciones push que reciben los duenos de restaurantes.

---

## Resumen Rapido

| Que quiero cambiar | Archivo |
|-------------------|---------|
| Titulo, cuerpo, emojis | `app/api/push/send/route.ts` |
| Icono, vibracion, botones | `public/sw.js` |
| Icono de la notificacion | `public/icon-192.png` |

---

## 1. Cambiar el Titulo y Mensaje

**Archivo:** `app/api/push/send/route.ts`

Busca esta seccion (aproximadamente linea 45-60):

```typescript
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
```

### Ejemplos de personalizacion:

**Cambiar el titulo:**
```typescript
// Original
title: `${orderTypeEmoji} Nuevo Pedido - ${orderTypeLabel}`,

// Ejemplo 1: Sin emoji
title: `Nuevo Pedido - ${orderTypeLabel}`,

// Ejemplo 2: Titulo fijo
title: `🔔 Pedido Recibido!`,

// Ejemplo 3: Con nombre del restaurante
title: `${orderTypeEmoji} Pedido en Mi Restaurante`,
```

**Cambiar el cuerpo del mensaje:**
```typescript
// Original
body: `${customerName} • $${Number(total).toLocaleString('es-AR')}\nTocá para ver el detalle`,

// Ejemplo 1: Solo el nombre
body: `${customerName} hizo un pedido`,

// Ejemplo 2: Mas detalle
body: `Cliente: ${customerName}\nTotal: $${Number(total).toLocaleString('es-AR')}\nTipo: ${orderTypeLabel}`,

// Ejemplo 3: Mensaje simple
body: `Tienes un nuevo pedido por $${Number(total).toLocaleString('es-AR')}`,
```

**Cambiar los emojis:**
```typescript
// Original
const orderTypeEmoji =
  orderType === 'delivery' ? '🛵' :
  orderType === 'retiro' ? '🏃' :
  '🍽️';

// Ejemplo con otros emojis
const orderTypeEmoji =
  orderType === 'delivery' ? '🚗' :
  orderType === 'retiro' ? '🏪' :
  '🪑';
```

---

## 2. Cambiar el Icono de la Notificacion

### Opcion A: Reemplazar el archivo

Simplemente reemplaza el archivo `public/icon-192.png` con tu propio icono.

**Requisitos:**
- Formato: PNG
- Tamaño: 192x192 pixeles
- Fondo: Puede ser transparente o solido

### Opcion B: Usar otro archivo

**Archivo:** `public/sw.js`

Busca esta linea (aproximadamente linea 22-23):

```javascript
const options = {
  body: data.body,
  icon: '/icon-192.png',        // <-- Cambiar aqui
  badge: '/icon-192.png',       // <-- Y aqui (icono pequeño en Android)
```

Cambialo por la ruta de tu nuevo icono:

```javascript
  icon: '/mi-icono.png',
  badge: '/mi-badge.png',
```

---

## 3. Cambiar el Patron de Vibracion

**Archivo:** `public/sw.js`

Busca esta linea:

```javascript
vibrate: [200, 100, 200, 100, 300],
```

El patron es: [vibracion, pausa, vibracion, pausa, vibracion] en milisegundos.

**Ejemplos:**

```javascript
// Vibracion corta simple
vibrate: [200],

// Dos vibraciones
vibrate: [200, 100, 200],

// Vibracion larga
vibrate: [500],

// Patron tipo "llamada"
vibrate: [300, 200, 300, 200, 300, 200, 300],

// Sin vibracion
vibrate: [],
```

---

## 4. Cambiar los Botones de Accion

**Archivo:** `public/sw.js`

Busca esta seccion:

```javascript
actions: [
  { action: 'view', title: 'Ver pedido' },
  { action: 'dismiss', title: 'Ignorar' },
],
```

**Ejemplos:**

```javascript
// Solo un boton
actions: [
  { action: 'view', title: 'Abrir' },
],

// Botones personalizados
actions: [
  { action: 'view', title: '👀 Ver detalle' },
  { action: 'dismiss', title: '❌ Cerrar' },
],

// Tres botones (maximo recomendado)
actions: [
  { action: 'view', title: 'Ver' },
  { action: 'call', title: 'Llamar' },
  { action: 'dismiss', title: 'Ignorar' },
],
```

**Nota:** Para que los botones adicionales funcionen, debes agregar la logica en el evento `notificationclick` del mismo archivo.

---

## 5. Cambiar a Donde Lleva la Notificacion

**Archivo:** `public/sw.js`

Busca esta linea:

```javascript
data: {
  url: '/dashboard/orders',
},
```

**Ejemplos:**

```javascript
// Ir al inicio del dashboard
url: '/dashboard',

// Ir a una pagina especifica
url: '/dashboard/orders?status=pendiente',
```

---

## 6. Cambiar el Comportamiento de la Notificacion

**Archivo:** `public/sw.js`

```javascript
const options = {
  body: data.body,
  icon: '/icon-192.png',
  badge: '/icon-192.png',
  vibrate: [200, 100, 200, 100, 300],
  tag: 'new-order-' + Date.now(),
  renotify: true,
  requireInteraction: true,        // <-- Cambiar estos
  // ... mas opciones
};
```

| Opcion | Valores | Que hace |
|--------|---------|----------|
| `requireInteraction` | `true` / `false` | Si es `true`, la notificacion no desaparece sola, el usuario debe tocarla |
| `renotify` | `true` / `false` | Si es `true`, vibra aunque ya haya una notificacion del mismo tag |
| `silent` | `true` / `false` | Si es `true`, no hace sonido ni vibra |
| `tag` | texto | Notificaciones con el mismo tag se reemplazan |

---

## 7. Ejemplos Completos

### Estilo Minimalista

**sw.js:**
```javascript
const options = {
  body: data.body,
  icon: '/icon-192.png',
  vibrate: [200],
  tag: 'order',
  renotify: true,
  requireInteraction: false,
  actions: [
    { action: 'view', title: 'Ver' },
  ],
  data: {
    url: '/dashboard/orders',
  },
};
```

**route.ts (payload):**
```typescript
const payload = JSON.stringify({
  title: 'Nuevo Pedido',
  body: `$${Number(total).toLocaleString('es-AR')}`,
});
```

### Estilo Detallado

**sw.js:**
```javascript
const options = {
  body: data.body,
  icon: '/icon-192.png',
  badge: '/icon-192.png',
  vibrate: [300, 100, 300, 100, 500],
  tag: 'new-order-' + Date.now(),
  renotify: true,
  requireInteraction: true,
  actions: [
    { action: 'view', title: '📋 Ver Pedido' },
    { action: 'dismiss', title: '✓ Enterado' },
  ],
  data: {
    url: '/dashboard/orders',
  },
};
```

**route.ts (payload):**
```typescript
const payload = JSON.stringify({
  title: `🔔 ¡Nuevo Pedido!`,
  body: `👤 ${customerName}\n💰 $${Number(total).toLocaleString('es-AR')}\n📦 ${orderTypeLabel}\n\nToca para ver el detalle completo`,
});
```

---

## 8. Probar los Cambios

Despues de hacer cambios:

1. Guarda los archivos
2. Si el servidor esta corriendo, los cambios se aplican automaticamente
3. Para probar, desactiva y vuelve a activar las notificaciones en el dashboard
4. Haz un pedido de prueba

**Importante:** Los cambios en `sw.js` pueden requerir que el usuario desinstale y reinstale la PWA para que tome el nuevo Service Worker.

---

## 9. Referencia de Emojis Utiles

| Categoria | Emojis |
|-----------|--------|
| Comida | 🍔 🍕 🌮 🍣 🍜 🥗 🍝 🥘 |
| Delivery | 🛵 🚗 🚴 📦 🏃 |
| Alertas | 🔔 📣 ⚡ 🚨 ✨ |
| Dinero | 💰 💵 💲 🤑 |
| Personas | 👤 👥 🙋 |
| Acciones | ✅ ❌ 👀 📋 |

---

## Dudas Frecuentes

**P: ¿Los cambios afectan a todos los usuarios?**
R: Si, los cambios en el servidor (`route.ts`) afectan a todas las notificaciones nuevas. Los cambios en `sw.js` requieren que cada usuario actualice su Service Worker.

**P: ¿Como fuerzo la actualizacion del Service Worker?**
R: El usuario puede desinstalar la PWA y volverla a instalar, o puedes cambiar el nombre del archivo `sw.js` a `sw-v2.js` y actualizar la referencia en `PushNotificationManager.tsx`.

**P: ¿Puedo enviar notificaciones diferentes segun el tipo de pedido?**
R: Si, ya esta implementado con los emojis. Puedes expandir la logica en `route.ts` para personalizar aun mas.

**P: ¿Puedo agregar imagenes a la notificacion?**
R: Si, agrega la propiedad `image` en las opciones de `sw.js`:
```javascript
image: '/imagen-pedido.png',
```
Nota: No todos los navegadores soportan imagenes en notificaciones.

---

Guia creada para Snappy - Personalizacion de Notificaciones Push
