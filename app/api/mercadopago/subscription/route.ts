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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { planType, userId, email, token } = body;

        // 1. Buscamos datos del restaurante
        const { data: restaurant, error: dbError } = await supabase
            .from('restaurants')
            .select('id, created_at, mp_preapproval_id')
            .eq('user_id', userId)
            .single();

        if (dbError || !restaurant) throw new Error("Restaurante no encontrado");

        const preapproval = new PreApproval(client);

        // 2. Limpieza de suscripciones viejas
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

// --- 3. Cálculo de Fecha de Inicio de Cobro (Trial de 14 días) ---
const fechaTrial = new Date();
fechaTrial.setDate(fechaTrial.getDate() + 14);
// Le sumamos unos minutos extra para evitar errores de "fecha en el pasado" por milisegundos
fechaTrial.setMinutes(fechaTrial.getMinutes() + 10);

/**
 * 🚀 EL FIX PARA EL FORMATO:
 * Mercado Pago Argentina a veces falla si no ve exactamente el formato:
 * YYYY-MM-DDTHH:mm:ss.SSS-03:00
 */const start_date_formatted = fechaTrial.toISOString().replace('Z', '-03:00');

// --- 4. Precios ---
const prices: Record<string, number> = {
    light: 10000,
    go: 16900,
    plus: 27000
};
const amount = prices[planType];
console.log("Fecha enviada a MP:", start_date_formatted);
// --- 5. Crear Suscripción en Mercado Pago ---
const response = await preapproval.create({
    body: {
        reason: `Plan ${planType.toUpperCase()} - Snappy`,
        external_reference: userId,
        payer_email: email.trim().toLowerCase(),
        card_token_id: token, 
        auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: amount,
            currency_id: 'ARS',
            // ✅ USAMOS LA NUEVA VARIABLE FORMATEADA
            start_date: start_date_formatted, 
        },
        back_url: 'https://snappy.uno/dashboard/plan',
        status: 'authorized', 
    }
});

        // 6. Actualizar Supabase
        const { error: updateError } = await supabase
            .from('restaurants')
            .update({ 
                mp_preapproval_id: response.id,
                subscription_status: 'authorized',
                subscription_plan: planType
            })
            .eq('user_id', userId);

        if (updateError) throw updateError;

        return NextResponse.json({ 
            success: true, 
            message: "Suscripción configurada con éxito",
            id: response.id 
        });

    } catch (error: any) {
        console.error("Error MP Subscription:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}