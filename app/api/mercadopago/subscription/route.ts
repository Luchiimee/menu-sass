// app/api/mercadopago/subscription/route.ts
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';

// 1. Configura tu cliente con el Access Token
const client = new MercadoPagoConfig({ 
    accessToken: 'APP_USR-7993102997429224-012119-bfa50f1ec737617062e24089c3bbd985-191097426'
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { planType, userId, email } = body;

        // --- CORRECCIÓN AQUÍ ---
        // Definimos el precio y nombre explícitamente para cada plan
        let amount = 0;
        let reason = '';

        if (planType === 'light') {
            amount = 7000;
            reason = 'Plan Light - Snappy';
        } else if (planType === 'plus') {
            amount = 15900;
            reason = 'Plan Plus - Snappy';
        } else {
            // Por defecto asumimos MAX si no es ni light ni plus
            amount = 28600;
            reason = 'Plan Max - Snappy';
        }
        // -----------------------

        // 2. Inicializamos la Suscripción (PreApproval)
        const preapproval = new PreApproval(client);

        // 3. Creamos la solicitud de pago recurrente
        const response = await preapproval.create({
            body: {
                reason: reason,
                external_reference: userId, // CLAVE: ID del usuario
                payer_email: email,
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: amount,
                    currency_id: 'ARS',
                },
                back_url: 'https://snappy.uno/dashboard/settings',
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