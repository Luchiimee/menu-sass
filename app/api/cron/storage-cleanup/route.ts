// Cron de limpieza de fotos huérfanas (vercel.json, cada 2 meses). Borra del bucket "images" las fotos que ninguna tabla
// nombra y que tienen más de MIN_AGE_DAYS días (función SQL storage_orphan_images, docs/sql/41).
//
// El borrado REAL solo corre si STORAGE_CLEANUP_DELETE = '1' en las variables de Vercel (por defecto NO: solo anota en el log
// cuántas se borrarían y cuánto pesan). Aun activado: máximo MAX_PER_RUN por corrida (el resto cae en la próxima).
// Los logs llevan solo cantidades, nunca nombres de archivos.
//
// Corrida manual (primera limpieza): además del Bearer CRON_SECRET acepta el header x-cleanup-key si existe la variable
// STORAGE_CLEANUP_KEY (se crea solo para esa corrida y se borra después: sin la variable este camino queda apagado).
// Una corrida manual SOLO lista salvo que se pase ?apply=1.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

const MIN_AGE_DAYS = 30;
const MAX_PER_RUN = 600;
const BATCH = 100;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const manualKey = process.env.STORAGE_CLEANUP_KEY;
  const isManual = !!manualKey && request.headers.get('x-cleanup-key') === manualKey;
  if (!isManual && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const mayDelete = isManual
    ? new URL(request.url).searchParams.get('apply') === '1'
    : process.env.STORAGE_CLEANUP_DELETE === '1';

  const { data, error } = await supabase.rpc('storage_orphan_images', { min_age_days: MIN_AGE_DAYS });
  if (error) {
    console.error('[cron/storage-cleanup] code=ORPHANS_QUERY_FAILED');
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }
  const orphans = (data ?? []) as { name: string; bytes: number }[];
  const batch = orphans.slice(0, MAX_PER_RUN);
  const totalMb = (orphans.reduce((a, o) => a + (o.bytes || 0), 0) / 1048576).toFixed(1);

  if (!mayDelete) {
    console.log(`[cron/storage-cleanup] DRY_RUN huerfanas=${orphans.length} mb=${totalMb} (se borrarian ${batch.length})`);
    return NextResponse.json({ ok: true, dry_run: true, orphans: orphans.length, mb: Number(totalMb), would_delete: batch.length });
  }

  let deleted = 0;
  let failed = 0;
  for (let i = 0; i < batch.length; i += BATCH) {
    const names = batch.slice(i, i + BATCH).map((o) => o.name);
    const { error: rmError } = await supabase.storage.from('images').remove(names);
    if (rmError) { failed += names.length; console.error('[cron/storage-cleanup] code=REMOVE_FAILED'); }
    else deleted += names.length;
  }
  console.log(`[cron/storage-cleanup] DELETED=${deleted} failed=${failed} huerfanas_total=${orphans.length} mb_total=${totalMb}`);
  return NextResponse.json({ ok: true, dry_run: false, deleted, failed, orphans: orphans.length });
}
