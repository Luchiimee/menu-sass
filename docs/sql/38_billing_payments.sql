-- 38 — Historial de facturación (public.billing_payments)
--
-- Estado: SIN APLICAR.
--
-- Qué hace: crea la tabla donde se anota cada cobro de la suscripción (fecha, monto, plan, estado y motivo si se
-- rechazó, e id del pago en Mercado Pago). La escriben solo el servidor (service_role): el cron de cobro y el webhook
-- de Mercado Pago (lib/billingPayments.ts). El dueño del local puede LEER solo los suyos (pantalla Plan → Historial).
--
-- Borrado de datos: los cobros se borran junto con el local (on delete cascade), igual que el resto de sus datos.
-- Mercado Pago conserva sus propios registros.
--
-- Solo agrega una tabla nueva y vacía; no cambia ninguna tabla ni dato existente.
--
-- Rollback: drop table public.billing_payments;  (y revertir el código)

create table if not exists public.billing_payments (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  mp_payment_id text not null unique,
  amount        numeric(12,2),
  currency      text not null default 'ARS',
  status        text not null,
  status_detail text,
  plan          text,
  source        text not null default 'webhook',
  paid_at       timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists billing_payments_restaurant_paid_idx
  on public.billing_payments (restaurant_id, paid_at desc);

alter table public.billing_payments enable row level security;

-- El dueño lee solo los cobros de su local. No hay políticas de insert/update/delete: el navegador no puede escribir.
drop policy if exists "owner reads own billing payments" on public.billing_payments;
create policy "owner reads own billing payments" on public.billing_payments
  for select to authenticated
  using (exists (select 1 from public.restaurants r where r.id = billing_payments.restaurant_id and r.user_id = auth.uid()));

revoke all on public.billing_payments from public, anon, authenticated;
grant select on public.billing_payments to authenticated;
grant all on public.billing_payments to service_role;
