-- =============================================================================
-- 14 — ZONAS DE ENVÍO: tabla delivery_zones (hasta 6 zonas por local)
-- =============================================================================
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE. Puede correrse antes o después de
-- deployar la rama feat/delivery-zones-engine:
--   - lib/deliveryZones.ts (readDeliveryZones) lee esta tabla y, si no existe o no
--     tiene filas para un local, usa las columnas viejas delivery_zone1_* / delivery_zone2_*;
--   - el panel del dueño escribe la tabla (si existe) y ADEMÁS espeja las zonas 1 y 2 en
--     las columnas viejas, que son las que sigue leyendo el checkout (CartFooter) hasta la
--     próxima etapa. Sin la tabla, el panel permite hasta 2 zonas.
--
-- Qué agrega: public.delivery_zones, una fila por zona (position 1 a 6, radio en km y
-- costo). NO borra ni modifica columnas de restaurants.
--
-- Migración: SOLO los locales con delivery_zones_enabled = true, con los mismos valores
-- efectivos que aplica hoy el checkout (app/[slug]/page.tsx):
--   - radio null o 0 → 3 km (zona 1) y 7 km (zona 2);
--   - si la zona 2 no supera a la 1, hoy nunca se alcanza: se migra solo la zona 1.
-- Diferencia deliberada: un costo NULL hoy se cobra como 0 (Number(x) || 0). Acá NO se
-- migra ese local (la tabla exige costo); queda leyendo las columnas viejas y aparece en
-- la verificación 3 para que el dueño cargue el precio.
-- Los locales con tarifa fija (delivery_zones_enabled = false) NO se migran: sus columnas
-- viejas y delivery_cost no se tocan.
--
-- Es idempotente: crea con "if not exists", reemplaza las policies y migra solo locales
-- que todavía no tienen filas (correrlo dos veces no duplica ni pisa lo que cargó el dueño).
--
-- Seguridad (RLS):
--   - lectura pública (anon y authenticated): radios y precios no son sensibles y el menú
--     público los necesita para mostrar el costo;
--   - insert / update / delete solo del dueño: restaurants.user_id = auth.uid();
--   - service_role (API routes) tiene acceso total, como en el resto de las tablas.
-- La regla "radios estrictamente crecientes" NO está en la base: la valida
-- lib/deliveryZones.ts (normalizeZones) en el panel y la va a validar el servidor.
-- =============================================================================

begin;

