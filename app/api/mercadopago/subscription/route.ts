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
        const body = await request.json();
        const { planType, userId, email, token, payment_method_id } = body;

        // 1. Buscamos datos del restaurante (Trial y Suscripción Actual)
        const { data: restaurant, error: dbError } = await supabase
            .from('restaurants')
            .select('created_at, mp_preapproval_id')
            .eq('user_id', userId)
            .single();

        if (dbError || !restaurant) throw new Error("Restaurante no encontrado");

        const preapproval = new PreApproval(client);

        // --- 2. LÓGICA DE LIMPIEZA (EVITAR DOBLE COBRO) ---
        // Si el usuario ya tiene una suscripción vinculada, la cancelamos antes de crear la nueva
        if (restaurant.mp_preapproval_id) {
            try {
                console.log(`Cancelando suscripción anterior: ${restaurant.mp_preapproval_id}`);
                await preapproval.update({ 
                    id: restaurant.mp_preapproval_id, 
                    body: { status: 'cancelled' } 
                });
            } catch (err) {
                console.error("Error al cancelar suscripción vieja (tal vez ya estaba cancelada):", err);
            }
        }

        // 3. Lógica de 14 días de prueba (Mantenemos tu excelente lógica)
        const fechaRegistro = new Date(restaurant.created_at);
        const fechaFinTrial = new Date(fechaRegistro);
        fechaFinTrial.setDate(fechaRegistro.getDate() + 14);

        const hoy = new Date();
        
        // Si el trial no venció, el cobro empieza al vencer. 
        // Si ya venció (o es cambio de plan), empieza en 5 min.
        let fechaInicioCobro = fechaFinTrial > hoy ? fechaFinTrial : hoy;
        fechaInicioCobro.setMinutes(fechaInicioCobro.getMinutes() + 5);

        // 4. Precios actualizados
       const prices: Record<string, number> = {
            light: 10000,
            go: 16900,
            plus: 27000,
            max: 0 // Aún no disponible para cobro
        };
if (!prices[planType] || prices[planType] === 0) {
            throw new Error("El plan seleccionado no está disponible para suscripción actualmente.");
        }
       const amount = prices[planType];

    // 5. Crear la suscripción DIRECTA usando el Token de la tarjeta
        const response = await preapproval.create({
            body: {
                reason: `Plan ${planType.toUpperCase()} - Snappy`,
                external_reference: userId,
                payer_email: email.trim().toLowerCase(),
                // 🚀 ESTA ES LA MAGIA: Usamos el token generado por el Brick en el frontend
                card_token_id: token, 
                auto_recurring: {
                    frequency: 1,
                    frequency_type: 'months',
                    transaction_amount: amount,
                    currency_id: 'ARS',
                    start_date: fechaInicioCobro.toISOString(), 
                },
                back_url: 'https://snappy.uno/dashboard/settings',
                // Al usar Checkout API, la suscripción se intenta activar de inmediato
                status: 'authorized', 
            }
        });

        // 6. Actualizar el restaurante en tu base de datos con el nuevo ID de suscripción
        await supabase
            .from('restaurants')
            .update({ 
                mp_preapproval_id: response.id,
                subscription_status: 'authorized',
                subscription_plan: planType
            })
            .eq('user_id', userId);

        return NextResponse.json({ 
            success: true, 
            message: "Suscripción activada con éxito",
            id: response.id 
        });

        // LOG de Auditoría
        console.log(`✅ Suscripción generada para ${userId} (${email}): ${response.id}`);

        return NextResponse.json({ 
            url: response.init_point,
            preapproval_id: response.id 
        });

        return NextResponse.json({ url: response.init_point });

    } catch (error: any) {
        console.error("Error MP Subscription:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}