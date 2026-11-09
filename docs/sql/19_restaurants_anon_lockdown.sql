-- =============================================================================
-- 19 — restaurants: quitarle a la clave pública (rol anon) la lectura de public.restaurants
-- =============================================================================
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE. NO se ejecuta desde el código.
-- Antes: tiene que estar desplegado el cambio que hace que el menú público lea el local desde
-- /api/public/menu/[slug] (servidor) y no desde el navegador con la clave pública. Si no, el menú
-- público dejaría de cargar. También conviene correr la consulta de solo lectura "ANTES DE CORRER"
-- y, después, el bloque de PRUEBA (los dos están comentados más abajo).
--
-- Qué hace
--   1. Pasa a {authenticated} las políticas que estaban en {public} y consultan restaurants en su
--      condición. Con anon sin permiso sobre restaurants, esas políticas darían
--      "permission denied for table restaurants" a anon en lugar de devolver 0 filas, y eso rompería
--      la lectura pública de products, categories, etc. Con el rol cambiado, anon ya no las evalúa.
--      (delivery_zones y orders ya eran {authenticated}.)
--   2. revoke select on public.restaurants from anon. Sin permisos por columna.
--
--   Solo cambia el rol de cada política: el comando (cmd), el using y el with check no se tocan.
--   No cambia datos. service_role y postgres no se ven afectados.
--
-- Todo en una transacción: si cualquier sentencia falla, no se aplica nada.
-- =============================================================================

-- =============================================================================
-- ANTES DE CORRER (SOLO LECTURA, comentado): políticas de las tablas involucradas
-- Esperado: las políticas de la lista de este archivo aparecen con roles {public} y
-- referencia_restaurants = true. Hay que mirar las que dejan leer a anon (roles {public} o {anon},
-- cmd SELECT o ALL) con referencia_restaurants = false: esas siguen funcionando para anon y son
-- las que mantienen la lectura pública de esa tabla. Si una tabla que el menú público necesita
-- no tiene ninguna de esas, anon ya hoy no la lee (o la lee por otro camino: revisar).
-- referencia_restaurants es una búsqueda de texto en qual/with_check: no detecta restaurants
-- escondido dentro de una función o vista; mirar esos casos a mano.
-- =============================================================================
-- select
--   tablename,
--   policyname,
--   cmd,
--   roles,
--   qual,
--   with_check,
--   (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ilike '%restaurants%' as referencia_restaurants,
--   (roles && array['public', 'anon']::name[])                                    as alcanza_a_anon
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('products', 'extras', 'categories', 'coupons', 'discount_rules',
--                     'cash_shifts', 'cash_expenses', 'order_item_costs', 'orders', 'tables',
--                     'delivery_zones', 'restaurants')
-- order by tablename, policyname;

begin;

-- -----------------------------------------------------------------------------
-- 1) Políticas {public} que consultan restaurants -> {authenticated}
-- -----------------------------------------------------------------------------

-- cash_expenses
alter policy "cash_expenses: dueño puede actualizar"       on public.cash_expenses to authenticated;
alter policy "cash_expenses: dueño puede borrar sus gastos" on public.cash_expenses to authenticated;
alter policy "cash_expenses: dueño puede insertar"         on public.cash_expenses to authenticated;
alter policy "cash_expenses: dueño puede leer sus gastos"  on public.cash_expenses to authenticated;

-- cash_shifts
alter policy "cash_shifts: dueño puede actualizar"         on public.cash_shifts to authenticated;
alter policy "cash_shifts: dueño puede insertar"           on public.cash_shifts to authenticated;
alter policy "cash_shifts: dueño puede leer sus turnos"    on public.cash_shifts to authenticated;

-- categories
alter policy "Owners manage categories"                    on public.categories to authenticated;

-- coupons
alter policy "Users can manage their own restaurant coupons" on public.coupons to authenticated;

-- discount_rules
alter policy "Dueño puede gestionar sus reglas"            on public.discount_rules to authenticated;

-- order_item_costs
alter policy "oic: dueño puede leer"                       on public.order_item_costs to authenticated;

-- products
alter policy "Enable delete for owners"                    on public.products to authenticated;
alter policy "Enable insert for owners"                    on public.products to authenticated;
alter policy "Enable read access for owners"               on public.products to authenticated;
alter policy "Enable update for owners"                    on public.products to authenticated;
alter policy "Owner manage products"                       on public.products to authenticated;
alter policy "Owners manage products"                      on public.products to authenticated;

