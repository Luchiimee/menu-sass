import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Necesitás esta key en tu .env
  );

  try {
    const { userId } = await request.json();

    // 1. Borramos al usuario de la AUTH (esto borra todo lo demás si tenés ON DELETE CASCADE)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}