create table if not exists public.delivery_zones (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  position      smallint not null check (position between 1 and 6),
  max_km        numeric(5, 2) not null check (max_km > 0 and max_km <= 30),
  cost          numeric(12, 2) not null check (cost >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint delivery_zones_restaurant_position_key unique (restaurant_id, position)
);

comment on table public.delivery_zones is
  'Zonas de envío por distancia (radio en línea recta desde restaurants.delivery_lat/lng). Hasta 6 por local. Si un local no tiene filas, el código usa delivery_zone1_*/delivery_zone2_*.';

alter table public.delivery_zones enable row level security;

revoke all on public.delivery_zones from public, anon, authenticated;
grant select on public.delivery_zones to anon, authenticated;
grant insert, update, delete on public.delivery_zones to authenticated;
grant select, insert, update, delete on public.delivery_zones to service_role;

drop policy if exists delivery_zones_select_public on public.delivery_zones;
create policy delivery_zones_select_public on public.delivery_zones
  for select to anon, authenticated
  using (true);

drop policy if exists delivery_zones_owner_insert on public.delivery_zones;
create policy delivery_zones_owner_insert on public.delivery_zones
  for insert to authenticated
  with check (exists (
    select 1 from public.restaurants r
    where r.id = delivery_zones.restaurant_id and r.user_id = (select auth.uid())
  ));

drop policy if exists delivery_zones_owner_update on public.delivery_zones;
create policy delivery_zones_owner_update on public.delivery_zones
  for update to authenticated
  using (exists (
    select 1 from public.restaurants r
    where r.id = delivery_zones.restaurant_id and r.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.restaurants r
    where r.id = delivery_zones.restaurant_id and r.user_id = (select auth.uid())
  ));

drop policy if exists delivery_zones_owner_delete on public.delivery_zones;
create policy delivery_zones_owner_delete on public.delivery_zones
  for delete to authenticated
  using (exists (
    select 1 from public.restaurants r
    where r.id = delivery_zones.restaurant_id and r.user_id = (select auth.uid())
  ));

-- Migración desde las columnas viejas (solo zonas activas, todo o nada por local)
with src as (
  select r.id                                          as restaurant_id,
         coalesce(nullif(r.delivery_zone1_km, 0), 3)   as km1,
         r.delivery_zone1_cost                         as cost1,
         coalesce(nullif(r.delivery_zone2_km, 0), 7)   as km2,
         r.delivery_zone2_cost                         as cost2
  from public.restaurants r
  where r.delivery_zones_enabled = true
    and not exists (select 1 from public.delivery_zones dz where dz.restaurant_id = r.id)
),
ok as (
  select * from src
  where km1 > 0 and km1 <= 30 and cost1 is not null and cost1 >= 0
    -- la zona 2 solo se exige válida si hoy se alcanza (km2 > km1)
    and (km2 <= km1 or (km2 <= 30 and cost2 is not null and cost2 >= 0))
)
insert into public.delivery_zones (restaurant_id, position, max_km, cost)
select restaurant_id, 1, km1, cost1 from ok
union all
select restaurant_id, 2, km2, cost2 from ok where km2 > km1
on conflict (restaurant_id, position) do nothing;

commit;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN (solo lectura)
-- -----------------------------------------------------------------------------
-- 1) Zonas migradas al lado de las columnas viejas (esperado hoy: Burgers Snappy con
--    zona 1 = 1,50 km / 3500 y zona 2 = 3,00 km / 6000; ningún otro local)
select r.name, dz.position, dz.max_km, dz.cost,
       r.delivery_zone1_km, r.delivery_zone1_cost, r.delivery_zone2_km, r.delivery_zone2_cost
from public.delivery_zones dz
join public.restaurants r on r.id = dz.restaurant_id
order by r.name, dz.position;

-- 2) Los locales con tarifa fija no tienen filas (esperado: 0 filas; Casa Delia y Doña Coca
--    siguen con delivery_cost y sus columnas viejas intactas)
select r.name, r.delivery_cost, count(dz.id) as zonas
from public.restaurants r
join public.delivery_zones dz on dz.restaurant_id = r.id
where r.delivery_zones_enabled is distinct from true
group by r.name, r.delivery_cost;

-- 3) Locales con zonas activas que NO se migraron (costo null, radios fuera de rango):
--    siguen leyendo las columnas viejas. Esperado: 0 filas.
select r.name, r.delivery_zone1_km, r.delivery_zone1_cost, r.delivery_zone2_km, r.delivery_zone2_cost
from public.restaurants r
where r.delivery_zones_enabled = true
  and not exists (select 1 from public.delivery_zones dz where dz.restaurant_id = r.id);

-- 4) RLS activo y policies (esperado: rowsecurity = true y 4 policies)
select relname, relrowsecurity from pg_class where oid = 'public.delivery_zones'::regclass;
select policyname, cmd, roles from pg_policies where schemaname = 'public' and tablename = 'delivery_zones' order by policyname;

-- 5) Permisos (esperado: anon solo SELECT; authenticated SELECT, INSERT, UPDATE, DELETE)
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'delivery_zones' and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- -----------------------------------------------------------------------------
-- ROLLBACK (comentado). Las columnas viejas no se tocaron: el código vuelve a leerlas
-- solo (readDeliveryZones detecta la tabla inexistente). Se pierden las zonas 3 a 6 que
-- haya cargado el dueño; las zonas 1 y 2 están espejadas en restaurants.
-- -----------------------------------------------------------------------------
-- begin;
-- drop table if exists public.delivery_zones;
-- commit;
