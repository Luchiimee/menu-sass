import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Intercambia código por sesión
    await supabase.auth.exchangeCodeForSession(code);
  }

  // AL FINALIZAR: Redirige siempre a la página de inicio o dashboard
  // Aseguramos que vaya a la URL base del sitio
  return NextResponse.redirect(`${origin}/dashboard`);
}