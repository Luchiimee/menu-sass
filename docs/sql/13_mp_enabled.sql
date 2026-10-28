-- =============================================================================
-- 13 — MERCADO PAGO CONNECT: interruptor del dueño "Cobrar con Mercado Pago"
-- =============================================================================
-- CORRER A MANO EN EL SQL EDITOR DE SUPABASE, ANTES DE DEPLOYAR la rama que lee
-- esta columna (Pagos > Métodos de pago, /api/checkout/mp/available y
-- POST /api/checkout/mp). Sin la columna, esas consultas fallan: el checkout con
-- MP queda no disponible (falla cerrado) y la pantalla Pagos no carga.
--
-- Qué agrega: restaurants.mp_checkout_enabled, el interruptor del dueño para
-- ofrecer Mercado Pago en su checkout. Es independiente de efectivo_enabled y
-- transferencia_enabled, y APAGADO por defecto: conectar la cuenta de MP no
-- empieza a cobrar sola; el dueño tiene que activarlo.
--
-- IMPORTANTE (seguridad): este flag lo escribe el propio dueño desde el navegador,
-- igual que efectivo_enabled y transferencia_enabled. NO es la puerta de acceso:
-- el servidor sigue exigiendo lanzamiento (MP_CONNECT_PUBLIC / admin), plan GO o
-- Plus, suscripción vigente y credenciales 'connected'. El flag solo se SUMA a eso.
--
-- Es aditivo: no toca RLS, policies ni grants (las columnas de restaurants se
-- actualizan con la misma policy del dueño que ya usan efectivo_enabled y
-- transferencia_enabled). En Postgres 11+ un default constante no reescribe la tabla.
-- =============================================================================

begin;

alter table public.restaurants
  add column if not exists mp_checkout_enabled boolean not null default false;

comment on column public.restaurants.mp_checkout_enabled is
  'El dueño ofrece Mercado Pago (MP Connect) en su checkout. Se suma a las condiciones del servidor; no las reemplaza.';

commit;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN (solo lectura)
-- -----------------------------------------------------------------------------
-- La columna existe: boolean, NOT NULL, default false (esperado: 1 fila)
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'restaurants' and column_name = 'mp_checkout_enabled';

-- Todos los restaurantes quedan apagados (esperado: una sola fila, mp_checkout_enabled = false)
select mp_checkout_enabled, count(*) as restaurantes
from public.restaurants
group by mp_checkout_enabled;

-- El dueño puede actualizarla igual que las otras dos (esperado: 3 filas, privilegio UPDATE
-- para 'authenticated'; si falta la de mp_checkout_enabled, el interruptor no guardaría)
select column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'restaurants'
  and column_name in ('efectivo_enabled', 'transferencia_enabled', 'mp_checkout_enabled')
  and grantee = 'authenticated' and privilege_type = 'UPDATE'
order by column_name;

-- -----------------------------------------------------------------------------
-- ROLLBACK (comentado). Se pierde qué dueños lo habían activado.
-- -----------------------------------------------------------------------------
-- begin;
-- alter table public.restaurants drop column if exists mp_checkout_enabled;
-- commit;
