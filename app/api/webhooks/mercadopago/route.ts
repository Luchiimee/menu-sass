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

            // --- CASO 1: PAGO EXITOSO O RE-ACTIVACIÓN ---
            if (status === 'authorized') {
                const mpAmount = Number(subData.auto_recurring?.transaction_amount || 0);
                const mpReason = subData.reason || "";
                
                let confirmedPlan = 'light'; 
                if (mpReason.toLowerCase().includes('plus') || mpAmount >= 27000) confirmedPlan = 'plus';
                else if (mpReason.toLowerCase().includes('go') || mpAmount >= 16900) confirmedPlan = 'go';

                await Promise.all([
                    supabase.from('restaurants').update({ 
                        subscription_status: 'authorized', // 🚀 Limpia banners y bloqueos
                        subscription_plan: confirmedPlan,
                        mp_preapproval_id: id,
                        updated_at: new Date().toISOString()
                    }).eq('user_id', userId),

                    supabase.from('profiles').update({ payment_configured: true }).eq('id', userId)
                ]);
                console.log(`✅ Usuario ${userId} activo en plan ${confirmedPlan}`);
            }
            
            // --- CASO 2: FALLO DE PAGO O PAUSA (PERIODO DE GRACIA) ---
            else if (status === 'past_due' || status === 'paused') {
                await supabase.from('restaurants').update({ 
                    subscription_status: 'suspended', // 🚀 Activa el banner naranja de 3 días
                    updated_at: new Date().toISOString() // 🕒 Marca el inicio de la cuenta regresiva
                }).eq('user_id', userId);

                console.log(`⚠️ GRACIA: El usuario ${userId} entró en mora/pausa.`);
            }

            // --- CASO 3: SUSCRIPCIÓN ELIMINADA (BLOQUEO TOTAL) ---
            else if (status === 'cancelled') {
                await supabase.from('restaurants').update({ 
                    subscription_status: 'cancelled', // 🚀 Activa el modal de Panel Suspendido
                    updated_at: new Date().toISOString()
                }).eq('user_id', userId);

                console.log(`🚫 BLOQUEO: Suscripción de ${userId} cancelada.`);
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error("Webhook Error:", error.message);
        return NextResponse.json({ error: 'Webhook fail' }, { status: 500 });
    }
}