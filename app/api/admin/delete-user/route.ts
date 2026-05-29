import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { userId } = await request.json();

    // 1. Buscar el restaurant del usuario
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    // 2. Borrar snappylinks si tiene restaurant
    if (restaurant?.id) {
      await supabaseAdmin.from('snappylinks').delete().eq('restaurant_id', restaurant.id);
    }

    // 3. Borrar push_subscriptions
    await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId);

    // 4. Borrar trial_usage
    await supabaseAdmin.from('trial_usage').delete().eq('user_id', userId);

    // 5. Borrar restaurant
    await supabaseAdmin.from('restaurants').delete().eq('user_id', userId);

    // 6. Borrar profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // 7. Borrar usuario de auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}