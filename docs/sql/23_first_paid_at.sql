-- =============================================================================
-- 23 — restaurants.first_paid_at: fecha del PRIMER pago de la suscripción (para ordenar el cupo de la promo)
-- =============================================================================
-- BORRADOR. NO EJECUTADO. CORRER A MANO EN EL SQL EDITOR DE SUPABASE. No se ejecuta desde el código.
-- Requisito: el script 18 ya aplicado (existen restaurants_01_protect_columns y protect_restaurant_columns).
--
-- Problema
--   No hay dónde leer cuándo pagó por primera vez un local. Cada cobro aprobado solo pisa
--   subscription_status ('active' / 'authorized') y next_payment_date (webhook de pagos, cron de cobro,
--   reintento, guardado de tarjeta): no queda historial. La promo de remeras necesita el orden de pago.
--
-- Qué hace (en una transacción: si algo falla, no se aplica nada)
--   1. Agrega restaurants.first_paid_at timestamptz (null = todavía no pagó, o pagó antes de este script).
--   2. Trigger restaurants_02_first_paid_at (BEFORE UPDATE): cuando subscription_status pasa a 'active' o
--      'authorized' desde un valor que NO es 'active' ni 'authorized', y first_paid_at es null, pone
--      NEW.first_paid_at := now(). Pasar de 'active' a 'authorized' (pago a pago) NO lo vuelve a poner, y una vez
--      puesto nunca se pisa. No toca código de la aplicación: todos los caminos de cobro que ya escriben
--      el estado lo disparan solos.
--   3. Protección: protect_restaurant_columns (script 18) pasa a restaurar también first_paid_at en UPDATE y a
--      forzarlo a null en INSERT para quien llega con sesión de usuario o clave pública. El dueño no puede
--      escribirlo. service_role, postgres y el SQL Editor pasan sin cambios.
--
--   Orden de los triggers (BEFORE, alfabético por nombre):
--     restaurants_01_protect_columns   restaura las columnas protegidas (incluida first_paid_at)
--     restaurants_02_first_paid_at     corre DESPUÉS: ve ya restaurado subscription_status, así que un usuario con
--                                      sesión que intente poner 'active' no dispara nada
--     restaurants_sync_owner_email     (script 18)
--
-- Lo que NO hace
--   - No completa locales que ya pagan (quedan con first_paid_at null): ver "BACKFILL" abajo (decisión manual).
--   - No cuenta cobros mensuales (la promo de 4 remeras pide el tercer cobro): eso necesita un historial de
--     pagos, que hoy no existe.
--   - INSERT con estado ya pagado no lo estampa (el trigger es BEFORE UPDATE, como se pidió).
--
-- Orden recomendado: 1) consultas "ANTES DE CORRER"; 2) aplicar; 3) consultas de verificación; 4) revisar el backfill.
-- =============================================================================

-- =============================================================================
-- ANTES DE CORRER (SOLO LECTURA, comentado)
--   (a) triggers de restaurants: esperado, restaurants_01_protect_columns y restaurants_sync_owner_email
--       (más los propios de la tabla). Fijate en los nombres: el nuevo restaurants_02_first_paid_at tiene que
--       quedar entre el 01 y el resto que deban correr después.
--   (b) definición viva de la función de protección: tiene que ser la del script 18. Si difiere (alguien la
--       cambió después), NO correr este script tal cual: adaptar la función de abajo a la definición viva.
--   (c) la columna todavía no existe (esperado: 0 filas).
--   (d) cuántos locales están en estado pagado hoy (quedarán con first_paid_at null hasta el backfill).
-- =============================================================================
-- select tgname, tgenabled, pg_get_triggerdef(oid) as definicion
-- from pg_trigger
-- where tgrelid = 'public.restaurants'::regclass and not tgisinternal
-- order by tgname;
--
-- select pg_get_functiondef('public.protect_restaurant_columns'::regproc);
--
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'restaurants' and column_name = 'first_paid_at';
--
-- select subscription_status, count(*) as locales
-- from public.restaurants group by subscription_status order by locales desc;

begin;

-- Guarda: tiene que estar aplicado el script 18
do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgrelid = 'public.restaurants'::regclass
       and not tgisinternal
       and tgname = 'restaurants_01_protect_columns'
  ) then
    raise exception 'Falta el trigger restaurants_01_protect_columns: correr antes el script 18';
  end if;
end $$;

alter table public.restaurants add column if not exists first_paid_at timestamptz;

-- -----------------------------------------------------------------------------
-- Función de protección del script 18 + first_paid_at (único cambio: las dos líneas marcadas con "NUEVO")
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
    new.first_paid_at       := old.first_paid_at;   -- NUEVO
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
    new.first_paid_at       := null;                -- NUEVO
    return new;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- first_paid_at: se estampa una sola vez, en el primer paso a un estado pagado
