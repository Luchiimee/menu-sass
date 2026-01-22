import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { supabase } from '@/lib/supabase';

// Configura tu cliente
const client = new MercadoPagoConfig({ 
    accessToken: 'APP_USR-7993102997429224-012119-bfa50f1ec737617062e24089c3bbd985-191097426' // <--- EL MISMO TOKEN DE ANTES
});

export async function POST(request: Request) {
    try {
        const url = new URL(request.url);
        const topic = url.searchParams.get('topic') || url.searchParams.get('type');
        const id = url.searchParams.get('id') || url.searchParams.get('data.id');

        // Solo nos interesan las notificaciones de suscripciones (preapproval)
        if (topic === 'preapproval') {
            
            // 1. Consultamos a MP el estado actual de esa suscripción
            const preapproval = new PreApproval(client);
            const subscription = await preapproval.get({ id: id! });

            // 2. Obtenemos datos clave
            const userId = subscription.external_reference; // El ID que mandamos al crearla
            const status = subscription.status; // 'authorized', 'paused', 'cancelled'

            if (userId) {
                // 3. ACTUALIZAMOS LA BASE DE DATOS
                let newPlan = 'light';
                
                // Si está autorizado, le damos el plan que corresponda
                if (status === 'authorized') {
                    // Detectamos si es Plus o Max por el monto (truco rápido)
                    // O podés guardar el reason en tu DB.
                    const amount = subscription.auto_recurring?.transaction_amount || 0;
                    newPlan = amount > 20000 ? 'max' : 'plus';
                }

                console.log(`Actualizando usuario ${userId} a plan ${newPlan} (Estado: ${status})`);

                await supabase.from('restaurants').update({ 
                    subscription_plan: newPlan,
                    // Podríamos guardar el estado también si creamos la columna 'subscription_status'
                    // subscription_status: status 
                }).eq('user_id', userId);
            }
        }

        return NextResponse.json({ status: 'ok' });

    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}