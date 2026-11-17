-- 30 — Limpieza de políticas duplicadas en products y una inútil en orders
--
-- Estado: APLICADO el 2026-11-17 en producción y probado (anon: lee, no edita ni borra; logueado ajeno: no edita ni
-- borra; dueño: edita y borra lo suyo; todo con rollback).
--
-- Las políticas permissive se suman (si una permite, pasa): las repetidas no agregaban acceso, solo costo por fila.
--   products: quedan "Owner manage products" (dueño, ALL) y "Public can view products" (lectura pública del menú).
--   orders:   queda owner_manage_own_orders. Se borra "Permitir manejo de pedidos propios" (comparaba
--             auth.uid() con el id del local: nunca daba permiso).
--
-- Rollback (recrear lo borrado; la condición del dueño es la misma de "Owner manage products"):
--   create policy "Owners manage products" on public.products for all to authenticated
--     using (restaurant_id in (select id from public.restaurants where user_id = auth.uid()));
--   create policy "Public view products" on public.products for select to public using (true);
--   (y las cuatro "Enable ... for owners" con auth.uid() = (select user_id from restaurants where id = products.restaurant_id))

begin;
drop policy if exists "Owners manage products"       on public.products;
drop policy if exists "Enable delete for owners"     on public.products;
drop policy if exists "Enable insert for owners"     on public.products;
drop policy if exists "Enable read access for owners" on public.products;
drop policy if exists "Enable update for owners"     on public.products;
drop policy if exists "Public view products"         on public.products;
drop policy if exists "Permitir manejo de pedidos propios" on public.orders;
commit;
