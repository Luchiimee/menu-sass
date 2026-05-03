// app/api/setup-mp-plans/route.ts
// 
// Ejecutá este endpoint UNA SOLA VEZ para crear los planes en Mercado Pago.
// Llamalo con: GET https://snappy.uno/api/setup-mp-plans?secret=TU_SECRET
// Luego copiá los IDs que devuelve y ponelos en tu .env:
//   MP_PLAN_ID_LIGHT=2c938084...
//   MP_PLAN_ID_GO=2c938084...
//   MP_PLAN_ID_PLUS=2c938084...
//
// IMPORTANTE: Una vez que tengas los IDs en .env, no necesitás llamar a este
// endpoint nunca más. Los planes en MP son permanentes.

import { NextResponse } from 'next/server';

const ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN!;

async function crearPlan(nombre: string, monto: number, frecuencia: number, frecuenciaTipo: string) {
    const res = await fetch('https://api.mercadopago.com/preapproval_plan', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            reason: `Plan ${nombre} - Snappy`,
            auto_recurring: {
                frequency: frecuencia,
                frequency_type: frecuenciaTipo,
                transaction_amount: monto,
                currency_id: 'ARS',
                // free_trial de 14 días:
                // - frequency: 14, frequency_type: 'days' → el trial dura 14 días
                // - first_invoice_offset: 14 → la primera factura real se emite al día 14
                free_trial: {
                    frequency: 14,
                    frequency_type: 'days',
                    first_invoice_offset: 14,
                },
            },
            back_url: 'https://snappy.uno/dashboard/plan',
        }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Error creando plan ${nombre}: ${JSON.stringify(data)}`);
    return data;
}

export async function GET(request: Request) {
    // Protección básica para que no lo llame cualquiera
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (secret !== process.env.SETUP_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [planLight, planGo, planPlus] = await Promise.all([
            crearPlan('LIGHT', 10000, 1, 'months'),
            crearPlan('GO',    16900, 1, 'months'),
            crearPlan('PLUS',  27000, 1, 'months'),
        ]);

        return NextResponse.json({
            message: 'Planes creados. Copiá estos IDs a tu .env',
            env: {
                MP_PLAN_ID_LIGHT: planLight.id,
                MP_PLAN_ID_GO:    planGo.id,
                MP_PLAN_ID_PLUS:  planPlus.id,
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}