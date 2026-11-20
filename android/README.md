# Snappy Android (app nativa)

App nativa de Android para dueños de locales: **panel de pedidos en vivo** y **catálogo** (disponibilidad y precios).
Kotlin + Jetpack Compose. Habla con la **misma base de Supabase** que la web (mismas tablas, misma sesión, mismas reglas RLS);
no usa claves de servidor ni backend propio.

## Abrirla (primera vez)
1. Instalar **Android Studio** (gratis): https://developer.android.com/studio
2. `File > Open` y elegir la carpeta `android/` de este repo. Esperar a que termine el *Gradle sync*.
3. Copiar `snappy.properties.example` como `snappy.properties` (si no existe) y completar la anon key
   (es la misma `NEXT_PUBLIC_SUPABASE_ANON_KEY` de la web). Ese archivo NO se sube a GitHub.
4. Conectar el celular Android con **depuración USB** activada (Ajustes > Opciones de desarrollador) y darle a ▶ Run.
5. Entrar con el mismo email y contraseña del panel web.

## Qué hace hoy (v0.1)
- Login con email y contraseña (sesión persistente).
- Pedidos de los últimos 7 días en vivo (Supabase Realtime): un pedido nuevo suena y aparece solo.
- Avanzar el estado: Tomar pedido → En preparación → (En camino) → Entregado; cancelar; confirmar transferencia.
  "Tomar pedido" reasigna el turno de caja si el del pedido ya se cerró, igual que el panel web.
- Abrir / cerrar el local.
- Catálogo: ver productos por categoría, activar/desactivar, cambiar precio.

## Pendiente (en este orden)
1. **Notificaciones push con la app cerrada (FCM).** Hoy el sonido solo funciona con la app abierta. Hace falta: proyecto de
   Firebase + `google-services.json`, tabla nueva de tokens FCM en Supabase (SQL con OK), y que `/api/push/send` también
   mande por FCM (clave de servicio en Vercel).
2. Login con Google (Credential Manager) y recuperar contraseña.
3. Catálogo completo: crear/editar productos, fotos (subida a Storage), categorías, extras.
4. Impresión de comandas (Bluetooth/red) y sonido insistente hasta tomar el pedido.
5. Ícono y capturas, firma de release (keystore), publicación en Google Play.
6. Cuando la app esté publicada: sacar la TWA vieja (`public/.well-known/assetlinks.json`) y el código de la web app que ya no haga falta.

## Notas
- `applicationId`: `uno.snappy.app` (distinto de la TWA `uno.snappy.twa`; no se pisan).
- Las versiones de librerías están en `gradle/libs.versions.toml`.
- Este código se escribió sin poder compilarlo en el entorno de desarrollo: si Android Studio marca errores de compilación,
  se corrigen en la primera pasada (son típicos de versiones de librerías).
