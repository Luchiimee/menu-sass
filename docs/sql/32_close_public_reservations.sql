-- 32 — Cierra el acceso público a `reservations` (queda solo el dueño, por la política de 31)
--
-- Estado: SIN APLICAR. Aplicar DESPUÉS de publicar el código de las reservas por servidor
--   (POST /api/public/reservations y /api/public/reservations/lookup) y de probarlo en producción.
--   Si se aplica antes, la página pública deja de poder crear y consultar reservas.
--
-- Qué hace: borra las dos políticas públicas que quedaban sobre reservations
--   SELECT "Permitir ver reserva propia por telefono"  (using true)       -> leía todas las reservas
--   INSERT "Permitir insertar reservas a todos"         (with check true)  -> insertaba sin límite de uso
-- blocked_dates sigue con lectura pública (solo fechas, sin datos personales).
--
-- Rollback:
--   create policy "Permitir ver reserva propia por telefono" on public.reservations for select to public using (true);
--   create policy "Permitir insertar reservas a todos" on public.reservations for insert to public with check (true);

begin;
drop policy if exists "Permitir ver reserva propia por telefono" on public.reservations;
drop policy if exists "Permitir insertar reservas a todos" on public.reservations;
commit;
