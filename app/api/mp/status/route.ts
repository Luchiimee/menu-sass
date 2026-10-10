// GET /api/mp/status — estado de la cuenta de MP vinculada del restaurante.
// Devuelve solo status, nickname, vencimiento y si MP Connect está disponible
// para este usuario (available, lib/access.ts). NUNCA tokens.

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { canUseMpConnect } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const available = canUseMpConnect(user.email);
  const supabase = getSupabaseAdmin();

  const { data: rest, error: restError } = await supabase
    .from('restaurants')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (restError) {
    console.error('[mp/status] error leyendo restaurante:', restError.message);
    return NextResponse.json({ error: 'No se pudo consultar' }, { status: 500 });
  }
  if (!rest) return NextResponse.json({ status: 'disconnected', available });

  const { data: cred, error } = await supabase
    .from('restaurant_mp_credentials')
    .select('status, mp_nickname, expires_at')
    .eq('restaurant_id', rest.id)
    .maybeSingle();
  if (error) {
    console.error('[mp/status] error leyendo credenciales:', error.message);
    return NextResponse.json({ error: 'No se pudo consultar' }, { status: 500 });
  }

  if (!cred || cred.status === 'revoked') return NextResponse.json({ status: 'disconnected', available });

  // Conectado pero ya vencido (el cron no llegó a refrescar): se informa vencido.
  const expired = cred.status === 'connected' && !!cred.expires_at && new Date(cred.expires_at) <= new Date();

  return NextResponse.json({
    status: expired ? 'expired' : cred.status,
    nickname: cred.mp_nickname,
    expiresAt: cred.expires_at,
    available,
  });
}
