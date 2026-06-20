import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const opening_balance = Number(body.opening_balance ?? 0);

  // Obtener el restaurant del usuario autenticado
  const { data: rest, error: restError } = await supabase
    .from('restaurants')
    .select('id, subscription_plan')
    .eq('user_id', user.id)
    .single();

  if (restError || !rest) {
    return NextResponse.json({ error: 'Restaurant no encontrado' }, { status: 404 });
  }

  // Verificar que no haya un turno ya abierto
  const { data: existing } = await supabase
    .from('cash_shifts')
    .select('id')
    .eq('restaurant_id', rest.id)
    .is('closed_at', null)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'Ya hay un turno abierto', shift_id: existing.id },
      { status: 409 }
    );
  }

  // Crear el turno
  const { data: shift, error: shiftError } = await supabase
    .from('cash_shifts')
    .insert({ restaurant_id: rest.id, opening_balance })
    .select()
    .single();

  if (shiftError || !shift) {
    return NextResponse.json({ error: 'Error al crear el turno' }, { status: 500 });
  }

  // Crear la orden de apertura vinculada al turno
  const { error: orderError } = await supabase.from('orders').insert({
    restaurant_id: rest.id,
    total: opening_balance,
    order_type: 'apertura',
    customer_name: 'MONTO INICIAL (CAMBIO)',
    payment_method: 'efectivo',
    status: 'completado',
    shift_id: shift.id,
    items: [],
  });

  if (orderError) {
    // Rollback: eliminar el turno recién creado
    await supabase.from('cash_shifts').delete().eq('id', shift.id);
    return NextResponse.json({ error: 'Error al registrar la apertura' }, { status: 500 });
  }

  return NextResponse.json({ shift_id: shift.id, opened_at: shift.opened_at });
}
