-- =============================================================================
-- 18 — restaurants: proteger plan, suscripción y cobro de las escrituras con sesión de usuario
-- =============================================================================
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE. NO se ejecuta desde el código.
-- Antes: tiene que estar desplegado el cambio que mueve la elección de plan a
-- /api/subscriptions/choose-plan (rama fix/plan-choice-server), o esa pantalla
-- quedaría sin efecto en silencio. También conviene correr la consulta de solo lectura
-- "ANTES DE CORRER" (más abajo) para ver qué locales cambiarían de owner_email.
--
-- Qué hace
--   Un usuario con sesión (rol authenticated) o anónimo (rol anon) ya no puede cambiar, en su propio
--   local, las columnas de plan, suscripción y cobro. El trigger NO rechaza: restaura el valor viejo
--   (NEW.col := OLD.col). Así Personalizar, que reenvía la fila entera, sigue guardando lo demás.
--   service_role, postgres y el SQL Editor pasan sin cambios (cron, webhook y rutas de /api/*).
--
--   Columnas protegidas (UPDATE: se restauran; INSERT: se fuerzan a un valor inicial)
--     user_id, created_at, subscription_plan, subscription_status, trial_ends_at, next_payment_date,
--     grace_period_until, mp_customer_id, mp_card_id, mp_preapproval_id, card_last_four, card_brand
--   NO se protegen: mp_checkout_enabled (el dueño lo enciende desde pagos), slug, owner_email
--   (se deriva de auth.users por sync_owner_email), ni los card_* de estilo (card_color, card_name...).
--
--   La función de protección NO es security definer a propósito: así current_user es el rol de quien
--   llama. Una función security definer que escriba restaurants (current_user = su dueño) también pasa.
--
--   owner_email: sync_owner_email pasa a correr en todo INSERT y UPDATE.
--     INSERT  owner_email = email de auth.users para NEW.user_id (null si no hay usuario).
--     UPDATE  owner_email = email de auth.users si hay usuario; si no (user_id nulo o usuario
--             inexistente) conserva OLD.owner_email en vez de ponerlo en null.
--   Efecto a tener en cuenta: cualquier UPDATE de un local cuyo owner_email difiera del email de
--   auth.users lo corrige a ese email (ver la consulta "ANTES DE CORRER").
--
--   Orden de los triggers (BEFORE, alfabético por nombre):
--     restaurants_01_protect_columns   restaura user_id y compañía
--     ...                              (otros, p. ej. el de handle_restaurant_defaults)
--     restaurants_sync_owner_email     recalcula owner_email con el user_id ya restaurado
--
-- Pendiente de verificar en la base ANTES de correrlo (solo lectura):
--   select tgname, tgenabled, pg_get_triggerdef(oid) from pg_trigger
--    where tgrelid = 'public.restaurants'::regclass and not tgisinternal;
--   select pg_get_functiondef('public.sync_owner_email'::regproc);
-- El script aborta si encuentra un trigger de sync_owner_email con otro nombre (ver el bloque DO).
-- =============================================================================

-- =============================================================================
-- ANTES DE CORRER (SOLO LECTURA, comentado): locales cuyo owner_email cambiaría o no tiene usuario
-- Lista id, name, owner_email y el email de auth. Sin datos de tarjeta ni de cobro.
-- Esperado: idealmente 0 filas. Cada fila es un local con user_id nulo, user_id sin usuario en
-- auth.users, o un owner_email distinto del de auth.users (el primer UPDATE lo cambiaría).
-- =============================================================================
-- select
--   r.id,
--   r.name,
--   r.owner_email,
--   u.email as auth_email,
--   case
--     when r.user_id is null then 'user_id nulo'
--     when u.id is null      then 'user_id sin usuario en auth.users'
--     else                        'owner_email distinto del email de auth'
--   end as problema
-- from public.restaurants r
-- left join auth.users u on u.id = r.user_id
-- where r.user_id is null
--    or u.id is null
--    or r.owner_email is distinct from u.email
-- order by problema, r.name;
--
-- Conteo por tipo:
-- select
--   count(*) filter (where r.user_id is null)                                   as user_id_nulo,
--   count(*) filter (where r.user_id is not null and u.id is null)              as sin_usuario_en_auth,
--   count(*) filter (where u.id is not null and r.owner_email is distinct from u.email) as owner_email_distinto
-- from public.restaurants r
-- left join auth.users u on u.id = r.user_id;

begin;

-- -----------------------------------------------------------------------------
-- Guarda: el único trigger que usa sync_owner_email tiene que llamarse
-- restaurants_sync_owner_email. Si tiene otro nombre, se dejaría duplicado: se aborta todo.
-- -----------------------------------------------------------------------------
do $$
declare
  otro text;
begin
  select tgname into otro
    from pg_trigger
   where tgrelid = 'public.restaurants'::regclass
     and not tgisinternal
     and tgfoid = 'public.sync_owner_email'::regproc
     and tgname <> 'restaurants_sync_owner_email'
   limit 1;
  if otro is not null then
    raise exception 'sync_owner_email ya está en otro trigger (%): revisar el nombre antes de seguir', otro;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Función de protección
-- -----------------------------------------------------------------------------
create or replace function public.protect_restaurant_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Solo para quien llega con la clave pública / sesión de usuario.
  -- service_role, postgres y el SQL Editor pasan sin cambios.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.user_id             := old.user_id;
    new.created_at          := old.created_at;
    new.subscription_plan   := old.subscription_plan;
    new.subscription_status := old.subscription_status;
    new.trial_ends_at       := old.trial_ends_at;
    new.next_payment_date   := old.next_payment_date;
    new.grace_period_until  := old.grace_period_until;
    new.mp_customer_id      := old.mp_customer_id;
    new.mp_card_id          := old.mp_card_id;
    new.mp_preapproval_id   := old.mp_preapproval_id;
    new.card_last_four      := old.card_last_four;
    new.card_brand          := old.card_brand;
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- El local nace en prueba, sin plan, sin cobro y a nombre de quien lo crea.
    -- Sin sesión, auth.uid() es null: user_id queda null.
    new.user_id             := auth.uid();
    new.created_at          := now();   -- evita crear un local con fecha futura para alargar la prueba
    new.subscription_status := 'trialing';
    new.subscription_plan   := null;
    new.trial_ends_at       := null;
    new.next_payment_date   := null;
    new.grace_period_until  := null;
    new.mp_customer_id      := null;
    new.mp_card_id          := null;
    new.mp_preapproval_id   := null;
    new.card_last_four      := null;
    new.card_brand          := null;
    return new;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Trigger nuevo: corre ANTES de restaurants_sync_owner_email (orden alfabético)
-- -----------------------------------------------------------------------------
drop trigger if exists restaurants_01_protect_columns on public.restaurants;
create trigger restaurants_01_protect_columns
  before insert or update on public.restaurants
  for each row execute function public.protect_restaurant_columns();

-- -----------------------------------------------------------------------------
-- sync_owner_email: owner_email se deriva de auth.users por NEW.user_id.
-- En UPDATE, si no hay usuario que coincida, se conserva OLD.owner_email (no se pone en null).
-- security definer + search_path fijo: lee auth.users aunque el rol que llama no pueda.
-- -----------------------------------------------------------------------------
create or replace function public.sync_owner_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  select u.email into v_email from auth.users u where u.id = new.user_id;

  if tg_op = 'INSERT' then
    new.owner_email := v_email;
  elsif v_email is not null then
    new.owner_email := v_email;
  else
    new.owner_email := old.owner_email;
  end if;

  return new;
end;
$$;

-- Antes corría solo en INSERT o UPDATE OF user_id; ahora en todo INSERT y UPDATE
-- (así editar owner_email a mano se corrige siempre).
drop trigger if exists restaurants_sync_owner_email on public.restaurants;
create trigger restaurants_sync_owner_email
  before insert or update on public.restaurants
  for each row execute function public.sync_owner_email();

commit;

-- =============================================================================
-- ROLLBACK DE EMERGENCIA (descomentar y correr si algo se rompe)
-- Vuelve al estado anterior: sin el trigger de protección, con la función sync_owner_email original
-- de este diseño (owner_email = email de auth.users, sin conservar el valor viejo) y el trigger
-- original BEFORE INSERT OR UPDATE OF user_id. No toca datos.
-- =============================================================================
-- begin;
--   drop trigger if exists restaurants_01_protect_columns on public.restaurants;
--   drop function if exists public.protect_restaurant_columns();
--
--   drop trigger if exists restaurants_sync_owner_email on public.restaurants;
--
--   create or replace function public.sync_owner_email()
--   returns trigger
--   language plpgsql
--   security definer
--   set search_path = public, auth
--   as $fn$
--   begin
--     NEW.owner_email = (SELECT email FROM auth.users WHERE id = NEW.user_id);
--     RETURN NEW;
--   end;
--   $fn$;
--
--   create trigger restaurants_sync_owner_email
--     before insert or update of user_id on public.restaurants
--     for each row execute function public.sync_owner_email();
-- commit;

-- =============================================================================
-- PRUEBA (SQL Editor): UNA ejecución, UNA fila final, no cambia datos.
-- Reemplazar <uuid> (3 veces) por el id de un local de prueba. Se corre con el trigger ya instalado.
--
-- Cómo no deja cambios: los updates corren dentro de un sub-bloque del DO que termina con una
-- excepción forzada (ZZ001); Postgres deshace todo lo hecho en ese sub-bloque y los resultados
-- ya leídos quedan en variables. Por eso no hace falta begin/rollback y el ÚLTIMO comando es el
-- select (así el editor, que muestra el resultado del último comando, lo muestra).
-- Las tablas temporales _t_* viven solo en esa sesión.
--
-- Qué esperar en la fila final (todas true si el trigger funciona):
--   plan_protegido, estado_protegido, user_id_protegido, created_at_protegido
--       true  = el update los intentó cambiar y quedaron con el valor de antes
--       false = el trigger NO los protegió (problema)
--       null  = el update no se aplicó (0 filas o error de RLS): no se pudo comprobar
--   owner_email_no_editable  true = owner_email no quedó en 'x@y.com'
--   columna_permitida_si_cambia  true = promo_message SÍ cambió (el trigger no bloquea de más)
--   todo_ok  true solo si los seis chequeos son true
--   filas_a / error_a / filas_b / error_b: filas actualizadas y mensaje de error de cada update
--       (A = columnas protegidas, B = columna permitida). Si hay error de RLS se ve acá.
-- =============================================================================
-- drop table if exists _t_antes;
-- drop table if exists _t_res;
--
-- -- 1) foto del estado antes (como postgres)
-- create temp table _t_antes as
--   select id, user_id, created_at, subscription_plan, subscription_status, owner_email, promo_message
--     from public.restaurants where id = '<uuid>';
--
-- create temp table _t_res (
--   filas_a int, error_a text, filas_b int, error_b text,
--   plan text, estado text, uid uuid, creado timestamptz, owner_email text, promo text
-- );
--
-- -- 2) updates como authenticated, todo deshecho al final del sub-bloque
-- do $$
-- declare
--   v_uid uuid;
--   v_fa int; v_ea text; v_fb int; v_eb text;
--   v_plan text; v_estado text; v_uid2 uuid; v_creado timestamptz; v_owner text; v_promo text;
-- begin
--   select user_id into v_uid from _t_antes;
--
--   begin  -- sub-bloque "deshacer"
--     perform set_config('request.jwt.claims',
--       json_build_object('sub', v_uid::text, 'role', 'authenticated')::text, true);
--
--     begin  -- A: intentar cambiar columnas protegidas (con valores distintos a los actuales)
--       set local role authenticated;
--       update public.restaurants set
--         subscription_plan   = case when subscription_plan   is not distinct from 'plus'   then 'go'     else 'plus'   end,
--         subscription_status = case when subscription_status is not distinct from 'active' then 'paused' else 'active' end,
--         owner_email         = 'x@y.com',
--         user_id             = gen_random_uuid(),
--         created_at          = '2000-01-01'
--       where id = '<uuid>';
--       get diagnostics v_fa = row_count;
--     exception when others then
--       v_ea := sqlerrm;
--     end;
--     reset role;
--
--     begin  -- B: una columna permitida
--       perform set_config('request.jwt.claims',
--         json_build_object('sub', v_uid::text, 'role', 'authenticated')::text, true);
--       set local role authenticated;
--       update public.restaurants set promo_message = 'prueba-trigger' where id = '<uuid>';
--       get diagnostics v_fb = row_count;
--     exception when others then
--       v_eb := sqlerrm;
--     end;
--     reset role;
--
--     -- estado resultante, leído como postgres
--     select subscription_plan, subscription_status, user_id, created_at, owner_email, promo_message
--       into v_plan, v_estado, v_uid2, v_creado, v_owner, v_promo
--       from public.restaurants where id = '<uuid>';
--
--     raise exception 'deshacer' using errcode = 'ZZ001';
--   exception when sqlstate 'ZZ001' then
--     null;  -- esperado: deshace los updates; las variables conservan lo leído
--   end;
--
--   insert into _t_res values (v_fa, v_ea, v_fb, v_eb, v_plan, v_estado, v_uid2, v_creado, v_owner, v_promo);
-- end $$;
--
-- -- 3) UNA fila final (último comando del script)
-- select
--   case when r.filas_a = 1 then r.plan   is not distinct from a.subscription_plan   end as plan_protegido,
--   case when r.filas_a = 1 then r.estado is not distinct from a.subscription_status end as estado_protegido,
--   case when r.filas_a = 1 then r.uid    is not distinct from a.user_id             end as user_id_protegido,
--   case when r.filas_a = 1 then r.creado is not distinct from a.created_at          end as created_at_protegido,
--   case when r.filas_a = 1 then r.owner_email is distinct from 'x@y.com'            end as owner_email_no_editable,
--   case when r.filas_b = 1 then r.promo = 'prueba-trigger'                          end as columna_permitida_si_cambia,
--   coalesce(
--     (r.filas_a = 1 and r.plan is not distinct from a.subscription_plan
--        and r.estado is not distinct from a.subscription_status
--        and r.uid is not distinct from a.user_id
--        and r.creado is not distinct from a.created_at
--        and r.owner_email is distinct from 'x@y.com')
--     and (r.filas_b = 1 and r.promo = 'prueba-trigger'),
--     false) as todo_ok,
--   r.filas_a, r.error_a, r.filas_b, r.error_b
-- from _t_res r
-- left join _t_antes a on true;
