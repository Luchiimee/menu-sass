-- =============================================================================
-- 17 — BAJA DE MAILS COMERCIALES (lista de personas que dejaron de recibirlos)
-- =============================================================================
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE, ANTES DE DEPLOYAR la baja de mails
-- (rama feat/email-unsubscribe). No lo ejecuta ningún script.
--
-- Qué guarda: una fila por email que pidió no recibir más el mail de seguimiento
-- (trial_followup). Hoy solo ese mail consulta la lista; los mails de servicio
-- (trial_ending, thanks) no.
--   email_lower  el email en minúsculas y sin espacios (clave primaria: una baja por persona)
--   created_at   cuándo pidió la baja
-- Insertar un email que ya está dado de baja no hace nada (on conflict do nothing en la API).
--
-- Seguridad (mismo patrón que 15_rate_limits.sql y 16_email_log.sql)
--   - RLS activado y CERO políticas; se revocan los permisos de anon y authenticated.
--   - Solo service_role puede leer e insertar (no hay update ni delete).
-- =============================================================================

begin;

create table public.email_unsubscribes (
  email_lower text        primary key check (char_length(email_lower) between 3 and 254 and email_lower = lower(email_lower)),
  created_at  timestamptz not null default now()
);

comment on table public.email_unsubscribes is
  'Emails que pidieron no recibir más mails comerciales de Snappy. Solo service_role.';

alter table public.email_unsubscribes enable row level security;
revoke all on public.email_unsubscribes from public, anon, authenticated;
grant select, insert on public.email_unsubscribes to service_role;

commit;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN (solo lectura)
-- -----------------------------------------------------------------------------
-- RLS activado y sin políticas (esperado: rls=true, politicas=0)
select c.relname as tabla, c.relrowsecurity as rls,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as politicas
from pg_class c
where c.oid = 'public.email_unsubscribes'::regclass;

-- anon y authenticated sin permisos (esperado: 0 filas)
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'email_unsubscribes'
  and grantee in ('anon', 'authenticated');

-- service_role solo con select e insert (esperado: 2 filas)
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'email_unsubscribes'
  and grantee = 'service_role';
