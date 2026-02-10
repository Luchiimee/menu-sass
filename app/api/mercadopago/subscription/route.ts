// app/api/mercadopago/subscription/route.ts
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { createClient } from '@supabase/supabase-js'; // Asegurate de tener instalada la lib

const client = new MercadoPagoConfig({ 
    accessToken: 'APP_USR-7993102997429224-012119-bfa50f1ec737617062e24089c3bbd985-191097426'
});

// Inicializamos Supabase para consultar la fecha de registro
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Usá la Service Role para saltar el RLS
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { planType, userId, email } = body;

        // 1. Buscamos al restaurante para saber cuándo se creó
        const { data: restaurant, error: dbError } = await supabase
            .from('restaurants')
            .select('created_at')
            .eq('user_id', userId)
            .single();

        if (dbError || !restaurant) throw new Error("Restaurante no encontrado");

        // 2. LÓGICA DE FECHAS (Trial de 14 días)
        const fechaRegistro = new Date(restaurant.created_at);
        const fechaFinTrial = new Date(fechaRegistro);
        fechaFinTrial.setDate(fechaRegistro.getDate() + 14); // Sumamos 14 días al registro

        const hoy = new Date();
        
        // Si la fecha de fin de trial es mayor a hoy, esa será la fecha de inicio de cobro.
        // Si ya pasaron los 14 días, el cobro empieza hoy mismo.
        const fechaInicioCobro = fechaFinTrial > hoy ? fechaFinTrial : hoy;

        // 3. Definimos precio y nombre
        let amount = planType === 'light' ? 7400 : planType === 'plus' ? 15900 : 28600;
        let reason = `Plan ${planType.toUpperCase()} - Snappy`;

        const preapproval = new PreApproval(client);

        // 4. Creamos la suscripción con start_date
        const response = await preapproval.create({
            body: {
                reason: reason,
                external_reference: userId,
                payer_email: email,
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: amount,
                    currency_id: 'ARS',
                    // ESTA ES LA CLAVE: Mercado Pago cobrará recién en esta fecha
                    start_date: fechaInicioCobro.toISOString(), 
                },
                back_url: 'https://snappy.uno/dashboard/settings',
                status: 'pending',
            }
        });

        return NextResponse.json({ url: response.init_point });

    } catch (error) {
        console.error("Error creando suscripción:", error);
        return NextResponse.json({ error: 'Error al crear la suscripción' }, { status: 500 });
    }
}