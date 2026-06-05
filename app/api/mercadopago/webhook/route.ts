 // app/api/mercadopago/webhook/route.ts
//
// MP llama a este endpoint cuando cambia el estado de una suscripción.
// Configuralo en: MP Dashboard → Tu App → Webhooks
// URL: https://snappy.uno/api/mercadopago/webhook
// Eventos a activar: subscription_preapproval

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

        // MP manda el tipo de evento y el ID del recurso afectado
        const { type, data } = body;

        // --- Validar firma de MP antes de procesar ---
        const dataId = searchParams.get('data.id') ?? data?.id ?? null;
        if (!isValidSignature(request, dataId ? String(dataId) : null)) {
            console.error('🚫 Webhook con firma inválida — rechazado');
            return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
        }

        // Solo procesamos eventos de suscripciones
        if (type !== 'subscription_preapproval') {
            return NextResponse.json({ received: true });
        }

        const preapprovalId = data?.id;
        if (!preapprovalId) {
            console.error('Webhook sin preapproval ID');
            return NextResponse.json({ error: 'Sin ID' }, { status: 400 });
        }

        // --- Consultar el estado actual de la suscripción en MP ---
        const mpResponse = await fetch(
            `https://api.mercadopago.com/preapproval/${preapprovalId}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                },
            }
        );

        if (!mpResponse.ok) {
            console.error('Error consultando MP:', mpResponse.status);
            return NextResponse.json({ error: 'Error MP' }, { status: 500 });
        }

        const subscription = await mpResponse.json();
        console.log('📋 Estado de suscripción:', subscription.status, 'para user:', subscription.external_reference);

        const userId = subscription.external_reference;
        const mpStatus = subscription.status; // 'authorized', 'paused', 'cancelled', 'pending'

        if (!userId) {
            console.error('Suscripción sin external_reference (userId)');
            return NextResponse.json({ error: 'Sin userId' }, { status: 400 });
        }

        // --- Mapear estado de MP a estado interno de Snappy ---
        // authorized → el usuario configuró el pago, está activo
        // paused     → pausado por MP (fallo de cobro generalmente)
        // cancelled  → cancelado
        // pending    → creado pero sin tarjeta configurada todavía
        const statusMap: Record<string, string> = {
            authorized: 'active',
            paused:     'paused',
            cancelled:  'cancelled',
            pending:    'trialing',
        };

        const newStatus = statusMap[mpStatus] ?? mpStatus;

        // --- Determinar el plan desde el preapproval_plan_id o mantener el actual ---
        const planMap: Record<string, string> = {
            '3aa6c7cc41fb4bfab3e9967e1bcbaeb5': 'light',
            '979bc6ba5ebe4d5fa4d5b1c823586772': 'go',
            '65dd4645b714425c814a482978375c74': 'plus',
        };

        // Traemos el plan actual y el preapproval vigente
        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('created_at, subscription_plan, mp_preapproval_id')
            .eq('user_id', userId)
            .maybeSingle();

        // --- Anti-pisado de webhooks viejos ---
        // Si llega un evento cancelled/paused de un preapproval que YA NO es el
        // vigente (p.ej. el usuario canceló y creó una sub nueva), lo ignoramos
        // para no borrar la suscripción actual.
        const isNegativeEvent = newStatus === 'cancelled' || newStatus === 'paused';
        if (
            isNegativeEvent &&
            restaurant?.mp_preapproval_id &&
            restaurant.mp_preapproval_id !== preapprovalId
        ) {
            console.log(`↩️ Webhook de preapproval viejo (${preapprovalId}) ignorado; vigente: ${restaurant.mp_preapproval_id}`);
            return NextResponse.json({ received: true });
        }

        const planType = planMap[subscription.preapproval_plan_id] ?? restaurant?.subscription_plan ?? 'light';

        let trialEndsAt = null;
        if (restaurant?.created_at) {
            const trialEnd = new Date(restaurant.created_at);
            trialEnd.setDate(trialEnd.getDate() + 14);
            trialEndsAt = trialEnd.toISOString();
        }

        // --- Actualizar Supabase ---
        const updatePayload: any = {
            subscription_status: newStatus,
            subscription_plan: planType,
            // Si se canceló, dejamos el id en null (no lo resucitamos)
            mp_preapproval_id: newStatus === 'cancelled' ? null : preapprovalId,
        };

        // Solo guardamos trial_ends_at si la columna existe
        // (ya deberías haberla creado con el ALTER TABLE)
        if (trialEndsAt) {
            updatePayload.trial_ends_at = trialEndsAt;
        }

        const { error: updateError } = await supabase
            .from('restaurants')
            .update(updatePayload)
            .eq('user_id', userId);

        if (updateError) {
            console.error('Error actualizando Supabase:', updateError);
            // Devolvemos 200 igual para que MP no reintente indefinidamente
            // pero logueamos el error
        } else {
            console.log(`✅ Usuario ${userId} actualizado: plan=${planType}, status=${newStatus}`);
        }

        // MP espera un 200 para confirmar recepción
        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error('Error en webhook:', error);
        // Devolvemos 200 para evitar reintentos infinitos de MP
        return NextResponse.json({ received: true });
    }
}

// MP también hace GET para verificar que el endpoint existe
export async function GET() {
    return NextResponse.json({ status: 'Webhook activo' });
}