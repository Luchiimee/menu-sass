import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN! });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: Request) {
    try {
        const { userId, mpPreapprovalId, pause } = await request.json();

        const preapproval = new PreApproval(client);
        
        // 1. Le decimos a Mercado Pago que pause o autorice
        const mpResponse = await preapproval.update({ 
            id: mpPreapprovalId, 
            body: { status: pause ? 'paused' : 'authorized' } 
        });

        // 2. Actualizamos nuestra base de datos
        const { error } = await supabase
            .from('restaurants')
            .update({ 
                subscription_status: pause ? 'paused' : 'authorized',
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (error) throw error;

        return NextResponse.json({ success: true, status: mpResponse.status });

    } catch (error: any) {
        console.error("Error en Pause Route:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}