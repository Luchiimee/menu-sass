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
                const mpReason = subData.reason || "";
                // Obtenemos el monto que realmente pagó el usuario
                const mpAmount = Number(subData.auto_recurring?.transaction_amount || 0);
                
                let confirmedPlan = 'light'; 

                if (mpReason.toLowerCase().includes('plus')) {
                    // SI PAGA EL PRECIO NUEVO ($27.000) O MÁS -> ES PLUS
                    if (mpAmount >= 27000) {
                        confirmedPlan = 'plus';
                    } 
                    // SI PAGA EL PRECIO VIEJO ($15.900) -> SE QUEDA EN GO
                    else {
                        confirmedPlan = 'go';
                    }
                } 
                else if (mpReason.toLowerCase().includes('go')) {
                    confirmedPlan = 'go';
                } 
                else if (mpReason.toLowerCase().includes('max')) {
                    confirmedPlan = 'max';
                }

                await supabase.from('restaurants').update({ 
                    subscription_status: 'authorized',
                    subscription_plan: confirmedPlan, // <--- RE-CONFIRMAMOS SEGÚN EL PRECIO
                    mp_preapproval_id: id,
                    updated_at: new Date().toISOString()
                }).eq('user_id', userId);

                await supabase.from('profiles').update({ 
                    payment_configured: true 
                }).eq('id', userId);
                
                console.log(`✅ Pago de $${mpAmount} procesado. Plan: ${confirmedPlan.toUpperCase()} para: ${userId}`);
            }

          
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