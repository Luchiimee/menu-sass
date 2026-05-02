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

      
// ... dentro de tu función POST del Webhook

if (topic === 'preapproval' && id) {
    const preapproval = new PreApproval(client);
    const subData = await preapproval.get({ id });

    const userId = subData.external_reference;
    const status = subData.status; 

    if (status === 'authorized') {
        // 1. Calculamos el plan según lo que pagó (para que sea dinámico)
        const mpReason = subData.reason || "";
        const mpAmount = Number(subData.auto_recurring?.transaction_amount || 0);
        
        let confirmedPlan = 'light'; 
        if (mpReason.toLowerCase().includes('plus') || mpAmount >= 27000) confirmedPlan = 'plus';
        else if (mpReason.toLowerCase().includes('go') || mpAmount >= 16900) confirmedPlan = 'go';

        // 🚀 AQUÍ VA EL FRAGMENTO:
        // Usamos Promise.all para que se actualicen las dos tablas a la vez
        await Promise.all([
            // Actualizamos la tabla de Restaurantes (Lógica de bloqueo)
            supabase.from('restaurants').update({ 
                subscription_status: 'authorized',
                subscription_plan: confirmedPlan,
                mp_preapproval_id: id,
                updated_at: new Date().toISOString()
            }).eq('user_id', userId),

            // Actualizamos la tabla de Perfiles (Carteles visuales)
            supabase.from('profiles').update({ 
                payment_configured: true 
            }).eq('id', userId)
        ]);
        
        console.log(`✅ ÉXITO: Usuario ${userId} activado en plan ${confirmedPlan}`);
    }
    
    // ... resto de los casos (past_due, paused, etc)

            // --- CASO 2: FALLO DE PAGO (past_due) ---
            // Mercado Pago intentó cobrar y la tarjeta rebotó.
            else if (status === 'past_due') {
                await supabase.from('restaurants').update({ 
                    subscription_status: 'past_due', // Esto activa el banner naranja de "Problema con el cobro"
                    updated_at: new Date().toISOString()
                }).eq('user_id', userId);

                console.log(`⚠️ PAGO REBOTADO: El usuario ${userId} entró en mora.`);
            }

        // --- CASO 3: MERCADO PAGO SE RINDIÓ (cancelled) O SE PAUSÓ (paused) ---
            else if (status === 'cancelled' || status === 'paused') {
                await supabase.from('restaurants').update({ 
                    // 🚀 Ponemos el estado en 'paused' para que tu Layout empiece a contar los 3 días
                    subscription_status: 'paused', 
                    // 🕒 Guardamos el momento exacto donde empieza la cuenta regresiva
                    updated_at: new Date().toISOString() 
                }).eq('user_id', userId);

                console.log(`⚠️ PERIODOD DE GRACIA: El usuario ${userId} tiene 3 días para regularizar.`);
            }
        }

        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error("Webhook Error:", error.message);
        return NextResponse.json({ error: 'Webhook fail' }, { status: 500 });
    }
}