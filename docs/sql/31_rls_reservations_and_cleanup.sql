-- 31 — RLS: reservas y fechas bloqueadas solo del dueño; limpieza de políticas sobrantes
--
-- Estado: APLICADO 2026-11-17 (probado con rollback: dueño no borra bloqueos ajenos, anon no borra reservas).
--
-- Hallazgos de la auditoría del 2026-11-17 (todas las tablas tienen RLS; esto es lo que estaba abierto de más):
--   reservations  DELETE  "Permitir borrar reservas a dueños"  roles public, using true  -> cualquiera borra cualquier reserva
--   reservations  UPDATE  "...a usuarios autenticados"         using true                -> cualquier logueado edita cualquier reserva
--   reservations  SELECT  "...a usuarios autenticados"         using true                -> cualquier logueado lee todas
--   blocked_dates ALL     "Admin full access"                   using auth.uid() is not null -> cualquier logueado maneja las fechas de TODOS los locales
--   order_items   INSERT  dos políticas public with check true  -> tabla sin uso (0 filas, el código no la toca)
--   duplicadas: push_subscriptions (3 iguales), restaurants UPDATE (2), blocked_dates SELECT (2)
--
-- Lo que NO cierra este script (queda para el paso siguiente, requiere código):
--   reservations SELECT "Permitir ver reserva propia por telefono" (using true, public): la web pública consulta por
--   teléfono desde el navegador (validatePhone y handleCheckReservation en app/[slug]/page.tsx), así que hoy un
--   anónimo puede leer todas las reservas (nombre, teléfono). Hoy hay 0 reservas, no hay datos expuestos todavía.
--   Y "Permitir insertar reservas a todos" (la reserva pública): sin límite de uso. Se pasan a endpoints del
--   servidor, como se hizo con los pedidos.
--
-- Rollback: recrear lo borrado con las condiciones de arriba (para reservations: using (true); para blocked_dates
--   "Admin full access": for all using (auth.uid() is not null); para order_items: for insert with check (true)).

begin;

-- reservations: el dueño maneja las de su local
create policy "owner_manage_own_reservations" on public.reservations
  for all to authenticated
  using (restaurant_id in (select id from public.restaurants where user_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where user_id = auth.uid()));

drop policy if exists "Permitir borrar reservas a dueños" on public.reservations;
drop policy if exists "Permitir ver reservas a usuarios autenticados" on public.reservations;
drop policy if exists "Permitir actualizar reservas a usuarios autenticados" on public.reservations;

-- blocked_dates: el dueño maneja las de su local; la lectura pública (fechas, sin datos personales) queda
create policy "owner_manage_own_blocked_dates" on public.blocked_dates
  for all to authenticated
  using (restaurant_id in (select id from public.restaurants where user_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where user_id = auth.uid()));

drop policy if exists "Admin full access" on public.blocked_dates;
drop policy if exists "Public read access" on public.blocked_dates;

-- order_items: sin uso
drop policy if exists "Public can insert order items" on public.order_items;
drop policy if exists "Public create order items" on public.order_items;

-- duplicadas
drop policy if exists "Permitir manejo de suscripciones propias" on public.push_subscriptions;
drop policy if exists "Users manage their subscriptions" on public.push_subscriptions;
drop policy if exists "Users can update own restaurant" on public.restaurants;

commit;
