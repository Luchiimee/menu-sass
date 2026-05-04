 // app/api/mercadopago/webhook/route.ts
//
// MP llama a este endpoint cuando cambia el estado de una suscripción.
// Configuralo en: MP Dashboard → Tu App → Webhooks
// URL: https://snappy.uno/api/mercadopago/webhook
// Eventos a activar: subscription_preapproval

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('📬 Webhook MP recibido:', JSON.stringify(body, null, 2));

        // MP manda el tipo de evento y el ID del recurso afectado
        const { type, data } = body;

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

        // --- Determinar el plan desde el preapproval_plan_id ---
        const planMap: Record<string, string> = {
            '3aa6c7cc41fb4bfab3e9967e1bcbaeb5': 'light',
            '979bc6ba5ebe4d5fa4d5b1c823586772': 'go',
            '65dd4645b714425c814a482978375c74': 'plus',
        };
        const planType = planMap[subscription.preapproval_plan_id] ?? 'light';

        // --- Calcular fecha de fin de trial ---
        // Buscamos el restaurante para saber cuándo se registró
        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('created_at')
            .eq('user_id', userId)
            .maybeSingle();

        let trialEndsAt = null;
        if (restaurant?.created_at) {
            const trialEnd = new Date(restaurant.created_at);
            trialEnd.setDate(trialEnd.getDate() + 14);
            trialEndsAt = trialEnd.toISOString();
        }

        // --- Actualizar Supabase ---
        const updatePayload: any = {
            mp_preapproval_id: preapprovalId,
            subscription_status: newStatus,
            subscription_plan: planType,
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