// app/api/mercadopago/webhook/route.ts
//
// Webhook de Mercado Pago — escucha eventos de pago del modelo deferred + cron.
// Configuralo en: MP Dashboard → Tu App → Webhooks
// URL: https://snappy.uno/api/mercadopago/webhook
// Eventos a activar: payment

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MP_BASE = 'https://api.mercadopago.com';

/**
 * Valida la firma del webhook de Mercado Pago (header x-signature).
 * Manifest: id:{data.id};request-id:{x-request-id};ts:{ts};
 * Se firma con HMAC-SHA256 usando MP_WEBHOOK_SECRET y se compara con v1.
 * Devuelve true si es válida (o si no hay secret configurado, con warning).
 */
function isValidSignature(request: Request, dataId: string | null): boolean {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
        console.warn('⚠️ MP_WEBHOOK_SECRET no configurado — webhook SIN validar firma. Configuralo antes de producción.');
        return true;
    }

    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    if (!xSignature || !dataId) return false;

    // x-signature: "ts=1700000000,v1=abcdef..."
    const parts = Object.fromEntries(
        xSignature.split(',').map((p) => {
            const [k, v] = p.split('=');
            return [k?.trim(), v?.trim()];
        })
    );
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    // data.id alfanumérico debe ir en minúsculas según MP
    const id = /[a-zA-Z]/.test(dataId) ? dataId.toLowerCase() : dataId;
    const manifest = `id:${id};request-id:${xRequestId};ts:${ts};`;
    const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    try {
        return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
    } catch {
        return false;
    }
}

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const body = await request.json();
        console.log('📬 Webhook MP recibido:', JSON.stringify(body, null, 2));

        const { type, data } = body;

        // Validar firma de MP antes de procesar
        const dataId = searchParams.get('data.id') ?? data?.id ?? null;
        if (!isValidSignature(request, dataId ? String(dataId) : null)) {
            console.error('🚫 Webhook con firma inválida — rechazado');
            return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
        }

        // Solo procesamos eventos de pago; cualquier otro tipo se ignora
        if (type !== 'payment') {
            console.log(`↩️ Webhook ignorado: type=${type}`);
            return NextResponse.json({ received: true });
        }

        const paymentId = data?.id;
        if (!paymentId) {
            console.error('Webhook de payment sin ID');
            return NextResponse.json({ received: true });
        }

        // Consultar el pago en MP
        const mpRes = await fetch(`${MP_BASE}/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
        });

        if (!mpRes.ok) {
            console.error('Error consultando pago en MP:', mpRes.status);
            // 200 para evitar reintentos infinitos
            return NextResponse.json({ received: true });
        }

        const payment = await mpRes.json();
        console.log(`📋 Pago ${paymentId}: status=${payment.status}, email=${payment.payer?.email}`);

        const payerEmail: string | undefined = payment.payer?.email;
        if (!payerEmail) {
            console.error('Pago sin payer.email — no se puede identificar el restaurante');
            return NextResponse.json({ received: true });
        }

        if (payment.status === 'approved') {
            const nextPayment = new Date();
            nextPayment.setDate(nextPayment.getDate() + 30);

            const { error } = await supabase
                .from('restaurants')
                .update({
                    subscription_status: 'active',
                    next_payment_date:   nextPayment.toISOString(),
                })
                .eq('owner_email', payerEmail);

            if (error) {
                console.error('Supabase update error (payment approved):', error);
            } else {
                console.log(`✅ ${payerEmail}: pago aprobado — next_payment_date actualizado`);
            }

        } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
            const { error } = await supabase
                .from('restaurants')
                .update({ subscription_status: 'paused' })
                .eq('owner_email', payerEmail);

            if (error) {
                console.error('Supabase update error (payment rejected/cancelled):', error);
            } else {
                console.log(`⚠️ ${payerEmail}: pago ${payment.status} — marcado paused`);
            }

        } else {
            // pending, in_process, etc. — no actualizamos, esperamos el evento definitivo
            console.log(`ℹ️ Pago ${paymentId} con status=${payment.status} — sin acción`);
        }

        // MP espera 200 para confirmar recepción
        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error('Error en webhook:', error);
        // 200 para evitar reintentos infinitos de MP
        return NextResponse.json({ received: true });
    }
}

// MP hace GET para verificar que el endpoint existe
export async function GET() {
    return NextResponse.json({ status: 'Webhook activo' });
}
