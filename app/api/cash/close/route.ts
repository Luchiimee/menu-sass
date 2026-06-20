import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';
import { buildShiftSummary } from '@/lib/cashUtils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { shift_id } = body;
  if (!shift_id) return NextResponse.json({ error: 'shift_id requerido' }, { status: 400 });

  // Obtener el restaurant del usuario autenticado
  const { data: rest } = await supabase
    .from('restaurants')
    .select('id, delivery_cost')
    .eq('user_id', user.id)
    .single();

  if (!rest) return NextResponse.json({ error: 'Restaurant no encontrado' }, { status: 404 });

  // Obtener el turno verificando ownership
  const { data: shift } = await supabase
    .from('cash_shifts')
    .select('id, closed_at, opening_balance')
    .eq('id', shift_id)
    .eq('restaurant_id', rest.id)
    .single();

  if (!shift) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });

  // Idempotencia: si ya está cerrado, devolver éxito sin escribir nada
  if (shift.closed_at) {
    return NextResponse.json({ already_closed: true, closed_at: shift.closed_at });
  }

  // Cargar órdenes y gastos del turno
  const [{ data: orders }, { data: expenses }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_type, payment_method, total, status')
      .eq('shift_id', shift_id)
      .neq('status', 'cancelado'),
    supabase
      .from('cash_expenses')
      .select('id, amount, description, category')
      .eq('shift_id', shift_id),
  ]);

  const summary = buildShiftSummary(
    orders ?? [],
    expenses ?? [],
    Number(rest.delivery_cost ?? 0),
    Number(shift.opening_balance ?? 0)
  );

  // Cerrar el turno
  const { error } = await supabase
    .from('cash_shifts')
    .update({ closed_at: new Date().toISOString(), close_type: 'manual', summary })
    .eq('id', shift_id);

  if (error) return NextResponse.json({ error: 'Error al cerrar el turno' }, { status: 500 });

  return NextResponse.json({ closed: true, summary });
}
