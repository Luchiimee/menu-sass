-- =============================================================================
-- 18 — restaurants: proteger plan, suscripción y cobro de las escrituras con sesión de usuario
-- =============================================================================
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE. NO se ejecuta desde el código.
-- Antes: tiene que estar desplegado el cambio que mueve la elección de plan a
-- /api/subscriptions/choose-plan (rama fix/plan-choice-server), o esa pantalla
-- quedaría sin efecto en silencio.
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
--   La función NO es security definer a propósito: así current_user es el rol de quien llama.
--   Una función security definer que escriba restaurants (current_user = su dueño) también pasa.
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
-- Función
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
    -- Sin sesión, auth.uid() es null: user_id queda null (ver "no verificado" en el resumen).
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
-- owner_email se deriva SIEMPRE de auth.users: el trigger pasa a BEFORE INSERT OR UPDATE
-- (antes: OF user_id, o sea que editar owner_email a mano no se corregía)
-- -----------------------------------------------------------------------------
alter function public.sync_owner_email() set search_path = public, auth;

drop trigger if exists restaurants_sync_owner_email on public.restaurants;
create trigger restaurants_sync_owner_email
  before insert or update on public.restaurants
  for each row execute function public.sync_owner_email();

commit;

-- =============================================================================
-- ROLLBACK DE EMERGENCIA (descomentar y correr si algo se rompe)
-- Vuelve al estado anterior: sin el trigger nuevo y con sync_owner_email solo en INSERT/UPDATE OF user_id.
-- No toca datos.
-- =============================================================================
-- begin;
--   drop trigger if exists restaurants_01_protect_columns on public.restaurants;
--   drop function if exists public.protect_restaurant_columns();
--
--   drop trigger if exists restaurants_sync_owner_email on public.restaurants;
--   create trigger restaurants_sync_owner_email
--     before insert or update of user_id on public.restaurants
--     for each row execute function public.sync_owner_email();
--   -- (el search_path de la función puede quedar: es inofensivo; para sacarlo:
--   --  alter function public.sync_owner_email() reset search_path;)
-- commit;

-- =============================================================================
-- PRUEBA (SQL Editor, SIN cambiar datos: todo dentro de begin ... rollback)
-- Reemplazar <uuid> por el id de un local de prueba. Se corre DESPUÉS de crear el trigger
-- (o dentro de la misma transacción, antes del commit, para probar sin dejarlo instalado).
-- =============================================================================
-- begin;
--
--   -- 1) foto de los valores actuales (como postgres, antes de cambiar de rol)
--   create temp table _antes as
--     select id, user_id, created_at, subscription_plan, subscription_status, owner_email, promo_message
--       from public.restaurants where id = '<uuid>';
--
--   -- 2) actuar como el dueño de ese local
--   select set_config(
--     'request.jwt.claims',
--     (select json_build_object('sub', user_id::text, 'role', 'authenticated')::text from _antes),
--     true);
--   set local role authenticated;
--
--   -- 3) intentos de cambiar columnas protegidas + una permitida (promo_message)
--   update public.restaurants
--      set subscription_plan   = 'plus',
--          subscription_status = 'active',
--          owner_email         = 'x@y.com',
--          user_id             = gen_random_uuid(),
--          created_at          = '2000-01-01',
--          promo_message       = 'prueba-trigger'
--    where id = '<uuid>';
--   -- Esperado: "UPDATE 1". Si dice "UPDATE 0" o un error de RLS, la policy de UPDATE no dejó pasar el
--   -- cambio de user_id: ver el comentario del paso 4. Un error acá NO es un fallo del trigger.
--
--   reset role;
--
--   -- 4) comparar contra la foto (como postgres, para poder leer todo)
--   select
--     r.subscription_plan   is not distinct from a.subscription_plan   as plan_igual,    -- esperado: true
--     r.subscription_status is not distinct from a.subscription_status as estado_igual,  -- esperado: true
--     r.owner_email         is not distinct from a.owner_email         as email_igual,   -- esperado: true (se derivó de auth.users)
--     r.user_id             is not distinct from a.user_id             as user_id_igual, -- esperado: true
--     r.created_at          is not distinct from a.created_at          as creado_igual,  -- esperado: true
--     r.promo_message = 'prueba-trigger'                               as permitida_cambio -- esperado: true
--   from public.restaurants r join _antes a on a.id = r.id;
--
--   -- 5) como postgres el trigger no actúa: un update de service_role/SQL Editor SÍ cambia el plan
--   update public.restaurants set subscription_plan = 'plus' where id = '<uuid>';
--   select subscription_plan from public.restaurants where id = '<uuid>';  -- esperado: 'plus' (se deshace con el rollback)
--
-- rollback;   -- no queda ningún cambio
