-- =============================================================================
-- 21 — product_extras: solo el dueño del producto puede insertar, editar y borrar vínculos
-- =============================================================================
-- EJECUTADO en producción el 2026-11-10; verificado con pg_policies y probado en el panel de Burgers Snappy.
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE. No se ejecuta desde el código.
--
-- Problema (verificado en la base)
--   - "Dueños pueden editar product_extras": cmd ALL, rol {public}, using auth.role() = 'authenticated'.
--     Cualquier usuario logueado puede vincular o desvincular extras de productos de cualquier local.
--   - "Product Extras son públicos": cmd SELECT, using true. La lectura pública del menú depende de
--     esta y NO se toca.
--
-- Qué es product_extras (según el código)
--   Columnas usadas: product_id y extra_id (un renglón = "este extra aplica a este producto").
--   - Escribe el panel con sesión de dueño, en app/dashboard/products/page.tsx al guardar un producto
--     (líneas 352 y 354): delete .eq('product_id', productId) y después insert de
--     [{ product_id, extra_id }, ...]. Antes el producto ya existe (se inserta o actualiza arriba).
--   - Lee el panel (línea 184: select extra_id .eq('product_id', ...)), el menú público como relación
--     embebida desde extras (app/[slug]/page.tsx: product_extras (product_id)) y el servidor en
--     lib/checkoutPricing.ts (product_id, extra_id). Ninguna lectura depende de esta política de
--     escritura.
--
-- Qué hace (en una transacción: si algo falla, no se aplica nada)
--   1. Borra "Dueños pueden editar product_extras".
--   2. Crea "product_extras: dueño gestiona": ALL, to authenticated, using y with check iguales:
--        product_id in (select p.id from public.products p
--                       where p.restaurant_id in (select r.id from public.restaurants r
--                                                 where r.user_id = auth.uid()))
--   Lectura: "Product Extras son públicos" sigue dando SELECT a anon y a authenticated; la política
--   nueva también da SELECT al dueño sobre sus filas (redundante, inocuo).
--   No cambia datos ni toca extras (ver 20_extras_owner_policy.sql).
--
--   Límite conocido: la política controla el producto, no el extra. Un dueño podría vincular su
--   producto con un extra_id de otro local si lo conociera (el vínculo no le da nada sobre ese extra).
--   Si se quiere cerrar, agregar al with check que el extra sea del mismo local.
--
-- Orden recomendado: 1) consulta "ANTES DE CORRER"; 2) aplicar; 3) consulta de verificación;
--   4) prueba en pantalla.
-- =============================================================================

-- =============================================================================
-- ANTES DE CORRER (SOLO LECTURA, comentado)
--   (a) políticas actuales de product_extras. Esperado: las dos de arriba.
--   (b) filas que con la política nueva ningún dueño podría editar: product_id que no existe en
--       products, o producto sin restaurant_id. Esperado: 0 filas. Si hay filas, decidir qué hacer
--       (borrarlas o asignarles restaurant_id al producto) antes de aplicar.
-- =============================================================================
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename = 'product_extras'
-- order by policyname;
--
-- select pe.*
-- from public.product_extras pe
-- left join public.products p on p.id = pe.product_id
-- where p.id is null or p.restaurant_id is null;

begin;

drop policy "Dueños pueden editar product_extras" on public.product_extras;

create policy "product_extras: dueño gestiona"
  on public.product_extras
  for all
  to authenticated
  using (
    product_id in (
      select p.id from public.products p
      where p.restaurant_id in (select r.id from public.restaurants r where r.user_id = auth.uid())
    )
  )
  with check (
    product_id in (
      select p.id from public.products p
      where p.restaurant_id in (select r.id from public.restaurants r where r.user_id = auth.uid())
    )
  );

commit;

-- =============================================================================
-- ROLLBACK DE EMERGENCIA (descomentar y correr si algo se rompe)
-- Devuelve la política anterior tal cual estaba: ALL, {public}, auth.role() = 'authenticated'
-- (sin with check: en una política ALL, sin with check se usa el using).
-- =============================================================================
-- begin;
--   drop policy "product_extras: dueño gestiona" on public.product_extras;
--   create policy "Dueños pueden editar product_extras"
--     on public.product_extras
--     for all
--     to public
--     using (auth.role() = 'authenticated');
-- commit;

-- =============================================================================
-- VERIFICACIÓN POSTERIOR (SOLO LECTURA, comentado): correr después de aplicar.
-- Esperado: dos filas.
--   "Product Extras son públicos"        SELECT  {public}         using true
--   "product_extras: dueño gestiona"     ALL     {authenticated}  using y with_check con la subconsulta
--   Y ninguna "Dueños pueden editar product_extras".
-- =============================================================================
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename = 'product_extras'
-- order by policyname;

-- =============================================================================
-- PRUEBA EN PANTALLA (después de aplicar; sin DO ni DDL de prueba)
-- Con la sesión del dueño de un local (por ejemplo Tama), en /dashboard/products:
--   1. Pestaña Extras: crear un adicional nuevo, editarlo (nombre y precio) y borrarlo
--      (eso prueba la política de 20_extras_owner_policy.sql si ya está aplicada).
--   2. Crear o editar un producto, tildar uno o dos extras y guardar. Reabrir el producto: los extras
--      tildados tienen que seguir ahí (el panel borra los vínculos y los inserta de nuevo).
--   3. Destildar un extra, guardar y reabrir: tiene que haber desaparecido.
--   4. Abrir el menú público del local: el producto muestra sus extras como antes (lectura pública).
--   5. Con la sesión de OTRO dueño (otro local), intentar lo mismo sobre un producto ajeno no es
--      posible desde el panel (solo lista los suyos); si se quiere probar a mano, un insert o delete
--      sobre product_extras de un producto de otro local por la API REST con ese usuario tiene que dar
--      42501 (insert) o 0 filas afectadas (delete).
-- OJO: el panel NO revisa el error de product_extras (líneas 352 a 355): si la política bloqueara al
-- dueño, el guardado parecería exitoso y los extras simplemente no quedarían vinculados. Por eso el paso
-- 2 (reabrir el producto) es la prueba que importa. Si falla: correr el ROLLBACK.
-- =============================================================================
