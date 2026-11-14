-- =============================================================================
-- 27 — orders: trigger que protege el insert público y solicitar_pago_mesa endurecida
-- =============================================================================
-- APLICADO en producción el 2026-11-13 (las dos piezas, A y B) y PROBADO en producción con el local Burgers Snappy:
--   un pedido de RETIRO y uno de MESA enviados desde el menú público entraron (POST a orders 201) con status
--   'pendiente', payment_status 'pendiente', pago_confirmado false y turno asignado; el pago de mesa por
--   solicitar_pago_mesa funciona. La pieza A de este archivo es la versión APLICADA (SECURITY DEFINER, ver abajo).
-- Dos piezas independientes (A y B), cada una con su transacción y su rollback: se aplican de a una.
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE. No se ejecuta desde el código.
--
-- Problema (verificado en producción)
--   1) Insert público. orders acepta INSERT de anon y authenticated con "with check (true)" (políticas "Permitir
--      crear pedidos" y "public_insert_orders"). Con la clave pública cualquiera puede insertar un pedido con los
--      campos que quiera: status 'completado' (entra a la caja), pago_confirmado = true, payment_status 'pagado',
--      un shift_id de otro local, un order_type 'apertura' o 'mostrador', un payment_method inventado.
--      Hechos de la base: status default 'pendiente'; payment_status default 'pendiente' (no null);
--      pago_confirmado boolean NOT NULL default false; sin CHECK constraints; status reales: pendiente, recibido,
--      en_proceso, en_camino, entregado, completado, cancelado.
--   2) solicitar_pago_mesa(p_order_id uuid, p_method text, p_payer_name text) es SECURITY DEFINER SIN search_path y
--      solo valida que el pedido exista y no esté completado/cancelado: cualquiera con un id de pedido puede
--      poner payment_status = 'esperando_confirmacion' en pedidos que no son de mesa, en cualquier estado
--      intermedio y también sobre uno ya 'pagado', con un método cualquiera y un nombre de largo libre.
--
-- Qué hace
--   PIEZA A: función public.protect_orders_insert() (SECURITY DEFINER, search_path = public) y trigger
--     orders_01_protect_insert BEFORE INSERT FOR EACH ROW. Es DEFINER porque anon no puede leer cash_shifts ni
--     restaurants: con SECURITY INVOKER los "exists" de abajo se evalúan con el RLS del que inserta y darían
--     falso (todos los pedidos públicos quedarían sin turno). Con DEFINER la función corre como su dueño, así que
--     current_user deja de ser 'anon' o 'authenticated' y NO sirve para saber quién inserta: el rol se lee de
--     auth.role() (el claim del JWT de la petición). Solo actúa si coalesce(auth.role(), '') es 'authenticated'
--     o 'anon' y quien inserta NO es dueño del local (no existe restaurants con id = new.restaurant_id y
--     user_id = auth.uid()). En ese caso:
--       - new.status := 'pendiente'; new.payment_status := 'pendiente'; new.pago_confirmado := false
--       - RAISE EXCEPTION si order_type no está en ('delivery','retiro','mesa') o es null
--       - RAISE EXCEPTION si payment_method no está en ('efectivo','transferencia','mercadopago') o es null
--       - new.shift_id := null si no existe cash_shifts con ese id y restaurant_id = new.restaurant_id
--     El dueño (insert con su sesión: apertura de caja, venta manual), service_role (webhook de Mercado Pago, que
--     inserta pago_confirmado = true y payment_status 'pagado') y postgres (auth.role() null o distinto de anon y
--     authenticated) pasan sin cambios.
--     Como la función es DEFINER, se le quita el EXECUTE a public, anon y authenticated: solo la dispara el
--     trigger (los privilegios de una función de trigger se comprueban al crear el trigger, no al dispararlo).
--     El flujo del cliente no cambia: CartFooter ya manda status 'pendiente', order_type delivery/retiro/mesa y payment_method
--     efectivo/transferencia/mercadopago, y no manda payment_status ni pago_confirmado.
--   PIEZA B: create or replace function public.solicitar_pago_mesa con set search_path = public:
--       - p_method debe ser 'efectivo', 'tarjeta' o 'transferencia' (si no, error)
--       - payer_name = left(coalesce(p_payer_name, ''), 100)
--       - un solo UPDATE ... WHERE id = p_order_id AND order_type = 'mesa' AND status IN ('en_proceso','entregado')
--         AND payment_status IS DISTINCT FROM 'pagado'. Se permite reenviar si ya estaba 'esperando_confirmacion'
--         (el cliente puede cambiar de método); solo se bloquea 'pagado'.
--       - si el UPDATE no toca ninguna fila: RAISE EXCEPTION 'Pedido no encontrado o no admite pago'
--       - revoke execute ... from public; grant execute ... to anon, authenticated, service_role
--     Nunca toca status, pago_confirmado ni total.
--   get_or_create_shift NO se toca en este script.
--
-- Lo que este script NO cubre (etapa 2)
--   a) El total lo manda el cliente. El trigger no recalcula total, delivery_cost ni discount_amount a partir de
--      los productos: con la clave pública se puede insertar un pedido con un total falso (por ejemplo 1) y
--      items cualquiera. Cierra solo el estado, el pago, el turno, el order_type y el payment_method.
--   b) get_or_create_shift sigue abierta a anon (EXECUTE para anon, SECURITY DEFINER): con un restaurant_id
--      conocido cualquiera puede crear o reutilizar el turno de caja de ese local. Lo usa CartFooter desde el
--      navegador anónimo. Pendiente: que el trigger asigne el turno del lado del servidor y revocar anon.
--   c) Otros campos del insert público no se validan (customer_name, address, description, items, coupon_code,
--      discount_amount, scheduled_delivery_time, origin_plan) ni hay límite de pedidos por IP.
--
-- OJO (ya considerado al aplicar)
--   1) PIEZA A, SECURITY DEFINER: anon no puede leer cash_shifts ni restaurants (consulta (d)). Un trigger
--      SECURITY INVOKER evaluaría los "exists" con ese RLS, daría falso y dejaría TODOS los pedidos públicos con
--      shift_id null (sin turno, fuera de la caja) y trataría al dueño como cliente. Por eso la función es
--      DEFINER. Consecuencias: (i) current_user ya no sirve (es el dueño de la función), se usa
--      coalesce(auth.role(), ''); (ii) hay que fijar search_path = public y quitar el EXECUTE a public, anon y
--      authenticated, para que nadie la llame directo por la API (/rest/v1/rpc); (iii) el trigger sigue
--      funcionando sin esos permisos.
--   2) PIEZA A, order_type: se rechaza todo order_type distinto de delivery, retiro y mesa para anon y
--      authenticated no dueño. Si algún flujo público manda otro valor (el repo no lo hace: CartFooter ofrece solo
--      esos tres), ese pedido falla. Ver la consulta (e).
--   3) PIEZA B, tipo de retorno: create or replace NO puede cambiar el tipo de retorno. Acá se declara
--      "returns void". Comparar con la consulta (a) ("Result data type" / pg_get_function_result). Si no es void,
--      ajustar la línea "returns" de la función nueva Y la del rollback antes de correr.
--   4) PIEZA B, estados: la UI muestra los botones de pago de mesa con el pedido 'entregado' o 'completado'
--      (CartFooter ~:939), pero la función nueva solo acepta 'en_proceso' y 'entregado'. Con 'completado' el pago
--      ya no se puede solicitar (hoy tampoco: la función actual rechaza completado y cancelado). El cliente verá
--      "No se pudo procesar la solicitud de pago." (alert).
--   5) PIEZA B, grants: hoy la función tiene el EXECUTE por defecto para PUBLIC. Guardar el resultado de (b) para
--      el rollback.
--   6) Triggers existentes sobre orders y otras funciones o integraciones que inserten orders con anon o
--      authenticated y no estén en este repo: no los conozco. Ver (c) y los logs de la API de Supabase.
--   7) NO usar bloques DO con DDL dentro de sub-bloques como "prueba": en extras (script 20) la política quedó
--      aplicada sin haber corrido el script real. Este archivo no trae ninguno.
--
-- Orden recomendado: 1) consultas "ANTES DE CORRER" y guardar el resultado; 2) aplicar la PIEZA A; 3) verificación
--   posterior A y prueba en pantalla; 4) aplicar la PIEZA B; 5) verificación posterior B y prueba en pantalla.
-- =============================================================================

