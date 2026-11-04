-- =============================================================================
-- 15 — LÍMITE DE USO de los endpoints públicos del checkout con Mercado Pago
-- =============================================================================
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE, ANTES DE DEPLOYAR la rama
-- feat/mp-checkout-rate-limit. Sin esta función:
--   - POST /api/checkout/mp responde 503 y no crea nada (falla cerrado);
--   - GET /api/checkout/mp/available y /status siguen andando sin límite (falla abierto).
--
-- Qué guarda: un contador por clave y ventana fija (lib/rateLimitCore.ts arma las claves):
--   checkout:ip:<sha-256 de la IP con sal>   POST /api/checkout/mp, por IP
--   checkout:rid:<restaurant_id>             POST /api/checkout/mp, por restaurante
--   public:ip:<sha-256 de la IP con sal>     /available y /status, por IP
-- La IP NUNCA se guarda en texto plano: el servidor la hashea con RATE_LIMIT_IP_SALT.
--
-- Seguridad
--   - RLS activado y CERO políticas; se revocan los permisos de anon y authenticated.
--   - La función se ejecuta con los permisos de quien la llama (security invoker) y
--     solo service_role puede ejecutarla.
--   - Limpieza: cada llamada borra, con probabilidad 1/100, las ventanas de hace más de
--     un día (la tabla no crece sin límite y no hace falta un cron).
-- =============================================================================

begin;

create table public.rate_limits (
  key          text        not null check (char_length(key) between 1 and 200),
  window_start timestamptz not null,
  count        integer     not null default 0 check (count >= 0),
  primary key (key, window_start)
);

comment on table public.rate_limits is
  'Contadores por ventana fija para limitar los endpoints públicos del checkout MP. Solo service_role.';

create index rate_limits_window_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.rate_limits to service_role;

-- Suma 1 al contador de la ventana actual y devuelve si la request entra.
-- Atómica: el insert ... on conflict do update toma el lock de la fila, así que dos
-- requests simultáneas nunca leen el mismo valor.
create or replace function public.check_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
)
returns table (allowed boolean, current_count integer, retry_after integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count        integer;
begin
  if p_key is null or char_length(p_key) = 0 or char_length(p_key) > 200 then
    raise exception 'check_rate_limit: clave inválida';
  end if;
  if p_limit is null or p_limit < 1 then
    raise exception 'check_rate_limit: límite inválido';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'check_rate_limit: ventana inválida';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start) do update set count = rl.count + 1
  returning rl.count into v_count;

  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  allowed := v_count <= p_limit;
  current_count := v_count;
  retry_after := greatest(1, ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - now())))::integer);
  return next;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

commit;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN (solo lectura)
-- -----------------------------------------------------------------------------
-- RLS activado y sin políticas (esperado: rls=true, politicas=0)
select c.relname as tabla, c.relrowsecurity as rls,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as politicas
from pg_class c
where c.oid = 'public.rate_limits'::regclass;

-- anon y authenticated sin permisos sobre la tabla (esperado: 0 filas)
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'rate_limits'
  and grantee in ('anon', 'authenticated');

-- Quién puede ejecutar la función (esperado: service_role sí; anon y authenticated no)
select r.rolname,
       has_function_privilege(r.rolname, 'public.check_rate_limit(text, integer, integer)', 'execute') as puede_ejecutar
from pg_roles r
where r.rolname in ('service_role', 'anon', 'authenticated');
