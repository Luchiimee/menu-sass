-- =============================================================================
-- 10 — MERCADO PAGO CONNECT (fase 1): credenciales OAuth por restaurante
-- =============================================================================
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE, ANTES DE DEPLOYAR la rama
-- feat/mp-connect (las rutas /api/mp/* usan estas tablas).
--
-- Es independiente del cobro de suscripciones de Snappy: no toca restaurants
-- ni ninguna tabla existente.
--
-- Seguridad
--   - RLS activado y CERO políticas: anon y authenticated no ven ni escriben
--     ninguna fila. Además se revocan todos los permisos de esos roles.
--   - Solo service_role (API routes del servidor) accede. service_role saltea
--     RLS, y los permisos por defecto de Supabase se lo dan sobre tablas nuevas;
--     igual se otorgan explícitamente.
--   - Los tokens se guardan CIFRADOS por la aplicación (AES-256-GCM con
--     MP_TOKEN_ENC_KEY, lib/crypto.ts). La base nunca ve el texto plano.
--   - No se agregan columnas a restaurants: esa tabla hoy se lee con la clave
--     pública desde el menú.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Credenciales de la cuenta de MP de cada restaurante
-- -----------------------------------------------------------------------------
create table public.restaurant_mp_credentials (
  restaurant_id     uuid primary key references public.restaurants(id) on delete cascade,
  mp_user_id        text,
  mp_nickname       text,          -- nickname o email de la cuenta: lo único que se muestra
  access_token_enc  text,          -- iv.tag.ciphertext (base64), nunca texto plano
  refresh_token_enc text,          -- idem
  expires_at        timestamptz,   -- vencimiento del access_token
  status            text not null default 'connected'
                    check (status in ('connected', 'expired', 'revoked', 'error')),
  connected_at      timestamptz,
  updated_at        timestamptz,
  last_error        text           -- motivo corto, sin tokens
);

comment on table public.restaurant_mp_credentials is
  'Credenciales OAuth de Mercado Pago de cada restaurante (fase 1 MP Connect). Solo service_role. Tokens cifrados por la app.';

create index restaurant_mp_credentials_expires_idx
  on public.restaurant_mp_credentials (expires_at)
  where status = 'connected';

alter table public.restaurant_mp_credentials enable row level security;
revoke all on public.restaurant_mp_credentials from public, anon, authenticated;
grant select, insert, update, delete on public.restaurant_mp_credentials to service_role;

-- -----------------------------------------------------------------------------
-- Estados OAuth pendientes (state + code_verifier de PKCE)
-- Vigencia: 10 minutos, validada en /api/mp/callback. Un state se borra al
-- usarse (un solo uso). Los vencidos se limpian en /api/mp/connect.
-- -----------------------------------------------------------------------------
create table public.mp_oauth_states (
  state         text primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id       uuid not null,
  code_verifier text not null,
  created_at    timestamptz not null default now()
);

comment on table public.mp_oauth_states is
  'Estados OAuth pendientes de MP Connect (PKCE). Vigencia 10 min, un solo uso. Solo service_role.';

create index mp_oauth_states_created_idx on public.mp_oauth_states (created_at);

alter table public.mp_oauth_states enable row level security;
revoke all on public.mp_oauth_states from public, anon, authenticated;
grant select, insert, update, delete on public.mp_oauth_states to service_role;

commit;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN (solo lectura)
-- -----------------------------------------------------------------------------
-- RLS activado y sin políticas (esperado: 2 filas con rls=true, politicas=0)
select c.relname as tabla, c.relrowsecurity as rls,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as politicas
from pg_class c
where c.oid in ('public.restaurant_mp_credentials'::regclass, 'public.mp_oauth_states'::regclass);

-- anon y authenticated sin permisos (esperado: 0 filas)
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('restaurant_mp_credentials', 'mp_oauth_states')
  and grantee in ('anon', 'authenticated');

-- Con la clave ANON (terminal), tiene que devolver [] o un error de permisos:
--   curl "$SUPABASE_URL/rest/v1/restaurant_mp_credentials?select=*" \
--     -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY"

-- -----------------------------------------------------------------------------
-- ROLLBACK (comentado). Borra las credenciales guardadas: los restaurantes
-- tendrían que volver a conectar su cuenta.
-- -----------------------------------------------------------------------------
-- begin;
-- drop table if exists public.mp_oauth_states;
-- drop table if exists public.restaurant_mp_credentials;
-- commit;