-- =============================================================================
-- ANTES DE CORRER (SOLO LECTURA, comentado)
--   (a) definición actual de solicitar_pago_mesa (cuerpo, tipo de retorno, security definer, search_path en
--       proconfig). GUARDAR el resultado: sirve para el rollback de la pieza B. Esperado: SECURITY DEFINER, sin
--       search_path, validación EXISTS con status NOT IN ('completado','cancelado') y UPDATE de payment_method,
--       payer_name y payment_status = 'esperando_confirmacion'.
--   (b) permisos de ejecución (proacl) de solicitar_pago_mesa. GUARDAR el resultado.
--   (c) triggers actuales de orders. Esperado: ninguno con nombre "orders_01_protect_insert"; revisar cualquier
--       otro que escriba status, payment_status, pago_confirmado o shift_id.
--   (d) políticas SELECT de cash_shifts y restaurants. Con la pieza A como SECURITY DEFINER no hace falta que
--       anon las lea (ver "OJO" 1); la consulta sirve para confirmar por qué es DEFINER.
--   (e) valores reales de order_type y payment_method en orders, para ver qué no entraría. Solo agregados.
--       Los order_type 'apertura' y 'mostrador' los inserta el dueño (pasan) y los de Mercado Pago son
--       'mercadopago' en payment_method (pasa).
--   (f) línea base: pedidos y pedidos sin turno, para comparar después.
-- =============================================================================
-- select p.proname, pg_get_function_identity_arguments(p.oid) as args, pg_get_function_result(p.oid) as retorno,
--        p.prosecdef as security_definer, p.proconfig, pg_get_functiondef(p.oid) as definicion
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname = 'solicitar_pago_mesa';
--
-- select p.proname, p.proacl
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname = 'solicitar_pago_mesa';
--
-- select tgname, tgenabled, pg_get_triggerdef(oid) as definicion
-- from pg_trigger
-- where tgrelid = 'public.orders'::regclass and not tgisinternal
-- order by tgname;
--
-- select tablename, policyname, cmd, roles, qual
-- from pg_policies
-- where schemaname = 'public' and tablename in ('cash_shifts', 'restaurants') and cmd in ('SELECT', 'ALL')
-- order by tablename, policyname;
--
-- select order_type, payment_method, count(*) as pedidos
-- from public.orders
-- group by order_type, payment_method
-- order by pedidos desc;
--
-- select count(*) as pedidos_total, count(*) filter (where shift_id is null) as pedidos_sin_turno
-- from public.orders;

