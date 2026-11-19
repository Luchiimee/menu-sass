-- 37 — El borrado de datos también acepta PRUEBAS GRATIS ABANDONADAS (delete_restaurant_data)
--
-- Estado: SIN APLICAR.
--
-- Qué hace: reemplaza public.delete_restaurant_data(uuid) (ver 35). Antes solo borraba locales 'cancelled'. Ahora también
-- borra un local 'trialing' que NUNCA tuvo tarjeta, cliente ni suscripción en Mercado Pago (mp_card_id, mp_customer_id,
-- mp_preapproval_id vacíos), nunca pagó (first_paid_at vacío) y se creó hace al menos 104 días (14 de prueba + 90 de
-- retención). Esa edad mínima la exige la propia base, aunque el cron falle. Cualquier otro caso (activo, pausado,
-- autorizado, prueba con tarjeta o más joven) sigue fallando con NOT_CANCELLED y no toca nada.
-- No agrega columnas ni cambia datos; el resto de la función es igual a la de 35.
--
-- Rollback: volver a crear la función con el cuerpo de 35_delete_restaurant_data.sql.

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
  v_card text;
  v_cust text;
  v_pre  text;
  v_paid timestamptz;
  v_created timestamptz;
begin
  select user_id, subscription_status, mp_card_id, mp_customer_id, mp_preapproval_id, first_paid_at, created_at
    into v_user, v_status, v_card, v_cust, v_pre, v_paid, v_created
  from restaurants where id = p_restaurant_id for update;

  if not found then raise exception 'RESTAURANT_NOT_FOUND'; end if;

  -- Solo se borra: (a) un local cancelado, o (b) una prueba gratis abandonada: 'trialing' que nunca tuvo tarjeta,
  -- cliente ni suscripción en Mercado Pago ni pagó, y que se creó hace al menos 104 días (14 de prueba + 90 de retención).
  -- Cualquier otro caso falla con NOT_CANCELLED y no toca nada.
  -- coalesce: con un estado o una fecha nulos la condición da NULL y NO debe pasar como permitida.
  if not coalesce(
    v_status = 'cancelled'
    or (
      v_status = 'trialing'
      and v_card is null and v_cust is null and v_pre is null and v_paid is null
      and v_created <= now() - interval '104 days'
    ),
    false
  ) then
    raise exception 'NOT_CANCELLED';
  end if;

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
