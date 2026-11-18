-- 35 — Borrado de los datos de un local cancelado (retención de datos).
--
-- Estado: APLICADO en producción (2026-11-18). Lo usará el cron de retención (lib/deleteRestaurantData.ts) cuando se active el borrado real.
--
-- Qué hace: dos funciones que SOLO puede ejecutar el service_role (el servidor), no el navegador:
--   retention_image_paths(restaurant_id)  nombres de los archivos del bucket 'images' que usa ese local (logo, banner,
--                                          fotos de productos y categorías, snappylink). Las fotos no están en una carpeta
--                                          por local: se encuentran por las URLs guardadas. Se excluyen las que otro local
--                                          también use.
--   delete_restaurant_data(restaurant_id)  borra el local (la base arrastra productos, categorías, extras, pedidos, caja,
--                                          reservas, cupones, mesas, zonas, credenciales de MP, etc.), los mails guardados
--                                          de ese local y, si el dueño no tiene otro local, su registro de prueba y su
--                                          usuario (con perfil, sesiones y suscripciones push). SOLO borra si el local está
--                                          'cancelled'; si no, falla con NOT_CANCELLED y no toca nada.
--   Lo que NO hace la base y hace el servidor: borrar los archivos del bucket y el cliente en Mercado Pago.
--
-- Rollback: drop function public.delete_restaurant_data(uuid); drop function public.retention_image_paths(uuid);
--   (no se recupera ningún dato ya borrado.)

create or replace function public.retention_image_paths(p_restaurant_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  with blobs as (
    select to_jsonb(r)::text as t from restaurants r where r.id = p_restaurant_id
    union all select to_jsonb(p)::text from products p where p.restaurant_id = p_restaurant_id
    union all select to_jsonb(c)::text from categories c where c.restaurant_id = p_restaurant_id
    union all select to_jsonb(s)::text from snappylinks s where s.restaurant_id = p_restaurant_id
  ),
  names as (
    select distinct m[1] as name
    from blobs, regexp_matches(t, '/object/public/images/([^"?\s\\]+)', 'g') as m
  )
  select coalesce(array_agg(n.name order by n.name), '{}')
  from names n
  where not exists (select 1 from restaurants r2 where r2.id <> p_restaurant_id and to_jsonb(r2)::text like '%' || n.name || '%')
    and not exists (select 1 from products p2 where p2.restaurant_id <> p_restaurant_id and to_jsonb(p2)::text like '%' || n.name || '%')
    and not exists (select 1 from categories c2 where c2.restaurant_id <> p_restaurant_id and to_jsonb(c2)::text like '%' || n.name || '%')
    and not exists (select 1 from snappylinks s2 where s2.restaurant_id <> p_restaurant_id and to_jsonb(s2)::text like '%' || n.name || '%');
$$;

create or replace function public.delete_restaurant_data(p_restaurant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user    uuid;
  v_status  text;
  v_mails   int;
  v_user_deleted boolean := false;
begin
  select user_id, subscription_status into v_user, v_status
  from restaurants where id = p_restaurant_id for update;

  if not found then raise exception 'RESTAURANT_NOT_FOUND'; end if;
  if v_status is distinct from 'cancelled' then raise exception 'NOT_CANCELLED'; end if;

  delete from email_log where restaurant_id = p_restaurant_id;
  get diagnostics v_mails = row_count;

  delete from restaurants where id = p_restaurant_id;

  -- Solo si el dueño no tiene otro local se borra también su usuario
  if not exists (select 1 from restaurants where user_id = v_user) then
    delete from trial_usage where user_id = v_user;
    delete from auth.users where id = v_user;
    v_user_deleted := true;
  end if;

  return jsonb_build_object('restaurant_deleted', true, 'user_deleted', v_user_deleted, 'email_log_deleted', v_mails);
end;
$$;

revoke all on function public.retention_image_paths(uuid) from public, anon, authenticated;
revoke all on function public.delete_restaurant_data(uuid) from public, anon, authenticated;
grant execute on function public.retention_image_paths(uuid) to service_role;
grant execute on function public.delete_restaurant_data(uuid) to service_role;
