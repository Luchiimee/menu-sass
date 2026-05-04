import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN! 
});

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const { userId } = await request.json();

        const { data: rest } = await supabaseAdmin
            .from('restaurants')
            .select('mp_preapproval_id')
            .eq('user_id', userId)
            .single();

        if (rest?.mp_preapproval_id) {
            const preapproval = new PreApproval(client);
            await preapproval.update({ 
                id: rest.mp_preapproval_id, 
                body: { status: 'cancelled' } 
            });
        }

        // 🟢 IMPORTANTE: Ponemos el status en 'cancelled' pero NO borramos el restaurante
        await supabaseAdmin
            .from('restaurants')
            .update({ 
                subscription_status: 'cancelled',
                mp_preapproval_id: null 
            })
            .eq('user_id', userId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}