// app/api/mercadopago/create-link/route.ts
//
// Recibe: { plan, restaurant_id, email }
// Crea un preapproval en MP con status 'pending' (sin tarjeta)
// Devuelve: { url } → el init_point para redirigir al usuario

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// IDs de los planes creados en el dashboard de MP
// Deben coincidir exactamente con los del frontend
const PLAN_IDS: Record<string, string> = {
    light: '3aa6c7cc41fb4bfab3e9967e1bcbaeb5',
    go:    '979bc6ba5ebe4d5fa4d5b1c823586772',
    plus:  '65dd4645b714425c814a482978375c74',
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { plan, restaurant_id, email } = body;

        // --- Validaciones ---
        if (!plan || !restaurant_id || !email) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos: plan, restaurant_id, email' },
                { status: 400 }
            );
        }

        const planId = PLAN_IDS[plan.toLowerCase().trim()];
        if (!planId) {
            return NextResponse.json(
                { error: `Plan inválido: "${plan}". Valores válidos: light, go, plus` },
                { status: 400 }
            );
        }

        // --- Buscar datos del restaurante ---
        const { data: restaurant, error: dbError } = await supabase
            .from('restaurants')
            .select('id, user_id, created_at, mp_preapproval_id, name')
            .eq('id', restaurant_id)
            .single();

        if (dbError || !restaurant) {
            return NextResponse.json(
                { error: 'Restaurante no encontrado' },
                { status: 404 }
            );
        }

        // --- Cancelar suscripción anterior si existe ---
        if (restaurant.mp_preapproval_id) {
            try {
                await fetch(`https://api.mercadopago.com/preapproval/${restaurant.mp_preapproval_id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: 'cancelled' }),
                });
                console.log(`Suscripción anterior ${restaurant.mp_preapproval_id} cancelada`);
            } catch (err) {
                // No bloqueamos el flujo si falla la cancelación
                console.error('Error cancelando suscripción anterior:', err);
            }
        }

        // --- Calcular start_date dinámico ---
        // El trial son 14 días desde el registro (created_at)
        // Si el usuario todavía está en trial → cobrar cuando venza
        // Si ya pasó el trial → cobrar en 10 minutos (mínimo técnico de MP)
        const fechaRegistro = new Date(restaurant.created_at);
        const fechaFinTrial = new Date(fechaRegistro);
        fechaFinTrial.setDate(fechaRegistro.getDate() + 14);

        const ahora = new Date();
        const fechaInicioCobro = ahora < fechaFinTrial
            ? fechaFinTrial
            : new Date(ahora.getTime() + 10 * 60 * 1000);

        const startDate = fechaInicioCobro.toISOString();

        console.log(`Creando link MP para restaurante ${restaurant_id}, plan ${plan}, cobro desde ${startDate}`);

        // --- Crear preapproval en MP ---
        // Usamos status: 'pending' para que MP genere el init_point
        // sin requerir card_token_id. El usuario completa el pago en el checkout de MP.
        const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                preapproval_plan_id: planId,
                reason: `Plan ${plan.toUpperCase()} - Snappy`,
                external_reference: restaurant.user_id, // userId para identificar en webhook
                payer_email: email.trim().toLowerCase(),
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: getPlanPrice(plan),
                    currency_id: 'ARS',
                    start_date: startDate,
                },
                back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=plan&status=success`,
                status: 'pending', // ← Clave: pending genera init_point sin pedir tarjeta acá
            }),
        });

        const mpData = await mpResponse.json();

        if (!mpResponse.ok) {
            console.error('Error de MP:', mpData);
            return NextResponse.json(
                { error: mpData.message || 'Error al crear el link de pago' },
                { status: mpResponse.status }
            );
        }

        if (!mpData.init_point) {
            console.error('MP no devolvió init_point:', mpData);
            return NextResponse.json(
                { error: 'Mercado Pago no devolvió un link de pago válido' },
                { status: 500 }
            );
        }

        // --- Guardar preapproval_id en Supabase (estado pendiente) ---
        // Lo guardamos para poder cancelarlo si el usuario cambia de plan
        const { error: updateError } = await supabase
            .from('restaurants')
            .update({
                mp_preapproval_id: mpData.id,
                subscription_plan: plan,
                // No cambiamos subscription_status todavía
                // Lo actualiza el webhook cuando MP confirme el pago
            })
            .eq('id', restaurant_id);

        if (updateError) {
            console.error('Error guardando preapproval_id:', updateError);
            // No bloqueamos: el link sirve igual, solo perdemos el tracking
        }

        console.log(`Link creado: ${mpData.init_point}`);

        return NextResponse.json({ url: mpData.init_point });

    } catch (error: any) {
        console.error('Error en create-link:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

function getPlanPrice(plan: string): number {
    const prices: Record<string, number> = {
        light: 10000,
        go: 16900,
        plus: 27000,
    };
    return prices[plan.toLowerCase()] ?? 10000;
}