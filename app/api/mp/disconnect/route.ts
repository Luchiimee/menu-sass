// POST /api/mp/disconnect — desvincula la cuenta de MP del restaurante.
// Sin requirePlan: un dueño que bajó de plan o tiene la suscripción pausada
// tiene que poder desconectar igual. Borra los tokens y deja la fila con
// status 'revoked' (historial). No revoca la autorización del lado de MP: el
// dueño puede hacerlo desde su cuenta de Mercado Pago.

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const supabase = getSupabaseAdmin();

  const { data: rest, error: restError } = await supabase
    .from('restaurants')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (restError) {
    console.error('[mp/disconnect] error leyendo restaurante:', restError.message);
    return NextResponse.json({ error: 'No se pudo desconectar' }, { status: 500 });
  }
  if (!rest) return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });

  const { data: updated, error } = await supabase
    .from('restaurant_mp_credentials')
    .update({
      access_token_enc: null,
      refresh_token_enc: null,
      expires_at: null,
      status: 'revoked',
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('restaurant_id', rest.id)
    .select('restaurant_id');

  if (error) {
    console.error('[mp/disconnect] no se pudo desconectar:', error.message);
    return NextResponse.json({ error: 'No se pudo desconectar' }, { status: 500 });
  }

  // Sin fila: no había cuenta vinculada. Se informa como tal (no es un error).
  return NextResponse.json({ status: updated && updated.length > 0 ? 'revoked' : 'disconnected' });
}
