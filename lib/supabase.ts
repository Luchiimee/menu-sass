import { createClient } from '@supabase/supabase-js';

// EL SECRETO: Usamos '||' para poner un valor falso por defecto.
// Esto evita que el comando "npm run build" explote si las variables tardan en cargar.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);