
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN! 
});

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // ¡Usa la SERVICE ROLE KEY aquí!
);

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();

        // 1. Buscamos al restaurante para ver si tiene suscripción activa
        const { data: restaurant } = await supabaseAdmin
            .from('restaurants')
            .select('id, mp_preapproval_id')
            .eq('user_id', userId)
            .single();

        // 2. CANCELAR EN MERCADO PAGO (Si tiene ID de suscripción)
        if (restaurant?.mp_preapproval_id) {
            try {
                const preapproval = new PreApproval(client);
                await preapproval.update({ 
                    id: restaurant.mp_preapproval_id, 
                    body: { status: 'cancelled' } 
                });
                console.log("✅ Suscripción de MP cancelada");
            } catch (mpErr) {
                console.error("Error al cancelar MP:", mpErr);
                // Continuamos el borrado aunque falle MP por si la suscripción ya estaba vencida
            }
        }

        // 3. BORRAR DATOS DE LA BASE (Delete on Cascade borrará productos/pedidos)
        // Borramos el restaurante y el perfil
        await supabaseAdmin.from('restaurants').delete().eq('user_id', userId);
        await supabaseAdmin.from('profiles').delete().eq('id', userId);

        // 4. BORRAR USUARIO DE AUTH (El paso que te faltaba)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        
        if (authError) throw authError;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error fatal en borrado:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}