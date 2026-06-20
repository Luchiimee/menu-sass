import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildShiftSummary, getExpectedCloseTime } from '@/lib/cashUtils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Cargar todos los turnos abiertos con datos del restaurant
  const { data: openShifts, error: queryError } = await supabase
    .from('cash_shifts')
    .select(`
      id,
      restaurant_id,
      opened_at,
      opening_balance,
      restaurants (
        delivery_cost,
        cash_close_hour,
        subscription_plan,
        cash_auto_close_enabled
      )
    `)
    .is('closed_at', null);

  if (queryError) {
    console.error('[cron/cash-close] Error al obtener turnos abiertos:', queryError.message);
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  const toClose = (openShifts ?? []).filter(shift => {
    const rest = shift.restaurants as any;
    if (!rest || rest.subscription_plan === 'light') return false;
    if (!rest.cash_auto_close_enabled) return false;

    const expectedClose = getExpectedCloseTime(
      shift.opened_at,
      rest.cash_close_hour ?? '00:00'
    );
    return now > expectedClose;
  });

  if (toClose.length === 0) {
    console.log(`[cron/cash-close] Sin turnos para cerrar. (${now.toISOString()})`);
    return NextResponse.json({ closed: 0 });
  }

  const results: { shift_id: string; status: 'ok' | 'error'; detail?: string }[] = [];

  for (const shift of toClose) {
    const rest = shift.restaurants as any;
    const shift_id = shift.id;

    try {
      // Doble-check: re-leer con FOR UPDATE equivalente — verificar que siga abierto
      const { data: current } = await supabase
        .from('cash_shifts')
        .select('closed_at')
        .eq('id', shift_id)
        .single();

      if (current?.closed_at) {
        // Otro proceso ya lo cerró (ej. cierre manual simultáneo)
        results.push({ shift_id, status: 'ok', detail: 'already_closed' });
        continue;
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

      const { error: closeError } = await supabase
        .from('cash_shifts')
        .update({ closed_at: now.toISOString(), close_type: 'auto', summary })
        .eq('id', shift_id)
        .is('closed_at', null); // Guard adicional: solo actualiza si sigue abierto

      if (closeError) throw closeError;

      console.log(
        `[cron/cash-close] Auto-cierre restaurant_id=${shift.restaurant_id} shift_id=${shift_id}`
      );
      results.push({ shift_id, status: 'ok' });
    } catch (err: any) {
      console.error(`[cron/cash-close] Error cerrando shift_id=${shift_id}:`, err.message);
      results.push({ shift_id, status: 'error', detail: err.message });
    }
  }

  const closed = results.filter(r => r.status === 'ok').length;
  return NextResponse.json({ closed, results });
}
