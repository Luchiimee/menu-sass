-- =============================================================================
-- 24 — tables: solo el dueño del local lee y gestiona sus mesas (se cierra la lectura y la escritura pública)
-- =============================================================================
-- BORRADOR. NO EJECUTADO. CORRER A MANO EN EL SQL EDITOR DE SUPABASE. No se ejecuta desde el código.
--
-- Problema (verificado en producción el 2026-11-10): public.tables tiene 5 políticas abiertas
--   "Permitir actualizar mesas a usuarios autenticados"  UPDATE  {authenticated}       using (true)
--   "Permitir borrar mesas a usuarios autenticados"      DELETE  {authenticated}       using (true)
--   "Permitir insertar mesas a usuarios autenticados"    INSERT  {authenticated}       with check (true)
--   "Ver mesas publicas"                                 SELECT  {public}              using (true)
--   "permitir_mozo"                                      UPDATE  {anon, authenticated} using (true) / with check (true)
--   Con la clave pública, cualquiera puede actualizar mesas de cualquier local (incluido marcar la llamada al
--   mozo de todas) y leerlas (con reservation_info: nombre, personas y nota de cada reserva). Cualquier usuario
--   logueado puede además insertar, editar y borrar mesas de cualquier local.
--
-- Por qué ya se puede (desplegado y probado el 2026-11-10 en main)
--   El cliente público ya no usa la clave pública sobre tables: lee con GET /api/public/tables y
--   GET /api/public/tables/[id], y llama al mozo con POST /api/public/table/call (los tres con service role, que
--   no pasa por estas políticas). El panel del dueño usa SU sesión: select, insert, update, delete y Realtime
--   sobre tables.
--
-- Qué hace (en una transacción: si algo falla, no se aplica nada)
--   1. Borra las 5 políticas de arriba (por su nombre exacto, sin "if exists": si alguno no coincide, el
--      drop falla y se deshace todo).
--   2. Crea "tables: dueño gestiona": ALL, to authenticated, using y with check iguales:
--        restaurant_id in (select r.id from public.restaurants r where r.user_id = auth.uid())
--   Después de esto:
--     - anon: no lee ni escribe tables (0 filas / permission denied).
--     - un usuario logueado: solo ve y gestiona las mesas de SUS locales (restaurants.user_id = auth.uid()).
--     - el dueño: sigue creando, renombrando, borrando, reservando y apagando la alarma desde el panel, y
--       recibe los cambios por Realtime (la política de SELECT que necesita Realtime es la misma).
--     - service_role (endpoints /api/public/*) pasa sin cambios.
--
-- OJO antes de aplicar
--   1) Pestañas viejas (cargadas antes del deploy del cliente nuevo): un cliente con esa versión lee tables con
--      la clave pública. Sin la lectura, el selector de mesas queda vacío y, en un QR de mesa, la etiqueta no
--      aparece y no se puede enviar el pedido; "Llamar mozo" de esa pestaña afecta 0 filas SIN error y avisaría
--      "El mozo fue notificado" sin que llegue nada. Esperar varias horas desde el deploy.
--   2) Un SuperAdmin que edite mesas de locales ajenos desde el panel dejará de poder (la política mira
--      restaurants.user_id). Si hace falta, se agrega una política para admins aparte.
--   3) Otros lectores anónimos de tables que no estén en este repo (integración, script): no los conozco.
--      Revisar los logs de la API de Supabase (rol anon, tabla tables) antes de aplicar.
--   4) NO usar bloques DO con DDL dentro de sub-bloques como "prueba": en extras (script 20) la política
--      quedó aplicada sin haber corrido el script real. Este archivo no trae ninguno.
--
-- Orden recomendado: 1) consultas "ANTES DE CORRER" y guardar el resultado; 2) aplicar; 3) verificación posterior;
--   4) prueba en pantalla.
-- =============================================================================

-- =============================================================================
-- ANTES DE CORRER (SOLO LECTURA, comentado)
--   (a) definición exacta de las políticas de tables. GUARDAR el resultado: sirve para recrear cualquiera si
--       hiciera falta. Esperado: las 5 de arriba, con los nombres escritos tal cual en el script real.
--   (b) filas de tables sin local o con un local que no existe: con la política nueva ningún dueño podría
--       verlas ni editarlas. Esperado: 0. Si da más de 0, NO aplicar: decidir qué hacer con esas filas.
-- =============================================================================
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename = 'tables'
-- order by policyname;
--
-- select count(*) as filas_sin_local
-- from public.tables t
-- left join public.restaurants r on r.id = t.restaurant_id
-- where t.restaurant_id is null or r.id is null;

begin;

drop policy "Permitir actualizar mesas a usuarios autenticados" on public.tables;
drop policy "Permitir borrar mesas a usuarios autenticados" on public.tables;
drop policy "Permitir insertar mesas a usuarios autenticados" on public.tables;
drop policy "Ver mesas publicas" on public.tables;
drop policy "permitir_mozo" on public.tables;

create policy "tables: dueño gestiona"
  on public.tables
  for all
  to authenticated
  using (
    restaurant_id in (select r.id from public.restaurants r where r.user_id = auth.uid())
  )
  with check (
    restaurant_id in (select r.id from public.restaurants r where r.user_id = auth.uid())
  );

commit;

-- =============================================================================
-- ROLLBACK DE EMERGENCIA (descomentar y correr si algo se rompe)
-- Vuelve a las 5 políticas originales tal cual estaban y borra la nueva. Si la consulta previa (a) mostró
-- definiciones distintas de estas, usar las guardadas.
-- (Una política UPDATE o DELETE sin "with check" usa el "using" también para comprobar la fila nueva.)
-- =============================================================================
-- begin;
--   drop policy "tables: dueño gestiona" on public.tables;
--
--   create policy "Permitir actualizar mesas a usuarios autenticados"
--     on public.tables
--     for update
--     to authenticated
--     using (true);
--
--   create policy "Permitir borrar mesas a usuarios autenticados"
--     on public.tables
--     for delete
--     to authenticated
--     using (true);
--
--   create policy "Permitir insertar mesas a usuarios autenticados"
--     on public.tables
--     for insert
--     to authenticated
--     with check (true);
--
--   create policy "Ver mesas publicas"
--     on public.tables
--     for select
--     to public
--     using (true);
--
--   create policy "permitir_mozo"
--     on public.tables
--     for update
--     to anon, authenticated
--     using (true)
--     with check (true);
-- commit;

-- =============================================================================
-- VERIFICACIÓN POSTERIOR (SOLO LECTURA, comentado): correr después de aplicar.
-- Esperado: UNA sola fila:
--   "tables: dueño gestiona"   ALL   {authenticated}   using y with_check con la subconsulta de restaurants
-- y ninguna de las 5 anteriores.
-- =============================================================================
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename = 'tables'
-- order by policyname;
--
-- Lectura como anon con la clave pública (desde una terminal; NO pegar la clave en ningún chat ni archivo).
-- Reemplazar <PROYECTO> y <ANON_KEY> por los de NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY:
--   curl -s "https://<PROYECTO>.supabase.co/rest/v1/tables?select=id,name&limit=5" \
--        -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
-- Esperado: [] (0 filas) o un error 42501 "permission denied". Antes de aplicar devolvía las mesas de todos los
-- locales. (No probar escrituras con la clave pública sobre datos reales.)

-- =============================================================================
-- PRUEBA EN PANTALLA (después de aplicar; sin DO ni DDL de prueba)
--   1. Menú público: abrir snappy.uno/burgersnappy?mesa=<id de una mesa> en una ventana nueva (sin sesión). La
--      etiqueta de la mesa aparece. Agregar un producto y enviar un pedido de mesa de prueba (solo con
--      autorización, local y medio de pago acordados). Con el seguimiento visible, tocar "Llamar mozo": debe
--      mostrar "El mozo fue notificado" (ahora por POST /api/public/table/call).
--   2. Panel del dueño (snappy.uno/dashboard/orders, con su sesión): la alarma de esa mesa aparece por Realtime
--      sin recargar; apagarla con "ATENDIDO — APAGAR LLAMADO".
--   3. En el mismo panel: crear una mesa nueva de prueba, renombrarla y borrarla (solo esa). Las tres
--      operaciones tienen que funcionar; si alguna falla, correr el ROLLBACK.
--   4. Red del navegador en el menú público: ninguna GET a supabase.co/rest/v1/tables (ni 401/403 de esa tabla).
--   Si falla el paso 1 o el panel no puede crear, renombrar o borrar mesas: correr el ROLLBACK.
-- =============================================================================