-- =============================================================================
-- PIEZA A — trigger que protege el insert público de orders
-- =============================================================================
begin;

create or replace function public.protect_orders_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo los roles de la API pública (claim del JWT: con SECURITY DEFINER current_user es el dueño de la función);
  -- service_role, postgres y demás pasan sin cambios
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    -- El dueño del local inserta con su sesión (apertura de caja, venta manual): sin cambios
    if not exists (
      select 1
      from public.restaurants r
      where r.id = new.restaurant_id
        and r.user_id = auth.uid()
    ) then
      if new.order_type is null or new.order_type not in ('delivery', 'retiro', 'mesa') then
        raise exception 'order_type inválido';
      end if;
      if new.payment_method is null or new.payment_method not in ('efectivo', 'transferencia', 'mercadopago') then
        raise exception 'payment_method inválido';
      end if;

      -- Valores iniciales: el cliente no decide estado ni pago
      new.status := 'pendiente';
      new.payment_status := 'pendiente';
      new.pago_confirmado := false;

      -- El turno tiene que ser de ese mismo local; si no, el pedido queda sin turno
      if new.shift_id is not null and not exists (
        select 1
        from public.cash_shifts s
        where s.id = new.shift_id
          and s.restaurant_id = new.restaurant_id
      ) then
        new.shift_id := null;
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_orders_insert() from public, anon, authenticated;

