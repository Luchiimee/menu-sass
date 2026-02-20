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
        const id = searchParams.get('id'); 
        const topic = searchParams.get('topic'); 

        if (topic === 'preapproval' && id) {
            const preapproval = new PreApproval(client);
            const subData = await preapproval.get({ id });

            const userId = subData.external_reference;
            const status = subData.status; 

     if (status === 'authorized') {
            // 1. ACTIVAMOS EL PLAN EN LA TABLA RESTAURANTS
            // Esto asegura que el restaurante tenga acceso a las funciones del plan
            await supabase
                .from('restaurants')
                .update({ 
                    subscription_status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            // 2. ACTIVAMOS LA "LLAVE MAESTRA" EN PROFILES
            // Esto elimina automáticamente el bloqueo de pantalla de los 14 días
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ 
                    payment_configured: true 
                })
                .eq('id', userId);

            if (profileError) {
                console.error("Error actualizando perfil:", profileError);
                throw profileError;
            }
            
            console.log(`✅ Suscripción y llave maestra activadas para: ${userId}`);
        }
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error("Webhook Error:", error.message);
        return NextResponse.json({ error: 'Webhook fail' }, { status: 500 });
    }
}