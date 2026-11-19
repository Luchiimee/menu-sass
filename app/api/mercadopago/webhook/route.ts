// app/api/mercadopago/webhook/route.ts
//
// Webhook de Mercado Pago — escucha eventos de pago del modelo deferred + cron.
// Configuralo en: MP Dashboard → Tu App → Webhooks
// URL: https://snappy.uno/api/mercadopago/webhook
// Eventos a activar: payment

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { nextMonthlyChargeDate } from '@/lib/billingDate';
import { paymentGraceUntil } from '@/lib/paymentGrace';
import { rowFromMpPayment, saveBillingPayment, subscriptionPaymentTarget } from '@/lib/billingPayments';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MP_BASE = 'https://api.mercadopago.com';

/**
 * Valida la firma del webhook de Mercado Pago (header x-signature).
 * Manifest: id:{data.id};request-id:{x-request-id};ts:{ts};
 * Se firma con HMAC-SHA256 usando MP_WEBHOOK_SECRET y se compara con v1.
 * Devuelve true solo si es válida. Sin MP_WEBHOOK_SECRET se rechaza todo (fail closed).
 */
function isValidSignature(request: Request, dataId: string | null): boolean {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
        console.error('🚫 MP_WEBHOOK_SECRET no configurado — webhook rechazado (fail closed).');
        return false;
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

// Cobros de suscripciones de Mercado Pago (primer cobro al suscribirse o reactivar, y los mensuales): llegan como
// 'subscription_authorized_payment', no como 'payment'. Solo se anotan en el historial de facturación; NO se cambia el
// estado de la cuenta (eso lo hacen save-card y las suscripciones). Best-effort: nunca rompe la respuesta del webhook.
async function recordSubscriptionPayment(authorizedPaymentId: string): Promise<void> {
    try {
        const headers = { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` };
        const apRes = await fetch(`${MP_BASE}/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`, { headers });
        if (!apRes.ok) { console.error(`[billing-payments] code=AUTH_PAYMENT_HTTP_${apRes.status}`); return; }
        const target = subscriptionPaymentTarget(await apRes.json());
        if (!target) return; // todavía sin pago asociado

        const payRes = await fetch(`${MP_BASE}/v1/payments/${encodeURIComponent(target.paymentId)}`, { headers });
        if (!payRes.ok) { console.error(`[billing-payments] code=SUB_PAYMENT_HTTP_${payRes.status}`); return; }
        const payment = await payRes.json();

        // A qué local pertenece: por la suscripción (si ya está guardada), por external_reference (= user_id, que se
        // manda al crear la suscripción: sirve cuando el aviso llega antes de que save-card guarde el id) o por el mail.
        const cols = 'id, subscription_plan';
        let owner: { id: string; subscription_plan: string | null } | null = null;
        if (target.preapprovalId) {
            owner = (await supabase.from('restaurants').select(cols).eq('mp_preapproval_id', target.preapprovalId).limit(1).maybeSingle()).data;
        }
        if (!owner && target.externalReference) {
            owner = (await supabase.from('restaurants').select(cols).eq('user_id', target.externalReference).limit(1).maybeSingle()).data;
        }
        if (!owner && payment?.payer?.email) {
            owner = (await supabase.from('restaurants').select(cols).eq('owner_email', payment.payer.email).limit(1).maybeSingle()).data;
        }
        if (!owner) { console.error('[billing-payments] code=SUB_PAYMENT_NO_OWNER'); return; }

        await saveBillingPayment(supabase, rowFromMpPayment(payment, owner, new Date()));
    } catch {
        console.error('[billing-payments] code=SUB_PAYMENT_RECORD_FAILED');
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

        // Cobro de una suscripción: solo se anota en el historial (ver recordSubscriptionPayment)
        if (type === 'subscription_authorized_payment' && data?.id) {
            await recordSubscriptionPayment(String(data.id));
            return NextResponse.json({ received: true });
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

        // Historial de facturación: se anota el cobro (aprobado, rechazado, reembolsado...). Es best-effort: si algo falla
        // acá, el resto del webhook sigue igual y no cambia lo que se responde.
        try {
            const { data: owner } = await supabase
                .from('restaurants')
                .select('id, subscription_plan')
                .eq('owner_email', payerEmail)
                .limit(1)
                .maybeSingle();
            if (owner) await saveBillingPayment(supabase, rowFromMpPayment(payment, owner, new Date()));
        } catch {
            console.error('[billing-payments] code=WEBHOOK_RECORD_FAILED');
        }

        if (payment.status === 'approved') {
            // Mismo día del mes siguiente (no +30 días), a partir de la fecha de cobro guardada (si hay)
            const { data: current } = await supabase
                .from('restaurants')
                .select('next_payment_date')
                .eq('owner_email', payerEmail)
                .limit(1)
                .maybeSingle();
            const nextPayment = nextMonthlyChargeDate(current?.next_payment_date);

            const { error } = await supabase
                .from('restaurants')
                .update({
                    subscription_status: 'active',
                    next_payment_date:   nextPayment.toISOString(),
                    payment_grace_until: null,
                })
                .eq('owner_email', payerEmail);

            if (error) {
                console.error('Supabase update error (payment approved):', error);
            } else {
                console.log(`✅ ${payerEmail}: pago aprobado — next_payment_date actualizado`);
            }

        } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
            // Gracia solo en el primer rechazo: si ya estaba pausado no se vuelve a dar (ni se extiende)
            const { data: before } = await supabase
                .from('restaurants')
                .select('subscription_status')
                .eq('owner_email', payerEmail)
                .limit(1)
                .maybeSingle();
            const update: Record<string, any> = { subscription_status: 'paused' };
            if (before && before.subscription_status !== 'paused') update.payment_grace_until = paymentGraceUntil(new Date());

            const { error } = await supabase
                .from('restaurants')
                .update(update)
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