create trigger orders_01_protect_insert
  before insert on public.orders
  for each row
  execute function public.protect_orders_insert();

commit;

-- =============================================================================
-- ROLLBACK DE EMERGENCIA — PIEZA A (descomentar y correr si algo se rompe)
-- Borra el trigger y la función: el insert público vuelve a aceptar lo que mande el cliente.
-- =============================================================================
-- begin;
--   drop trigger orders_01_protect_insert on public.orders;
--   drop function public.protect_orders_insert();
-- commit;

-- =============================================================================
-- VERIFICACIÓN POSTERIOR — PIEZA A (SOLO LECTURA, comentado): correr después de aplicar.
-- Esperado: (a) una fila, tgenabled = 'O', BEFORE INSERT FOR EACH ROW; (b) security_definer = true, proconfig
-- con search_path=public y proacl SIN anon, authenticated ni PUBLIC (sin "=X/..."); (c) igual que antes de
-- aplicar o más (los pedidos nuevos), y pedidos_sin_turno sin subir de golpe: si cada pedido nuevo del menú
-- público aparece sin turno, correr el ROLLBACK.
-- =============================================================================
-- select tgname, tgenabled, pg_get_triggerdef(oid) as definicion
-- from pg_trigger
-- where tgrelid = 'public.orders'::regclass and not tgisinternal and tgname = 'orders_01_protect_insert';
--
-- select p.proname, p.prosecdef as security_definer, p.proconfig, p.proacl
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname = 'protect_orders_insert';
--
-- select count(*) as pedidos_total, count(*) filter (where shift_id is null) as pedidos_sin_turno
-- from public.orders;
--
-- Pedidos de las últimas 2 horas (solo agregados): nada con pago_confirmado = true que no sea mercadopago.
-- select payment_method, status, payment_status, pago_confirmado, count(*) as pedidos,
--        count(*) filter (where shift_id is null) as sin_turno
-- from public.orders
-- where created_at > now() - interval '2 hours'
-- group by 1, 2, 3, 4
-- order by pedidos desc;

-- =============================================================================
-- PIEZA B — solicitar_pago_mesa endurecida
-- =============================================================================
begin;

