-- 41 — función storage_orphan_images(min_age_days): lista las fotos del bucket "images" que NINGUNA tabla de la base nombra.
--
-- Estado: APLICADO en producción (2026-11-20). Es de solo lectura (no borra nada). La usa el cron /api/cron/storage-cleanup.
--
-- Qué hace: junta el texto de todas las tablas de public y devuelve los archivos del bucket "images" cuyo nombre no aparece en
-- ninguna, y que tienen más de min_age_days días (así no toca una foto recién subida que todavía no se guardó en el formulario).
-- Solo la puede ejecutar service_role (el servidor), no los usuarios.
--
-- Rollback: drop function public.storage_orphan_images(int);

create or replace function public.storage_orphan_images(min_age_days int default 30)
returns table(name text, bytes bigint)
language sql
security definer
set search_path = public, storage
as $$
  with refs as (
    select string_agg(query_to_xml(format('select * from public.%I', table_name), false, false, '')::text, ' ') as s
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  )
  select o.name, coalesce((o.metadata->>'size')::bigint, 0)
  from storage.objects o, refs
  where o.bucket_id = 'images'
    and o.created_at < now() - make_interval(days => min_age_days)
    and position(o.name in refs.s) = 0
$$;

revoke all on function public.storage_orphan_images(int) from public, anon, authenticated;
grant execute on function public.storage_orphan_images(int) to service_role;
