import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSessionUser } from '@/lib/auth-server';

/**
 * POST /api/qz/sign
 *
 * Firma el request hash de QZ Tray con la clave privada RSA de Snappy.
 * Solo acepta requests de usuarios autenticados — no firmamos para anónimos.
 *
 * Body:   { request: string }   ← el hash crudo que envía qz-tray.js
 * Return: { signature: string } ← firma RSA-SHA512 en base64
 *
 * La clave privada vive en QZ_PRIVATE_KEY (Vercel env var, solo servidor).
 * Vercel almacena env vars con \n literal como \\n — se normaliza antes de usar.
 */
export async function POST(req: Request) {
  // Solo usuarios autenticados pueden solicitar firma
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Leer y validar el body
  const body = await req.json().catch(() => null);
  if (!body?.request || typeof body.request !== 'string') {
    return NextResponse.json({ error: 'request requerido' }, { status: 400 });
  }

  // Leer la clave privada desde env var
  const rawKey = process.env.QZ_PRIVATE_KEY;
  if (!rawKey) {
    console.error('[qz/sign] QZ_PRIVATE_KEY no está configurada en las variables de entorno');
    return NextResponse.json({ error: 'Configuración de firma no disponible' }, { status: 500 });
  }

  // Vercel escapa los saltos de línea del PEM como \\n — restaurar formato real
  const privateKeyPem = rawKey.replace(/\\n/g, '\n');

  try {
    const signer = crypto.createSign('SHA512');
    signer.update(body.request);
    const signature = signer.sign(
      { key: privateKeyPem, format: 'pem' },
      'base64'
    );
    return NextResponse.json({ signature });
  } catch (err: any) {
    console.error('[qz/sign] Error al firmar:', err.message);
    return NextResponse.json(
      { error: 'Error al generar la firma' },
      { status: 500 }
    );
  }
}
