import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN! });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: Request) {
    try {
        const { userId, mpPreapprovalId } = await request.json();

        // 1. Cancelamos en Mercado Pago para que no cobre el mes que viene
        if (mpPreapprovalId) {
            try {
                const preapproval = new PreApproval(client);
                await preapproval.update({ 
                    id: mpPreapprovalId, 
                    body: { status: 'cancelled' } 
                });
            } catch (err) {
                console.error("MP ya estaba cancelado o error:", err);
            }
        }

        // 2. IMPORTANTE: Cambiamos el estado a 'cancelled' pero NO BORRAMOS nada
        // Esto activará el "Menú Pausado" en el link público
        await supabaseAdmin.from('restaurants').update({ 
            subscription_status: 'cancelled',
            updated_at: new Date().toISOString()
        }).eq('user_id', userId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}