-- (no es security definer: solo lee OLD/NEW y escribe NEW)
-- -----------------------------------------------------------------------------
create or replace function public.set_first_paid_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.first_paid_at is null
     and new.subscription_status in ('active', 'authorized')
     and coalesce(old.subscription_status, '') not in ('active', 'authorized') then
    new.first_paid_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists restaurants_02_first_paid_at on public.restaurants;
create trigger restaurants_02_first_paid_at
  before update on public.restaurants
  for each row execute function public.set_first_paid_at();

commit;

-- =============================================================================
-- ROLLBACK DE EMERGENCIA (descomentar y correr si algo se rompe)
-- Quita el trigger nuevo y deja la función de protección como en el script 18 (sin first_paid_at).
-- NO borra la columna (borrarla perdería las fechas ya estampadas): si de verdad querés quitarla, al final.
-- =============================================================================
-- begin;
--   drop trigger if exists restaurants_02_first_paid_at on public.restaurants;
--   drop function if exists public.set_first_paid_at();
--
--   create or replace function public.protect_restaurant_columns()
--   returns trigger
--   language plpgsql
--   set search_path = public
--   as $fn$
--   begin
--     if current_user not in ('authenticated', 'anon') then
--       return new;
--     end if;
--
--     if tg_op = 'UPDATE' then
--       new.user_id             := old.user_id;
--       new.created_at          := old.created_at;
--       new.subscription_plan   := old.subscription_plan;
--       new.subscription_status := old.subscription_status;
--       new.trial_ends_at       := old.trial_ends_at;
--       new.next_payment_date   := old.next_payment_date;
--       new.grace_period_until  := old.grace_period_until;
--       new.mp_customer_id      := old.mp_customer_id;
--       new.mp_card_id          := old.mp_card_id;
--       new.mp_preapproval_id   := old.mp_preapproval_id;
--       new.card_last_four      := old.card_last_four;
--       new.card_brand          := old.card_brand;
--       return new;
--     end if;
--
--     if tg_op = 'INSERT' then
--       new.user_id             := auth.uid();
--       new.created_at          := now();
--       new.subscription_status := 'trialing';
--       new.subscription_plan   := null;
--       new.trial_ends_at       := null;
--       new.next_payment_date   := null;
--       new.grace_period_until  := null;
--       new.mp_customer_id      := null;
--       new.mp_card_id          := null;
--       new.mp_preapproval_id   := null;
--       new.card_last_four      := null;
--       new.card_brand          := null;
--       return new;
--     end if;
--
--     return new;
--   end;
--   $fn$;
-- commit;
--
-- Solo si querés quitar la columna (se pierden las fechas):
-- alter table public.restaurants drop column if exists first_paid_at;

-- =============================================================================
-- VERIFICACIÓN POSTERIOR (SOLO LECTURA, comentado): correr después de aplicar.
--   1) la columna existe (timestamptz);
--   2) los triggers quedan en el orden 01, 02, ...;
--   3) las dos funciones incluyen first_paid_at;
--   4) conteos: pagando_sin_fecha = los locales que ya pagaban antes (ver backfill).
-- =============================================================================
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'restaurants' and column_name = 'first_paid_at';
--
-- select tgname, tgenabled from pg_trigger
-- where tgrelid = 'public.restaurants'::regclass and not tgisinternal
-- order by tgname;
--
-- select p.proname, position('first_paid_at' in pg_get_functiondef(p.oid)) > 0 as incluye_first_paid_at
-- from pg_proc p
-- where p.pronamespace = 'public'::regnamespace
--   and p.proname in ('protect_restaurant_columns', 'set_first_paid_at');
--
-- select
--   count(*) filter (where subscription_status in ('active', 'authorized'))                              as pagando,
--   count(*) filter (where first_paid_at is not null)                                                    as con_first_paid_at,
--   count(*) filter (where subscription_status in ('active', 'authorized') and first_paid_at is null)    as pagando_sin_fecha
-- from public.restaurants;

-- =============================================================================
-- BACKFILL (SOLO LECTURA, comentado): los locales que ya pagaban antes de este script quedan con
-- first_paid_at null. Esta consulta lista los registrados en noviembre de 2026 (hora Argentina) en esa situación,
-- con una ESTIMACIÓN del primer cobro (next_payment_date - 30 días: solo es exacta si hubo un único cobro por
-- el cron o el webhook; con la suscripción de Mercado Pago next_payment_date es null). Completarlo es una
-- decisión manual, caso por caso; este script no escribe ningún dato.
-- =============================================================================
-- select id, name, owner_email, subscription_status, created_at, next_payment_date,
--        next_payment_date - interval '30 days' as primer_cobro_estimado
-- from public.restaurants
-- where subscription_status in ('active', 'authorized')
--   and first_paid_at is null
--   and created_at >= '2026-11-01 00:00:00-03'
--   and created_at <  '2026-12-01 00:00:00-03'
-- order by created_at;
