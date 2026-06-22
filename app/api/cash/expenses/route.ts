import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getRestaurantId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data?.id ?? null;
}

// GET /api/cash/expenses?shift_id=xxx
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const shift_id = searchParams.get('shift_id');
  if (!shift_id) return NextResponse.json({ error: 'shift_id requerido' }, { status: 400 });

  const restaurant_id = await getRestaurantId(user.id);
  if (!restaurant_id) return NextResponse.json({ error: 'Restaurant no encontrado' }, { status: 404 });

  const { data, error } = await supabase
    .from('cash_expenses')
    .select('*')
    .eq('shift_id', shift_id)
    .eq('restaurant_id', restaurant_id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/cash/expenses  { shift_id, description, amount, category? }
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { shift_id, description, amount, category } = body;

  if (!shift_id || !description || !amount) {
    return NextResponse.json(
      { error: 'shift_id, description y amount son requeridos' },
      { status: 400 }
    );
  }
  if (Number(amount) <= 0) {
    return NextResponse.json({ error: 'El importe debe ser mayor a 0' }, { status: 400 });
  }

  const restaurant_id = await getRestaurantId(user.id);
  if (!restaurant_id) return NextResponse.json({ error: 'Restaurant no encontrado' }, { status: 404 });

  // Verificar que el turno pertenece a este restaurant y está abierto
  const { data: shift } = await supabase
    .from('cash_shifts')
    .select('id, closed_at')
    .eq('id', shift_id)
    .eq('restaurant_id', restaurant_id)
    .single();

  if (!shift) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
  if (shift.closed_at) {
    return NextResponse.json(
      { error: 'No se pueden agregar gastos a un turno cerrado' },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('cash_expenses')
    .insert({
      restaurant_id,
      shift_id,
      description: description.trim(),
      category: category?.trim() || null,
      amount: Number(amount),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/cash/expenses?expense_id=xxx
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const expense_id = searchParams.get('expense_id');
  if (!expense_id) return NextResponse.json({ error: 'expense_id requerido' }, { status: 400 });

  const restaurant_id = await getRestaurantId(user.id);
  if (!restaurant_id) return NextResponse.json({ error: 'Restaurant no encontrado' }, { status: 404 });

  const { error } = await supabase
    .from('cash_expenses')
    .delete()
    .eq('id', expense_id)
    .eq('restaurant_id', restaurant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
