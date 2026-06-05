import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Leer el perfil (bypasea RLS con service role)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Falta userId' }, { status: 400 });

    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, email')
      .eq('id', userId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}

// Actualizar campos del perfil (bypasea RLS con service role)
export async function POST(req: Request) {
  try {
    const { userId, ...fields } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Falta userId' }, { status: 400 });

    const allowed = ['first_name', 'last_name', 'phone'];
    const updates: Record<string, any> = {};
    for (const k of allowed) {
      if (k in fields) updates[k] = fields[k];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...updates }, { onConflict: 'id' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
