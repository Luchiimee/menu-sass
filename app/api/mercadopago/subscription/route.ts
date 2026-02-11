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
        const { planType, userId, email } = body;

        // 1. Buscamos al restaurante para calcular el trial
        const { data: restaurant, error: dbError } = await supabase
            .from('restaurants')
            .select('created_at')
            .eq('user_id', userId)
            .single();

        if (dbError || !restaurant) throw new Error("Restaurante no encontrado");

        // 2. Lógica de 14 días de prueba
        const fechaRegistro = new Date(restaurant.created_at);
        const fechaFinTrial = new Date(fechaRegistro);
        fechaFinTrial.setDate(fechaRegistro.getDate() + 14);

        const hoy = new Date();
        
        // Si el trial no venció, empieza al vencer. Si ya venció, empieza en 5 min.
        let fechaInicioCobro = fechaFinTrial > hoy ? fechaFinTrial : hoy;
        fechaInicioCobro.setMinutes(fechaInicioCobro.getMinutes() + 5);

        // 3. Precios actualizados
        const prices: Record<string, number> = {
            light: 7400,
            plus: 15900,
            max: 28600
        };

        const amount = prices[planType] || 7400;
        const preapproval = new PreApproval(client);

        // 4. Crear suscripción en Mercado Pago
        const response = await preapproval.create({
            body: {
                reason: `Plan ${planType.toUpperCase()} - Snappy`,
                external_reference: userId, // CLAVE para el webhook
                payer_email: email,
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: amount,
                    currency_id: 'ARS',
                    start_date: fechaInicioCobro.toISOString(), 
                },
                back_url: 'https://snappy.uno/dashboard/settings',
                status: 'pending',
            }
        });

        return NextResponse.json({ url: response.init_point });

    } catch (error: any) {
        console.error("Error MP Subscription:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}