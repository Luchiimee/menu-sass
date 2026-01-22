// app/api/mercadopago/subscription/route.ts
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { supabase } from '@/lib/supabase'; // Asegúrate que esta ruta sea correcta

// 1. Configura tu cliente con el Access Token
const client = new MercadoPagoConfig({ 
    accessToken: 'APP_USR-7993102997429224-012119-bfa50f1ec737617062e24089c3bbd985-191097426' // <--- PEGA TU TOKEN AQUÍ
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { planType, userId, email } = body;

        // Definimos el precio según el plan
        const amount = planType === 'plus' ? 13900 : 25200; 
        const reason = planType === 'plus' ? 'Plan Plus - Snappy' : 'Plan Max - Snappy';

        // 2. Inicializamos la Suscripción (PreApproval)
        const preapproval = new PreApproval(client);

        // 3. Creamos la solicitud de pago recurrente
        const response = await preapproval.create({
            body: {
                reason: reason,
                external_reference: userId, // CLAVE: Aquí mandamos el ID del usuario para identificarlo después
                payer_email: email,
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: amount,
                    currency_id: 'ARS',
                },
                back_url: 'https://snappy-menu.vercel.app/dashboard/settings', // A donde vuelve el usuario al terminar
                status: 'pending',
            }
        });

        // 4. Devolvemos el link de pago al Frontend
        return NextResponse.json({ url: response.init_point });

    } catch (error) {
        console.error("Error creando suscripción:", error);
        return NextResponse.json({ error: 'Error al crear la suscripción' }, { status: 500 });
    }
}