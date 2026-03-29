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
// ... (imports y config inicial igual)

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

            if (!userId) return NextResponse.json({ error: 'No userId' }, { status: 400 });

            // --- CASO 1: SUSCRIPCIÓN ACTIVA (authorized) ---
            if (status === 'authorized') {
                await supabase.from('restaurants').update({ 
                    subscription_status: 'authorized',
                    mp_preapproval_id: id,
                    updated_at: new Date().toISOString()
                }).eq('user_id', userId);

                await supabase.from('profiles').update({ 
                    payment_configured: true 
                }).eq('id', userId);
            }

            // --- CASO 2: FALLO TEMPORAL / RE-INTENTOS (pending) ---
            // Mercado Pago re-intenta 4 veces. Mientras tanto, mostramos el banner NARANJA.
            else if (status === 'pending') {
                await supabase.from('restaurants').update({ 
                    subscription_status: 'past_due', 
                    updated_at: new Date().toISOString()
                }).eq('user_id', userId);
            }

            // --- CASO 3: MP SE RINDIÓ O SE CANCELÓ (cancelled) ---
            // Aquí aplicamos tu lógica: En lugar de bloquearlo al instante, 
            // lo pasamos a 'paused' para activar el banner ROJO de 3 días de gracia.
            else if (status === 'cancelled') {
                await supabase.from('restaurants').update({ 
                    subscription_status: 'paused', // <--- CAMBIO CLAVE: Activa el banner rojo
                    updated_at: new Date().toISOString()
                }).eq('user_id', userId);

                console.log(`⚠️ Suscripción enviada a periodo de gracia (paused) para: ${userId}`);
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error("Webhook Error:", error.message);
        return NextResponse.json({ error: 'Webhook fail' }, { status: 500 });
    }
}