-- 29 — get_or_create_shift: solo el servidor o el dueño del local
--
-- Estado: APLICADO el 2026-11-17 en producción y probado (anon: permission denied; logueado ajeno: No autorizado;
-- dueño propio y service_role: devuelven el turno).
--
-- Problema: la función es SECURITY DEFINER y tenía EXECUTE para public y anon. Con la clave pública y un
-- restaurant_id conocido, cualquiera podía crear o reutilizar el turno de caja de ese local (lo anotaba el
-- script 27, "lo que no cubre b"). Desde que los pedidos los crea el servidor (POST /api/checkout/order) ningún
-- flujo anónimo la necesita.
--
-- Quién la usa (revisado en el repo):
--   - app/api/checkout/order/route.ts y lib/mpWebhookCore.ts: el servidor con service_role.
--   - app/dashboard/orders/page.tsx (takeOrder): el dueño logueado (authenticated), sobre su propio local.
--
-- Qué hace:
--   1. Dentro de la función: si no es service_role, el restaurant_id debe ser de un local del usuario
--      (restaurants.user_id = auth.uid()); si no, error 42501. La lógica de abrir/reutilizar el turno no cambia.
--   2. Quita EXECUTE a public y anon. Quedan authenticated (con la guarda de arriba) y service_role.
--
-- Rollback (vuelve al estado anterior, abierto a anon):
--   grant execute on function public.get_or_create_shift(uuid) to public, anon;
--   y volver a crear la función sin el bloque de la guarda (cuerpo anterior: select del turno abierto o insert
--   en cash_shifts con opening_balance 0 y opened_type 'auto').

begin;

create or replace function public.get_or_create_shift(p_restaurant_id uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_shift_id uuid;
begin
  -- Solo el servidor o el dueño del local pueden pedir o crear el turno
  if coalesce(auth.role(), '') <> 'service_role'
     and not exists (
       select 1 from public.restaurants r
       where r.id = p_restaurant_id and r.user_id = auth.uid()
     ) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select id into v_shift_id
  from cash_shifts
  where restaurant_id = p_restaurant_id
    and closed_at is null
  order by opened_at desc
  limit 1;

  if v_shift_id is null then
    insert into cash_shifts (restaurant_id, opening_balance, opened_type)
    values (p_restaurant_id, 0, 'auto')
    returning id into v_shift_id;
  end if;

  return v_shift_id;
end;
$function$;

revoke execute on function public.get_or_create_shift(uuid) from public, anon;
grant execute on function public.get_or_create_shift(uuid) to authenticated, service_role;

commit;
