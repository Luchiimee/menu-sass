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
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id'); // ID de la notificación
        const topic = searchParams.get('topic'); // Tipo de notificación

        // Solo procesamos si es una suscripción (preapproval)
        if (topic === 'preapproval' && id) {
            const preapproval = new PreApproval(client);
            const subData = await preapproval.get({ id });

            const userId = subData.external_reference;
            const status = subData.status; // 'authorized' = pagado/activo

            if (status === 'authorized') {
                // ACTIVAMOS EL PLAN EN LA BASE DE DATOS
                const { error } = await supabase
                    .from('restaurants')
                    .update({ 
                        subscription_status: 'active',
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);

                if (error) throw error;
                console.log(`✅ Suscripción activada para el usuario: ${userId}`);
            }
        }

        // MP espera un 200 o 201 para dejar de mandar la notificación
        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error("Webhook Error:", error.message);
        return NextResponse.json({ error: 'Webhook fail' }, { status: 500 });
    }
}