-- =============================================================================
-- 16 — REGISTRO DE MAILS DE CICLO DE VIDA (idempotencia de envíos)
-- =============================================================================
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE, ANTES DE DEPLOYAR el cron de mails
-- (rama feat/lifecycle-emails). No lo ejecuta ningún script.
--
-- Qué guarda: una fila por mail que Snappy decide mandar a un local.
--   kind        'trial_ending' | 'trial_followup' | 'thanks' (gracias al cargar la tarjeta)
--   dedupe_key  '<kind>:<restaurant_id>'  → un mail de cada tipo por local, para siempre
--   status      'pending' (reservado, por enviar) | 'sent' | 'failed'
-- El unique (kind, dedupe_key) hace de candado: dos corridas del cron a la vez no pueden
-- reservar el mismo mail.
--
-- Seguridad (mismo patrón que 15_rate_limits.sql)
--   - RLS activado y CERO políticas; se revocan los permisos de anon y authenticated.
--   - Solo service_role puede leer, insertar y actualizar (no hay delete).
-- =============================================================================

begin;

create table public.email_log (
  id            uuid        primary key default gen_random_uuid(),
  kind          text        not null check (kind in ('trial_ending', 'trial_followup', 'thanks')),
  dedupe_key    text        not null check (char_length(dedupe_key) between 1 and 200),
  restaurant_id uuid        references public.restaurants (id) on delete set null,
  to_email      text        not null,
  status        text        not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_id   text,
  error         text,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz,
  unique (kind, dedupe_key)
);

comment on table public.email_log is
  'Mails de ciclo de vida enviados (o por enviar) a los locales. Solo service_role.';

create index email_log_restaurant_idx on public.email_log (restaurant_id);

alter table public.email_log enable row level security;
revoke all on public.email_log from public, anon, authenticated;
grant select, insert, update on public.email_log to service_role;

commit;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN (solo lectura)
-- -----------------------------------------------------------------------------
-- RLS activado y sin políticas (esperado: rls=true, politicas=0)
select c.relname as tabla, c.relrowsecurity as rls,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as politicas
from pg_class c
where c.oid = 'public.email_log'::regclass;

-- anon y authenticated sin permisos (esperado: 0 filas)
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'email_log'
  and grantee in ('anon', 'authenticated');
