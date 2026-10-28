-- =============================================================================
-- 11 — MERCADO PAGO CONNECT (fase 2): pedidos pendientes de pago
-- =============================================================================
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE, ANTES DE DEPLOYAR la rama
-- feat/mp-checkout-server (POST /api/checkout/mp y el cron mp-refresh usan
-- esta tabla). Requiere haber corrido antes 10_mp_connect.sql.
--
-- Qué guarda: el pedido YA CALCULADO por el servidor (carrito, datos del
-- cliente, desglose de montos) mientras el cliente paga en Mercado Pago. La
-- fila se crea antes de crear la preference y su id viaja como
-- external_reference. La fase 3 (webhook) la pasa a 'paid' y crea el pedido
-- real en orders; esta fase NO toca orders.
--
-- Estados: 'pending' (esperando pago) → 'paid' | 'expired' (30 min sin pago,
-- lo marca el cron mp-refresh) | 'failed' (no se pudo crear la preference).
--
-- Seguridad
--   - RLS activado y CERO políticas: anon y authenticated no ven ni escriben
--     ninguna fila (el payload tiene nombre, teléfono y dirección del cliente).
--     Además se revocan todos los permisos de esos roles.
--   - Solo service_role (API routes del servidor) accede.
-- =============================================================================

begin;

create table public.pending_mp_orders (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references public.restaurants(id) on delete cascade,
  status           text not null default 'pending'
                   check (status in ('pending', 'paid', 'expired', 'failed')),
  payload          jsonb not null,           -- carrito normalizado + cliente + desglose de montos
  total_amount     numeric(12, 2) not null check (total_amount > 0),
  mp_preference_id text,
  mp_payment_id    text,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '30 minutes')
);

comment on table public.pending_mp_orders is
  'Pedidos calculados por el servidor a la espera del pago en Mercado Pago (fase 2 MP Connect). Solo service_role.';

-- Barrido de vencidos (cron) y búsquedas del webhook
create index pending_mp_orders_expires_idx
  on public.pending_mp_orders (expires_at)
  where status = 'pending';
create index pending_mp_orders_restaurant_idx
  on public.pending_mp_orders (restaurant_id, created_at desc);
create index pending_mp_orders_payment_idx
  on public.pending_mp_orders (mp_payment_id)
  where mp_payment_id is not null;

alter table public.pending_mp_orders enable row level security;
revoke all on public.pending_mp_orders from public, anon, authenticated;
grant select, insert, update, delete on public.pending_mp_orders to service_role;

commit;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN (solo lectura)
-- -----------------------------------------------------------------------------
-- RLS activado y sin políticas (esperado: 1 fila con rls=true, politicas=0)
select c.relname as tabla, c.relrowsecurity as rls,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as politicas
from pg_class c
where c.oid = 'public.pending_mp_orders'::regclass;

-- anon y authenticated sin permisos (esperado: 0 filas)
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'pending_mp_orders'
  and grantee in ('anon', 'authenticated');

-- service_role con permisos (esperado: 4 filas: SELECT, INSERT, UPDATE, DELETE)
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'pending_mp_orders'
  and grantee = 'service_role';

-- Con la clave ANON (terminal), tiene que devolver [] o un error de permisos:
--   curl "$SUPABASE_URL/rest/v1/pending_mp_orders?select=*" \
--     -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"

-- -----------------------------------------------------------------------------
-- ROLLBACK (comentado). Borra los pedidos pendientes: los pagos en curso
-- quedarían sin pedido asociado.
-- -----------------------------------------------------------------------------
-- begin;
-- drop table if exists public.pending_mp_orders;
-- commit;