create or replace function public.solicitar_pago_mesa(p_order_id uuid, p_method text, p_payer_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  if p_method is null or p_method not in ('efectivo', 'tarjeta', 'transferencia') then
    raise exception 'Método de pago inválido';
  end if;

  update public.orders
     set payment_method = p_method,
         payer_name = left(coalesce(p_payer_name, ''), 100),
         payment_status = 'esperando_confirmacion'
   where id = p_order_id
     and order_type = 'mesa'
     and status in ('en_proceso', 'entregado')
     and payment_status is distinct from 'pagado';

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Pedido no encontrado o no admite pago';
  end if;
end;
$$;

revoke execute on function public.solicitar_pago_mesa(uuid, text, text) from public;
grant execute on function public.solicitar_pago_mesa(uuid, text, text) to anon, authenticated, service_role;

commit;

-- =============================================================================
-- ROLLBACK DE EMERGENCIA — PIEZA B (descomentar y correr si algo se rompe)
-- Recrea la definición actual tal cual: SECURITY DEFINER, SIN search_path, valida solo que el pedido exista y
-- no esté completado/cancelado, y pone payment_method, payer_name y payment_status = 'esperando_confirmacion'.
-- Si la consulta previa (a) mostró otro texto (mensaje de error, tipo de retorno), usar el guardado.
-- Los permisos vuelven al EXECUTE por defecto para PUBLIC; si (b) mostró otra cosa, usar lo guardado.
-- =============================================================================
-- begin;
--   create or replace function public.solicitar_pago_mesa(p_order_id uuid, p_method text, p_payer_name text)
--   returns void
--   language plpgsql
--   security definer
--   as $$
--   begin
--     if not exists (
--       select 1
--       from public.orders
--       where id = p_order_id
--         and status not in ('completado', 'cancelado')
--     ) then
--       raise exception 'Pedido no encontrado o ya finalizado';
--     end if;
--
--     update public.orders
--        set payment_method = p_method,
--            payer_name = p_payer_name,
--            payment_status = 'esperando_confirmacion'
--      where id = p_order_id;
--   end;
--   $$;
--
--   -- create or replace reemplaza también la configuración: la función vuelve a quedar sin search_path.
--   grant execute on function public.solicitar_pago_mesa(uuid, text, text) to public;
-- commit;

-- =============================================================================
-- VERIFICACIÓN POSTERIOR — PIEZA B (SOLO LECTURA, comentado): correr después de aplicar.
-- Esperado: security_definer = true, proconfig con search_path=public, definición con los tres estados y el
-- left(..., 100); proacl SIN "=X/..." (sin PUBLIC) y con anon, authenticated y service_role.
-- =============================================================================
-- select p.proname, pg_get_function_result(p.oid) as retorno, p.prosecdef as security_definer, p.proconfig,
--        p.proacl, pg_get_functiondef(p.oid) as definicion
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname = 'solicitar_pago_mesa';

-- =============================================================================
-- PRUEBA EN PANTALLA (después de aplicar cada pieza; sin DO ni DDL de prueba). Solo con autorización, un local
-- de prueba y medios de pago acordados.
--   PIEZA A
--   a. Menú público (ventana sin sesión): enviar un pedido de retiro en efectivo. Tiene que guardarse y aparecer
--      en el panel del dueño como pendiente.
--   b. En el panel, ese pedido tiene turno (shift_id no nulo) y cuenta en la caja al tomarlo. Si todos los pedidos
--      públicos nuevos quedan sin turno: ver "OJO" 1 y correr el ROLLBACK de la pieza A.
--   c. Panel del dueño: abrir caja (crea el pedido 'apertura' completado) y cargar una venta manual en Analytics
--      (mostrador, completado). Ambos tienen que quedar 'completado', no 'pendiente'.
--   d. Pedido con Mercado Pago (checkout del menú): el webhook crea el pedido con pago confirmado y
--      payment_status 'pagado' (service_role, el trigger no actúa).
--   e. Menú de mesa (QR): enviar un pedido de mesa; entra como pendiente.
--   f. Red del navegador en el menú público: ningún 400 ni 42501 sobre orders al enviar el pedido.
--   PIEZA B
--   g. Pedido de mesa en estado entregado: en el menú del cliente elegir efectivo, tarjeta o transferencia. El
--      panel muestra "El cliente indica que desea pagar por: ...". Volver a elegir otro método: se actualiza.
--   h. Con el pedido ya 'completado': el pago no se puede solicitar (alert del cliente, error en la red).
--   i. Confirmar el pago desde el panel: sigue funcionando (el dueño actualiza con su sesión).
--   Resultado del 2026-11-13 en producción (Burgers Snappy): retiro (efectivo) y mesa 2 (pedido enviado desde el
--   QR) entraron, POST a orders 201 en el de mesa; ambos quedaron pendiente / pendiente / pago_confirmado false
--   y con turno asignado; el pago de mesa por solicitar_pago_mesa funcionó. El código HTTP del POST del retiro
--   no se capturó (el pedido sí se guardó y se leyó por /api/public/order/[id]).
--   Si falla a, b, c, d o e: ROLLBACK de la pieza A. Si falla g o i: ROLLBACK de la pieza B.
-- =============================================================================
