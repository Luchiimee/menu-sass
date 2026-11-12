-- =============================================================================
-- 25 — snappylinks: solo el dueño del local crea y modifica su bio (se cierra la escritura pública)
-- =============================================================================
-- BORRADOR. NO EJECUTADO.
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE. No se ejecuta desde el código.
--
-- Problema (verificado en producción): public.snappylinks tiene dos políticas de escritura abiertas
--   "Permitir actualizar a todos"   UPDATE  {public}  using (true)
--   "Permitir insertar a todos"     INSERT  {public}  with check (true)
-- y dos políticas de lectura pública con using (true). Con la clave pública, cualquiera puede crear o
-- modificar la bio (SnappyLinks) de cualquier local: título, links, colores, imágenes y el slug público.
--
-- Por qué ya se puede
--   En el repo, la clave pública no escribe snappylinks en ningún flujo. Escribe solo:
--     - app/dashboard/personalizar/page.tsx (~:839): upsert con la SESIÓN del dueño, onConflict restaurant_id,
--       del local cargado por user_id.
--     - app/api/admin/delete-user/route.ts (~:37): delete con service role (no pasa por RLS).
--   Lee:
--     - personalizar (~:526): select con la sesión del dueño, por restaurant_id.
--     - app/api/public/menu/[slug]/route.ts (~:71): service role (el menú público ya no usa la clave pública).
--     - app/admin/snappy/page.tsx (~:41): sesión del admin; descarta el resultado.
--
-- Qué hace (en una transacción: si algo falla, no se aplica nada)
--   1. Borra las dos políticas de escritura abiertas por su nombre exacto, sin "if exists": si un nombre no
--      coincide, el drop falla y se deshace todo.
--   2. Crea "snappylinks: dueño gestiona": ALL, to authenticated, using y with check iguales:
--        restaurant_id in (select r.id from public.restaurants r where r.user_id = auth.uid())
--   Las dos políticas de lectura pública NO se tocan: la lectura sigue como está.
--   Después de esto:
--     - anon: puede leer (como hoy) pero no insertar, actualizar ni borrar.
--     - un usuario logueado: solo crea, edita y borra la bio de SU local. Puede además leer todas (lectura pública).
--     - el dueño: sigue guardando la bio desde Personalizar (el upsert pasa por with check en el insert y por
--       using en el update; para el conflicto necesita leer la fila, y la lectura pública se mantiene).
--     - el slug duplicado sigue dando 23505 (lo da el índice único, también con filas de otros locales).
--     - service_role (menú público, delete-user) pasa sin cambios.
--
-- OJO antes de aplicar
--   1) Escritores que no estén en este repo (integración, script, función de la base): no los conozco.
--      Revisar los logs de la API de Supabase (rol anon, tabla snappylinks, métodos POST/PATCH).
--   2) Triggers o funciones que escriban snappylinks (por ejemplo al registrarse un local): no se ven en el repo.
--      Si corren como SECURITY INVOKER con el rol del usuario, la política nueva los afecta; con SECURITY DEFINER no.
--   3) Filas con restaurant_id nulo o de un local que no existe: ningún dueño podría editarlas (solo service role).
--      Ver la consulta (d). Si da más de 0, decidir qué hacer antes de aplicar.
--   4) Un SuperAdmin que edite bios de locales ajenos con su sesión dejará de poder. Hoy el repo no lo hace:
--      Personalizar carga el local por user_id de la sesión.
--   5) Si hay una política DELETE o ALL en snappylinks que no figure acá, la consulta (a) la muestra: revisarla.
--   6) NO usar bloques DO con DDL dentro de sub-bloques como "prueba": en extras (script 20) la política quedó
--      aplicada sin haber corrido el script real. Este archivo no trae ninguno.
--
-- Orden recomendado: 1) consultas "ANTES DE CORRER" y guardar el resultado; 2) aplicar; 3) verificación posterior;
--   4) prueba en pantalla.
-- =============================================================================

