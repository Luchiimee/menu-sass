-- =============================================================================
-- 12 — MERCADO PAGO CONNECT (fase 3): vínculo pedido pendiente → pedido real
-- =============================================================================
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE, ANTES DE DEPLOYAR la rama que
-- trae POST /api/mp/webhook. Requiere haber corrido antes 11_mp_pending_orders.sql.
--
-- Qué agrega: pending_mp_orders.order_id, el id del pedido creado en orders
-- cuando el webhook confirma el pago. Para reconciliar cobros sin pedido:
--   status = 'paid' and order_id is null
-- (el webhook marca la fila 'paid' ANTES de crear el pedido; si la creación
-- falla, la fila queda así hasta que MP reintente o se resuelva a mano).
--
-- Sin FK a orders a propósito: no se toca esa tabla. El webhook usa como id del
-- pedido el id de esta fila, así que el insert es idempotente por clave primaria.
-- La columna es nullable y aditiva: no cambia permisos ni RLS (siguen los de 11).
-- =============================================================================

begin;

alter table public.pending_mp_orders
  add column if not exists order_id uuid;

comment on column public.pending_mp_orders.order_id is
  'Id del pedido creado en orders por el webhook de MP Connect. Nulo mientras no exista.';

-- Cobros sin pedido (pocas filas): para el chequeo de reconciliación
create index if not exists pending_mp_orders_unreconciled_idx
  on public.pending_mp_orders (created_at)
  where status = 'paid' and order_id is null;

commit;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN (solo lectura)
-- -----------------------------------------------------------------------------
-- La columna existe (esperado: 1 fila, uuid, nullable)
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'pending_mp_orders' and column_name = 'order_id';

-- Cobros sin pedido a reconciliar (esperado: 0 filas)
select id, restaurant_id, mp_payment_id, total_amount, created_at
from public.pending_mp_orders
where status = 'paid' and order_id is null
order by created_at;

-- RLS y permisos siguen como en 11 (esperado: rls=true, politicas=0; 0 grants a anon/authenticated)
select c.relname as tabla, c.relrowsecurity as rls,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as politicas
from pg_class c
where c.oid = 'public.pending_mp_orders'::regclass;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'pending_mp_orders'
  and grantee in ('anon', 'authenticated');

-- -----------------------------------------------------------------------------
-- ROLLBACK (comentado). Pierde el vínculo con los pedidos ya creados.
-- -----------------------------------------------------------------------------
-- begin;
-- drop index if exists public.pending_mp_orders_unreconciled_idx;
-- alter table public.pending_mp_orders drop column if exists order_id;
-- commit;