-- -----------------------------------------------------------------------------
-- 2) anon ya no lee restaurants (sin permisos por columna)
-- -----------------------------------------------------------------------------
revoke select on public.restaurants from anon;

commit;

-- =============================================================================
-- ROLLBACK DE EMERGENCIA (descomentar y correr si algo se rompe)
-- Revierte TODO: devuelve las políticas a {public} y el select de anon sobre restaurants.
-- =============================================================================
-- begin;
--   alter policy "cash_expenses: dueño puede actualizar"       on public.cash_expenses to public;
--   alter policy "cash_expenses: dueño puede borrar sus gastos" on public.cash_expenses to public;
--   alter policy "cash_expenses: dueño puede insertar"         on public.cash_expenses to public;
--   alter policy "cash_expenses: dueño puede leer sus gastos"  on public.cash_expenses to public;
--
--   alter policy "cash_shifts: dueño puede actualizar"         on public.cash_shifts to public;
--   alter policy "cash_shifts: dueño puede insertar"           on public.cash_shifts to public;
--   alter policy "cash_shifts: dueño puede leer sus turnos"    on public.cash_shifts to public;
--
--   alter policy "Owners manage categories"                    on public.categories to public;
--
--   alter policy "Users can manage their own restaurant coupons" on public.coupons to public;
--
--   alter policy "Dueño puede gestionar sus reglas"            on public.discount_rules to public;
--
--   alter policy "oic: dueño puede leer"                       on public.order_item_costs to public;
--
--   alter policy "Enable delete for owners"                    on public.products to public;
--   alter policy "Enable insert for owners"                    on public.products to public;
--   alter policy "Enable read access for owners"               on public.products to public;
--   alter policy "Enable update for owners"                    on public.products to public;
--   alter policy "Owner manage products"                       on public.products to public;
--   alter policy "Owners manage products"                      on public.products to public;
--
--   grant select on public.restaurants to anon;
-- commit;

