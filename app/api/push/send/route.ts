import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:push@snappy.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  try {
   const webhookPayload = await req.json();

// Supabase mete los datos reales adentro de 'record'
const record = webhookPayload.record; 

// Extraemos los datos usando los nombres exactos de tu base de datos
const restaurantId = record.restaurant_id;
const customerName = record.customer_name;
const total = record.total;
const orderType = record.order_type;

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
      .select('user_id')
      .eq('id', restaurantId)
      .single();

    if (!restaurant?.user_id) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // 2. Buscar todas las suscripciones push del dueño
    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', restaurant.user_id);

    if (!subscriptions || subscriptions.length === 0) {
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

    const payload = JSON.stringify({
      title: `${orderTypeEmoji} Nuevo Pedido - ${orderTypeLabel}`,
      body: `${customerName} • $${Number(total).toLocaleString('es-AR')}\nTocá para ver el detalle`,
      orderType,
      customerName,
      total,
    });

    // 4. Enviar a todas las suscripciones
    const expiredEndpoints: string[] = [];
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

    return NextResponse.json({ ok: true, sent: sentCount, cleaned: expiredEndpoints.length });
  } catch (err) {
    console.error('Push send route error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