-- =============================================================================
-- ANTES DE CORRER (SOLO LECTURA, comentado)
--   (a) políticas de snappylinks, definición exacta. GUARDAR el resultado: sirve para recrear cualquiera si
--       hiciera falta. Esperado: "Permitir actualizar a todos" (UPDATE, public, using true), "Permitir insertar a
--       todos" (INSERT, public, with check true) y dos de lectura pública (SELECT, using true). Si aparece otra
--       (DELETE o ALL), revisarla antes de seguir.
--   (b) RLS activo. Esperado: relrowsecurity = true. Si da false, las políticas no se aplican y hay que
--       revisarlo antes de seguir.
--   (c) unicidad: índices sobre snappylinks. Esperado: uno único sobre restaurant_id (lo necesita el upsert con
--       onConflict) y uno único sobre slug (da el 23505 por slug repetido).
--   (d) filas sin local o con un local que no existe. Esperado: 0.
--   (e) cantidad de filas, para comparar después.
-- =============================================================================
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename = 'snappylinks'
-- order by policyname;
--
-- select relname, relrowsecurity, relforcerowsecurity
-- from pg_class
-- where oid = 'public.snappylinks'::regclass;
--
-- select indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public' and tablename = 'snappylinks'
-- order by indexname;
--
-- select count(*) as filas_sin_local
-- from public.snappylinks s
-- left join public.restaurants r on r.id = s.restaurant_id
-- where s.restaurant_id is null or r.id is null;
--
-- select count(*) as filas_total from public.snappylinks;

begin;

drop policy "Permitir actualizar a todos" on public.snappylinks;
drop policy "Permitir insertar a todos" on public.snappylinks;

create policy "snappylinks: dueño gestiona"
  on public.snappylinks
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
-- Borra la política nueva y vuelve a crear las dos abiertas tal cual estaban. Si la consulta previa (a) mostró
-- definiciones distintas de estas, usar las guardadas.
-- (Una política UPDATE sin "with check" usa el "using" también para comprobar la fila nueva.)
-- =============================================================================
-- begin;
--   drop policy "snappylinks: dueño gestiona" on public.snappylinks;
--
--   create policy "Permitir actualizar a todos"
--     on public.snappylinks
--     for update
--     to public
--     using (true);
--
--   create policy "Permitir insertar a todos"
--     on public.snappylinks
--     for insert
--     to public
--     with check (true);
-- commit;

-- =============================================================================
-- VERIFICACIÓN POSTERIOR (SOLO LECTURA, comentado): correr después de aplicar.
-- Esperado: TRES filas: las dos de lectura pública (SELECT, using true) sin cambios y
--   "snappylinks: dueño gestiona"   ALL   {authenticated}   using y with_check con la subconsulta de restaurants
-- y ninguna de las dos de escritura abiertas.
-- =============================================================================
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename = 'snappylinks'
-- order by policyname;
--
-- select count(*) as filas_total from public.snappylinks;   -- igual que en (e)
--
-- Lectura como anon con la clave pública (desde una terminal; NO pegar la clave en ningún chat ni archivo).
-- Reemplazar <PROYECTO> y <ANON_KEY> por los de NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY:
--   curl -s "https://<PROYECTO>.supabase.co/rest/v1/snappylinks?select=slug&limit=3" \
--        -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
-- Esperado: filas (la lectura pública se mantiene). NO probar escrituras con la clave pública sobre datos reales:
-- la ausencia de las políticas de escritura abiertas se comprueba con pg_policies.

-- =============================================================================
-- PRUEBA EN PANTALLA (después de aplicar; sin DO ni DDL de prueba). Con una cuenta de dueño de prueba.
--   a. Panel (snappy.uno/dashboard/personalizar, con su sesión): en la pestaña SnappyLinks cambiar el título de
--      la bio y tocar Guardar. Tiene que salir el modal de éxito.
--   b. Recargar Personalizar: el cambio sigue ahí (lectura con la sesión del dueño).
--   c. Abrir el link público de la bio en una ventana sin sesión: muestra el cambio (lo lee el servidor).
--   d. Con un local sin bio (cuenta de prueba nueva), guardar en Personalizar: crea la fila (camino insert del
--      upsert) y la bio aparece.
--   e. Poner en la bio el slug de OTRO local: tiene que mostrar "Ese link de SnappyLinks ya está en uso" (23505),
--      no un error de permisos.
--   f. Red del navegador en Personalizar: ninguna respuesta 401, 403 ni 42501 sobre snappylinks. Y snappy.uno/
--      admin/snappy (con el admin) sigue cargando.
--   Si falla a, b o d: correr el ROLLBACK.
-- =============================================================================
