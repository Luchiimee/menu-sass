// POST /api/mp/webhook — avisos de pago de MP Connect (cuentas de los restaurantes).
// Lo llama Mercado Pago, sin sesión. Distinto de /api/mercadopago/webhook
// (suscripciones de Snappy): no mezclar. Toda la lógica está en
// lib/mpWebhookCore.ts; acá solo se conectan la base y la consulta a MP.
//
// Configurar en la app de MP Connect (Snappy-pagos): evento "payment" y
// MP_CONNECT_WEBHOOK_SECRET con la clave secreta de ESA app.
// Responde 401 (firma/secreto), 500 (error reintentable) o 200.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getSellerAccessToken } from '@/lib/mpSellerToken';
import { handleWebhookRequest, type FetchPaymentResult } from '@/lib/mpWebhookCore';

export const dynamic = 'force-dynamic';

const MP_PAYMENTS_URL = 'https://api.mercadopago.com/v1/payments';
const MAX_BODY_BYTES = 64 * 1024;

// GET /v1/payments/{id} con el token del vendedor. Nunca se loguea el cuerpo.
async function fetchPayment(restaurantId: string, paymentId: string): Promise<FetchPaymentResult> {
  const token = await getSellerAccessToken(restaurantId);
  if (!token) return { kind: 'no_token' };
  try {
    const res = await fetch(`${MP_PAYMENTS_URL}/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      console.error(`[mp/webhook] consulta de pago ${paymentId}: http=${res.status}`);
      return { kind: 'not_found' };
    }
    if (!res.ok) {
      console.error(`[mp/webhook] consulta de pago ${paymentId}: http=${res.status}`);
      return { kind: 'transient' };
    }
    return { kind: 'ok', payment: await res.json() };
  } catch (err: any) {
    console.error(`[mp/webhook] consulta de pago ${paymentId} sin respuesta: ${String(err?.name ?? 'error')}`);
    return { kind: 'transient' };
  }
}

export async function POST(req: Request) {
  let rawBody = '';
  try {
    rawBody = await req.text();
  } catch {
    rawBody = '';
  }
  if (rawBody.length > MAX_BODY_BYTES) return NextResponse.json({ received: true }, { status: 200 });

  const result = await handleWebhookRequest(
    {
      secret: process.env.MP_CONNECT_WEBHOOK_SECRET,
      searchParams: new URL(req.url).searchParams,
      xSignature: req.headers.get('x-signature'),
      xRequestId: req.headers.get('x-request-id'),
      rawBody,
    },
    { db: getSupabaseAdmin(), fetchPayment }
  );

  if (result.http === 401) return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  return NextResponse.json({ received: result.http === 200 }, { status: result.http });
}
