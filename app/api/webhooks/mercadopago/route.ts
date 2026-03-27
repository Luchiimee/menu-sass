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
            
            console.log(`Webhook MP: Recibido estado '${status}' para el usuario ${userId}`);

            if (!userId) {
                 console.error("Webhook Error: No hay external_reference en la suscripción");
                 return NextResponse.json({ error: 'No userId' }, { status: 400 });
            }

            // --- CASO 1: PAGO EXITOSO O SUSCRIPCIÓN ACTIVA ---
            if (status === 'authorized') {
                await supabase
                    .from('restaurants')
                    .update({ 
                        subscription_status: 'authorized',
                        mp_preapproval_id: id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);

                await supabase
                    .from('profiles')
                    .update({ payment_configured: true })
                    .eq('id', userId);

                console.log(`✅ Suscripción y llave maestra activadas para: ${userId}`);
            }

            // --- CASO 2: PAGO FALLIDO / EN REINTENTOS ---
            // Mercado Pago pone el estado 'pending' cuando falla el cobro e inicia sus 4 intentos
            else if (status === 'pending') {
                await supabase
                    .from('restaurants')
                    .update({ 
                        subscription_status: 'past_due', // Usamos este estado para el banner naranja
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);

                console.log(`⚠️ Pago fallido para ${userId}. Suscripción en estado 'past_due' (reintentando).`);
            }

            // --- CASO 3: CANCELADA DEFINTIVAMENTE ---
            // MP lo pasa a 'cancelled' si fallan los 4 intentos o si el usuario/vos la cancelan a mano
            else if (status === 'cancelled') {
                await supabase
                    .from('restaurants')
                    .update({ 
                        subscription_status: 'cancelled', // Esto bloquea el panel en layout.tsx
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);

                // Opcional: Podrías poner payment_configured: false si querés que tengan que hacer todo de nuevo
                // await supabase.from('profiles').update({ payment_configured: false }).eq('id', userId);

                console.log(`❌ Suscripción CANCELADA para: ${userId}`);
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error("Webhook Error:", error.message);
        return NextResponse.json({ error: 'Webhook fail' }, { status: 500 });
    }
}