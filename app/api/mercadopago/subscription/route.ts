import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN! 
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLAN_IDS: Record<string, string> = {
    light: process.env.MP_PLAN_ID_LIGHT!,
    go:    process.env.MP_PLAN_ID_GO!,
    plus:  process.env.MP_PLAN_ID_PLUS!,
};

const PRICES: Record<string, number> = {
    light: 10000,
    go:    16900,
    plus:  27000,
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { planType, userId, email, token } = body;

        const { data: restaurant, error: dbError } = await supabase
            .from('restaurants')
            .select('id, created_at, mp_preapproval_id')
            .eq('user_id', userId)
            .single();

        if (dbError || !restaurant) throw new Error("Restaurante no encontrado");

        const preapproval = new PreApproval(client);

        if (restaurant.mp_preapproval_id) {
            try {
                await preapproval.update({ 
                    id: restaurant.mp_preapproval_id, 
                    body: { status: 'cancelled' } 
                });
            } catch (err) {
                console.error("Error al cancelar vieja:", err);
            }
        }

        const fechaRegistro = new Date(restaurant.created_at);
        const fechaFinTrial = new Date(fechaRegistro);
        fechaFinTrial.setDate(fechaRegistro.getDate() + 14);

        const ahora = new Date();
        const fechaInicioCobro = ahora < fechaFinTrial
            ? fechaFinTrial
            : new Date(ahora.getTime() + 10 * 60000);

        const start_date_formatted = fechaInicioCobro.toISOString();

        const planId = PLAN_IDS[planType];
        if (!planId) {
            throw new Error(
                `No se encontró MP_PLAN_ID_${planType.toUpperCase()} en .env. ` +
                `Ejecutá /api/setup-mp-plans primero.`
            );
        }

        console.log(`Sub para ${userId}. Plan: ${planType}. PlanId: ${planId}. Cobro: ${start_date_formatted}`);

        const response = await preapproval.create({
            body: {
                preapproval_plan_id: planId,
                reason: `Plan ${planType.toUpperCase()} - Snappy`,
                external_reference: userId,
                payer_email: email.trim().toLowerCase(),
                card_token_id: token,
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: PRICES[planType],
                    currency_id: 'ARS',
                    start_date: start_date_formatted,
                },
                back_url: 'https://snappy.uno/dashboard/plan',
                status: 'authorized',
            }
        });

        const { error: updateError } = await supabase
            .from('restaurants')
            .update({ 
                mp_preapproval_id: response.id,
                subscription_status: 'trialing',
                subscription_plan: planType,
                trial_ends_at: fechaFinTrial.toISOString(),
            })
            .eq('user_id', userId);

        if (updateError) throw updateError;

        return NextResponse.json({ 
            success: true, 
            id: response.id,
            proximo_cobro: start_date_formatted,
        });

    } catch (error: any) {
        console.error("Error MP Subscription:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}