-- =============================================================================
-- PRUEBA (SQL Editor, como postgres): UNA ejecución, UNA fila-resultado por tabla/rol, no cambia nada.
-- Correr ANTES de aplicar el script (con el script ya aplicado, "antes" y "después" serían iguales
-- y la prueba no probaría nada).
--
-- Cómo no deja cambios: el sub-bloque del DO mide "antes", aplica los pasos 1 y 2 (las mismas
-- sentencias de arriba), mide "después" y termina con una excepción forzada (ZZ001); Postgres deshace
-- todo lo hecho en el sub-bloque (alter policy y revoke incluidos). Las filas medidas se guardan en
-- tablas temporales (_t_res), que se escriben siempre como postgres, y el ÚLTIMO comando es el select.
-- Cada medición tiene su propio begin/exception: un error en una tabla no aborta el resto.
--
-- Qué mide
--   rol anon: filas que ve de cada tabla (products, extras, categories, coupons, discount_rules,
--             cash_shifts, cash_expenses, order_item_costs, orders, tables).
--   rol authenticated con el user_id del local cuyo owner_email = 'tamalu026@gmail.com':
--             filas que ve de products y categories.
--
-- Qué esperar
--   - authenticated (dueño de Tama): filas_antes = filas_despues y > 0. Si baja, el cambio le rompería
--     el panel al dueño: NO aplicar.
--   - anon: filas_antes = filas_despues, sin error. Lo normal es que products/categories/extras
--     muestren lo que hoy es público (por una política que no menciona restaurants) y que las tablas
--     privadas (cash_*, coupons, orders, order_item_costs, discount_rules) den 0 antes y después.
--   - error_despues no nulo (por ejemplo "permission denied for table restaurants") en alguna tabla:
--     hay otra política que consulta restaurants y que anon sigue evaluando. NO aplicar hasta
--     pasarla a authenticated (ver la consulta "ANTES DE CORRER").
--   - ok = true solo si no hay error y filas_antes = filas_despues. Esperado: todas true.
--   - Si filas_antes es null, la medición de "antes" falló (ese error no se muestra, solo el de
--     después): ok queda en false.
--   - Si el script falla con 'no se encontró el dueño de Tama', el owner_email no existe en restaurants.
-- =============================================================================
-- drop table if exists _t_res;
-- create temp table _t_res (
--   tabla text, rol text, filas_antes int, filas_despues int, error_despues text
-- );
--
-- do $$
-- declare
--   v_uid  uuid;
--   v_t    text;
--   v_n    int;
--   v_e    text;
--   v_anon text[] := array['products', 'extras', 'categories', 'coupons', 'discount_rules',
--                          'cash_shifts', 'cash_expenses', 'order_item_costs', 'orders', 'tables'];
--   v_auth text[] := array['products', 'categories'];
-- begin
--   select user_id into v_uid from public.restaurants
--    where owner_email = 'tamalu026@gmail.com' and user_id is not null limit 1;
--   if v_uid is null then
--     raise exception 'no se encontró el dueño de Tama (owner_email = tamalu026@gmail.com)';
--   end if;
--
--   begin  -- sub-bloque "deshacer"
--
--     -- ===== ANTES =====
--     perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
--     foreach v_t in array v_anon loop
--       v_n := null;
--       begin
--         set local role anon;
--         execute format('select count(*) from public.%I', v_t) into v_n;
--       exception when others then
--         v_n := null;
--       end;
--       reset role;
--       insert into _t_res (tabla, rol, filas_antes) values (v_t, 'anon', v_n);
--     end loop;
--
--     perform set_config('request.jwt.claims',
--       json_build_object('sub', v_uid::text, 'role', 'authenticated')::text, true);
--     foreach v_t in array v_auth loop
--       v_n := null;
--       begin
--         set local role authenticated;
--         execute format('select count(*) from public.%I', v_t) into v_n;
--       exception when others then
--         v_n := null;
--       end;
--       reset role;
--       insert into _t_res (tabla, rol, filas_antes) values (v_t, 'authenticated', v_n);
--     end loop;
--
--     -- ===== APLICAR pasos 1 y 2 (se deshacen al final del sub-bloque) =====
--     alter policy "cash_expenses: dueño puede actualizar"       on public.cash_expenses to authenticated;
--     alter policy "cash_expenses: dueño puede borrar sus gastos" on public.cash_expenses to authenticated;
--     alter policy "cash_expenses: dueño puede insertar"         on public.cash_expenses to authenticated;
--     alter policy "cash_expenses: dueño puede leer sus gastos"  on public.cash_expenses to authenticated;
--     alter policy "cash_shifts: dueño puede actualizar"         on public.cash_shifts to authenticated;
--     alter policy "cash_shifts: dueño puede insertar"           on public.cash_shifts to authenticated;
--     alter policy "cash_shifts: dueño puede leer sus turnos"    on public.cash_shifts to authenticated;
--     alter policy "Owners manage categories"                    on public.categories to authenticated;
--     alter policy "Users can manage their own restaurant coupons" on public.coupons to authenticated;
--     alter policy "Dueño puede gestionar sus reglas"            on public.discount_rules to authenticated;
--     alter policy "oic: dueño puede leer"                       on public.order_item_costs to authenticated;
--     alter policy "Enable delete for owners"                    on public.products to authenticated;
--     alter policy "Enable insert for owners"                    on public.products to authenticated;
--     alter policy "Enable read access for owners"               on public.products to authenticated;
--     alter policy "Enable update for owners"                    on public.products to authenticated;
--     alter policy "Owner manage products"                       on public.products to authenticated;
--     alter policy "Owners manage products"                      on public.products to authenticated;
--     revoke select on public.restaurants from anon;
--
--     -- ===== DESPUÉS =====
--     perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
--     foreach v_t in array v_anon loop
--       v_n := null; v_e := null;
--       begin
--         set local role anon;
--         execute format('select count(*) from public.%I', v_t) into v_n;
--       exception when others then
--         v_e := sqlerrm;
--       end;
--       reset role;
--       update _t_res set filas_despues = v_n, error_despues = v_e
--        where tabla = v_t and rol = 'anon';
--     end loop;
--
--     perform set_config('request.jwt.claims',
--       json_build_object('sub', v_uid::text, 'role', 'authenticated')::text, true);
--     foreach v_t in array v_auth loop
--       v_n := null; v_e := null;
--       begin
--         set local role authenticated;
--         execute format('select count(*) from public.%I', v_t) into v_n;
--       exception when others then
--         v_e := sqlerrm;
--       end;
--       reset role;
--       update _t_res set filas_despues = v_n, error_despues = v_e
--        where tabla = v_t and rol = 'authenticated';
--     end loop;
--
--     raise exception 'deshacer' using errcode = 'ZZ001';
--   exception when sqlstate 'ZZ001' then
--     null;  -- esperado: deshace alter policy y revoke
--   end;
-- end $$;
--
-- -- UNA sentencia final (último comando del script)
-- select
--   tabla,
--   rol,
--   filas_antes,
--   filas_despues,
--   error_despues,
--   (error_despues is null and filas_antes is not null and filas_antes = filas_despues) as ok
-- from _t_res
-- order by rol, tabla;
