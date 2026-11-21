import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { isValidWebhookSecret } from '@/lib/webhookAuth';
import { sendFcm } from '@/lib/fcm';

// Configuramos VAPID de forma perezosa y protegida: NO al cargar el módulo
// (eso corre durante el build y, si las claves faltan o están mal, rompe el
// build entero). Se ejecuta una sola vez, en el primer request.
let vapidReady = false;
function ensureVapid(): boolean {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    console.error('Push: faltan claves VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');
    return false;
  }
  try {
    webpush.setVapidDetails('mailto:push@snappy.app', pub, priv);
    vapidReady = true;
    return true;
  } catch (err) {
    console.error('Push: claves VAPID inválidas:', err);
    return false;
  }
}

// Database Webhook de Supabase (INSERT en orders). Exige el header
// x-webhook-secret = SUPABASE_WEBHOOK_SECRET (lib/webhookAuth.ts).
export async function POST(req: NextRequest) {
  if (!isValidWebhookSecret(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    if (!ensureVapid()) {
      return NextResponse.json({ error: 'Push no configurado' }, { status: 503 });
    }
   const webhookPayload = await req.json();

// Supabase mete los datos reales adentro de 'record'
const record = webhookPayload.record; 

// Extraemos los datos usando los nombres exactos de tu base de datos
const restaurantId = record.restaurant_id;
const customerName = record.customer_name;
const total = record.total;
const orderType = record.order_type;
    const oldRecord = webhookPayload.old_record;

    // Avisos que arma el propio webhook según qué cambió:
    //  - INSERT en orders con status 'pendiente'  → pedido nuevo de un cliente
    //  - UPDATE en tables: needs_attention pasó a true → "Llamar al mozo"
    //  - UPDATE en orders: payment_status pasó a 'esperando_confirmacion' → "Pagar cuenta"
    let kind: 'pedido' | 'mozo' | 'cuenta' | null = null;
    if (webhookPayload.table === 'tables') {
      if (webhookPayload.type === 'UPDATE' && record.needs_attention === true && oldRecord?.needs_attention !== true) kind = 'mozo';
    } else if (webhookPayload.type === 'UPDATE') {
      if (record.order_type !== 'delivery' && record.order_type !== 'retiro' && record.payment_status === 'esperando_confirmacion' && oldRecord?.payment_status !== 'esperando_confirmacion') kind = 'cuenta';
    } else if (record.status === 'pendiente') {
      // Solo los pedidos de clientes entran como 'pendiente' (checkout y Mercado Pago). Lo que carga el propio
      // negocio (abrir una mesa a mano, venta de mostrador, apertura de caja) entra con otro estado y no avisa.
      kind = 'pedido';
    }
    if (!kind) {
      return NextResponse.json({ ok: true, sent: 0, skipped: 'sin aviso para este evento' });
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Buscar el user_id del dueño del restaurante
const { data: restaurant } = await supabaseAdmin
  .from('restaurants')
  .select('user_id, subscription_plan') // <--- CAMBIÁ ESTO (Línea 35)
  .eq('id', restaurantId)
  .single();

if (!restaurant?.user_id) {
  return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
}

// Ahora TypeScript ya no marcará error aquí
if (restaurant?.subscription_plan === 'light') {
  return NextResponse.json({ ok: true, message: 'Plan Light no incluye Push' });
}
    // 2. Buscar las suscripciones web push y los celulares Android (FCM) del dueño
    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', restaurant.user_id);

    const { data: fcmRows } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', restaurant.user_id);
    const fcmTokens = (fcmRows || []).map((r) => r.token as string);

    if ((!subscriptions || subscriptions.length === 0) && fcmTokens.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    // 3. Preparar payload
    const orderTypeLabel =
      orderType === 'delivery' ? 'Delivery' :
      orderType === 'retiro' ? 'Retiro' :
      'Mesa';

    const orderTypeEmoji =
      orderType === 'delivery' ? '🛵' :
      orderType === 'retiro' ? '🏃' :
      '🍽️';

    const pushTitle =
      kind === 'mozo' ? '🔔 Llaman al mozo' :
      kind === 'cuenta' ? '💳 Piden la cuenta' :
      `${orderTypeEmoji} Nuevo Pedido - ${orderTypeLabel}`;
    const pushBody =
      kind === 'mozo' ? `${record.name ?? 'Una mesa'} necesita atención` :
      kind === 'cuenta' ? `${customerName ?? 'Mesa'} • $${Number(total).toLocaleString('es-AR')}` :
      `${customerName} • $${Number(total).toLocaleString('es-AR')}`;
    const pushType = kind === 'pedido' ? orderType : 'mesa';

    const payload = JSON.stringify({
      title: pushTitle,
      body: `${pushBody}\nTocá para ver el detalle`,
      orderType: pushType,
      customerName,
      total,
    });

    // 4. Enviar a todas las suscripciones
    const expiredEndpoints: string[] = [];
    let sentCount = 0;

    await Promise.allSettled(
      (subscriptions || []).map(async (sub) => {
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
          if (error.statusCode === 410 || error.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint);
          } else {
            console.error('Push send error:', error);
          }
        }
      })
    );

    // 5. Limpiar suscripciones expiradas
    if (expiredEndpoints.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }

    // 6. Android (FCM): mensaje de solo datos, la app arma la notificación con sonido
    let fcmSent = 0;
    if (fcmTokens.length > 0) {
      try {
        const fcm = await sendFcm(fcmTokens, {
          title: pushTitle,
          body: pushBody,
          orderId: kind === 'mozo' ? '' : String(record.id ?? ''),
          orderType: String(pushType ?? ''),
        });
        fcmSent = fcm.sent;
        if (fcm.invalid.length > 0) {
          await supabaseAdmin.from('fcm_tokens').delete().in('token', fcm.invalid);
        }
      } catch (err) {
        console.error('FCM error:', err);
      }
    }

    return NextResponse.json({ ok: true, sent: sentCount, fcm: fcmSent, cleaned: expiredEndpoints.length });
  } catch (err) {
    console.error('Push send route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
